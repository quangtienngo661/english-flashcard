import { describe, expect, it } from 'vitest';
import { isLocalSmtpHost, mailPreviewSamples } from './mail-preview-samples.js';

const options = { to: 'a@x.test', learnerAppUrl: 'http://localhost:3001', adminAppUrl: 'http://localhost:5173', supportEmail: 'support@wordmet.com' };

describe('mailPreviewSamples', () => {
  const samples = mailPreviewSamples(options);

  it('builds the 17 shipped emails, every one for the given address, with an html part and a text twin', () => {
    expect(samples).toHaveLength(17);
    for (const mail of samples) {
      expect(mail.to, mail.subject).toBe('a@x.test');
      expect(mail.html, mail.subject).toContain('<html');
      expect(mail.text.length, mail.subject).toBeGreaterThan(20);
    }
  });

  it('covers every kind: the code mail, the password mails, the reminders in both languages, the receipt and the expiry notice', () => {
    const subjects = samples.map((mail) => mail.subject);
    for (const expected of ['Mã xác minh Wordmet / Your Wordmet code', 'Tài khoản quản trị Wordmet / Your Wordmet admin account',
      'Tới giờ ôn từ', 'Your words are still waiting', 'Biên nhận mua Wordmet Pro', 'Your Wordmet Pro plan ends soon']) {
      expect(subjects, expected).toContain(expected);
    }
    expect(samples.find((mail) => mail.subject.startsWith('Mã xác minh'))!.text).toMatch(/\b482915\b/);
  });
});

describe('isLocalSmtpHost', () => {
  it.each(['localhost', '127.0.0.1', '::1'])('%s is local', (host) => expect(isLocalSmtpHost(host)).toBe(true));
  it.each(['smtp.resend.com', 'mail.example.com', 'localhost.evil.com'])('%s is refused so sample mail never leaves the machine', (host) => {
    expect(isLocalSmtpHost(host)).toBe(false);
  });
});
