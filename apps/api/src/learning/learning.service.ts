import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
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
  ) {}

  /** Learners (of the given ones) with at least one card left after today's caps; `today` is each one's local date. */
  cardsLeftToday(entries: LearnerDay[]): Promise<Set<string>> {
    return this.queue.cardsLeftToday(entries);
  }

  /** The learner's visible items of a practice source, one row per item; a group not owned → 404. */
  practiceItems(userId: string, scope: PracticeScope): Promise<PracticeItem[]> {
    return this.practice.items(userId, scope);
  }

  /** For each sense, the visible senses sharing a group with the learner's item of it (itself excluded; `[]` if none). */
  practiceGroupMates(userId: string, senseIds: string[]): Promise<Map<string, string[]>> {
    return this.practice.groupMates(userId, senseIds);
  }

  practiceCheck(userId: string, senseId: string, groupId: string | null): Promise<PracticeCheck> {
    return this.practice.check(userId, senseId, groupId);
  }

  /** "Cần ôn tập" / "Đã biết" from practice, in the caller's transaction; idempotent by `reviewId`. */
  practiceReview(tx: Prisma.TransactionClient, userId: string, inputs: PracticeReviewInput[]): Promise<PracticeReviewOutcome[]> {
    return this.practiceReviews.review(tx, userId, inputs);
  }
}
