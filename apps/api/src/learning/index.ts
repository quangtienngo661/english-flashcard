// The only entry point other modules (Notifications, Practice) may import from Learning.
export { LearningModule } from './learning.module.js';
export { LearningService } from './learning.service.js';
export type { PracticeCheck, PracticeItem, PracticeScope } from './practice/practice-reads.service.js';
export type { PracticeReviewInput, PracticeReviewOutcome } from './practice/practice-review.service.js';
export { PRIVATE_SENSES_CLEANUP, type PrivateSensesCleanup } from './private-senses-cleanup.port.js';
export {
  PRACTICE_DAY_COUNTS,
  type PracticeDayCount,
  type PracticeDayCounts,
  type PracticeDaySession,
} from './practice-day-counts.port.js';
export type { LearnerDay } from './queue/queue.queries.js';
export type { Section } from './schedule/schedule.js';
