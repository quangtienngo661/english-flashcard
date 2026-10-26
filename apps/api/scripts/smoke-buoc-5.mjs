// Smoke test for Bước 5 (Entitlements) against a REAL running API + worker (design §16 B5#1–B5#35 without B5#34, §17 item 2;
// plan Task 21). Start them first: `docker compose up -d` (repo root), then `pnpm build && pnpm run:dev` (this package) with
// BILLING_FAKE_ENABLED=true and BILLING_FAKE_FETCH_STATE=<true|false>, then `SMOKE_FETCH_STATE=<same> pnpm smoke:buoc-5`.
// Run it once per mode, each on a fresh database (`english_learning_smoke_b5`); the expectations are the same in both modes.
// Needs DATABASE_URL and BILLING_FAKE_SECRET (env, else .env), Mailpit, and `docker compose -p english-learning` for psql.
// SMOKE_API_LOG (optional) names the API's log file, read for the `trial_reuse_detected` log of B5#28.
//
// The API has no fake clock: "time passes" means back-dating columns with psql (design §17 item 2, R13); `travel` moves the
// fake provider's copy of a period too, so a fetched state never undoes a back-date. Learners that never sign in are inserted
// with psql (registration allows 5 per IP per hour); staff read their plan through GET /v1/admin/entitlements/users/{id}.
// Exit code 0 only when every step matched.
import { execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { sendFakeEvent } from './billing-fake-event.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-Test-Pass-9!';
const DAY = 86_400_000;
const run = randomUUID().slice(0, 8);

const MODE = process.env.SMOKE_FETCH_STATE;
if (MODE !== 'true' && MODE !== 'false') throw new Error('Set SMOKE_FETCH_STATE=true or false (the API\'s BILLING_FAKE_FETCH_STATE).');
const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
for (const key of ['DATABASE_URL', 'BILLING_FAKE_SECRET']) if (!process.env[key] && fileEnv[key]) process.env[key] = fileEnv[key];
// maintenance:run and entitlements:fake-ai read .env, and a variable in their environment wins (plan review #6).
const configuredMode = process.env.BILLING_FAKE_FETCH_STATE ?? fileEnv.BILLING_FAKE_FETCH_STATE;
if (configuredMode !== undefined && configuredMode !== MODE) {
  throw new Error(`BILLING_FAKE_FETCH_STATE is ${configuredMode} but SMOKE_FETCH_STATE is ${MODE}: set both alike and restart the API.`);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
if (!process.env.BILLING_FAKE_SECRET) throw new Error('BILLING_FAKE_SECRET is not set (env or .env).');
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);
const SECRET = process.env.BILLING_FAKE_SECRET;
const CHILD_ENV = { ...process.env, BILLING_FAKE_ENABLED: 'true', BILLING_FAKE_FETCH_STATE: MODE };

let stepNo = 0;
function step(name) { stepNo += 1; console.log(`\n[${stepNo}] ${new Date().toISOString().slice(11, 19)}Z ${name}`); }
function ok(detail) { console.log(`    ok — ${detail}`); }
function check(condition, message) { if (!condition) throw new Error(message); }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const iso = (ms) => new Date(Date.now() + ms).toISOString();

/**
 * `fetch`, retried on a network error: the API closes an idle keep-alive socket after 5 s, and a request sent on it just then
 * fails with "fetch failed" before the server reads it. Seen on this smoke's pauses for CLI runs; the cause is printed.
 */
async function send(url, init) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (attempt >= 2) throw error;
      console.log(`    (network error on ${init?.method ?? 'GET'} ${new URL(url).pathname}: ${error.cause?.code ?? error.cause?.message ?? error.message}; retrying)`);
      await sleep(300);
    }
  }
}

/** `sendFakeEvent`, retried like `send`; a resent event is safe (the webhook dedupes by event id). */
async function webhook(args) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await sendFakeEvent(args);
    } catch (error) {
      if (attempt >= 2) throw error;
      console.log(`    (network error on the webhook: ${error.cause?.code ?? error.cause?.message ?? error.message}; retrying)`);
      await sleep(300);
    }
  }
}

/** One request; waits out a 429 (user.write is 30/min) and retries with the same Idempotency-Key. */
async function api(method, path, { token, body, idem = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idem) headers['Idempotency-Key'] = randomUUID();
  for (let attempt = 0; ; attempt += 1) {
    const res = await send(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.status !== 429 || attempt >= 5) return read(res);
    const wait = Number(res.headers.get('retry-after') ?? '5');
    console.log(`    (429 on ${method} ${path}; waiting ${wait}s)`);
    await sleep(wait * 1000 + 250);
  }
}

async function read(res) {
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, json, text, retryAfter: res.headers.get('retry-after') };
}

async function want(promise, status, context) {
  const res = await promise;
  if (res.status !== status) throw new Error(`${context}: expected ${status}, got ${res.status}\n${res.text}`);
  return res.json;
}

async function wantProblem(promise, status, type, context) {
  const res = await promise;
  const got = res.json?.type ?? '';
  if (res.status !== status || !String(got).endsWith(type)) {
    throw new Error(`${context}: expected ${status} ${type}, got ${res.status}\n${res.text}`);
  }
  return res.json;
}

function psql(sql) {
  return execFileSync('docker', ['compose', '-p', 'english-learning', 'exec', '-T', 'postgres', 'psql', '-U', 'dev', '-d', DB_NAME,
    '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql], { encoding: 'utf8' }).trim();
}

const vnToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());

async function waitFor(readValue, done, what, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await readValue();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`${what} did not happen within ${timeoutMs}ms: ${JSON.stringify(value)}`);
    await sleep(250);
  }
}

async function waitForApi(timeoutMs = 20_000) {
  await waitFor(async () => {
    try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; }
  }, Boolean, `API at ${BASE}`, timeoutMs);
}

function built(file) {
  if (!existsSync(file)) throw new Error(`Missing ${file}; run \`pnpm build\` first.`);
  return file;
}

function maintenance() {
  execFileSync(process.execPath, [built('dist/cli/run-maintenance.js')], { stdio: 'pipe', env: CHILD_ENV });
}

