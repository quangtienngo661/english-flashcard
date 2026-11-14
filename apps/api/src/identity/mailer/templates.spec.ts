import { describe, expect, it } from 'vitest';
import { FakeMailer } from '../../common/mail/fake-mailer.js';
import {
  accountDeletedMail, accountExistsMail, adminPasswordResetMail, emailChangedConfirmMail, emailChangedNoticeMail, googleLinkedMail, learnerAccountMail,
  otpLockedMail, otpMail, passwordChangedMail, passwordResetMail, staffAccountMail,
} from './templates.js';

const APP = 'http://localhost:3001';
const ADMIN = 'http://localhost:5173';
const FIRST_CODE = /\b\d{6}\b/;

/** Every mail of this file is a bilingual HTML mail with a text twin; the HTML keeps the links the text names. */
function expectBilingualHtml(message: { html?: string; text: string }) {
  expect(message.html).toBeDefined();
  expect(message.html).toContain('>English<');
  expect(message.html).toContain('<html lang="vi"');
}

describe('#1 #2 otp mail', () => {
  it('verify_email: subject, code only in the body, no button, English part', () => {
    const message = otpMail('a@example.com', 'verify_email', '482915', APP);
    expect(message.to).toBe('a@example.com');
    expect(message.subject).toBe('Mã xác minh Wordmet / Your Wordmet code');
    expect(message.text.match(FIRST_CODE)?.[0]).toBe('482915');
    expect(message.subject).not.toContain('482915');
    expect(message.html!.split('482915')).toHaveLength(2);
    expect(message.html).toContain('Xác minh email');
    expect(message.html).not.toContain('class="wm-btn"');
    expect(message.text).toContain('10 phút');
    expect(message.text).toContain('10 minutes');
    expectBilingualHtml(message);
  });
  it('reset_password: subject and the line that the password stays the same', () => {
    const message = otpMail('a@example.com', 'reset_password', '482915', APP);
    expect(message.subject).toBe('Mã đặt lại mật khẩu Wordmet / Your Wordmet reset code');
    expect(message.text.match(FIRST_CODE)?.[0]).toBe('482915');
    expect(message.text).toContain('mật khẩu không đổi');
    expect(message.text).toContain('your password stays the same');
    expectBilingualHtml(message);
  });
  it.each(['verify_email', 'reset_password'] as const)('B1#4/B1#5: %s keeps leading zeroes and FakeMailer.otpFor finds the newest code', async (purpose) => {
    const mailer = new FakeMailer();
    await mailer.send(otpMail('a@example.com', purpose, '012345', APP));
    expect(mailer.otpFor('a@example.com')).toBe('012345');
    expect(mailer.otpFor('other@example.com')).toBeUndefined();
    await mailer.send(otpMail('a@example.com', purpose, '654321', APP));
    await mailer.send(passwordChangedMail('a@example.com', APP));
    expect(mailer.otpFor('a@example.com')).toBe('654321');
  });
  it('B1E16/IE6: failNext affects only the next send and failed messages are not recorded', async () => {
    const mailer = new FakeMailer();
    const message = otpMail('a@example.com', 'verify_email', '123456', APP);
    const error = new Error('SMTP failed');
    mailer.failNext(error);
    await expect(mailer.send(message)).rejects.toBe(error);
    expect(mailer.sent).toEqual([]);
    await mailer.send(message);
    expect(mailer.sent).toEqual([message]);
  });
});

describe('#3 locked mail', () => {
  it('names the locked thing in both languages and the 24 hours', () => {
    const verify = otpLockedMail('a@example.com', 'verify_email', APP);
    expect(verify.subject).toBe('Tạm khóa nhập mã Wordmet / Wordmet codes locked');
    expect(verify.text).toContain('xác minh email');
    expect(verify.text).toContain('email verification');
    const reset = otpLockedMail('a@example.com', 'reset_password', APP);
    expect(reset.text).toContain('đặt lại mật khẩu');
    expect(reset.text).toContain('password reset');
    for (const message of [verify, reset]) {
      expect(message.text).toContain('24 giờ');
      expect(message.text).toContain('24 hours');
      expectBilingualHtml(message);
    }
    expect(verify.text).not.toBe(reset.text);
  });
});

describe('#4 #5 #7 security mails with a reset-password button', () => {
  const forgot = `${APP}/vi/app/forgot-password`;
  it.each([
    ['#4 changed', () => passwordChangedMail('a@example.com', APP), 'Mật khẩu Wordmet đã đổi / Your Wordmet password was changed', /password.*changed/i],
    ['#5 reset', () => passwordResetMail('a@example.com', APP), 'Mật khẩu Wordmet đã đặt lại / Your Wordmet password was reset', /password.*reset/i],
    ['#7 google linked', () => googleLinkedMail('a@example.com', APP), 'Đã liên kết Google với Wordmet / Google linked to Wordmet', /Change your password now/],
  ])('%s: subject, one button to Forgot password, English twin', (_name, build, subject, english) => {
    const message = build();
    expect(message.to).toBe('a@example.com');
    expect(message.subject).toBe(subject);
    expect(message.html).toContain(`href="${forgot}"`);
    expect(message.text.split('\n')).toContain(`Đặt lại mật khẩu: ${forgot}`);
    expect(message.text).toMatch(english);
    expect(message.text).toContain('Không phải bạn');
    expectBilingualHtml(message);
  });
  it('#7: the subject still matches the smoke script pattern (liên kết|linked)', () => {
    expect(googleLinkedMail('a@example.com', APP).subject).toMatch(/liên kết|linked/i);
  });
});

