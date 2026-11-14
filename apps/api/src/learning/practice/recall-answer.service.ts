import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateString, dateValue, daysBetween, localDate } from '../../common/time/local-date.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { applyRecall } from '../schedule/schedule.js';

export type RecallAnswerInput = { senseId: string; groupId: string; correct: boolean };
export type RecallAnswerOutcome =
  | { outcome: 'leveled_up' | 'kept'; level: number; due_date: string }
  | { outcome: 'not-in-learning' };

/**
 * The final answer of a recall ("Ôn") session applied to the schedule (round C, DC4), written in the caller's transaction so
 * Practice records its own state with it. The log row carries the group, so the daily caps count it like a flashcard.
 * It does not record the activity day: Practice does that with the final answer, once for the whole call.
 */
@Injectable()
export class RecallAnswerService {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async recallAnswer(tx: Prisma.TransactionClient, userId: string, input: RecallAnswerInput): Promise<RecallAnswerOutcome> {
    const profile = await this.identity.getProfile(userId, tx);
    if (!profile) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    const { learning } = await this.settings.get(tx);
    // Two tabs answering the same due word: the second waits here, then reads the level the first one wrote and finds it not due.
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id::text AS id FROM learning_items WHERE user_id = ${userId}::uuid AND sense_id = ${input.senseId}::uuid FOR UPDATE`;
    if (locked.length === 0) return { outcome: 'not-in-learning' };
    const item = await tx.learningItem.findUniqueOrThrow({ where: { id: locked[0].id } });
    const at = this.clock.now();
    const today = localDate(profile.timezone, at);
    const before = { level: item.level, dueDate: dateString(item.dueDate), priority: item.priority };
    const result = applyRecall(before, input.correct, today, learning.backlogAfterDays);
    if (result.changed) {
      await tx.learningItem.update({
        where: { id: item.id },
        data: { level: result.next.level, dueDate: dateValue(result.next.dueDate), priority: result.next.priority, lastReviewedAt: at },
      });
    }
    await tx.learningLogEntry.create({ data: {
      userId, itemId: item.id, senseId: item.senseId, groupId: input.groupId, kind: 'review',
      answer: input.correct ? 'known' : 'review', rating: result.rating, levelBefore: before.level, levelAfter: result.next.level,
      dueBefore: item.dueDate, dueAfter: dateValue(result.next.dueDate), wasDue: result.wasDue,
      daysSinceLast: item.lastReviewedAt ? daysBetween(localDate(profile.timezone, item.lastReviewedAt), today) : null,
      reviewId: null, section: result.section, origin: 'recall', localDate: dateValue(today), at,
    } });
    return { outcome: result.outcome, level: result.next.level, due_date: result.next.dueDate };
  }
}
