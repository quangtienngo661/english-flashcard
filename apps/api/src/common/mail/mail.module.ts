import { Module } from '@nestjs/common';
import { MailBudget } from './mail-budget.service.js';
import { MailDispatcher } from './mail-dispatcher.service.js';
import { Mailer } from './mailer.js';
import { SmtpMailer } from './smtp-mailer.js';

/** Mail sending and the shared daily budget: infrastructure used by Identity (OTP) and Notifications (reminders). */
@Module({
  providers: [{ provide: Mailer, useClass: SmtpMailer }, MailBudget, MailDispatcher],
  exports: [Mailer, MailBudget, MailDispatcher],
})
export class MailModule {}
