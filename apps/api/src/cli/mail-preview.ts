import { existsSync } from 'node:fs';
import { SmtpMailer } from '../common/mail/smtp-mailer.js';
import type { AppConfig } from '../common/config/app-config.js';
import { isLocalSmtpHost, mailPreviewSamples } from './mail-preview-samples.js';

// `pnpm mail:preview [address]`: sends the 17 sample emails to a local mail server (Mailpit, http://localhost:8025) to look at them in a real
// mail client view. It needs no database and not the whole API environment: only SMTP_HOST / SMTP_PORT / SMTP_FROM (defaults: localhost, 1025,
// no-reply@localhost) and the app URLs. Exit 1 when SMTP_HOST is not this machine, so sample mail never goes through a real provider.
async function main(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const env = process.env;
  const host = env.SMTP_HOST ?? 'localhost';
  if (!isLocalSmtpHost(host)) {
    console.error(`mail:preview only sends to a local mail server; SMTP_HOST is "${host}". Use Mailpit (SMTP_HOST=localhost, SMTP_PORT=1025).`);
    process.exitCode = 1;
    return;
  }
  const to = process.argv[2] ?? 'preview@example.com';
  const mailer = new SmtpMailer({ smtp: { host, port: Number(env.SMTP_PORT ?? 1025), from: env.SMTP_FROM ?? 'no-reply@localhost', secure: false } } as AppConfig);
  const samples = mailPreviewSamples({
    to, learnerAppUrl: env.LEARNER_APP_URL ?? 'http://localhost:3001', adminAppUrl: env.ADMIN_APP_URL ?? 'http://localhost:5173',
    supportEmail: env.SUPPORT_EMAIL ?? 'support@wordmet.com',
  });
  let sent = 0;
  for (const mail of samples) {
    await mailer.send(mail);
    sent += 1;
  }
  console.log(`sent ${sent}/${samples.length} to ${to}; open http://localhost:8025`);
}

try {
  await main();
} catch (error) {
  console.error('mail:preview failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
