import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { IdentityModule } from '../identity/identity.module.js';
import { AdminSettingsController } from './admin-settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [IdentityModule],
  controllers: [AdminSettingsController],
  providers: [SettingsService, IdempotencyInterceptor],
  exports: [SettingsService],
})
export class SettingsModule {}
