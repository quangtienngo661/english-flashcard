import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { recordActivityIn } from './activity/record-activity.js';
import {
  PracticeReadsService, type PracticeCheck, type PracticeItem, type PracticeScope,
} from './practice/practice-reads.service.js';
import {
  PracticeReviewService, type PracticeReviewInput, type PracticeReviewOutcome,
} from './practice/practice-review.service.js';
import type { LearnerDay } from './queue/queue.queries.js';
import { QueueService } from './queue/queue.service.js';

/** The façade other modules (Notifications, Practice) use. */
@Injectable()
export class LearningService {
  constructor(
    @Inject(QueueService) private readonly queue: QueueService,
    @Inject(PracticeReadsService) private readonly practice: PracticeReadsService,
    @Inject(PracticeReviewService) private readonly practiceReviews: PracticeReviewService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  /** Learners (of the given ones) with at least one card left after today's caps; `today` is each one's local date. */
  cardsLeftToday(entries: LearnerDay[]): Promise<Set<string>> {
    return this.queue.cardsLeftToday(entries);
  }

  /**
   * The learner's visible items of a practice source, one row per item; a group not owned → 404. The three practice reads take
   * the client to read through: a caller inside an open transaction passes its `tx`, so the read needs no second connection.
   */
  practiceItems(userId: string, scope: PracticeScope, db?: Prisma.TransactionClient | PrismaClient): Promise<PracticeItem[]> {
    return this.practice.items(userId, scope, db);
  }

  /** For each sense, the visible senses sharing a group with the learner's item of it (itself excluded; `[]` if none). */
  practiceGroupMates(userId: string, senseIds: string[], db?: Prisma.TransactionClient | PrismaClient): Promise<Map<string, string[]>> {
    return this.practice.groupMates(userId, senseIds, db);
  }

  /** API (b): the learner's groups holding each sense, `{id, name}`, visible senses only. */
  groupsOfSenses(userId: string, senseIds: string[], db?: Prisma.TransactionClient | PrismaClient):
    Promise<Map<string, Array<{ id: string; name: string }>>> {
    return this.practice.groupsOfSenses(userId, senseIds, db);
  }

  practiceCheck(userId: string, senseId: string, groupId: string | null, db?: Prisma.TransactionClient | PrismaClient):
    Promise<PracticeCheck> {
    return this.practice.check(userId, senseId, groupId, db);
  }

  /** "Cần ôn tập" / "Đã biết" from practice, in the caller's transaction; idempotent by `reviewId`. */
  practiceReview(tx: Prisma.TransactionClient, userId: string, inputs: PracticeReviewInput[]): Promise<PracticeReviewOutcome[]> {
    return this.practiceReviews.review(tx, userId, inputs);
  }

  /**
   * A "lần học" of the learner on their local date `localDate` (nhóm B D39, B51): one row per learner per day, however many calls.
   * Practice calls it with its `tx` as the last write of a final answer; the shared client is the default for any other caller.
   */
  recordActivity(userId: string, localDate: string, db?: Prisma.TransactionClient | PrismaClient): Promise<void> {
    return recordActivityIn(db ?? this.prisma, userId, localDate);
  }
}
