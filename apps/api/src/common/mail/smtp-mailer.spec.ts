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

  it('passes html with text so nodemailer sends multipart/alternative', async () => {
    const sendMail = vi.fn(async () => ({}));
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as unknown as ReturnType<typeof nodemailer.createTransport>);
    const mailer = new SmtpMailer(testConfig({ smtp: { host: 'h', port: 25, secure: false, from: 'sender@example.com' } }));
    const message = { to: 'to@example.com', subject: 'test', text: 'body', html: '<p>body</p>' };
    await mailer.send(message);
    expect(sendMail).toHaveBeenCalledExactlyOnceWith({ from: 'sender@example.com', to: 'to@example.com', subject: 'test', text: 'body', html: '<p>body</p>' });
  });

  it('builds a message with both a text/plain and a text/html part', async () => {
    const real = await vi.importActual<typeof import('nodemailer')>('nodemailer');
    const transport = real.default.createTransport({ streamTransport: true, buffer: true });
    const info = await transport.sendMail({ from: 'a@example.com', to: 'b@example.com', subject: 's', text: 'plain body', html: '<p>html body</p>' });
    const raw = (info as unknown as { message: Buffer }).message.toString('utf8');
    expect(raw).toContain('multipart/alternative');
    expect(raw).toContain('text/plain');
    expect(raw).toContain('text/html');
  });
});
