import nodemailer from 'nodemailer';
import { describe, expect, it } from 'vitest';
import { listMailpitMessages, startMailpit } from './support/mailpit.js';

describe('Mailpit container', () => {
  it('mailpit accepts SMTP and exposes the message over its API', async () => {
    const mailpit = await startMailpit();
    const transport = nodemailer.createTransport({
      host: mailpit.smtpHost,
      port: mailpit.smtpPort,
      secure: false,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });

    try {
      await transport.sendMail({
        from: 'no-reply@localhost',
        to: 'a@example.com',
        subject: 'ping',
        text: 'hello from SMTP',
      });

      expect(await listMailpitMessages(mailpit.apiUrl)).toEqual([
        expect.objectContaining({
          to: 'a@example.com',
          subject: 'ping',
          text: expect.stringContaining('hello from SMTP'),
        }),
      ]);
    } finally {
      transport.close();
      await mailpit.stop();
    }
  }, 60_000);
});
