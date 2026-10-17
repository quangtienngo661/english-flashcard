import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ReminderPrefsService } from './prefs/reminder-prefs.service.js';
import { RemindersController } from './prefs/reminders.controller.js';

@Module({
  imports: [IdentityModule],
  controllers: [RemindersController],
  providers: [ReminderPrefsService, IdempotencyInterceptor],
})
export class NotificationsModule {}
