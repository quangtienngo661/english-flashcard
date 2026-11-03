import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { IdentityModule } from '../identity/identity.module.js';
import { AdminLegalController } from './admin-legal.controller.js';
import { LegalService } from './legal.service.js';
import { LegalTermsProvider } from './legal-terms.provider.js';
import { PublicLegalController } from './public-legal.controller.js';

@Module({
  imports: [IdentityModule],
  controllers: [AdminLegalController, PublicLegalController],
  providers: [LegalService, IdempotencyInterceptor, LegalTermsProvider],
  exports: [LegalService],
})
export class LegalModule {}
