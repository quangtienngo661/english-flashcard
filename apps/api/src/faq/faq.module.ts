import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { IdentityModule } from '../identity/identity.module.js';
import { AdminFaqController } from './admin-faq.controller.js';
import { FaqService } from './faq.service.js';
import { PublicFaqController } from './public-faq.controller.js';

/** The home page FAQ (giao diện mới §10.7). Its own module, not Legal: Legal's version number is the terms version learners re-accept. */
@Module({
  imports: [IdentityModule],
  controllers: [AdminFaqController, PublicFaqController],
  providers: [FaqService, IdempotencyInterceptor],
})
export class FaqModule {}
