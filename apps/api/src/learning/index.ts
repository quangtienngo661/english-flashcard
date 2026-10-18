// The only entry point other modules (Notifications, Practice) may import from Learning.
export { LearningModule } from './learning.module.js';
export { LearningService } from './learning.service.js';
export type { PracticeCheck, PracticeItem, PracticeScope } from './practice/practice-reads.service.js';
export type { LearnerDay } from './queue/queue.queries.js';
export type { Section } from './schedule/schedule.js';
