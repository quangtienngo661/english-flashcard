// Signs and sends fake-provider events to a RUNNING API through the real webhook (design §9.1; no test endpoint). The secret is
// BILLING_FAKE_SECRET (env, else .env). Import `sendFakeEvent` from a smoke script, or run it from the CLI:
//   pnpm billing:fake-event --type renewed --sub s1 --user <uuid> --tx t1 --interval month --period-start … --period-end …
// Options: --type --sub --user [--event-id] [--occurred-at] [--environment] [--interval] [--period-start] [--period-end]
//          [--trial-ends] [--fingerprint] [--tx] [--amount] [--grace-ends] [--get] [--bad-signature] [--base-url]
// Prints the HTTP status and body; exit code 0 only on a 2xx answer.
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function sign(secret, body) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

/** Sends one signed batch; `badSignature` signs with a random key instead. */
export async function sendFakeEvent({ baseUrl, secret, events, method = 'POST', badSignature = false }) {
  const body = Buffer.from(JSON.stringify({ events }));
  const key = badSignature ? randomBytes(32) : Buffer.from(secret, 'base64url');
  const signature = sign(key, body);
  const url = new URL('/v1/billing/webhooks/fake', baseUrl);
  let res;
  if (method === 'GET') {
    url.searchParams.set('payload', body.toString('base64url'));
    url.searchParams.set('signature', signature);
    res = await fetch(url);
  } else {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Fake-Signature': signature }, body });
  }
  const text = await res.text();
  let parsed = text;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, body: parsed };
}

const FIELDS = {
  'event-id': 'id',
  'occurred-at': 'occurred_at',
  environment: 'environment',
  sub: 'subscription_id',
  user: 'app_user_id',
  interval: 'interval',
  'period-start': 'current_period_start',
  'period-end': 'current_period_end',
  'trial-ends': 'trial_ends_at',
  fingerprint: 'payment_fingerprint',
  tx: 'transaction_id',
  'grace-ends': 'grace_ends_at',
};

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const name = argv[i].replace(/^--/, '');
    if (name === 'get' || name === 'bad-signature') flags[name] = true;
    else flags[name] = argv[(i += 1)];
  }
  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (!flags.type || !flags.sub || !flags.user) throw new Error('--type, --sub and --user are required');
  if (!process.env.BILLING_FAKE_SECRET && existsSync('.env')) process.loadEnvFile('.env');
  if (!process.env.BILLING_FAKE_SECRET) throw new Error('BILLING_FAKE_SECRET is not set (env or .env)');
  const event = { id: randomUUID(), type: flags.type, environment: 'sandbox', occurred_at: new Date().toISOString() };
  for (const [flag, field] of Object.entries(FIELDS)) if (flags[flag] !== undefined) event[field] = flags[flag];
  if (flags.amount !== undefined) event.amount = Number(flags.amount);
  const result = await sendFakeEvent({
    baseUrl: flags['base-url'] ?? process.env.SMOKE_BASE_URL ?? 'http://localhost:3000',
    secret: process.env.BILLING_FAKE_SECRET,
    events: [event],
    method: flags.get ? 'GET' : 'POST',
    badSignature: flags['bad-signature'] === true,
  });
  console.log(JSON.stringify({ event_id: event.id, status: result.status, body: result.body }));
  if (result.status < 200 || result.status >= 300) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err.message); process.exitCode = 1; });
}
