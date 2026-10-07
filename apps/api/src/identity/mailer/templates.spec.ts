import { describe, expect, it } from 'vitest';
import { FakeMailer } from './fake-mailer.js';
import { otpMail, otpLockedMail, passwordChangedMail, passwordResetMail } from './templates.js';

describe('Mail templates and FakeMailer', () => {
  it.each(['verify_email', 'reset_password'] as const)('B1#4/B1#5: %s OTP mail is bilingual and preserves leading zeroes', async (purpose) => {
    const mailer = new FakeMailer();
    const message = otpMail('a@example.com', purpose, '012345');
    expect(message.to).toBe('a@example.com');
    expect(message.text).toContain('012345');
    expect(message.text).toMatch(/10 phút/);
    expect(message.text).toMatch(/10 minutes/);
    expect(message.subject).toMatch(purpose === 'verify_email' ? /Verify/ : /Reset/);
    await mailer.send(message);
    expect(mailer.otpFor('a@example.com')).toBe('012345');
    expect(mailer.otpFor('other@example.com')).toBeUndefined();
    await mailer.send(otpMail('a@example.com', purpose, '654321'));
    await mailer.send(passwordChangedMail('a@example.com'));
    expect(mailer.otpFor('a@example.com')).toBe('654321');
  });

  it('B1#22/B1#23/B1#10: security notifications contain Vietnamese and English for each purpose', () => {
    const changed = passwordChangedMail('a@example.com');
    const reset = passwordResetMail('a@example.com');
    expect(changed.text).toMatch(/mật khẩu/);
    expect(changed.text).toMatch(/password.*changed/i);
    expect(reset.text).toMatch(/mật khẩu/);
    expect(reset.text).toMatch(/password.*reset/i);
    for (const purpose of ['verify_email', 'reset_password'] as const) {
      const locked = otpLockedMail('a@example.com', purpose);
      expect(locked.text).toMatch(/24 giờ/);
      expect(locked.text).toMatch(/24 hours/);
      expect(locked.text).toMatch(purpose === 'verify_email' ? /email verification/i : /password reset/i);
    }
    expect(otpLockedMail('a@example.com', 'verify_email').text)
      .not.toBe(otpLockedMail('a@example.com', 'reset_password').text);
  });

  it('B1E16/IE6: failNext affects only the next send and failed messages are not recorded', async () => {
    const mailer = new FakeMailer();
    const message = otpMail('a@example.com', 'verify_email', '123456');
    const error = new Error('SMTP failed');
    mailer.failNext(error);
    await expect(mailer.send(message)).rejects.toBe(error);
    expect(mailer.sent).toEqual([]);
    await mailer.send(message);
    expect(mailer.sent).toEqual([message]);
    mailer.failNext();
    await expect(mailer.send(message)).rejects.toBeInstanceOf(Error);
  });
});
