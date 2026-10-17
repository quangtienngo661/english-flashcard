import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateString, dateValue, daysBetween, localDate } from '../../common/time/local-date.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { applyAnswer, type Answer, type Section } from '../schedule/schedule.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

export type ReviewInput = { itemId: string; groupId: string; answer: Answer; reviewId: string };
export type ReviewResult = { item_id: string; level: number; due_date: string; priority: boolean; section: Section };

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });

function isUniqueViolation(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';
}

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  /** Idempotent by `review_id` (B3E4); answers on one item run one at a time under its row lock (B3E5). */
  async answer(userId: string, input: ReviewInput): Promise<ReviewResult> {
    const [profile, { learning }] = await Promise.all([this.identity.getProfile(userId), this.settings.get()]);
    if (!profile) throw notFound();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const stored = await this.storedResult(tx, userId, input);
        if (stored) return stored;
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM learning_items WHERE id = ${input.itemId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
        if (locked.length === 0) throw notFound();
        // A duplicate sent at the same moment waited on the lock and now finds the first one's row.
        const replay = await this.storedResult(tx, userId, input);
        if (replay) return replay;
        const link = await tx.groupItem.findFirst({
          where: { itemId: input.itemId, groupId: input.groupId, group: { userId } },
        });
        if (!link) throw notFound();

        const item = await tx.learningItem.findUniqueOrThrow({ where: { id: input.itemId } });
        const at = this.clock.now();
        const today = localDate(profile.timezone, at);
        const before = { level: item.level, dueDate: dateString(item.dueDate), priority: item.priority };
        const result = applyAnswer(before, input.answer, today, learning.backlogAfterDays);
        await tx.learningItem.update({
          where: { id: item.id },
          data: {
            level: result.next.level, dueDate: dateValue(result.next.dueDate), priority: result.next.priority,
            lastReviewedAt: at,
          },
        });
        await tx.learningLogEntry.create({ data: {
          userId, itemId: item.id, senseId: item.senseId, groupId: input.groupId, kind: 'review', answer: input.answer,
          rating: result.rating, levelBefore: before.level, levelAfter: result.next.level, dueBefore: item.dueDate,
          dueAfter: dateValue(result.next.dueDate), wasDue: result.wasDue,
          daysSinceLast: item.lastReviewedAt ? daysBetween(localDate(profile.timezone, item.lastReviewedAt), today) : null,
          reviewId: input.reviewId, section: result.section, localDate: dateValue(today), at,
        } });
        return {
          item_id: item.id, level: result.next.level, due_date: result.next.dueDate, priority: result.next.priority,
          section: result.section,
        };
      }, transactionOptions);
    } catch (error) {
      // The same review_id raced on another item: the first one's row decides (stored result or 400).
      if (isUniqueViolation(error)) {
        const stored = await this.storedResult(this.prisma, userId, input);
        if (stored) return stored;
      }
      throw error;
    }
  }

  /** The result stored for this review_id; 400 when the id was used for a different answer (like Idempotency-Key). */
  private async storedResult(
    db: Prisma.TransactionClient | PrismaClient, userId: string, input: ReviewInput,
  ): Promise<ReviewResult | null> {
    const row = await db.learningLogEntry.findFirst({ where: { userId, reviewId: input.reviewId } });
    if (!row) return null;
    if (row.itemId !== input.itemId || row.groupId !== input.groupId || row.answer !== input.answer) {
      throw new ProblemDetailsException({ status: 400, title: 'review_id reused with a different payload' });
    }
    return {
      item_id: row.itemId, level: row.levelAfter!, due_date: dateString(row.dueAfter!),
      // "known" always leaves the item without priority; "review" always sets it.
      priority: row.answer === 'review', section: row.section as Section,
    };
  }
}
