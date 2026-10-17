import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { ContentModule } from '../content/content.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { GroupsController } from './groups/groups.controller.js';
import { GroupsService } from './groups/groups.service.js';
import { ItemsController } from './items/items.controller.js';
import { ItemsService } from './items/items.service.js';
import { LearningService } from './learning.service.js';
import { QueueController } from './queue/queue.controller.js';
import { QueueService } from './queue/queue.service.js';
import { ReviewsController } from './reviews/reviews.controller.js';
import { ReviewsService } from './reviews/reviews.service.js';

@Module({
  // IdentityModule: the learner guard needs IdentityService in the module that hosts the controller.
  imports: [IdentityModule, ContentModule, SettingsModule],
  controllers: [GroupsController, ItemsController, QueueController, ReviewsController],
  providers: [GroupsService, ItemsService, QueueService, ReviewsService, LearningService, IdempotencyInterceptor],
  exports: [LearningService],
})
export class LearningModule {}
