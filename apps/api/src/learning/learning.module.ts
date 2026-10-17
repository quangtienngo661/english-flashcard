import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { ContentModule } from '../content/content.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { GroupsController } from './groups/groups.controller.js';
import { GroupsService } from './groups/groups.service.js';
import { LearningService } from './learning.service.js';
import { ReviewsController } from './reviews/reviews.controller.js';
import { ReviewsService } from './reviews/reviews.service.js';

@Module({
  // IdentityModule: the learner guard needs IdentityService in the module that hosts the controller.
  imports: [IdentityModule, ContentModule],
  controllers: [GroupsController, ReviewsController],
  providers: [GroupsService, ReviewsService, LearningService, IdempotencyInterceptor],
  exports: [LearningService],
})
export class LearningModule {}