describe('#6 account exists mail', () => {
  it('subject, sign-in button, Forgot password hint and no code', () => {
    const message = accountExistsMail('a@example.com', APP);
    expect(message.subject).toBe('Bạn đã có tài khoản Wordmet / You already have a Wordmet account');
    expect(message.html).toContain(`href="${APP}/vi/app/login"`);
    expect(message.text.split('\n')).toContain(`Đăng nhập: ${APP}/vi/app/login`);
    for (const part of ['đã có tài khoản Wordmet', 'Quên mật khẩu', 'Forgot password', 'Someone just signed up']) expect(message.text).toContain(part);
    expect(message.text).not.toMatch(FIRST_CODE);
    expectBilingualHtml(message);
  });
});

describe('#8 account deleted mail', () => {
  it('years of retention in both languages, subject matches the smoke pattern, no "why you got this" footer', () => {
    const message = accountDeletedMail('a@example.com', 7, APP);
    expect(message.subject).toBe('Tài khoản Wordmet đã xóa / Your Wordmet account was deleted');
    expect(message.subject).toMatch(/đã được xóa|was deleted/i);
    expect(message.text).toContain('đã được xóa');
    expect(message.text).toContain('has been deleted');
    expect(message.text).toContain('7 năm');
    expect(message.text).toContain('7 years');
    expect(message.text).not.toContain('Bạn nhận thư này');
    expectBilingualHtml(message);
  });
});

describe('#9 #10 #11 mails that carry a password', () => {
  const PASSWORD = 'Kp7#<wQ&';
  it('#9 learner account: the password line the tools read, escaped in HTML, one login button', () => {
    const message = learnerAccountMail('a@example.com', PASSWORD, APP, true);
    expect(message.subject).toBe('Tài khoản Wordmet của bạn / Your Wordmet account');
    expect(message.text.split('\n')).toContain(`Mật khẩu tạm / Password: ${PASSWORD}`);
    expect(/Password: (\S+)/.exec(message.text)![1]).toBe(PASSWORD);
    expect(message.html).toContain('Kp7#&lt;wQ&amp;');
    expect(message.html).toContain(`href="${APP}/vi/app/login"`);
    expectBilingualHtml(message);
  });
  it('#10 staff account: the button goes to the admin app', () => {
    const message = staffAccountMail('a@example.com', 'Pw-Secret-1234!', ADMIN, true, APP);
    expect(message.subject).toBe('Tài khoản quản trị Wordmet / Your Wordmet admin account');
    expect(message.html).toContain(`href="${ADMIN}"`);
    expect(message.text.split('\n')).toContain(`Mở trang quản trị: ${ADMIN}`);
    expect(/Password: (\S+)/.exec(message.text)![1]).toBe('Pw-Secret-1234!');
    expectBilingualHtml(message);
  });
  it('#11 admin reset: new password line; the button is the learner login for a learner and the admin url for staff', () => {
    const learner = adminPasswordResetMail('a@example.com', PASSWORD, APP, true, APP);
    expect(learner.subject).toBe('Mật khẩu Wordmet đã đặt lại / Your Wordmet password was reset');
    expect(learner.text.split('\n')).toContain(`Mật khẩu mới / New password: ${PASSWORD}`);
    expect(learner.html).toContain(`href="${APP}/vi/app/login"`);
    const staff = adminPasswordResetMail('a@example.com', PASSWORD, ADMIN, true, APP);
    expect(staff.html).toContain(`href="${ADMIN}"`);
    expect(staff.html).not.toContain(`href="${APP}/vi/app/login"`);
    expectBilingualHtml(learner);
  });
  it.each([
    ['#9', (must: boolean) => learnerAccountMail('a@example.com', 'pw', APP, must)],
    ['#10', (must: boolean) => staffAccountMail('a@example.com', 'pw', ADMIN, must, APP)],
    ['#11', (must: boolean) => adminPasswordResetMail('a@example.com', 'pw', APP, must, APP)],
  ])('%s: the forced password change is mentioned only when asked, in HTML and text', (_name, build) => {
    const forced = build(true);
    expect(forced.text).toMatch(/đổi mật khẩu/);
    expect(forced.text).toMatch(/change (the|it) /i);
    expect(forced.html).toMatch(/đổi mật khẩu/);
    const free = build(false);
    for (const part of [free.text, free.html!]) {
      expect(part).not.toMatch(/đổi mật khẩu/);
      expect(part).not.toMatch(/change (the|it) /i);
    }
  });
});

describe('#12 #13 email changed mails', () => {
  it('#12 goes to the old address, names the new one and the support address', () => {
    const message = emailChangedNoticeMail('old@example.com', 'new@example.com', APP, 'help@example.com');
    expect(message.to).toBe('old@example.com');
    expect(message.subject).toBe('Email đăng nhập Wordmet đã đổi / Your Wordmet email was changed');
    expect(message.text.split('\n')).toContain('Email mới / New email: new@example.com');
    expect(message.html).toContain('href="mailto:help@example.com"');
    expect(message.text).toContain('help@example.com');
    expectBilingualHtml(message);
  });
  it('#13 goes to the new address with a login button and the Forgot password hint', () => {
    const message = emailChangedConfirmMail('new@example.com', APP);
    expect(message.to).toBe('new@example.com');
    expect(message.subject).toBe('Xác nhận email Wordmet mới / Confirm your new Wordmet email');
    expect(message.html).toContain(`href="${APP}/vi/app/login"`);
    expect(message.text).toContain('Quên mật khẩu');
    expect(message.text).toContain('Forgot password');
    expectBilingualHtml(message);
  });
});
