import { renderMail } from '../../common/mail/layout/render-mail.js';
import type { MailBlock } from '../../common/mail/layout/blocks.js';
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

type Copy = {
  subject: string;
  preheader: string;
  heading: string;
  /** The line under the heading; `streakDays` is only given when the learner has a streak worth keeping. */
  body: (streakDays: number | null) => string;
  button: string;
  chip: (days: number) => string;
};

const COPY: Record<ReminderLanguage, Record<ReminderKind, Copy>> = {
  vi: {
    regular: {
      subject: 'Tới giờ ôn từ', preheader: 'Vài phút là xong.', heading: 'Hôm nay còn từ cần ôn', button: 'Ôn ngay',
      body: (days) => days === null ? 'Ôn hôm nay. Vài phút là xong.' : `Ôn hôm nay để giữ chuỗi ${days} ngày. Vài phút là xong.`,
      chip: (days) => `Chuỗi ${days} ngày`,
    },
    inactive: {
      subject: 'Các từ của bạn vẫn đang chờ', preheader: 'Quay lại ôn vài phút.', heading: 'Các từ của bạn vẫn đang chờ', button: 'Mở Wordmet',
      body: () => 'Đã lâu bạn chưa vào học. Quay lại ôn vài phút.',
      chip: (days) => `Chuỗi ${days} ngày`,
    },
  },
  en: {
    regular: {
      subject: 'Time to review your words', preheader: 'A few minutes is enough.', heading: 'You have words to review today', button: 'Review now',
      body: (days) => days === null ? 'Review today. A few minutes is enough.' : `Review today to keep your ${days}-day streak. A few minutes is enough.`,
      chip: (days) => `${days}-day streak`,
    },
    inactive: {
      subject: 'Your words are still waiting', preheader: 'Come back for a few minutes.', heading: 'Your words are still waiting', button: 'Open Wordmet',
      body: () => 'It has been a while. Come back for a few minutes.',
      chip: (days) => `${days}-day streak`,
    },
  },
};

/**
 * HTML and text, generic (design 8.4): names no word. `streakDays` (round C, DC29) adds the streak chip when the learner has a streak worth
 * keeping; null or 0 leaves it out. `learnerAppUrl` is the app origin: the button and the settings link are built from it and the language.
 */
export function reminderMail(
  to: string, kind: ReminderKind, language: ReminderLanguage, learnerAppUrl: string, streakDays: number | null,
): MailMessage {
  const copy = COPY[language][kind];
  const streak = streakDays !== null && streakDays > 0 ? streakDays : null;
  const blocks: MailBlock[] = [
    ...(streak === null ? [] : [{ kind: 'chip', text: copy.chip(streak) } as const]),
    { kind: 'heading', text: copy.heading },
    { kind: 'paragraph', parts: [copy.body(streak)] },
    { kind: 'button', label: copy.button, href: `${learnerAppUrl}/${language}/app` },
  ];
  const { html, text } = renderMail({
    language, preheader: copy.preheader, blocks, footer: { kind: 'reminder', settingsUrl: reminderSettingsUrl(learnerAppUrl, language) }, appUrl: learnerAppUrl,
  });
  return { to, subject: copy.subject, text, html };
}
