import { describe, expect, it } from 'vitest';
import { reminderLanguage, reminderMail, reminderSettingsUrl } from './reminder-message.js';

const appUrl = 'https://wordmet.example.com';

describe('reminder email (design 8.4)', () => {
  it('8.4: the vi regular reminder has subject "Tới giờ học từ vựng", names no word and ends with <learnerAppUrl>/vi/app/settings', () => {
    const mail = reminderMail('a@example.com', 'regular', 'vi', reminderSettingsUrl(appUrl, 'vi'));
    expect(mail.to).toBe('a@example.com');
    expect(mail.subject).toBe('Tới giờ học từ vựng');
    expect(mail.text.split('\n').at(-1)).toBe('Tắt nhắc học trong Cài đặt: https://wordmet.example.com/vi/app/settings');
    expect(mail.text.endsWith('https://wordmet.example.com/vi/app/settings')).toBe(true);
  });

  it('the en and inactive variants', () => {
    const settings = reminderSettingsUrl(appUrl, 'en');
    expect(settings).toBe('https://wordmet.example.com/en/app/settings');
    const regular = reminderMail('a@example.com', 'regular', 'en', settings);
    expect(regular.subject).toBe('Time to study your words');
    expect(regular.text.split('\n').at(-1)).toBe('Turn reminders off in Settings: https://wordmet.example.com/en/app/settings');
    expect(reminderMail('a@example.com', 'inactive', 'vi', reminderSettingsUrl(appUrl, 'vi')).subject).toBe('Đã lâu rồi bạn chưa vào học');
    const inactive = reminderMail('a@example.com', 'inactive', 'en', settings);
    expect(inactive.subject).toBe("It's been a while since you studied");
    expect(inactive.text.split('\n').at(-1)).toBe('Turn reminders off in Settings: https://wordmet.example.com/en/app/settings');
    // The four bodies differ from each other only by kind and language; none of them takes a word.
    expect(new Set([regular.text, inactive.text, reminderMail('x', 'regular', 'vi', 'u').text, reminderMail('x', 'inactive', 'vi', 'u').text]).size).toBe(4);
    expect(reminderMail.length).toBe(4);
  });

  it('a learner without native_language gets vi', () => {
    expect(reminderLanguage(null)).toBe('vi');
    expect(reminderLanguage('en')).toBe('en');
    expect(reminderLanguage('vi')).toBe('vi');
  });
});
