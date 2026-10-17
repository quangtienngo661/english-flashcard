import type { MailMessage } from '../../common/mail/mailer.js';

export type ReminderKind = 'regular' | 'inactive';
export type ReminderLanguage = 'vi' | 'en';

/** The email language is the learner's native_language, vi when the profile has none. */
export function reminderLanguage(nativeLanguage: ReminderLanguage | null): ReminderLanguage {
  return nativeLanguage ?? 'vi';
}

/** The learner app's reminder settings page (G1, D39); the UI plan serves this path. */
export function reminderSettingsUrl(learnerAppUrl: string, language: ReminderLanguage): string {
  return `${learnerAppUrl}/${language}/app/settings`;
}

const COPY: Record<ReminderLanguage, Record<ReminderKind, { subject: string; body: string }> & { settings: string }> = {
  vi: {
    regular: { subject: 'Tới giờ học từ vựng', body: 'Hôm nay bạn còn từ cần ôn. Mở app để học vài phút nhé.' },
    inactive: { subject: 'Đã lâu rồi bạn chưa vào học', body: 'Các từ của bạn vẫn đang chờ. Quay lại học vài phút nhé.' },
    settings: 'Tắt nhắc học trong Cài đặt',
  },
  en: {
    regular: { subject: 'Time to study your words', body: 'You still have words to review today. Open the app for a few minutes.' },
    inactive: { subject: "It's been a while since you studied", body: 'Your words are still waiting. Come back for a few minutes.' },
    settings: 'Turn reminders off in Settings',
  },
};

/** Plain text, generic (design 8.4): names no word and ends with the settings link line. */
export function reminderMail(to: string, kind: ReminderKind, language: ReminderLanguage, settingsUrl: string): MailMessage {
  const copy = COPY[language];
  return { to, subject: copy[kind].subject, text: `${copy[kind].body}\n\n${copy.settings}: ${settingsUrl}` };
}
