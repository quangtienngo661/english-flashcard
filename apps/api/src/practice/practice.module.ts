import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { ContentModule } from '../content/content.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { LearningModule } from '../learning/index.js';
import { SettingsModule } from '../settings/index.js';

@Module({
  // IdentityModule: the learner guard needs IdentityService in the module that hosts the controllers.
  imports: [IdentityModule, ContentModule, LearningModule, SettingsModule],
  providers: [IdempotencyInterceptor],
})
export class PracticeModule {}
