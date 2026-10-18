import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { ContentModule } from '../content/content.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { BacklogController } from './backlog/backlog.controller.js';
import { BacklogService } from './backlog/backlog.service.js';
import { GroupsController } from './groups/groups.controller.js';
import { GroupsService } from './groups/groups.service.js';
import { ItemsController } from './items/items.controller.js';
import { ItemsService } from './items/items.service.js';
import { LearningService } from './learning.service.js';
import { MyWordsDeleteController } from './my-words/my-words-delete.controller.js';
import { PracticeReadsService } from './practice/practice-reads.service.js';
import { PracticeReviewService } from './practice/practice-review.service.js';
import { QuickAddController } from './quick-add/quick-add.controller.js';
import { QuickAddService } from './quick-add/quick-add.service.js';
import { QueueController } from './queue/queue.controller.js';
import { QueueService } from './queue/queue.service.js';
import { ReviewsController } from './reviews/reviews.controller.js';
import { ReviewsService } from './reviews/reviews.service.js';

@Module({
  // IdentityModule: the learner guard needs IdentityService in the module that hosts the controller.
  imports: [IdentityModule, ContentModule, SettingsModule],
  controllers: [
    BacklogController, GroupsController, ItemsController, MyWordsDeleteController, QueueController, QuickAddController,
    ReviewsController,
  ],
  providers: [
    BacklogService, GroupsService, ItemsService, QueueService, QuickAddService, ReviewsService, PracticeReadsService,
    PracticeReviewService, LearningService, IdempotencyInterceptor,
  ],
  exports: [LearningService],
})
export class LearningModule {}
