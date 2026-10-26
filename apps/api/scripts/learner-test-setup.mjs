// Test data for the learner app (design "Giao diện người học" §11 point 4; plan Task 11) against a REAL running API + worker.
// Start them first: `docker compose up -d` (repo root), then `pnpm build && pnpm run:dev` (this package) with AI_FAKE_ENABLED=true and
// BILLING_FAKE_ENABLED=true, then from apps/api:
//   pnpm learner:setup -- --admin <email> --learner <email> [--plan pro|trial] [--transactions]
// It makes sure both accounts exist and are verified (OTP from Mailpit), the admin is admin (dist/cli/admin-grant.js), the learner
// has native_language vi; creates the five topics and the level source, imports and publishes fixtures/learner-sample.csv; adds the
// fake model fake:ok and chooses it for every AI operation; then grants Pro or starts a fake trial. Safe to run again: what exists is
// kept. Local test accounts only: both use the fixed password below.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { sendFakeEvent } from './billing-fake-event.mjs';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Learner-Test-Pass-9!';
const CSV_NAME = 'learner-sample.csv';
const CSV_PATH = new URL(`./fixtures/${CSV_NAME}`, import.meta.url);
const SOURCE = { name: 'Wordmet learner sample', version: '1.0', license: 'test data written for Wordmet', display_priority: 90 };
const TOPICS = [
  { code: 'technology', names: { vi: 'Công nghệ', en: 'Technology' } },
  { code: 'business', names: { vi: 'Kinh doanh', en: 'Business' } },
  { code: 'food', names: { vi: 'Ẩm thực', en: 'Food' } },
  { code: 'daily-life', names: { vi: 'Đời sống hằng ngày', en: 'Daily life' } },
  { code: 'travel', names: { vi: 'Du lịch', en: 'Travel' } },
];
// src/ai/ai.types.ts AI_OPERATIONS: the five smoke-buoc-7 chooses plus translate_sentence (plan Task 11: six operations).
const AI_OPERATIONS = ['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq',
  'check_private_word'];
const DAY = 24 * 3_600_000;

// ---------------------------------------------------------------------------------------------------------------------
// Arguments and environment.
function parseArgs(argv) {
  const flags = { plan: null, transactions: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') continue; // `pnpm learner:setup -- …` passes the separator through
    if (arg === '--transactions') flags.transactions = true;
    else if (['--admin', '--learner', '--plan'].includes(arg)) flags[arg.slice(2)] = argv[(i += 1)];
    else throw new Error(`Unknown argument ${arg}`);
  }
  if (!flags.admin || !flags.learner) throw new Error('--admin <email> and --learner <email> are required');
  if (flags.admin.toLowerCase() === flags.learner.toLowerCase()) throw new Error('--admin and --learner must be different emails');
  if (flags.plan !== null && flags.plan !== 'pro' && flags.plan !== 'trial') throw new Error('--plan must be pro or trial');
  return flags;
}

const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
const envValue = (key) => process.env[key] ?? fileEnv[key];

let stepNo = 0;
function step(name) { stepNo += 1; console.log(`\n[${stepNo}] ${name}`); }
function ok(detail) { console.log(`    ok — ${detail}`); }
function check(condition, message) { if (!condition) throw new Error(message); }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();

// ---------------------------------------------------------------------------------------------------------------------
// HTTP. An actor is { email, token }; a 401 logs the actor in again once (access tokens live 15 minutes).

/** `fetch`, retried on a network error: the API closes an idle keep-alive socket after 5 s (seen in Bước 5–6's smokes). */
async function send(url, init) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (attempt >= 2) throw error;
      await sleep(300);
    }
  }
}

