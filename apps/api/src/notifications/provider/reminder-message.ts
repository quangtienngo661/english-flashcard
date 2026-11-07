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

const COPY: Record<ReminderLanguage, Record<ReminderKind, { subject: string; body: string }> & { settings: string; streak: (days: number) => string }> = {
  vi: {
    regular: { subject: 'Tới giờ học từ vựng', body: 'Hôm nay bạn còn từ cần ôn. Mở app để học vài phút nhé.' },
    inactive: { subject: 'Đã lâu rồi bạn chưa vào học', body: 'Các từ của bạn vẫn đang chờ. Quay lại học vài phút nhé.' },
    settings: 'Tắt nhắc học trong Cài đặt',
    streak: (days) => `Bạn đang có chuỗi ${days} ngày. Học hôm nay để giữ chuỗi.`,
  },
  en: {
    regular: { subject: 'Time to study your words', body: 'You still have words to review today. Open the app for a few minutes.' },
    inactive: { subject: "It's been a while since you studied", body: 'Your words are still waiting. Come back for a few minutes.' },
    settings: 'Turn reminders off in Settings',
    streak: (days) => `You're on a ${days}-day streak. Study today to keep it.`,
  },
};

/**
 * Plain text, generic (design 8.4): names no word and ends with the settings link line. `streakDays` (round C, DC29) adds the
 * streak line first when the learner has a streak worth keeping; null leaves the mail as it was.
 */
export function reminderMail(
  to: string, kind: ReminderKind, language: ReminderLanguage, settingsUrl: string, streakDays: number | null,
): MailMessage {
  const copy = COPY[language];
  const streak = streakDays === null ? '' : `${copy.streak(streakDays)}\n\n`;
  return { to, subject: copy[kind].subject, text: `${streak}${copy[kind].body}\n\n${copy.settings}: ${settingsUrl}` };
}
