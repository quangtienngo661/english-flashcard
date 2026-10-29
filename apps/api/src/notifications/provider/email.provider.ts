import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { MailBudget, REMINDER_MAIL_SHARE } from '../../common/mail/mail-budget.service.js';
import { Mailer } from '../../common/mail/mailer.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { NotificationProvider, NotSentError, type NotificationOutcome, type ReminderKind } from './notification-provider.js';
import { reminderMail, reminderSettingsUrl, type ReminderLanguage } from './reminder-message.js';

@Injectable()
export class EmailProvider extends NotificationProvider {
  readonly channel = 'email' as const;

  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(MailBudget) private readonly budget: MailBudget,
    @Inject(Mailer) private readonly mailer: Mailer,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    super();
  }

  async send(userId: string, message: { kind: ReminderKind; language: ReminderLanguage }): Promise<NotificationOutcome> {
    let to: string | undefined;
    try {
      to = (await this.identity.verifiedEmails([userId])).get(userId);
      if (to === undefined) return 'no-address';
      // Reminders may use only their share of the daily budget; the rest stays for OTP (D24).
      if (!await this.budget.tryConsume({ ceiling: REMINDER_MAIL_SHARE })) return 'budget-exhausted';
    } catch (error) {
      // Nothing reached the mail server: the caller may retry (B3-3). Only an error from `mailer.send` below says "unknown".
      throw new NotSentError(error);
    }
    const settingsUrl = reminderSettingsUrl(this.config.learnerAppUrl, message.language);
    await this.mailer.send(reminderMail(to, message.kind, message.language, settingsUrl));
    return 'sent';
  }
}
