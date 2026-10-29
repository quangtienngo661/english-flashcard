import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { IdentityModule } from '../identity/identity.module.js';
import { AdminSettingsController } from './admin-settings.controller.js';
import { IdentitySettingsProvider } from './identity-settings.provider.js';
import { MeAppConfigController } from './me-app-config.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [IdentityModule],
  controllers: [AdminSettingsController, MeAppConfigController],
  providers: [SettingsService, IdempotencyInterceptor, IdentitySettingsProvider],
  exports: [SettingsService],
})
export class SettingsModule {}
