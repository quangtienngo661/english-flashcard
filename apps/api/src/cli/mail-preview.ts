import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AppConfig } from '../common/config/app-config.js';
import { SmtpMailer } from '../common/mail/smtp-mailer.js';
import { isLocalSmtpHost, mailPreviewSamples } from './mail-preview-samples.js';

export type MailPreviewArgs = {
  positionalTo: string | null;
  allowRemoteTo: string | null;
  allLocales: boolean;
};

export type MailPreviewTarget =
  | { ok: true; to: string; remote: boolean }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseMailPreviewArgs(argv: string[]): MailPreviewArgs {
  let positionalTo: string | null = null;
  let allowRemoteTo: string | null = null;
  let allLocales = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--all-locales') {
      allLocales = true;
    } else if (arg === '--allow-remote-to') {
      allowRemoteTo = argv[i + 1] ?? '';
      i += 1;
    } else if (arg.startsWith('--allow-remote-to=')) {
      allowRemoteTo = arg.slice('--allow-remote-to='.length);
    } else if (!arg.startsWith('-') && positionalTo === null) {
      positionalTo = arg;
    }
  }
  return { positionalTo, allowRemoteTo, allLocales };
}

export function resolveMailPreviewTarget(host: string, args: MailPreviewArgs): MailPreviewTarget {
  const local = isLocalSmtpHost(host);
  if (args.allowRemoteTo !== null) {
    const allowed = args.allowRemoteTo.trim();
    if (!EMAIL_PATTERN.test(allowed)) {
      return { ok: false, error: '--allow-remote-to requires a valid single email address.' };
    }
    if (args.positionalTo !== null && args.positionalTo.trim() !== allowed) {
      return { ok: false, error: `Refused: target "${args.positionalTo}" does not match --allow-remote-to "${allowed}".` };
    }
    return { ok: true, to: allowed, remote: !local };
  }
  if (!local) {
    return {
      ok: false,
      error: `mail:preview only sends to a local mail server; SMTP_HOST is "${host}". Use Mailpit (SMTP_HOST=localhost, SMTP_PORT=1025) or pass --allow-remote-to <email>.`,
    };
  }
  return { ok: true, to: args.positionalTo ?? 'preview@example.com', remote: false };
}

// `pnpm mail:preview [address] [--all-locales] [--allow-remote-to <email>]`: sends sample emails to Mailpit (default) or,
// when `--allow-remote-to <email>` is explicitly passed (D5), to that exact single allowlisted address via configured SMTP.
// Needs no database and never touches real users.
async function main(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const env = process.env;
  const host = env.SMTP_HOST ?? 'localhost';
  const args = parseMailPreviewArgs(process.argv.slice(2));
  const target = resolveMailPreviewTarget(host, args);
  if (!target.ok) {
    console.error(target.error);
    process.exitCode = 1;
    return;
  }
  const smtp = target.remote
    ? {
      host,
      port: Number(env.SMTP_PORT ?? 465),
      from: env.SMTP_FROM ?? 'no-reply@wordmet.com',
      secure: env.SMTP_SECURE === 'true' || Number(env.SMTP_PORT ?? 465) === 465,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    }
    : {
      host,
      port: Number(env.SMTP_PORT ?? 1025),
      from: env.SMTP_FROM ?? 'no-reply@localhost',
      secure: false,
    };
  const mailer = new SmtpMailer({ smtp } as AppConfig);
  const samples = mailPreviewSamples({
    to: target.to,
    learnerAppUrl: env.LEARNER_APP_URL ?? 'http://localhost:3001',
    adminAppUrl: env.ADMIN_APP_URL ?? 'http://localhost:5173',
    supportEmail: env.SUPPORT_EMAIL ?? 'support@wordmet.com',
    allLocales: args.allLocales,
  });
  let sent = 0;
  for (const mail of samples) {
    if (mail.to !== target.to) {
      throw new Error(`Refused to send to non-allowlisted recipient "${mail.to}"`);
    }
    await mailer.send(mail);
    sent += 1;
  }
  console.log(target.remote
    ? `sent ${sent}/${samples.length} to allowlisted recipient ${target.to} via ${host}`
    : `sent ${sent}/${samples.length} to ${target.to}; open http://localhost:8025`);
}

function isDirectEntry(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectEntry()) {
  try {
    await main();
  } catch (error) {
    console.error('mail:preview failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
