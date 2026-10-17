import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { MailModule } from '../common/mail/mail.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { LearningModule } from '../learning/index.js';
import { SettingsModule } from '../settings/index.js';
import { ReminderPrefsService } from './prefs/reminder-prefs.service.js';
import { RemindersController } from './prefs/reminders.controller.js';
import { ChannelChooser } from './provider/channel-chooser.js';
import { EmailProvider } from './provider/email.provider.js';
import { ReminderQueueService } from './scheduler/reminder-queue.service.js';
import { ReminderSendService } from './scheduler/reminder-send.service.js';
import { ReminderTickService } from './scheduler/reminder-tick.service.js';

@Module({
  imports: [IdentityModule, LearningModule, MailModule, SettingsModule],
  controllers: [RemindersController],
  providers: [
    ReminderPrefsService, EmailProvider, ChannelChooser, IdempotencyInterceptor,
    ReminderQueueService, ReminderTickService, ReminderSendService,
  ],
})
export class NotificationsModule {}