/** One request; waits out a 429 (user.write is 30/min) and retries with the same Idempotency-Key. */
async function api(method, path, { as, body, idem = false, form } = {}) {
  const idempotencyKey = idem ? randomUUID() : undefined;
  for (let attempt = 0, relogged = false; ; attempt += 1) {
    const headers = {};
    if (as) headers.Authorization = `Bearer ${as.token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const res = await send(`${BASE}${path}`, { method, headers, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    if (res.status === 401 && as && !relogged) {
      relogged = true;
      as.token = await loginToken(as.email);
      continue;
    }
    if (res.status !== 429 || attempt >= 6) return { status: res.status, json, text };
    const wait = Number(res.headers.get('retry-after') ?? '5');
    console.log(`    (429 on ${method} ${path}; waiting ${wait}s)`);
    await sleep(wait * 1000 + 250);
  }
}

async function want(promise, status, context) {
  const res = await promise;
  if (res.status !== status) throw new Error(`${context}: expected ${status}, got ${res.status}\n${res.text}`);
  return res.json;
}

async function waitFor(read, done, what, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`${what} did not finish within ${timeoutMs}ms: ${JSON.stringify(value)}`);
    await sleep(500);
  }
}

async function loginToken(email) {
  const before = (await mailsTo(email)).length;
  const started = Date.now();
  const res = await api('POST', '/v1/auth/login', { body: { email, password: PASSWORD, client: 'web' } });
  if (res.status === 401) {
    throw new Error(`Login refused for ${email}: the account exists with another password. This script only uses its own test password.`);
  }
  if (res.status === 403 && String(res.json?.type).endsWith('email-not-verified')) {
    // Login already sends a code. Only resend if none arrives, after the 60 s cooldown (review M4).
    const code = await newestCode(email, before + 1, { allowMissing: true });
    if (code) return (await verifyCode(email, code)).access_token;
    await sleep(Math.max(0, 60_250 - (Date.now() - started)));
    return (await requestAndVerify(email)).access_token;
  }
  check(res.status === 200, `login ${email}: ${res.status} ${res.text}`);
  return res.json.access_token;
}

// ---------------------------------------------------------------------------------------------------------------------
// Accounts.
async function mailsTo(email) {
  const list = await (await send(`${MAILPIT}/api/v1/messages?limit=500`)).json();
  return (list.messages ?? []).filter((m) => m.To?.some((to) => to.Address.toLowerCase() === email.toLowerCase()))
    .sort((a, b) => (a.Created < b.Created ? 1 : -1));
}

/** The newest 6-digit code once `atLeast` mails reached `email` (only the newest code is valid). */
async function newestCode(email, atLeast, { allowMissing = false } = {}) {
  const deadline = Date.now() + 20_000;
  for (;;) {
    const mails = await mailsTo(email);
    if (mails.length >= atLeast) {
      const full = await (await send(`${MAILPIT}/api/v1/message/${mails[0].ID}`)).json();
      const match = (full.Text ?? '').match(/(\d{6})/);
      if (match) return match[1];
    }
    if (Date.now() > deadline) {
      if (allowMissing) return null;
      throw new Error(`No OTP mail for ${email} in Mailpit (${MAILPIT}) after 20s (found ${mails.length})`);
    }
    await sleep(300);
  }
}

async function verifyCode(email, code) {
  return want(api('POST', '/v1/auth/verify-email', { body: { email, code, password: PASSWORD, client: 'web' } }), 200, `verify ${email}`);
}

async function requestAndVerify(email) {
  const before = (await mailsTo(email)).length;
  await want(api('POST', '/v1/auth/otp', { body: { purpose: 'verify_email', email } }), 202, 'request OTP');
  return verifyCode(email, await newestCode(email, before + 1));
}

/** Registers `email` (or logs in when it is taken) and makes sure it is verified. Returns { email, token, profile, created }. */
async function ensureAccount(email) {
  const actor = { email, token: null, created: false };
  const before = (await mailsTo(email)).length;
  const registered = await api('POST', '/v1/auth/register', { body: {
    email, password: PASSWORD, timezone: TIMEZONE, given_name: 'Test', birth_date: '2000-01-01', accept_terms: true, client: 'web' } });
  if (registered.status === 201) {
    actor.created = true;
    // Re-registration in the cooldown may keep the earlier code; resend if no new mail arrives or the code is refused.
    const code = await newestCode(email, before + 1, { allowMissing: true });
    const first = code ? await api('POST', '/v1/auth/verify-email', { body: { email, code, password: PASSWORD, client: 'web' } }) : null;
    actor.token = first?.status === 200 ? first.json.access_token : (await requestAndVerify(email)).access_token;
  } else if (registered.status === 409) {
    actor.token = await loginToken(email);
  } else {
    throw new Error(`register ${email}: ${registered.status} ${registered.text}`);
  }
  actor.profile = await want(api('GET', '/v1/me', { as: actor }), 200, 'GET /v1/me');
  check(actor.profile.email_verified, `${email} is still not verified`);
  return actor;
}

// ---------------------------------------------------------------------------------------------------------------------
// Content.

/** Published senses of one import batch, all pages. */
async function publishedOf(admin, batchId) {
  const items = [];
  let token = null;
  do {
    const query = `batch_id=${batchId}&status=published&page_size=100${token ? `&page_token=${encodeURIComponent(token)}` : ''}`;
    const page = await want(api('GET', `/v1/admin/content/senses?${query}`, { as: admin }), 200, 'published senses');
    items.push(...page.items);
    token = page.next_page_token;
  } while (token);
  return items;
}

async function publishBatch(admin, batchId) {
  const job = await want(api('POST', '/v1/admin/content/senses/publish-jobs', {
    as: admin, idem: true, body: { filter: { batch_id: batchId } } }), 202, 'publish job');
  const done = await waitFor(() => want(api('GET', `/v1/admin/content/senses/publish-jobs/${job.job_id}`, { as: admin }), 200, 'job'),
    (j) => j.status !== 'queued' && j.status !== 'running', 'publish job', 120_000);
  check(done.status === 'succeeded', `publish job ${JSON.stringify(done)}`);
  return job.job_id;
}

// ---------------------------------------------------------------------------------------------------------------------
async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const summary = {};

  step('Check the fake providers are on (env or .env)');
  for (const key of ['AI_FAKE_ENABLED', 'BILLING_FAKE_ENABLED']) {
    const value = envValue(key);
    if (value !== 'true') {
      console.error(`\n${key} is ${value ?? 'not set'}: this script only runs with AI_FAKE_ENABLED=true and BILLING_FAKE_ENABLED=true `
        + '(in the environment or apps/api/.env), and the API must be started with the same values.');
      process.exit(1);
    }
  }
  const secret = envValue('BILLING_FAKE_SECRET');
  if ((flags.plan === 'trial' || flags.transactions) && !secret) {
    throw new Error('BILLING_FAKE_SECRET is not set (env or .env); --plan trial and --transactions need it.');
  }
  ok('AI_FAKE_ENABLED=true, BILLING_FAKE_ENABLED=true');

  step('Wait for the API');
  await waitFor(async () => {
    try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; }
  }, Boolean, `API at ${BASE}`);
  ok(`reachable at ${BASE}`);

  step(`Admin account ${flags.admin}`);
  const admin = await ensureAccount(flags.admin);
  if (admin.profile.staff_role !== 'admin') {
    if (!existsSync('dist/cli/admin-grant.js')) throw new Error('Missing dist/cli/admin-grant.js; run `pnpm build` first.');
    execFileSync(process.execPath, ['dist/cli/admin-grant.js', flags.admin], { stdio: 'pipe' });
    admin.token = await loginToken(flags.admin);
    admin.profile = await want(api('GET', '/v1/me', { as: admin }), 200, 'GET /v1/me');
    check(admin.profile.staff_role === 'admin', `${flags.admin} is ${admin.profile.staff_role} after admin-grant`);
  }
  ok(`${admin.created ? 'registered' : 'existed'}, verified, admin`);

  step(`Learner account ${flags.learner}`);
  const learner = await ensureAccount(flags.learner);
  check(learner.profile.staff_role === null, `${flags.learner} is staff (${learner.profile.staff_role}); use a learner email`);
  if (learner.profile.native_language === null) {
    await want(api('PATCH', '/v1/me', { as: learner, body: { native_language: 'vi' } }), 200, 'set native_language');
  }
  ok(`${learner.created ? 'registered' : 'existed'}, verified, native_language ${learner.profile.native_language ?? 'vi'}`);

  step('Topics and level source');
  const topics = (await want(api('GET', '/v1/admin/taxonomy/topics', { as: admin }), 200, 'topics')).items;
  const createdTopics = [];
  for (const topic of TOPICS) {
    if (topics.some((row) => row.code === topic.code)) continue;
    const res = await api('POST', '/v1/admin/taxonomy/topics', { as: admin, body: topic });
    check(res.status === 201 || res.status === 409, `create topic ${topic.code}: ${res.status} ${res.text}`);
    if (res.status === 201) createdTopics.push(topic.code);
  }
  const archived = topics.filter((row) => TOPICS.some((t) => t.code === row.code) && row.archived_at);
  if (archived.length > 0) console.log(`    note — archived topic(s) ${archived.map((row) => row.code).join(', ')}: rows using them are rejected`);
  let source = (await want(api('GET', '/v1/admin/content/sources', { as: admin }), 200, 'sources')).items
    .find((row) => row.name === SOURCE.name);
  if (!source) source = await want(api('POST', '/v1/admin/content/sources', { as: admin, body: SOURCE }), 201, 'create source');
  ok(`topics created: ${createdTopics.join(', ') || 'none (all existed)'}; level source "${source.name}" ${source.id}`);

  step(`Import ${CSV_NAME} and publish it`);
  // An earlier run's batch: the newest finished upload of this file (the list is newest first; `partial` = some rows rejected).
  const finished = (status) => status === 'succeeded' || status === 'partial';
  const uploads = (await want(api('GET', '/v1/admin/content/uploads?page_size=100', { as: admin }), 200, 'uploads')).items
    .filter((batch) => batch.file_name === CSV_NAME && finished(batch.status));
  let batchId = null;
  let published = [];
  for (const batch of uploads) {
    const senses = await publishedOf(admin, batch.id);
    if (senses.some((sense) => sense.lemma === 'deploy')) { batchId = batch.id; published = senses; break; }
  }
  if (batchId) {
    ok(`skipped: batch ${batchId} from an earlier run already published "deploy" (${published.length} senses published)`);
  } else {
    if (uploads.length > 0) {
      // Imported before but never published: publish that batch (a second import would leave its rows unchanged).
      batchId = uploads[0].id;
      console.log(`    batch ${batchId} from an earlier run was imported but not published; publishing it`);
    } else {
      const form = new FormData();
      form.set('level_source_id', source.id);
      form.set('file', new Blob([readFileSync(CSV_PATH)], { type: 'text/csv' }), CSV_NAME);
      const accepted = await want(api('POST', '/v1/admin/content/uploads', { as: admin, idem: true, form }), 202, 'upload');
      batchId = accepted.batch_id;
      const batch = await waitFor(() => want(api('GET', `/v1/admin/content/uploads/${batchId}`, { as: admin }), 200, 'batch'),
        (b) => b.status !== 'queued' && b.status !== 'running', 'import batch (is the worker running?)', 180_000);
      check(finished(batch.status), `import batch ${JSON.stringify(batch)}`);
      console.log(`    batch ${batchId}: counters ${JSON.stringify(batch.counters)}`);
      if (batch.counters?.rejected > 0) {
        console.log(`    note — ${batch.counters.rejected} row(s) rejected; see GET /v1/admin/content/uploads/${batchId}/rejected.csv`);
      }
    }
    const jobId = await publishBatch(admin, batchId);
    published = await publishedOf(admin, batchId);
    check(published.some((sense) => sense.lemma === 'deploy'), `"deploy" is not published after job ${jobId}`);
    ok(`batch ${batchId} published by job ${jobId}: ${published.length} senses published`);
  }
  summary.senses = published.length;

  step('Fake AI model fake:ok, chosen for every AI operation');
  let model = (await want(api('GET', '/v1/admin/ai/models?provider=fake', { as: admin }), 200, 'models')).items
    .find((row) => row.model_id === 'fake:ok');
  if (!model) {
    const res = await api('POST', '/v1/admin/ai/models', { as: admin, body: { provider: 'fake', model_id: 'fake:ok' } });
    check(res.status === 201 || res.status === 409, `add fake:ok: ${res.status} ${res.text}`);
    model = res.status === 201 ? res.json : (await want(api('GET', '/v1/admin/ai/models?provider=fake', { as: admin }), 200, 'models'))
      .items.find((row) => row.model_id === 'fake:ok');
  }
  check(model, 'fake:ok is not in the model list');
  const operations = (await want(api('GET', '/v1/admin/ai/operations', { as: admin }), 200, 'operations')).items;
  const chosen = [];
  for (const op of AI_OPERATIONS) {
    const current = operations.find((row) => row.operation === op);
    if (!current) { console.log(`    note — operation ${op} is not listed by the API; skipped`); continue; }
    if (current.model?.id !== model.id) {
      await want(api('PUT', `/v1/admin/ai/operations/${op}`, { as: admin, body: {
        expected_version: current.version, model_ref: model.id, effort: null, thinking: null, max_output_tokens: null } }), 200, `choose fake:ok for ${op}`);
    }
    chosen.push(op);
  }
  ok(`fake:ok ${model.id} chosen for ${chosen.join(', ')}`);

  const entitlements = () => want(api('GET', '/v1/me/entitlements', { as: learner }), 200, 'GET /v1/me/entitlements');
  if (flags.plan === 'pro') {
    step('Grant Pro for 30 days');
    const before = await entitlements();
    if (before.plan === 'pro') {
      ok('skipped: the learner is already Pro');
    } else {
      const grant = await want(api('POST', '/v1/admin/entitlements/grants', { as: admin, idem: true, body: {
        user_id: learner.profile.id, kind: 'plan', plan: 'pro', ends_at: iso(30 * DAY), reason: 'learner:setup' } }), 201, 'grant Pro');
      ok(`grant ${grant.id}: Pro until ${grant.ends_at}`);
    }
  } else if (flags.plan === 'trial') {
    step('Start a 7-day trial (fake billing subscription_started)');
    const before = await entitlements();
    if (before.plan === 'trial') {
      ok('skipped: the learner is already on a trial');
    } else if (!before.trial_eligible) {
      ok(`skipped: the learner has used a trial before (plan stays ${before.plan})`);
    } else {
      const sub = `learner-setup-trial-${learner.profile.id}`;
      const res = await sendFakeEvent({ baseUrl: BASE, secret, events: [{
        id: randomUUID(), type: 'subscription_started', environment: 'sandbox', subscription_id: sub, app_user_id: learner.profile.id,
        occurred_at: iso(0), interval: 'month', current_period_start: iso(0), current_period_end: iso(7 * DAY), trial_ends_at: iso(7 * DAY),
        payment_fingerprint: `fp-${sub}` }] });
      check(res.status === 200, `webhook subscription_started: ${res.status} ${JSON.stringify(res.body)}`);
      await waitFor(entitlements, (view) => view.plan === 'trial', 'trial start');
      ok(`subscription ${sub}: trial until ${iso(7 * DAY)}`);
    }
  }

  if (flags.transactions) {
    step('Fake transactions (purchase, renewal, refund) for M4b');
    const list = await want(api('GET', '/v1/me/transactions?page_size=100', { as: learner }), 200, 'GET /v1/me/transactions');
    if (list.items.some((item) => item.kind === 'purchase')) {
      ok(`skipped: the learner already has ${list.items.length} transactions`);
    } else {
      // A paid month 60 days ago, renewed 30 days ago, then that renewal refunded: the refund revokes the subscription, so the
      // learner's plan is whatever --plan gave (design §8.9, Bước 5 D34).
      const sub = `learner-setup-paid-${learner.profile.id}`;
      const tx = (name) => `fake_txn_${name}_${learner.profile.id.slice(0, 8)}`;
      const base = { environment: 'sandbox', subscription_id: sub, app_user_id: learner.profile.id, interval: 'month' };
      const events = [
        { ...base, id: randomUUID(), type: 'subscription_started', occurred_at: iso(-60 * DAY), current_period_start: iso(-60 * DAY),
          current_period_end: iso(-30 * DAY), transaction_id: tx('purchase'), amount: 99000, currency: 'VND' },
        { ...base, id: randomUUID(), type: 'renewed', occurred_at: iso(-30 * DAY), current_period_start: iso(-30 * DAY),
          current_period_end: iso(DAY), transaction_id: tx('renewal'), amount: 99000, currency: 'VND' },
        { ...base, id: randomUUID(), type: 'refunded', occurred_at: iso(-29 * DAY), transaction_id: tx('renewal'), amount: 99000, currency: 'VND' },
      ];
      for (const event of events) {
        const res = await sendFakeEvent({ baseUrl: BASE, secret, events: [event] });
        check(res.status === 200, `webhook ${event.type}: ${res.status} ${JSON.stringify(res.body)}`);
      }
      const done = await waitFor(
        () => want(api('GET', '/v1/me/transactions?page_size=100', { as: learner }), 200, 'GET /v1/me/transactions'),
        (view) => view.items.some((item) => item.kind === 'refund'), 'the refund row');
      ok(`${done.items.length} transactions: ${done.items.map((item) => `${item.kind}/${item.status}`).join(', ')}`);
    }
  }

  step('Summary');
  const plan = (await entitlements()).plan;
  console.log(`    admin    ${flags.admin}`);
  console.log(`    learner  ${flags.learner} (plan ${plan})`);
  console.log(`    password ${PASSWORD} (both accounts; local test accounts only)`);
  console.log(`    senses   ${summary.senses} published from ${CSV_NAME}`);
  console.log(`    AI       fake:ok for ${chosen.length} operations`);
}

main().catch((error) => {
  console.error('\nlearner:setup FAILED:', error.message);
  process.exitCode = 1;
});
