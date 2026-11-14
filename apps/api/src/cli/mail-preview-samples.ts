import type { MailMessage } from '../common/mail/mailer.js';
import { entitlementMail } from '../entitlements/notices/entitlement-mail.js';
import { reminderMail } from '../notifications/provider/reminder-message.js';
import {
  accountDeletedMail, accountExistsMail, adminPasswordResetMail, emailChangedConfirmMail, emailChangedNoticeMail, googleLinkedMail, learnerAccountMail,
  otpLockedMail, otpMail, passwordChangedMail, passwordResetMail, staffAccountMail,
} from '../identity/mailer/templates.js';

export type MailPreviewOptions = { to: string; learnerAppUrl: string; adminAppUrl: string; supportEmail: string };

/** Only a mail server on this machine (Mailpit) may receive sample mail. */
export function isLocalSmtpHost(host: string): boolean {
  return ['localhost', '127.0.0.1', '::1'].includes(host);
}

/** The 17 emails Wordmet sends, with the example data of the mockup (Lan, code 482915, a 3-month receipt), all addressed to `to`. */
export function mailPreviewSamples({ to, learnerAppUrl: app, adminAppUrl, supportEmail }: MailPreviewOptions): MailMessage[] {
  const periodEnd = new Date('2027-02-13T17:00:00.000Z');
  const mail = (kind: 'payment_receipt' | 'expiry_notice', language: 'vi' | 'en'): MailMessage => ({
    to,
    ...entitlementMail(kind, language, {
      periodEnd, timeZone: 'Asia/Ho_Chi_Minh', appUrl: app, plansUrl: `${app}/${language}/app/plans`, supportEmail,
      receipt: { months: 3, amountMinor: 249000, description: 'WM7K2Q9X', reference: 'FT26318004512', startsAt: new Date('2026-11-14T03:00:00.000Z'), endsAt: periodEnd },
    }),
  });
  return [
    otpMail(to, 'verify_email', '482915', app),
    otpMail(to, 'reset_password', '482915', app),
    otpLockedMail(to, 'verify_email', app),
    passwordChangedMail(to, app),
    passwordResetMail(to, app),
    accountExistsMail(to, app),
    googleLinkedMail(to, app),
    accountDeletedMail(to, 10, app),
    learnerAccountMail(to, 'Kp7#wQ2m9xLr', app, true),
    staffAccountMail(to, 'Kp7#wQ2m9xLr', adminAppUrl, true, app),
    adminPasswordResetMail(to, 'Kp7#wQ2m9xLr', app, true, app),
    emailChangedNoticeMail(to, 'lan.work@example.com', app, supportEmail),
    emailChangedConfirmMail(to, app),
    reminderMail(to, 'regular', 'vi', app, 12),
    reminderMail(to, 'inactive', 'en', app, null),
    mail('payment_receipt', 'vi'),
    mail('expiry_notice', 'en'),
  ];
}
