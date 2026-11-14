import { describe, expect, it } from 'vitest';
import { reminderLanguage, reminderMail, reminderSettingsUrl } from './reminder-message.js';

const APP = 'https://wordmet.example.com';
const lines = (text: string) => text.split('\n');

describe('reminder email', () => {
  it('vi regular with a streak: subject, chip, button to /vi/app, settings link, no word named', () => {
    const mail = reminderMail('a@example.com', 'regular', 'vi', APP, 12);
    expect(mail.to).toBe('a@example.com');
    expect(mail.subject).toBe('Tới giờ ôn từ');
    expect(mail.html).toContain('Chuỗi 12 ngày');
    expect(mail.html).toContain(`href="${APP}/vi/app"`);
    expect(lines(mail.text)).toContain(`Ôn ngay: ${APP}/vi/app`);
    expect(lines(mail.text)).toContain('Ôn hôm nay để giữ chuỗi 12 ngày. Vài phút là xong.');
    expect(mail.html).toContain(`href="${reminderSettingsUrl(APP, 'vi')}"`);
    expect(lines(mail.text)).toContain(`Tắt nhắc học trong Cài đặt: ${APP}/vi/app/settings`);
    expect(mail.html).toContain('<html lang="vi"');
  });

  it('en inactive: whole mail in English, /en links, English footer', () => {
    const mail = reminderMail('a@example.com', 'inactive', 'en', APP, null);
    expect(mail.subject).toBe('Your words are still waiting');
    expect(mail.html).toContain('<html lang="en"');
    expect(mail.html).toContain(`href="${APP}/en/app"`);
    expect(lines(mail.text)).toContain(`Open Wordmet: ${APP}/en/app`);
    expect(mail.html).toContain('Turn them off in Settings');
    expect(mail.html).toContain(`href="${APP}/en/privacy"`);
    expect(lines(mail.text)).toContain(`Turn reminders off in Settings: ${APP}/en/app/settings`);
    expect(mail.html).not.toContain('>English<');
  });

  it('the four subjects and bodies differ by kind and language', () => {
    const all = (['regular', 'inactive'] as const).flatMap((kind) => (['vi', 'en'] as const).map((lang) => reminderMail('a@x.test', kind, lang, APP, null)));
    expect(all.map((mail) => mail.subject)).toEqual(['Tới giờ ôn từ', 'Time to review your words', 'Các từ của bạn vẫn đang chờ', 'Your words are still waiting']);
    expect(new Set(all.map((mail) => mail.text)).size).toBe(4);
    expect(reminderMail.length).toBe(5);
  });

  it.each([null, 0])('streakDays %s: no chip and no streak sentence, in HTML and text, in both languages', (streak) => {
    for (const lang of ['vi', 'en'] as const) {
      const mail = reminderMail('a@example.com', 'regular', lang, APP, streak);
      for (const part of [mail.text, mail.html!]) expect(part).not.toMatch(/chuỗi|streak/i);
    }
    expect(lines(reminderMail('a@example.com', 'regular', 'vi', APP, null).text)).toContain('Ôn hôm nay. Vài phút là xong.');
    expect(lines(reminderMail('a@example.com', 'regular', 'en', APP, null).text)).toContain('Review today. A few minutes is enough.');
  });

  it('en regular with a streak and the inactive reminder with a streak keep the chip; the subject does not change', () => {
    const regular = reminderMail('a@example.com', 'regular', 'en', APP, 12);
    expect(regular.html).toContain('12-day streak');
    expect(lines(regular.text)).toContain('Review today to keep your 12-day streak. A few minutes is enough.');
    const inactive = reminderMail('a@example.com', 'inactive', 'vi', APP, 3);
    expect(inactive.html).toContain('Chuỗi 3 ngày');
    expect(inactive.subject).toBe('Các từ của bạn vẫn đang chờ');
  });

  it('the settings url stays a function of the app url and language', () => {
    expect(reminderSettingsUrl(APP, 'en')).toBe('https://wordmet.example.com/en/app/settings');
  });

  it('a learner without native_language gets vi', () => {
    expect(reminderLanguage(null)).toBe('vi');
    expect(reminderLanguage('en')).toBe('en');
    expect(reminderLanguage('vi')).toBe('vi');
  });
});