/** `pnpm entitlements:fake-ai`; one parsed JSON line per call. */
function fakeAi(args) {
  const out = execFileSync(process.execPath, [built('dist/cli/fake-ai.js'), ...args], { encoding: 'utf8', env: CHILD_ENV });
  return out.split(/\r?\n/).filter((line) => line.startsWith('{')).map((line) => JSON.parse(line));
}
const reserve = (user, op, pool = 'ai_practice') => fakeAi(['reserve', '--user', user, '--pool', pool, '--op', op])[0].result;
const confirm = (user, op, pool = 'ai_practice') => fakeAi(['confirm', '--user', user, '--pool', pool, '--op', op])[0].result;

async function mailsTo(email) {
  const list = await (await send(`${MAILPIT}/api/v1/messages?limit=500`)).json();
  return (list.messages ?? []).filter((m) => m.To?.some((to) => to.Address === email));
}

async function otpCodeFor(email, atLeast) {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const mails = await mailsTo(email);
    const message = mails.length >= atLeast ? mails.sort((a, b) => (a.Created < b.Created ? 1 : -1))[0] : null;
    if (message) {
      const full = await (await send(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const match = (full.Text ?? '').match(/(\d{6})/);
      if (match) return match[1];
    }
    if (Date.now() > deadline) throw new Error(`No OTP mail found for ${email} after 10s`);
    await sleep(300);
  }
}

async function registerVerified(email) {
  const before = (await mailsTo(email)).length;
  await want(api('POST', '/v1/auth/register', {
    body: { email, password: PASSWORD, timezone: TIMEZONE, given_name: 'Smoke', birth_date: '2000-01-01', accept_terms: true, client: 'web' } }), 201, `register ${email}`);
  const code = await otpCodeFor(email, before + 1);
  const verified = await want(api('POST', '/v1/auth/verify-email', { body: { email, code, password: PASSWORD, client: 'web' } }), 200, `verify ${email}`);
  return verified.access_token;
}

const login = async (email) => (await want(api('POST', '/v1/auth/login', {
  body: { email, password: PASSWORD, client: 'web' } }), 200, `login ${email}`)).access_token;

/** A learner who never signs in: a verified `users` row, Vietnam time. */
function sqlUser(label) {
  const email = `smoke5-${label}-${run}@example.com`;
  const id = psql(`INSERT INTO users (email, timezone, email_verified_at, native_language)
    VALUES ('${email}', '${TIMEZONE}', now(), 'vi') RETURNING id`).split('\n')[0];
  check(/^[0-9a-f-]{36}$/.test(id), `sqlUser ${label}: ${id}`);
  return { id, email };
}

// Letters only, so private lemmas are valid words.
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(97 + randomInt(26))).join('');

