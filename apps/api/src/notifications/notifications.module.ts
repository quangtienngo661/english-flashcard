import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { MailModule } from '../common/mail/mail.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { ReminderPrefsService } from './prefs/reminder-prefs.service.js';
import { RemindersController } from './prefs/reminders.controller.js';
import { ChannelChooser } from './provider/channel-chooser.js';
import { EmailProvider } from './provider/email.provider.js';

@Module({
  imports: [IdentityModule, MailModule, SettingsModule],
  controllers: [RemindersController],
  providers: [ReminderPrefsService, EmailProvider, ChannelChooser, IdempotencyInterceptor],
})
export class NotificationsModule {}
