import nodemailer from 'nodemailer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testConfig } from '../../../test/support/test-config.js';
import { SmtpMailer } from './smtp-mailer.js';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));

describe('SmtpMailer', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it.each([false, true])('B1E34: uses SMTP config and separate 10-second phase timeouts (secure=%s)', async (secure) => {
    const sendMail = vi.fn(async () => ({}));
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as unknown as ReturnType<typeof nodemailer.createTransport>);
    const smtp = { host: 'smtp.example.com', port: 465, secure, from: 'sender@example.com', user: 'user', pass: 'private' };
    const mailer = new SmtpMailer(testConfig({ smtp }));
    const message = { to: 'to@example.com', subject: 'test', text: 'body' };
    await mailer.send(message);
    expect(nodemailer.createTransport).toHaveBeenCalledExactlyOnceWith({
      host: smtp.host, port: smtp.port, secure, auth: { user: smtp.user, pass: smtp.pass },
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 10_000,
    });
    expect(sendMail).toHaveBeenCalledExactlyOnceWith({ from: smtp.from, ...message });
  });

  it('B1E34: omits authentication for local SMTP and propagates transport failures', async () => {
    const error = new Error('private SMTP error');
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail: vi.fn().mockRejectedValue(error) } as unknown as ReturnType<typeof nodemailer.createTransport>);
    const mailer = new SmtpMailer(testConfig());
    expect(vi.mocked(nodemailer.createTransport).mock.calls[0][0]).not.toHaveProperty('auth');
    await expect(mailer.send({ to: 'a@example.com', subject: 'test', text: 'body' })).rejects.toBe(error);
  });
});
