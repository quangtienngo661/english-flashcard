import { describe, expect, it } from 'vitest';
import { reminderLanguage, reminderMail, reminderSettingsUrl } from './reminder-message.js';

const appUrl = 'https://wordmet.example.com';

describe('reminder email (design 8.4)', () => {
  it('8.4: the vi regular reminder has subject "Tới giờ học từ vựng", names no word and ends with <learnerAppUrl>/vi/app/settings', () => {
    const mail = reminderMail('a@example.com', 'regular', 'vi', reminderSettingsUrl(appUrl, 'vi'), null);
    expect(mail.to).toBe('a@example.com');
    expect(mail.subject).toBe('Tới giờ học từ vựng');
    expect(mail.text.split('\n').at(-1)).toBe('Tắt nhắc học trong Cài đặt: https://wordmet.example.com/vi/app/settings');
    expect(mail.text.endsWith('https://wordmet.example.com/vi/app/settings')).toBe(true);
  });

  it('the en and inactive variants', () => {
    const settings = reminderSettingsUrl(appUrl, 'en');
    expect(settings).toBe('https://wordmet.example.com/en/app/settings');
    const regular = reminderMail('a@example.com', 'regular', 'en', settings, null);
    expect(regular.subject).toBe('Time to study your words');
    expect(regular.text.split('\n').at(-1)).toBe('Turn reminders off in Settings: https://wordmet.example.com/en/app/settings');
    expect(reminderMail('a@example.com', 'inactive', 'vi', reminderSettingsUrl(appUrl, 'vi'), null).subject).toBe('Đã lâu rồi bạn chưa vào học');
    const inactive = reminderMail('a@example.com', 'inactive', 'en', settings, null);
    expect(inactive.subject).toBe("It's been a while since you studied");
    expect(inactive.text.split('\n').at(-1)).toBe('Turn reminders off in Settings: https://wordmet.example.com/en/app/settings');
    // The four bodies differ from each other only by kind and language; none of them takes a word.
    expect(new Set([regular.text, inactive.text, reminderMail('x', 'regular', 'vi', 'u', null).text, reminderMail('x', 'inactive', 'vi', 'u', null).text]).size).toBe(4);
    expect(reminderMail.length).toBe(5);
  });

  it('a learner without native_language gets vi', () => {
    expect(reminderLanguage(null)).toBe('vi');
    expect(reminderLanguage('en')).toBe('en');
    expect(reminderLanguage('vi')).toBe('vi');
  });
});

describe('the streak line (round C, DC29)', () => {
  const settings = reminderSettingsUrl(appUrl, 'vi');

  it('vi: the first line is the streak line, then the usual body and the settings link', () => {
    const mail = reminderMail('a@example.com', 'regular', 'vi', settings, 12);
    expect(mail.text.split('\n')[0]).toBe('Bạn đang có chuỗi 12 ngày. Học hôm nay để giữ chuỗi.');
    expect(mail.text).toBe([
      'Bạn đang có chuỗi 12 ngày. Học hôm nay để giữ chuỗi.', '',
      'Hôm nay bạn còn từ cần ôn. Mở app để học vài phút nhé.', '',
      `Tắt nhắc học trong Cài đặt: ${settings}`,
    ].join('\n'));
  });

  it('en', () => {
    const mail = reminderMail('a@example.com', 'regular', 'en', reminderSettingsUrl(appUrl, 'en'), 12);
    expect(mail.text.split('\n')[0]).toBe("You're on a 12-day streak. Study today to keep it.");
  });

  it('the inactive reminder takes the line too; the subject does not change', () => {
    const mail = reminderMail('a@example.com', 'inactive', 'vi', settings, 3);
    expect(mail.text.split('\n')[0]).toBe('Bạn đang có chuỗi 3 ngày. Học hôm nay để giữ chuỗi.');
    expect(mail.subject).toBe('Đã lâu rồi bạn chưa vào học');
  });

  it('null leaves the mail exactly as before', () => {
    const mail = reminderMail('a@example.com', 'regular', 'vi', settings, null);
    expect(mail.text).toBe(`Hôm nay bạn còn từ cần ôn. Mở app để học vài phút nhé.\n\nTắt nhắc học trong Cài đặt: ${settings}`);
  });
});
