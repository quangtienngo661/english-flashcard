import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateString, dateValue, daysBetween, localDate } from '../../common/time/local-date.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { applyAnswer, type Answer } from '../schedule/schedule.js';

export type PracticeReviewInput = { senseId: string; action: Answer; reviewId: string };
export type PracticeReviewOutcome =
  | { senseId: string; outcome: 'applied'; item_id: string; level: number; due_date: string; priority: boolean }
  | { senseId: string; outcome: 'not-in-learning' }
  | { senseId: string; outcome: 'known-not-allowed' };

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });

/**
 * "Cần ôn tập" / "Đã biết" pressed in a practice session (design Bước 4 5.3, 7.8): the Bước 3 schedule rules, written in the
 * caller's transaction so Practice records its own state with it (R2). The log row has no group, so no daily cap counts it
 * (D35), and is keyed by `review_id` (the practice item id), so pressing twice writes once.
 */
@Injectable()
export class PracticeReviewService {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async review(tx: Prisma.TransactionClient, userId: string, inputs: PracticeReviewInput[]): Promise<PracticeReviewOutcome[]> {
    if (inputs.length === 0) return [];
    const [profile, { learning }] = await Promise.all([this.identity.getProfile(userId), this.settings.get()]);
    if (!profile) throw notFound();
    // Every affected item first, in id order (as lockItems), so a duplicate waits here and then finds the first one's row.
    const items = await tx.$queryRaw<Array<{ id: string; sense_id: string }>>`
      SELECT id::text AS id, sense_id::text AS sense_id FROM learning_items
      WHERE user_id = ${userId}::uuid AND sense_id = ANY(${inputs.map(({ senseId }) => senseId)}::uuid[])
      ORDER BY id FOR UPDATE`;
    const itemOf = new Map(items.map((item) => [item.sense_id, item.id]));
    const at = this.clock.now();
    const today = localDate(profile.timezone, at);
    const outcomes: PracticeReviewOutcome[] = [];
    for (const { senseId, action, reviewId } of inputs) {
      const stored = await tx.learningLogEntry.findFirst({ where: { userId, reviewId } });
      if (stored) {
        outcomes.push({
          senseId, outcome: 'applied', item_id: stored.itemId, level: stored.levelAfter!, due_date: dateString(stored.dueAfter!),
          // "known" always leaves the item without priority; "review" always sets it.
          priority: stored.answer === 'review',
        });
        continue;
      }
      const itemId = itemOf.get(senseId);
      if (!itemId) {
        outcomes.push({ senseId, outcome: 'not-in-learning' });
        continue;
      }
      const item = await tx.learningItem.findUniqueOrThrow({ where: { id: itemId } });
      const before = { level: item.level, dueDate: dateString(item.dueDate), priority: item.priority };
      const result = applyAnswer(before, action, today, learning.backlogAfterDays);
      if (action === 'known' && !result.wasDue) {
        outcomes.push({ senseId, outcome: 'known-not-allowed' });
        continue;
      }
      await tx.learningItem.update({
        where: { id: item.id },
        data: {
          level: result.next.level, dueDate: dateValue(result.next.dueDate), priority: result.next.priority, lastReviewedAt: at,
        },
      });
      await tx.learningLogEntry.create({ data: {
        userId, itemId: item.id, senseId, groupId: null, kind: 'review', answer: action, rating: result.rating,
        levelBefore: before.level, levelAfter: result.next.level, dueBefore: item.dueDate, dueAfter: dateValue(result.next.dueDate),
        wasDue: result.wasDue,
        daysSinceLast: item.lastReviewedAt ? daysBetween(localDate(profile.timezone, item.lastReviewedAt), today) : null,
        reviewId, section: result.section, origin: 'practice', localDate: dateValue(today), at,
      } });
      outcomes.push({
        senseId, outcome: 'applied', item_id: item.id, level: result.next.level, due_date: result.next.dueDate,
        priority: result.next.priority,
      });
    }
    return outcomes;
  }
}