async function main() {
  const started = Date.now();

  step('Wait for the API');
  await waitForApi();
  ok(`reachable at ${BASE}; database ${DB_NAME}; fetchState mode ${MODE === 'true' ? 'ON' : 'OFF'} (BILLING_FAKE_FETCH_STATE=${MODE})`);

  // ------------------------------------------------------------------------------------------------------------------
  step('Accounts: admin (CLI grant), two editors (created by the admin), learner P (registered, verified)');
  const adminEmail = `smoke5-admin-${run}@example.com`;
  await registerVerified(adminEmail);
  execFileSync(process.execPath, [built('dist/cli/admin-grant.js'), adminEmail], { stdio: 'pipe', env: CHILD_ENV });
  const admin = await login(adminEmail);
  const editors = [];
  for (const n of [1, 2]) {
    const email = `smoke5-editor${n}-${run}@example.com`;
    const view = await want(api('POST', '/v1/admin/users', { token: admin, body: {
      email, staff_role: 'editor', password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, `create editor ${n}`);
    editors.push({ id: view.id, email, token: await login(email) });
  }
  const [editor1, editor2] = editors;
  const pEmail = `smoke5-learner-${run}@example.com`;
  const P = await registerVerified(pEmail);
  const pProfile = await want(api('PATCH', '/v1/me', { token: P, body: { native_language: 'vi' } }), 200, 'P native_language');
  ok(`admin ${adminEmail}; editors ${editor1.email}, ${editor2.email}; learner P ${pEmail} (${pProfile.id})`);

  const me = () => want(api('GET', '/v1/me/entitlements', { token: P }), 200, 'GET /v1/me/entitlements');
  const view = (userId) => want(api('GET', `/v1/admin/entitlements/users/${userId}`, { token: admin }), 200, `user view ${userId}`);
  const grant = (body, token = admin) => api('POST', '/v1/admin/entitlements/grants', { token, idem: true, body });
  async function settings(section, patch) {
    const current = await want(api('GET', '/v1/admin/settings', { token: admin }), 200, 'GET settings');
    await want(api('PUT', '/v1/admin/settings', { token: admin, idem: true, body: { version: current.version, values: { [section]: patch } } }),
      200, `PUT settings ${section} ${JSON.stringify(patch)}`);
  }

  // ------------------------------------------------------------------------------------------------------------------
  step('B5#1: a new learner reads GET /v1/me/entitlements');
  const fresh = await me();
  check(fresh.plan === 'free', `plan ${fresh.plan}`);
  check(fresh.pools.practice_sessions.limit === 3 && fresh.pools.ai_practice.limit === 0 && fresh.pools.ai_lookup.limit === 0,
    `pools ${JSON.stringify(fresh.pools)}`);
  check(!fresh.features['ai.practice'].allowed && !fresh.features['ai.lookup'].allowed, `features ${JSON.stringify(fresh.features)}`);
  check(fresh.ads.show === false && fresh.trial_eligible === true, `ads ${JSON.stringify(fresh.ads)}, trial_eligible ${fresh.trial_eligible}`);
  ok('plan free; practice 3/day; AI pools 0; ai.practice and ai.lookup not allowed; ads.show false; trial_eligible true');

  // ------------------------------------------------------------------------------------------------------------------
  step('Practice material for P: a group with two private words');
  const words = [{ lemma: `zs${letters(6)}`, meaning: 'chiếc lá' }, { lemma: `zt${letters(6)}`, meaning: 'hòn đá' }];
  const byMeaning = new Map(words.map((word) => [word.meaning, word]));
  const group = await want(api('POST', '/v1/groups', { token: P, idem: true, body: { name: `B5 ${run}` } }), 201, 'group');
  for (const word of words) {
    await want(api('POST', '/v1/quick-add', { token: P, idem: true, body: { group_id: group.id, new_word: word } }), 201, 'quick-add');
  }
  const startBody = { source: 'group', group_id: group.id, types: ['type_word'], count: 2, prompt_style: 'meaning' };
  const start = () => api('POST', '/v1/practice/sessions', { token: P, idem: true, body: startBody });
  const startOk = async () => (await want(start(), 201, 'start a session')).session;
  async function firstItem(sessionId) {
    const shown = await want(api('POST', `/v1/practice/sessions/${sessionId}/next`, { token: P }), 200, 'next');
    check(shown.state === 'question', `next → ${JSON.stringify(shown)}`);
    return shown.item;
  }
  const answerBody = (item) => ({ text: byMeaning.get(item.prompt.meaning).lemma });
  async function answerFirst(sessionId) {
    const item = await firstItem(sessionId);
    const res = await want(api('POST', `/v1/practice/items/${item.item_id}/answer`, { token: P, idem: true, body: answerBody(item) }), 200, 'answer');
    check(res.result === 'correct', `answer → ${JSON.stringify(res)}`);
  }
  const countedToday = () => Number(psql(`SELECT count(*) FROM usage_records WHERE user_id = '${pProfile.id}'
    AND pool = 'practice_sessions' AND kind = 'use' AND local_date = '${vnToday()}'`));
  ok(`group ${group.id} with ${words.map((w) => w.lemma).join(', ')}`);

  step('B5#3: open and abandon five sessions without answering → none is counted');
  for (let i = 0; i < 5; i += 1) await startOk();
  check(countedToday() === 0, `counted ${countedToday()} after five unanswered sessions`);
  check((await me()).pools.practice_sessions.used === 0, 'used is not 0');
  ok('five sessions opened (each closes the previous); usage_records has 0 sessions today; used 0');

  step('B5#2: three sessions answered → the fourth is 403 quota-exhausted with resets_at');
  for (let i = 0; i < 3; i += 1) await answerFirst((await startOk()).id);
  const fourth = await wantProblem(start(), 403, 'quota-exhausted', 'fourth session');
  const afterThree = await me();
  check(fourth.resets_at && fourth.resets_at === afterThree.pools.practice_sessions.resets_at, `resets_at ${fourth.resets_at}`);
  check(afterThree.pools.practice_sessions.used === 3 && afterThree.pools.practice_sessions.remaining === 0, 'used/remaining');
  ok(`3 counted; 4th → 403 quota-exhausted, resets_at ${fourth.resets_at} (next Vietnam midnight)`);

  step('B5#23: admin sets free_practice_sessions_per_day = 5 → the 4th and 5th open today; the 6th is refused');
  await settings('entitlements', { free_practice_sessions_per_day: 5 });
  await answerFirst((await startOk()).id);
  await answerFirst((await startOk()).id);
  await wantProblem(start(), 403, 'quota-exhausted', 'sixth session');
  await settings('entitlements', { free_practice_sessions_per_day: 3 });
  ok('limit 5: sessions 4 and 5 opened and counted, the 6th → 403; limit back to 3');

  step('B5E73: 10 rounds of "start a session" racing "first answer of the open session" (Free, 2 counted)');
  console.log('    (waiting 60 s so the rounds have the user.write budget)');
  await sleep(60_000);
  const outcomes = { start: 0, answer: 0 };
  for (let round = 1; round <= 10;) {
    psql(`DELETE FROM usage_records WHERE user_id = '${pProfile.id}' AND pool = 'practice_sessions'`);
    psql(`INSERT INTO usage_records (user_id, pool, operation_id, kind, status, local_date, confirmed_at)
      SELECT '${pProfile.id}', 'practice_sessions', gen_random_uuid()::text, 'use', 'confirmed', '${vnToday()}', now() FROM generate_series(1, 2)`);
    const s1 = await startOk();
    const item = await firstItem(s1.id);
    const headers = { Authorization: `Bearer ${P}`, 'Content-Type': 'application/json' };
    const [s2, ans] = await Promise.all([
      send(`${BASE}/v1/practice/sessions`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': randomUUID() },
        body: JSON.stringify(startBody) }).then(read),
      send(`${BASE}/v1/practice/items/${item.item_id}/answer`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': randomUUID() },
        body: JSON.stringify(answerBody(item)) }).then(read),
    ]);
    if (s2.status === 429 || ans.status === 429) {
      const wait = Number(s2.retryAfter ?? ans.retryAfter ?? '10');
      console.log(`    (round ${round}: 429; waiting ${wait}s and repeating it)`);
      await sleep(wait * 1000 + 250);
      continue;
    }
    const startWon = s2.status === 201;
    const answerWon = ans.status === 200;
    check(startWon !== answerWon, `round ${round}: start ${s2.status}, answer ${ans.status} (exactly one must succeed)\n${s2.text}\n${ans.text}`);
    const counted = countedToday();
    check(counted <= 3, `round ${round}: ${counted} sessions counted today`);
    outcomes[startWon ? 'start' : 'answer'] += 1;
    round += 1;
  }
  ok(`10 rounds: exactly one of the two won each time (start ${outcomes.start}×, answer ${outcomes.answer}×); never more than 3 counted`);

  // ------------------------------------------------------------------------------------------------------------------
  // Billing (design §9). Every event that stands for a charge carries a transaction id (D37).
  const subOf = (key) => `${key}-${run}`;
  async function fake(type, sub, user, fields = {}, id = randomUUID()) {
    const event = { id, type, environment: 'sandbox', subscription_id: sub, app_user_id: user, occurred_at: new Date().toISOString(), ...fields };
    const res = await webhook({ baseUrl: BASE, secret: SECRET, events: [event] });
    check(res.status === 200, `webhook ${type}: ${res.status} ${JSON.stringify(res.body)}`);
    const status = await waitFor(() => psql(`SELECT status FROM billing_events WHERE dedupe_key = 'fake:sandbox:${id}'`),
      (value) => value !== '' && value !== 'pending', `event ${type} applied`);
    // A refetch (stale event, refund, D39) or endTrialNow runs after the event's transaction commits.
    await sleep(1_500);
    return { id, status, event };
  }
  const subRow = (sub, columns) => psql(`SELECT ${columns} FROM subscriptions WHERE provider = 'fake' AND external_subscription_id = '${sub}'`);
  const FAKE_COLUMNS = new Set(['current_period_start', 'current_period_end', 'trial_ends_at']);
  /** "Time passes" for one subscription: the same SQL on our row and on the fake provider's copy (plan Task 21). */
  function travel(sub, sets) {
    const list = (entries) => entries.map(([column, value]) => `${column} = ${value}`).join(', ');
    const entries = Object.entries(sets);
    psql(`UPDATE subscriptions SET ${list(entries)} WHERE provider = 'fake' AND external_subscription_id = '${sub}'`);
    const fakeEntries = entries.filter(([column]) => FAKE_COLUMNS.has(column));
    if (fakeEntries.length > 0) psql(`UPDATE fake_billing_subscriptions SET ${list(fakeEntries)} WHERE external_subscription_id = '${sub}'`);
  }
  const plan = async (userId) => (await view(userId)).plan;
  const month = { interval: 'month', current_period_start: iso(0), current_period_end: iso(30 * DAY) };

  step('B5#4: fake subscription_started with a 7-day trial → plan trial, trial_history row, trial-started email');
  const T = sqlUser('trial');
  const t1 = subOf('t1');
  await fake('subscription_started', t1, T.id, {
    interval: 'month', current_period_start: iso(0), current_period_end: iso(7 * DAY), trial_ends_at: iso(7 * DAY), payment_fingerprint: `fp-${run}` });
  check(await plan(T.id) === 'trial', 'plan is not trial');
  check(psql(`SELECT count(*) FROM trial_history WHERE user_id = '${T.id}'`) === '1', 'no trial_history row');
  maintenance();
  const startedMail = await waitFor(() => mailsTo(T.email), (list) => list.some((m) => /dùng thử|trial has started/i.test(m.Subject)), 'trial-started email');
  ok(`plan trial; trial_history 1 row; email "${startedMail.find((m) => /dùng thử|trial has started/i.test(m.Subject)).Subject}"`);

  step('B5#5: trial_ends_at − 2 days reached, job → the trial reminder email, exactly once');
  travel(t1, { trial_ends_at: "now() + interval '2 days' - interval '1 hour'" });
  maintenance();
  const isReminder = (m) => /sắp kết thúc|ends soon/i.test(m.Subject);
  await waitFor(() => mailsTo(T.email), (list) => list.filter(isReminder).length === 1, 'trial reminder email');
  maintenance();
  await sleep(1_000);
  check((await mailsTo(T.email)).filter(isReminder).length === 1, 'the trial reminder was sent twice');
  ok('one reminder email after the first run; still one after a second run');

  step('B5#6: fake renewed after the trial → plan pro, cycle anchor = the renewed period start, AI 300/100');
  const renewedStart = iso(0);
  await fake('renewed', t1, T.id, { ...month, current_period_start: renewedStart, transaction_id: `${t1}-r1` });
  const proT = await view(T.id);
  check(proT.plan === 'pro', `plan ${proT.plan}`);
  const anchor = subRow(t1, "to_char(quota_anchor_at at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS')");
  check(anchor === renewedStart.slice(0, 19), `quota_anchor_at ${anchor}, expected ${renewedStart}`);
  check(proT.pools.ai_practice.limit === 300 && proT.pools.ai_lookup.limit === 100, `AI pools ${JSON.stringify(proT.pools)}`);
  ok(`plan pro; quota_anchor_at ${anchor}Z; ai_practice 300, ai_lookup 100 (resets ${proT.pools.ai_practice.resets_at})`);

  step('B5#7: renewal_failed; +3 days still Pro (grace); +8 days not Pro (on_hold)');
  await fake('renewal_failed', t1, T.id);
  check(subRow(t1, 'status') === 'grace', `status ${subRow(t1, 'status')}`);
  travel(t1, { current_period_end: "now() - interval '3 days'", grace_ends_at: "now() + interval '4 days'" });
  check(await plan(T.id) === 'pro', 'not Pro 3 days into grace');
  travel(t1, { current_period_end: "now() - interval '8 days'", grace_ends_at: "now() - interval '1 day'" });
  check(await plan(T.id) === 'free', 'still Pro 8 days after the failed renewal');
  maintenance();
  check(subRow(t1, 'status') === 'on_hold', `status after the job ${subRow(t1, 'status')}`);
  ok('grace: Pro at +3 days; free at +8 days; the job wrote on_hold');

  step('B5#8: fake renewed while on_hold → Pro again at once');
  await fake('renewed', t1, T.id, { ...month, transaction_id: `${t1}-r2` });
  check(await plan(T.id) === 'pro' && subRow(t1, 'status') === 'active', 'not Pro after renewed');
  ok('renewed → active, plan pro');

  step('B5#9: the same event sent twice → one row, applied once');
  const dup = randomUUID();
  const periodEnd = iso(60 * DAY);
  await fake('renewed', t1, T.id, { ...month, current_period_end: periodEnd, transaction_id: `${t1}-r3` }, dup);
  const endAfterFirst = subRow(t1, 'current_period_end');
  const again = await webhook({ baseUrl: BASE, secret: SECRET, events: [{ id: dup, type: 'renewed', environment: 'sandbox',
    subscription_id: t1, app_user_id: T.id, occurred_at: new Date().toISOString(), ...month, current_period_end: periodEnd,
    transaction_id: `${t1}-r3` }] });
  check(again.status === 200, `second send ${again.status}`);
  await sleep(1_000);
  check(psql(`SELECT count(*) || '|' || min(status) FROM billing_events WHERE external_event_id = '${dup}'`) === '1|applied', 'duplicate event rows');
  check(subRow(t1, 'current_period_end') === endAfterFirst, 'the duplicate changed the subscription');
  ok(`event ${dup}: one row, applied; second send acked (200) and changed nothing`);

  step('B5#10: an old expired after a newer renewed → stale, still Pro');
  const stale = await fake('expired', t1, T.id, { occurred_at: iso(-3_600_000) });
  check(stale.status === 'stale', `expired → ${stale.status}`);
  check(await plan(T.id) === 'pro', 'lost Pro to a stale expired');
  ok('expired (1 hour old) → stale; plan pro');

  step('B5#11: cancel_scheduled, then past the period end → Pro until the end, then free');
  await fake('cancel_scheduled', t1, T.id);
  check(subRow(t1, 'cancel_at_period_end') === 't' && await plan(T.id) === 'pro', 'cancel_scheduled');
  travel(t1, { current_period_end: "now() - interval '1 minute'" });
  check(await plan(T.id) === 'free', 'still Pro past the period end');
  maintenance();
  check(subRow(t1, 'status') === 'expired', `status after the job ${subRow(t1, 'status')}`);
  ok('Pro while cancel_at_period_end; free past the end; the job wrote expired');

  step('B5#12: refunded, then refund_reversed (the current transaction) → Pro lost, then back');
  const R2 = sqlUser('refund2');
  const q1 = subOf('q1');
  await fake('subscription_started', q1, R2.id, { ...month, transaction_id: `${q1}-tx` });
  check(await plan(R2.id) === 'pro', 'not Pro after the start');
  await fake('refunded', q1, R2.id, { transaction_id: `${q1}-tx` });
  check(await plan(R2.id) === 'free' && subRow(q1, 'status') === 'revoked', `after refunded: ${subRow(q1, 'status')}`);
  await fake('refund_reversed', q1, R2.id, { transaction_id: `${q1}-tx` });
  check(await plan(R2.id) === 'pro' && subRow(q1, 'status') === 'active', `after refund_reversed: ${subRow(q1, 'status')}`);
  ok('refunded → revoked (free); refund_reversed → active (pro)');

  step('B5#13: plan_change_scheduled (year → month), then plan_change_canceled → pending_interval appears and goes; Pro throughout');
  const Y = sqlUser('yearly');
  const y1 = subOf('y1');
  await fake('subscription_started', y1, Y.id, { interval: 'year', current_period_start: iso(0), current_period_end: iso(365 * DAY), transaction_id: `${y1}-tx` });
  await fake('plan_change_scheduled', y1, Y.id, { interval: 'month' });
  const scheduled = await view(Y.id);
  check(scheduled.plan === 'pro' && scheduled.sources.some((s) => s.kind === 'subscription' && s.pending_interval === 'month'), 'pending_interval month');
  await fake('plan_change_canceled', y1, Y.id);
  const canceled = await view(Y.id);
  check(canceled.plan === 'pro' && canceled.sources.every((s) => s.pending_interval === null), 'pending_interval not cleared');
  ok('pending_interval month after scheduled, null after canceled; plan pro all along');

  step('B5#28: a trial for an account that already used one (D30) → free in the trial, endTrialNow called; renewed → pro');
  const t2 = subOf('t2');
  await fake('subscription_started', t2, T.id, {
    interval: 'month', current_period_start: iso(0), current_period_end: iso(7 * DAY), trial_ends_at: iso(7 * DAY), payment_fingerprint: `fp2-${run}` });
  check(subRow(t2, 'status || \'|\' || trial_denied') === 'trialing|true', `t2 row ${subRow(t2, 'status, trial_denied')}`);
  check(await plan(T.id) === 'free', 'a reused trial gave Pro');
  await waitFor(() => psql(`SELECT end_trial_called_at IS NOT NULL FROM fake_billing_subscriptions WHERE external_subscription_id = '${t2}'`),
    (value) => value === 't', 'endTrialNow on the fake provider');
  let reuseLog = 'not checked (SMOKE_API_LOG not set)';
  if (process.env.SMOKE_API_LOG) {
    check(readFileSync(process.env.SMOKE_API_LOG, 'utf8').includes('trial_reuse_detected'), 'no trial_reuse_detected in the API log');
    reuseLog = 'trial_reuse_detected in the API log';
  }
  await fake('renewed', t2, T.id, { ...month, transaction_id: `${t2}-r1` });
  check(await plan(T.id) === 'pro', 'not Pro after renewed');
  ok(`trialing with trial_denied → plan free; fake end_trial_called_at set; ${reuseLog}; renewed → pro`);

  step('B5#29: an active subscription past its period with no event (D31) → Pro 3 days over; on_hold 11 days over');
  const O = sqlUser('overdue');
  const o1 = subOf('o1');
  await fake('subscription_started', o1, O.id, { ...month, transaction_id: `${o1}-tx` });
  travel(o1, { current_period_start: "now() - interval '33 days'", current_period_end: "now() - interval '3 days'" });
  maintenance();
  check(await plan(O.id) === 'pro', 'lost Pro 3 days past the period');
  travel(o1, { current_period_start: "now() - interval '41 days'", current_period_end: "now() - interval '11 days'" });
  check(await plan(O.id) === 'free', 'still Pro 11 days past the period');
  maintenance();
  check(subRow(o1, 'status') === 'on_hold', `status ${subRow(o1, 'status')}`);
  ok('3 days over: still Pro after the job; 11 days over: free, the job wrote on_hold');

  step('B5#30: expired, then renewed for a new period (R2) → pro again');
  const E = sqlUser('expired');
  const e1 = subOf('e1');
  await fake('subscription_started', e1, E.id, { ...month, transaction_id: `${e1}-tx` });
  await fake('expired', e1, E.id);
  check(await plan(E.id) === 'free' && subRow(e1, 'status') === 'expired', 'expired');
  await fake('renewed', e1, E.id, { ...month, transaction_id: `${e1}-r1` });
  check(await plan(E.id) === 'pro' && subRow(e1, 'status') === 'active', 'renewed after expired');
  ok('expired → free; renewed → active, pro');

  step('B5#33: a partial refund of the current period\'s transaction (D34) → Pro lost at once');
  const R = sqlUser('refund');
  const r1 = subOf('r1');
  await fake('subscription_started', r1, R.id, { ...month, transaction_id: `${r1}-tx` });
  check(await plan(R.id) === 'pro', 'not Pro after the start');
  await fake('refunded', r1, R.id, { transaction_id: `${r1}-tx`, amount: 1 });
  check(await plan(R.id) === 'free' && subRow(r1, 'status') === 'revoked', `after a partial refund: ${subRow(r1, 'status')}`);
  ok('refunded (amount 1) → revoked, plan free');

  // ------------------------------------------------------------------------------------------------------------------
  step('B5#14 / B5E1: ten parallel reserves for the last unit → exactly one reserved');
  const L1 = sqlUser('ledger1');
  await want(grant({ user_id: L1.id, kind: 'limits', limits: { ai_practice_per_cycle: 1 }, ends_at: iso(30 * DAY), reason: 'smoke:b5e1' }), 201, 'grant 1 AI unit');
  const raced = fakeAi(['reserve', '--user', L1.id, '--pool', 'ai_practice', '--op', `race-${run}`, '--parallel', '10']);
  const reservedCount = raced.filter((line) => line.result.state === 'reserved').length;
  const exhausted = raced.filter((line) => line.result.state === 'refused' && line.result.reason === 'quota-exhausted').length;
  check(raced.length === 10 && reservedCount === 1 && exhausted === 9, `race results ${JSON.stringify(raced.map((l) => l.result))}`);
  check(psql(`SELECT count(*) FROM usage_records WHERE user_id = '${L1.id}' AND status = 'reserved'`) === '1', 'reserved rows');
  ok('10 calls: 1 reserved, 9 quota-exhausted; one reserved row in usage_records (Free + 1 AI unit, B5E32)');

  step('B5#15: a reservation never confirmed, +3 minutes → the unit is back');
  check((await view(L1.id)).pools.ai_practice.remaining === 0, 'remaining is not 0 while reserved');
  psql(`UPDATE usage_records SET reserved_at = reserved_at - interval '3 minutes', expires_at = expires_at - interval '3 minutes'
    WHERE user_id = '${L1.id}' AND status = 'reserved'`);
  check((await view(L1.id)).pools.ai_practice.remaining === 1, 'the expired reservation still counts');
  ok('remaining 0 while reserved; 1 once expires_at passed');

  step('B5#20: admin sets "AI practice: 0" for a Pro user → reserve refused plan-required');
  const L2 = sqlUser('ledger2');
  await want(grant({ user_id: L2.id, kind: 'plan', plan: 'pro', ends_at: iso(30 * DAY), reason: 'smoke:b5#20' }), 201, 'grant Pro');
  await want(grant({ user_id: L2.id, kind: 'limits', limits: { ai_practice_per_cycle: 0 }, ends_at: iso(30 * DAY), reason: 'smoke:b5#20' }), 201, 'AI 0');
  const zero = reserve(L2.id, `zero-${run}`);
  check(zero.state === 'refused' && zero.reason === 'plan-required', `reserve → ${JSON.stringify(zero)}`);
  ok('plan pro + ai_practice_per_cycle 0 → reserve refused, reason plan-required (HTTP 403 entitlement-required)');

  step('B5#22: refund one confirmed unit → remaining +1; a second refund changes nothing');
  const L3 = sqlUser('ledger3');
  await want(grant({ user_id: L3.id, kind: 'plan', plan: 'pro', ends_at: iso(30 * DAY), reason: 'smoke:b5#22' }), 201, 'grant Pro');
  check(reserve(L3.id, `used-${run}`).state === 'reserved' && confirm(L3.id, `used-${run}`).state === 'confirmed', 'reserve + confirm');
  const before = (await view(L3.id)).pools.ai_practice.remaining;
  const report = randomUUID();
  const refund = (op) => fakeAi(['refund', '--user', L3.id, '--pool', 'ai_practice', '--op', op, '--report', report])[0].result;
  check(refund(`used-${run}`).refunded === true, 'first refund');
  const afterRefund = (await view(L3.id)).pools.ai_practice.remaining;
  refund(`used-${run}`);
  const afterSecond = (await view(L3.id)).pools.ai_practice.remaining;
  check(afterRefund === before + 1 && afterSecond === afterRefund, `remaining ${before} → ${afterRefund} → ${afterSecond}`);
  ok(`remaining ${before} → ${afterRefund} after the refund → ${afterSecond} after a second one`);

  step('B5E11: ten learners, one unit left in the system cap, ten parallel reserves → exactly one reserved');
  const ten = [];
  for (let i = 0; i < 10; i += 1) {
    const user = sqlUser(`cap${i}`);
    await want(grant({ user_id: user.id, kind: 'limits', limits: { ai_practice_per_cycle: 5 }, ends_at: iso(30 * DAY), reason: 'smoke:b5e11' }), 201, 'grant');
    ten.push(user);
  }
  const usageNow = await want(api('GET', '/v1/admin/entitlements/ai-usage', { token: admin }), 200, 'ai-usage');
  await settings('entitlements', { ai_daily_cap: usageNow.used + 1 });
  const capRace = fakeAi(['reserve', '--users', ten.map((u) => u.id).join(','), '--pool', 'ai_practice', '--op', `cap-${run}`, '--parallel', '10']);
  const capReserved = capRace.filter((line) => line.result.state === 'reserved').length;
  const unavailable = capRace.filter((line) => line.result.state === 'refused' && line.result.reason === 'ai-unavailable').length;
  check(capReserved === 1 && unavailable === 9, `cap race ${JSON.stringify(capRace.map((l) => l.result))}`);
  ok(`cap ${usageNow.used + 1} (used ${usageNow.used}): 1 reserved, 9 ai-unavailable across 10 learners`);

  step('B5#16: ai_daily_cap = 2, three learners reserve → two pass, the third is ai-unavailable; ai-usage alert_reached');
  // The earlier steps' units are moved to yesterday, so "today" starts at 0 (time passes, design §17 item 2).
  psql(`UPDATE usage_records SET system_date = system_date - 1 WHERE pool <> 'practice_sessions' AND system_date = '${vnToday()}'`);
  await settings('entitlements', { ai_daily_cap: 2 });
  const three = ten.slice(0, 3).map((user, i) => reserve(user.id, `c16-${run}-${i}`));
  check(three[0].state === 'reserved' && three[1].state === 'reserved' && three[2].state === 'refused' && three[2].reason === 'ai-unavailable',
    `three reserves ${JSON.stringify(three)}`);
  const usage = await want(api('GET', '/v1/admin/entitlements/ai-usage', { token: admin }), 200, 'ai-usage');
  check(usage.used === 2 && usage.cap === 2 && usage.alert_reached === true, `ai-usage ${JSON.stringify(usage)}`);
  ok(`reserved, reserved, ai-unavailable (retry after ${three[2].retry_after_seconds}s); ai-usage used 2/2, alert_reached true (no email, D36)`);

  step('B5#17: ai_enabled off → reserve ai-unavailable; a practice session without AI still opens');
  await settings('entitlements', { ai_enabled: false, ai_daily_cap: 1000 });
  const off = reserve(ten[5].id, `off-${run}`);
  check(off.state === 'refused' && off.reason === 'ai-unavailable' && off.retry_after_seconds === null, `reserve → ${JSON.stringify(off)}`);
  psql(`DELETE FROM usage_records WHERE user_id = '${pProfile.id}' AND pool = 'practice_sessions'`);
  await startOk();
  await settings('entitlements', { ai_enabled: true });
  ok('switch off: reserve → ai-unavailable with no Retry-After; P opened a session; switch back on, cap 1000');

  // ------------------------------------------------------------------------------------------------------------------
  step('B5#18: admin grants "Pro until a date" to a Free learner → pro at once; listed; revoked → free at once');
  const A = sqlUser('granted');
  const g18 = await want(grant({ user_id: A.id, kind: 'plan', plan: 'pro', ends_at: iso(10 * DAY), reason: 'smoke:b5#18' }), 201, 'grant');
  check(await plan(A.id) === 'pro', 'not Pro after the grant');
  const listed = await want(api('GET', `/v1/admin/entitlements/grants?user_id=${A.id}`, { token: admin }), 200, 'list');
  check(listed.items.some((g) => g.id === g18.id), 'grant not listed');
  await want(api('POST', `/v1/admin/entitlements/grants/${g18.id}/revoke`, { token: admin, body: { reason: 'smoke revoke' } }), 200, 'revoke');
  check(await plan(A.id) === 'free', 'still Pro after the revoke');
  ok(`grant ${g18.id}: pro, in the list; revoked → free`);

  step('B5#19: an editor grants to another editor / to themselves / sets AI units → 409 grant-not-allowed with the reason');
  const refused = async (body, reason) => {
    const problem = await wantProblem(grant(body, editor1.token), 409, 'grant-not-allowed', `editor grant (${reason})`);
    check(problem.reason === reason, `reason ${problem.reason}, expected ${reason}`);
  };
  await refused({ user_id: editor2.id, kind: 'plan', plan: 'pro', ends_at: iso(10 * DAY), reason: 'smoke' }, 'target-is-staff');
  await refused({ user_id: editor1.id, kind: 'plan', plan: 'pro', ends_at: iso(10 * DAY), reason: 'smoke' }, 'self-grant');
  await refused({ user_id: A.id, kind: 'limits', limits: { ai_practice_per_cycle: 10 }, ends_at: iso(10 * DAY), reason: 'smoke' }, 'ai-limits-admin-only');
  ok('target-is-staff, self-grant, ai-limits-admin-only');

  step('B5#21: filter the grant history by granted_by = editor and expiring_within_days = 7');
  const B = sqlUser('grantedB');
  const C = sqlUser('grantedC');
  const soon = await want(grant({ user_id: A.id, kind: 'plan', plan: 'pro', ends_at: iso(5 * DAY), reason: 'smoke:b5#21' }, editor1.token), 201, 'editor, 5 days');
  const late = await want(grant({ user_id: B.id, kind: 'plan', plan: 'pro', ends_at: iso(30 * DAY), reason: 'smoke:b5#21' }, editor1.token), 201, 'editor, 30 days');
  const byAdmin = await want(grant({ user_id: C.id, kind: 'plan', plan: 'pro', ends_at: iso(5 * DAY), reason: 'smoke:b5#21' }), 201, 'admin, 5 days');
  const filtered = await want(api('GET', `/v1/admin/entitlements/grants?granted_by=${editor1.id}&expiring_within_days=7`, { token: admin }), 200, 'filter');
  const ids = filtered.items.map((g) => g.id);
  check(ids.includes(soon.id) && !ids.includes(late.id) && !ids.includes(byAdmin.id), `filtered ${JSON.stringify(ids)}`);
  check(filtered.items.every((g) => g.granted_by === editor1.id && Date.parse(g.ends_at) <= Date.now() + 7 * DAY), 'a row outside the filter');
  ok(`${filtered.items.length} row(s): the editor's 5-day grant; not the editor's 30-day one, not the admin's`);

  step('B5#32: an editor revokes a grant carrying AI units (D33) → 409 ai-limits-admin-only');
  const aiGrant = await want(grant({ user_id: B.id, kind: 'limits', limits: { ai_lookup_per_cycle: 50 }, ends_at: iso(30 * DAY), reason: 'smoke:b5#32' }), 201, 'AI grant');
  const revokeRefused = await wantProblem(api('POST', `/v1/admin/entitlements/grants/${aiGrant.id}/revoke`, {
    token: editor1.token, body: { reason: 'smoke' } }), 409, 'grant-not-allowed', 'editor revoke');
  check(revokeRefused.reason === 'ai-limits-admin-only', `reason ${revokeRefused.reason}`);
  ok('409 grant-not-allowed, reason ai-limits-admin-only');

  step('B5#31: admin grants Pro to someone paying through an auto-renewing fake subscription (D32)');
  const S = sqlUser('paying');
  const s1 = subOf('s1');
  await fake('subscription_started', s1, S.id, { interval: 'month', current_period_start: iso(-10 * DAY), current_period_end: iso(20 * DAY), transaction_id: `${s1}-tx` });
  check(reserve(S.id, `s-used-${run}`).state === 'reserved' && confirm(S.id, `s-used-${run}`).state === 'confirmed', 'one unit used');
  check((await view(S.id)).pools.ai_practice.used === 1, 'used is not 1');
  const proGrant = { user_id: S.id, kind: 'plan', plan: 'pro', ends_at: iso(30 * DAY), reason: 'smoke:b5#31' };
  const unconfirmed = await wantProblem(grant(proGrant), 409, 'grant-not-allowed', 'grant without confirmation');
  check(unconfirmed.reason === 'target-has-paid-subscription', `reason ${unconfirmed.reason}`);
  const g31 = await want(grant({ ...proGrant, confirm_turn_off_paid_renewal: true }), 201, 'grant with confirmation');
  // The adapter call and paid_renewal_action run after the grant's transaction commits (R6).
  await waitFor(async () => (await view(S.id)).grants.find((g) => g.id === g31.id)?.paid_renewal_action,
    (value) => value === 'turned_off', 'paid_renewal_action turned_off');
  await waitFor(() => psql(`SELECT cancel_called_at IS NOT NULL FROM fake_billing_subscriptions WHERE external_subscription_id = '${s1}'`),
    (value) => value === 't', 'cancelAtPeriodEnd on the fake provider');
  const s31 = await view(S.id);
  check(s31.pools.ai_practice.used === 0 && s31.pools.ai_practice.remaining === s31.pools.ai_practice.limit, `pools ${JSON.stringify(s31.pools.ai_practice)}`);
  const resets31 = s31.pools.ai_practice.resets_at;
  check(Math.abs(Date.parse(resets31) - Date.parse(g31.starts_at) - 30 * DAY) <= 3 * DAY, `resets_at ${resets31} vs grant start ${g31.starts_at}`);
  ok(`without confirmation → 409 target-has-paid-subscription; with it → 201, paid_renewal_action turned_off, fake cancel_called_at set; `
    + `new anchor ${g31.starts_at} → ai_practice used 0 of ${s31.pools.ai_practice.limit}`);

  step('B5#35: admin moves the running Pro grant\'s ends_at one month later (D38)');
  const newEnd = new Date(Date.parse(g31.ends_at) + 30 * DAY).toISOString();
  await want(api('PATCH', `/v1/admin/entitlements/grants/${g31.id}`, { token: admin, body: { ends_at: newEnd, reason: 'smoke: one more month' } }), 200, 'PATCH');
  const s35 = await view(S.id);
  const source = s35.sources.find((s) => s.id === g31.id);
  check(source && source.ends_at === newEnd, `source ${JSON.stringify(source)}`);
  check(s35.pools.ai_practice.resets_at === resets31, `AI cycle moved: ${s35.pools.ai_practice.resets_at} vs ${resets31}`);
  const changed = s35.grants.find((g) => g.id === g31.id);
  check(changed.changes.length === 1 && changed.changes[0].new_ends_at === newEnd && changed.changes[0].old_ends_at === g31.ends_at, 'changes');
  ok(`ends_at ${g31.ends_at} → ${newEnd}; AI cycle unchanged (resets ${resets31}); one row in changes`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B5#24: private_words_per_user lowered below what P has (rows made with SQL, R13) → old words kept, new ones refused');
  psql(`INSERT INTO entries (lemma, pos, scope, owner_user_id)
    SELECT 'zx${letters(4)}' || g, 'noun', 'private', '${pProfile.id}' FROM generate_series(1, 1000) g`);
  const owned = () => Number(psql(`SELECT count(*) FROM entries WHERE scope = 'private' AND owner_user_id = '${pProfile.id}'`));
  const ownedBefore = owned();
  await settings('content', { private_words_per_user: 1000 });
  await wantProblem(api('POST', '/v1/quick-add', { token: P, idem: true, body: { group_id: group.id, new_word: { lemma: `zy${letters(6)}`, meaning: 'ngọn cỏ' } } }),
    409, 'private-word-limit-reached', 'quick-add over the limit');
  check(owned() === ownedBefore, `private words ${ownedBefore} → ${owned()}`);
  await settings('content', { private_words_per_user: 10000 });
  ok(`P owns ${ownedBefore} private words; limit 1000 → a new one is 409 private-word-limit-reached, the ${ownedBefore} stay; limit back to 10000`);

  step('B5#25: ads_enabled on → Free shows ads with the frequency; Pro and trial do not');
  const TR = sqlUser('trialing');
  await fake('subscription_started', subOf('tr1'), TR.id, {
    interval: 'month', current_period_start: iso(0), current_period_end: iso(7 * DAY), trial_ends_at: iso(7 * DAY), payment_fingerprint: `fp3-${run}` });
  await settings('entitlements', { ads_enabled: true });
  const freeAds = (await me()).ads;
  const proView = await view(S.id);
  const trialView = await view(TR.id);
  check(freeAds.show === true && freeAds.interstitial_per_day === 3 && freeAds.min_interval_minutes === 10, `Free ads ${JSON.stringify(freeAds)}`);
  check(proView.plan === 'pro' && proView.ads.show === false && trialView.plan === 'trial' && trialView.ads.show === false, 'Pro/trial ads');
  await settings('entitlements', { ads_enabled: false });
  ok('Free: show, 3 a day, 10 minutes apart; Pro: no; trial: no; switch back off');

  step('B5#26: webhook with a wrong signature → 400, no event row');
  const badId = randomUUID();
  const bad = await webhook({ baseUrl: BASE, secret: SECRET, badSignature: true, events: [{ id: badId, type: 'expired', environment: 'sandbox',
    subscription_id: subOf('y1'), app_user_id: Y.id, occurred_at: new Date().toISOString() }] });
  check(bad.status === 400, `bad signature → ${bad.status}`);
  check(psql(`SELECT count(*) FROM billing_events WHERE external_event_id = '${badId}'`) === '0', 'a row was stored');
  ok('400; 0 rows for that event id');

  step('B5#27: an editor reads GET /v1/admin/entitlements/ai-usage → 403 forbidden');
  await wantProblem(api('GET', '/v1/admin/entitlements/ai-usage', { token: editor1.token }), 403, 'forbidden', 'editor ai-usage');
  ok('403 forbidden');

  console.log(`\nALL CHECKS PASSED in ${Date.now() - started}ms (run id ${run}; fetchState ${MODE === 'true' ? 'ON' : 'OFF'})`);
}

main().catch((error) => {
  console.error('\nSMOKE TEST FAILED:', error.message);
  process.exitCode = 1;
});
