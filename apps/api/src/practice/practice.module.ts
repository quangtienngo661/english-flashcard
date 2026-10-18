import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { ContentModule } from '../content/content.module.js';
import { EntitlementsModule } from '../entitlements/index.js';
import { IdentityModule } from '../identity/identity.module.js';
import { LearningModule } from '../learning/index.js';
import { SettingsModule } from '../settings/index.js';
import { QuestionBuilder } from './questions/question-builder.service.js';
import { SessionsController } from './sessions/sessions.controller.js';
import { SessionsService } from './sessions/sessions.service.js';
import { PracticeStats } from './weak/practice-stats.js';

@Module({
  // IdentityModule: the learner guard needs IdentityService in the module that hosts the controllers.
  imports: [IdentityModule, ContentModule, LearningModule, SettingsModule, EntitlementsModule],
  controllers: [SessionsController],
  providers: [IdempotencyInterceptor, QuestionBuilder, PracticeStats, SessionsService],
})
export class PracticeModule {}
