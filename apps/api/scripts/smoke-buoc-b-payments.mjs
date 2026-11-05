// Smoke test for launch prep B, M1 (plan 2026-11-04-chuan-bi-launch-b, Task 14) against a REAL running API + worker on a fresh database
// (`english_learning_smoke_lb_pay`): orders, the fake payOS and its checkout page, webhooks, the reconcile job and the return-page check,
// the order rules T1–T14 and the period maths — everything the unit tests only prove with fakes. Postgres, Redis, the lock order and the
// races are real here (Review Focus 1: one transfer reaching the webhook and the return page at once must give ONE period).
//
// Start the stack first: `docker compose up -d` (repo root); `pnpm db:setup` on the fresh database; `pnpm build`; then ONE environment for
// everything (the script runs the maintenance CLI with the environment it was started with, so it must be the API's): API and worker started
// with `PAYOS_FAKE_ENABLED=true BILLING_FAKE_SECRET=<gen-secret> BILLING_FAKE_ENABLED=true MAINTENANCE_ENABLED=false TURNSTILE_MODE=fake`,
// a `JOB_QUEUE_PREFIX` of its own, `PORT`, `PROBLEM_TYPE_BASE=<BASE>/problems/` (the fake checkout page is built on it) and
// `LEARNER_APP_URL` = SMOKE_LEARNER_URL; then `pnpm smoke:buoc-b-payments`. Needs `docker compose -p english-learning` for psql.
// SMOKE_CONTINUE=1 prints a PASS/FAIL per step and keeps going.
//
// Accounts are inserted with psql (registration allows 5 per IP per hour); their password hash is made here with the API's own argon2
// options, so they sign in through the real login route.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import argon2 from 'argon2';
import { SMOKE_TURNSTILE_TOKEN, requireFakeTurnstile } from './smoke-turnstile.mjs';

// Launch prep A: login needs a Turnstile token; the API under test runs with TURNSTILE_MODE=fake.
requireFakeTurnstile();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const CONTINUE = process.env.SMOKE_CONTINUE === '1';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-LB-Pass-9!';
const DAY = 86_400_000;
const run = randomUUID().slice(0, 8);

const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
for (const key of ['DATABASE_URL', 'BILLING_FAKE_SECRET']) if (!process.env[key] && fileEnv[key]) process.env[key] = fileEnv[key];
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
if (!process.env.BILLING_FAKE_SECRET) throw new Error('BILLING_FAKE_SECRET is not set (env or .env).');
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);
// The script deletes accounts, inserts rows and moves dates: never against a working database.
if (!DB_NAME.includes('smoke')) throw new Error(`Refusing to run against "${DB_NAME}": use a fresh smoke database (english_learning_smoke_lb_pay).`);
if (process.env.PAYOS_FAKE_ENABLED !== 'true') throw new Error('PAYOS_FAKE_ENABLED=true must be set in this shell (and in the API).');

const { signPayosData } = await import(pathToFileURL(`${process.cwd()}/dist/entitlements/billing/payos/payos-signature.js`).href);
/** The fake payOS signs with the fake billing secret, as text (design §3.3). */
const CHECKSUM_KEY = Buffer.from(process.env.BILLING_FAKE_SECRET, 'base64url').toString('hex');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ok = (detail) => console.log(`    ok — ${detail}`);
function check(condition, message) { if (!condition) throw new Error(message); }

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
async function read(res) {
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, json, text, headers: res.headers };
}
const brief = (res) => `${res.status} ${res.text.replace(/"(access_token|refresh_token)":"[^"]*"/g, '"$1":"<redacted>"').slice(0, 300)}`;

async function api(method, path, { token, body, idem = false, headers: extra = {} } = {}) {
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idem) headers['Idempotency-Key'] = idem === true ? randomUUID() : idem;
  for (let attempt = 0; ; attempt += 1) {
    const res = await send(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.status !== 429 || attempt >= 5) return read(res);
    const wait = Number(res.headers.get('retry-after') ?? '5');
    console.log(`    (429 on ${method} ${path}; waiting ${wait}s)`);
    await sleep(wait * 1000 + 250);
  }
}
async function want(promise, status, context) {
  const res = await promise;
  if (res.status !== status) throw new Error(`${context}: expected ${status}, got ${brief(res)}`);
  return res.json;
}
async function wantProblem(promise, status, type, context) {
  const res = await promise;
  const got = String(res.json?.type ?? '');
  if (res.status !== status || (type && !got.endsWith(`/${type}`))) throw new Error(`${context}: expected ${status}${type ? ` ${type}` : ''}, got ${brief(res)}`);
  return res;
}

const psqlArgs = ['compose', '-p', 'english-learning', 'exec', '-T', 'postgres', 'psql', '-U', 'dev', '-d', DB_NAME, '-v', 'ON_ERROR_STOP=1', '-tA'];
function psql(sql) { return execFileSync('docker', [...psqlArgs, '-c', sql], { encoding: 'utf8' }).trim(); }
async function waitFor(readValue, done, what, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await readValue();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`${what} did not happen within ${timeoutMs}ms: ${JSON.stringify(value)}`);
    await sleep(250);
  }
}
/** The CLIs read the environment this script was started with (the API's). */
function cli(file, args = []) {
  return execFileSync(process.execPath, [`dist/cli/${file}`, ...args], { encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
}
const maintenance = () => cli('run-maintenance.js');
const resetLimits = () => psql('DELETE FROM rate_limit_counters');

// --- accounts ----------------------------------------------------------------------------------------------------------------
let passwordHash;
async function sqlUsers(labels, { staffRole = null } = {}) {
  passwordHash ??= await argon2.hash(PASSWORD.normalize('NFC'), { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const rows = labels.map((label) => `('smokelb-${label}-${run}@example.com', '${TIMEZONE}', now(), 'vi', ${staffRole ? `'${staffRole}'` : 'NULL'},
    'active', 'Lan', DATE '1999-01-01', now(), now(), 'smoke')`);
  const out = psql(`WITH u AS (INSERT INTO users (email, timezone, email_verified_at, native_language, staff_role, status, given_name, birth_date, created_at, terms_accepted_at, terms_version)
    VALUES ${rows.join(', ')} RETURNING id, email), c AS (INSERT INTO password_credentials (user_id, hash) SELECT id, '${passwordHash}' FROM u)
    SELECT id || '|' || email FROM u`);
  const users = out.split('\n').map((line) => { const [id, email] = line.split('|'); return { id, email }; });
  check(users.length === labels.length && users.every((u) => /^[0-9a-f-]{36}$/.test(u.id)), `sqlUsers: ${out}`);
  return labels.map((label) => users.find((u) => u.email === `smokelb-${label}-${run}@example.com`));
}
async function signIn(user) {
  const body = await want(api('POST', '/v1/auth/login', { body: { email: user.email, password: PASSWORD, client: 'web', turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 200, `login ${user.email}`);
  return { ...user, token: body.access_token };
}

// --- orders and the fake payOS ------------------------------------------------------------------------------------------------
let PRICES;
const buy = (user, months, expected) =>
  api('POST', '/v1/me/orders', { token: user.token, idem: true, body: { period_months: months, expected_amount: expected ?? PRICES[String(months)], locale: 'vi' } });
async function createOrder(user, months) {
  const created = await want(buy(user, months), 201, `buy ${months} months`);
  check(/\/v1\/dev\/payos\/checkout\?order=\d+$/.test(created.checkout_url), `checkout url ${created.checkout_url}`);
  return { id: created.order_id, url: created.checkout_url, code: Number(new URL(created.checkout_url).searchParams.get('order')) };
}
/** The buttons of the fake page: `paid`, `short` or `cancel`, with or without the webhook. */
async function page(order, action, { webhook = true } = {}) {
  const res = await send(`${order.url}&action=${action}${webhook ? '' : '&webhook=0'}`, { redirect: 'manual' });
  check([200, 302].includes(res.status), `fake page ${action}: ${res.status} ${await res.text()}`);
  return res;
}
const orderRow = (id, columns) => psql(`SELECT ${columns} FROM billing_orders WHERE id = '${id}'`);
const periodsOf = (orderId) => Number(psql(`SELECT count(*) FROM prepaid_periods WHERE order_id = '${orderId}'`));
const paymentsOf = (orderId) => Number(psql(`SELECT count(*) FROM billing_order_payments WHERE order_id = '${orderId}'`));
const view = (user, id) => want(api('GET', `/v1/me/orders/${id}`, { token: user.token }), 200, `GET order ${id}`);
const entitlements = (user) => want(api('GET', '/v1/me/entitlements', { token: user.token }), 200, 'GET entitlements');
const checkOrder = (user, id) => api('POST', `/v1/me/orders/${id}/check`, { token: user.token });
/** The transactions the fake payOS holds for the order, as getCheckout would list them. */
const fakeTransactions = (code) => JSON.parse(psql(`SELECT transactions::text FROM fake_payos_links WHERE order_code = ${code}`));
const fakeLink = (code) => psql(`SELECT payment_link_id FROM fake_payos_links WHERE order_code = ${code}`);

/** A signed webhook for one transfer, sent to the real route (what payOS would POST). */
async function postWebhook(order, transaction, { amount, success = true } = {}) {
  const data = {
    orderCode: order.code, amount: amount ?? transaction.amount, description: 'WMSMOKE', accountNumber: '0000000000', reference: transaction.reference,
    transactionDateTime: transaction.transactionDateTime, currency: 'VND', paymentLinkId: fakeLink(order.code), code: '00', desc: 'Thành công',
    counterAccountBankId: 'FAKE', counterAccountBankName: 'Fake Bank', counterAccountName: 'NGUYEN VAN FAKE', counterAccountNumber: '0000000001',
    virtualAccountName: '', virtualAccountNumber: '',
  };
  const body = JSON.stringify({ code: '00', desc: 'success', success, data, signature: signPayosData(data, CHECKSUM_KEY) });
  return read(await send(`${BASE}/v1/billing/webhooks/payos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
}
const eventStatus = (code, reference) => psql(`SELECT status FROM billing_events WHERE dedupe_key = 'payos:sandbox:${code}:${reference}'`);

// --- the run -------------------------------------------------------------------------------------------------------------------
const results = [];
let stepNo = 0;
async function step(code, name, body) {
  stepNo += 1;
  resetLimits();
  console.log(`\n[${stepNo}] ${new Date().toISOString().slice(11, 19)}Z ${code}: ${name}`);
  try {
    await body();
    results.push({ code, status: 'PASS' });
  } catch (error) {
    console.log(`    FAILED — ${error.message}`);
    results.push({ code, status: 'FAIL', reason: error.message.split('\n')[0] });
    if (!CONTINUE) throw error;
  }
}

async function main() {
  const started = Date.now();
  const [admin, lan, ann, bao, cuong, dung, eva] = await sqlUsers(['admin', 'lan', 'ann', 'bao', 'cuong', 'dung', 'eva'], {});
  psql(`UPDATE users SET staff_role = 'admin' WHERE id = '${admin.id}'`);
  const S = { admin: await signIn(admin) };
  for (const [label, user] of Object.entries({ lan, ann, bao, cuong, dung, eva })) S[label] = await signIn(user);
  const config = await want(api('GET', '/v1/me/app-config', { token: S.lan.token }), 200, 'app-config');
  PRICES = config.plans.pro.prices;
  check(PRICES && PRICES['1'] === 79000 && PRICES['3'] === 199000 && PRICES['12'] === 599000, `prices ${JSON.stringify(PRICES)}`);

  await step('LB1A1', 'Lan buys 1 month through the fake page: paid by webhook, one period from now, Pro, a purchase row of 79.000 ₫ "month"', async () => {
    const order = await createOrder(S.lan, 1);
    check((await view(S.lan, order.id)).status === 'pending', 'a new order is pending');
    check(orderRow(order.id, 'amount_minor, currency, description, environment') === `79000|VND|${psql(`SELECT description FROM billing_orders WHERE id = '${order.id}'`)}|sandbox`, 'amount, currency or environment');
    const res = await page(order, 'paid');
    check(res.status === 302 && new URL(res.headers.get('location')).searchParams.get('status') === 'PAID', `the page sends the browser back with status PAID: ${res.headers.get('location')}`);
    const done = await view(S.lan, order.id);
    check(done.status === 'paid' && done.period !== null, `order ${JSON.stringify(done)}`);
    check(orderRow(order.id, 'paid_via') === 'webhook', 'paid_via webhook');
    const e = await entitlements(S.lan);
    check(e.plan === 'pro' && e.sources.some((s) => s.kind === 'prepaid') && e.pro_until === done.period.ends_at, `entitlements ${JSON.stringify({ plan: e.plan, pro_until: e.pro_until })}`);
    const end = new Date(done.period.ends_at);
    check(end.getTime() > Date.now() + 28 * DAY && end.getTime() < Date.now() + 33 * DAY, `period end ${done.period.ends_at}`);
    check(psql(`SELECT interval || '|' || amount_minor || '|' || kind || '|' || status FROM billing_transactions WHERE user_id = '${S.lan.id}'`) === 'month|79000|purchase|succeeded', 'purchase row');
    check(psql(`SELECT provider_transaction_id ~ '^${order.code}:FAKE' FROM billing_transactions WHERE user_id = '${S.lan.id}'`) === 't', 'provider_transaction_id is <orderCode>:<reference>');
    ok(`paid, period to ${done.period.ends_at}, Pro, one purchase row`);
    S.lan.first = { order, done, tx: fakeTransactions(order.code)[0] };
  });

  await step('LB1E1', 'the same webhook sent again, and a second delivery of it: still one period, one payment', async () => {
    const { order, tx } = S.lan.first;
    const second = await postWebhook(order, tx);
    check(second.status === 200, `duplicate webhook: ${brief(second)}`);
    await sleep(1_000);
    check(periodsOf(order.id) === 1 && paymentsOf(order.id) === 1, 'a second period or payment appeared');
    check(psql(`SELECT count(*) FROM billing_events WHERE dedupe_key = 'payos:sandbox:${order.code}:${tx.reference}'`) === '1', 'a second inbox row');
    ok('one inbox row, one payment, one period');
  });

  await step('LB1E22', 'a webhook with a wrong signature is 400 and writes nothing; payOS’s own test webhook (orderCode 123) is 200 and ignored as unknown-order', async () => {
    const { order } = S.lan.first;
    const before = psql('SELECT count(*) FROM billing_events');
    const data = { orderCode: order.code, amount: 1, reference: 'FORGED', paymentLinkId: 'x', code: '00' };
    const forged = await read(await send(`${BASE}/v1/billing/webhooks/payos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, data, signature: 'f'.repeat(64) }) }));
    check(forged.status === 400, `forged: ${brief(forged)}`);
    check(psql('SELECT count(*) FROM billing_events') === before, 'a forged webhook was stored');
    // payOS's confirm-webhook sample: an order code (123) nobody has, signed with the key.
    const data123 = { orderCode: 123, amount: 3000, description: 'VQRIO123', accountNumber: '12345678', reference: 'TF230204212323', transactionDateTime: '2023-02-04 18:25:00', currency: 'VND', paymentLinkId: '124c33293c43417ab7879e14c8d9eb18', code: '00', desc: 'Thành công' };
    const sampleBody = JSON.stringify({ code: '00', desc: 'success', success: true, data: data123, signature: signPayosData(data123, CHECKSUM_KEY) });
    const sample = await read(await send(`${BASE}/v1/billing/webhooks/payos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sampleBody }));
    check(sample.status === 200, `test webhook: ${brief(sample)}`);
    await waitFor(() => psql(`SELECT status FROM billing_events WHERE dedupe_key = 'payos:sandbox:123:TF230204212323'`), (s) => s === 'ignored', 'the test webhook ignored');
    check(psql(`SELECT error FROM billing_events WHERE dedupe_key = 'payos:sandbox:123:TF230204212323'`) === 'unknown-order', 'reason unknown-order');
    ok('forged → 400 nothing stored; sample → 200 and ignored (unknown-order)');
  });

  await step('LB1A3', 'the transfer is made but the webhook never comes: the return page asks payOS once, the order becomes paid (reconcile), and F5 does not ask again within 10 s', async () => {
    const order = await createOrder(S.ann, 1);
    await page(order, 'paid', { webhook: false });
    check((await view(S.ann, order.id)).status === 'pending', 'still pending without the webhook');
    const first = await want(checkOrder(S.ann, order.id), 200, 'check');
    check(first.status === 'paid' && first.period !== null, `check → ${JSON.stringify(first)}`);
    check(orderRow(order.id, 'paid_via') === 'reconcile', 'paid_via reconcile');
    check(periodsOf(order.id) === 1 && psql(`SELECT count(*) FROM billing_transactions WHERE user_id = '${S.ann.id}'`) === '1', 'one period, one purchase');
    const again = await want(checkOrder(S.ann, order.id), 200, 'check again');
    check(again.status === 'paid', 'the order stays paid');
    ok('check found the money: paid by reconcile, one period');
  });

  await step('LB1E46', 'F5 on the return page of a pending order asks payOS at most once per 10 seconds', async () => {
    const order = await createOrder(S.bao, 1);
    const stamp = () => orderRow(order.id, "coalesce(extract(epoch from checked_at)::text, '')");
    check(stamp() === '', 'never asked yet');
    await want(checkOrder(S.bao, order.id), 200, 'check 1');
    const first = stamp();
    check(first !== '', 'checked_at written by the first check');
    for (let i = 0; i < 4; i += 1) await want(checkOrder(S.bao, order.id), 200, `check ${i + 2}`);
    check(stamp() === first, 'checked_at moved: payOS was asked again within 10 s');
    await want(api('POST', `/v1/me/orders/${randomUUID()}/check`, { token: S.bao.token }), 404, 'another order');
    const other = await api('POST', `/v1/me/orders/${order.id}/check`, { token: S.ann.token });
    check(other.status === 404, `another learner’s order: ${brief(other)}`);
    S.bao.pending = order;
    ok('one ask per 10 s; another learner’s order is 404');
  });

  await step('LB1A4', 'neither webhook nor return page: the hourly job finds the money (reconcile), through the real maintenance CLI', async () => {
    const order = await createOrder(S.cuong, 3);
    await page(order, 'paid', { webhook: false });
    psql(`UPDATE billing_orders SET created_at = now() - interval '10 minutes', checked_at = NULL WHERE id = '${order.id}'`);
    maintenance();
    const done = await waitFor(() => view(S.cuong, order.id), (v) => v.status === 'paid', 'the job paid the order');
    check(orderRow(order.id, 'paid_via') === 'reconcile' && done.period !== null, `order ${JSON.stringify(done)}`);
    check(psql(`SELECT interval || '|' || amount_minor FROM billing_transactions WHERE user_id = '${S.cuong.id}'`) === 'quarter|199000', 'a 3-month purchase is a quarter of 199.000 ₫');
    ok('paid by the job; 3 months is interval quarter');
  });

  await step('Review Focus 1', 'the webhook and the return page for the SAME transfer at the same time (Promise.all, ×5 orders): always exactly one period', async () => {
    for (let round = 0; round < 5; round += 1) {
      const learner = round === 0 ? S.dung : S.lan;
      const order = await createOrder(learner, 1);
      await page(order, 'paid', { webhook: false });
      const tx = fakeTransactions(order.code)[0];
      const [hook, ask] = await Promise.all([postWebhook(order, tx), checkOrder(learner, order.id)]);
      check(hook.status === 200 && ask.status === 200, `webhook ${hook.status}, check ${ask.status}`);
      await waitFor(() => eventStatus(order.code, tx.reference), (s) => s !== '' && s !== 'pending', `round ${round}: the event applied`);
      await waitFor(() => view(learner, order.id), (v) => v.status === 'paid', `round ${round}: paid`);
      check(periodsOf(order.id) === 1, `round ${round}: ${periodsOf(order.id)} periods for one transfer`);
      check(paymentsOf(order.id) === 1, `round ${round}: ${paymentsOf(order.id)} payment rows`);
      check(psql(`SELECT count(*) FROM billing_transactions WHERE provider_transaction_id = '${order.code}:${tx.reference}'`) === '1', `round ${round}: purchase rows`);
    }
    ok('5 races, 5 times one period, one payment, one purchase row');
  });

  await step('LB1E7 + LB1E26', 'Lan (already Pro) buys 12 months: the new period starts where the running one ends; the second transfer into a paid order is a second period', async () => {
    const e0 = await entitlements(S.ann);
    const order = await createOrder(S.ann, 12);
    await page(order, 'paid');
    const e1 = await entitlements(S.ann);
    check(e1.plan === 'pro' && e1.upcoming_periods.length === 1, `upcoming ${JSON.stringify(e1.upcoming_periods)}`);
    check(e1.upcoming_periods[0].starts_at === e0.pro_until, `the new period starts at ${e1.upcoming_periods[0].starts_at}, the old one ends at ${e0.pro_until}`);
    const end = new Date(e1.pro_until);
    check(end.getTime() > Date.now() + 390 * DAY && end.getTime() < Date.now() + 400 * DAY, `pro_until ${e1.pro_until}`);
    // The second transfer of the same amount into the now paid 12-month order (a new reference, its own webhook): T8, a period that follows.
    // The fake writes the moment in whole seconds, and the same amount at the same second is the same transfer (review I2): wait it out.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await page(order, 'paid');
    check(periodsOf(order.id) === 2, `periods of the order: ${periodsOf(order.id)}`);
    const e2 = await entitlements(S.ann);
    check(e2.upcoming_periods.length === 2 && e2.upcoming_periods[1].starts_at === e2.upcoming_periods[0].ends_at, `chain ${JSON.stringify(e2.upcoming_periods)}`);
    S.ann.chain = e2;
    ok('periods follow end to start; pro_until is the end of the chain');
  });

  await step('LB1E33', 'admin revokes the middle period of a chain: the next one does not move, Lan is Pro until the end of the first period only', async () => {
    const e = S.ann.chain;
    const middle = e.upcoming_periods[0];
    await want(api('POST', `/v1/admin/prepaid-periods/${middle.id}/revoke`, { token: S.admin.token, idem: true, body: { reason: 'recorded on the wrong learner' } }), 200, 'revoke');
    const after = await entitlements(S.ann);
    check(after.pro_until === middle.starts_at, `pro_until ${after.pro_until}, expected ${middle.starts_at} (the end of the first period)`);
    check(after.upcoming_periods.length === 1 && after.upcoming_periods[0].starts_at === e.upcoming_periods[1].starts_at, 'the later period moved');
    await wantProblem(api('POST', `/v1/admin/prepaid-periods/${middle.id}/revoke`, { token: S.admin.token, idem: true, body: { reason: 'again' } }), 409, 'period-already-revoked', 'revoke again');
    ok('gap after the revoke; the later period keeps its dates; revoking twice is 409');
  });

  await step('LB1E9', 'a short payment then the rest: needs_review amount-short, then paid with one period', async () => {
    const order = await createOrder(S.bao, 1);
    await page(order, 'short');
    check(orderRow(order.id, 'status || \'|\' || coalesce(review_reason, \'\')') === 'needs_review|amount-short', 'after the short payment');
    check(periodsOf(order.id) === 0, 'no period yet');
    await page(order, 'paid');
    check(orderRow(order.id, 'status || \'|\' || coalesce(review_reason, \'\')') === 'paid|', 'after the rest');
    check(periodsOf(order.id) === 1 && paymentsOf(order.id) === 2, `periods ${periodsOf(order.id)}, payments ${paymentsOf(order.id)}`);
    ok('short → needs_review amount-short; rest → paid, one period, two payments');
  });

  await step('LB1E3 + LB1E5 + LB1E6', 'admin confirms first; the same transfer by webhook is attached (no new period); pressing it twice is 409 order-already-paid', async () => {
    const order = await createOrder(S.dung, 1);
    const confirmed = await want(api('POST', `/v1/admin/orders/${order.id}/confirm-payment`, { token: S.admin.token, idem: true, body: { reference: 'FT2611-BANK', amount: 79000, reason: 'saw it in the bank app' } }), 200, 'confirm');
    check(confirmed.status === 'paid' && confirmed.periods.length === 1 && confirmed.payments[0].source === 'manual', `confirmed ${JSON.stringify(confirmed).slice(0, 200)}`);
    check(orderRow(order.id, 'paid_via') === 'manual', 'paid_via manual');
    await wantProblem(api('POST', `/v1/admin/orders/${order.id}/confirm-payment`, { token: S.admin.token, idem: true, body: { reference: 'FT2611-BANK', amount: 79000, reason: 'again' } }), 409, 'order-already-paid', 'confirm twice');
    await page(order, 'paid');
    check(periodsOf(order.id) === 1, `the webhook opened another period: ${periodsOf(order.id)}`);
    check(psql(`SELECT string_agg(outcome, ',' ORDER BY received_at) FROM billing_order_payments WHERE order_id = '${order.id}'`) === 'opened-period,attached', 'outcomes');
    const detail = await want(api('GET', `/v1/admin/orders/${order.id}`, { token: S.admin.token }), 200, 'admin detail');
    check(detail.review_reason === null && detail.payments.length === 2, 'no flag on an attached payment');
    const list = await want(api('GET', `/v1/admin/orders?status=paid&q=${detail.description.slice(0, 6)}`, { token: S.admin.token }), 200, 'admin list');
    check(list.items.some((i) => i.id === order.id), 'the admin list finds the order by its transfer note');
    ok('confirmed by hand; the webhook attached to it; 409 on the second press; the list finds it');
  });

  await step('LB1E17 + LB1E18', 'payOS (the fake) fails while the link is made: order failed, 503 provider-unavailable, the key is freed and the next press is a new order; the job cancels the stray link', async () => {
    const next = Number(psql("SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END FROM billing_order_code_seq"));
    psql(`INSERT INTO fake_payos_links (order_code, payment_link_id, amount, status, expires_at, return_url, cancel_url) VALUES (${next}, 'collide-${run}', 1000, 'PENDING', now() + interval '15 minutes', 'http://x', 'http://x')`);
    const key = randomUUID();
    const failed = await api('POST', '/v1/me/orders', { token: S.cuong.token, idem: key, body: { period_months: 1, expected_amount: PRICES['1'], locale: 'vi' } });
    check(failed.status === 503 && String(failed.json?.type).endsWith('/provider-unavailable'), `create: ${brief(failed)}`);
    check(psql(`SELECT status FROM billing_orders WHERE order_code = ${next}`) === 'failed', 'the failed order');
    const again = await api('POST', '/v1/me/orders', { token: S.cuong.token, idem: key, body: { period_months: 1, expected_amount: PRICES['1'], locale: 'vi' } });
    check(again.status === 201 && Number(new URL(again.json.checkout_url).searchParams.get('order')) === next + 1, `the same key again: ${brief(again)}`);
    maintenance();
    check(psql(`SELECT status FROM fake_payos_links WHERE order_code = ${next}`) === 'CANCELLED', 'the job cancelled the stray link');
    check(psql(`SELECT status FROM billing_orders WHERE order_code = ${next}`) === 'failed', 'the failed order stays failed');
    ok('503, key freed, new order with the next code; the stray link cancelled by the job');
  });

  await step('LB1E28', 'a price that changed since Lan looked → 409 price-changed; the admin price change after an order leaves the order alone', async () => {
    const problem = await wantProblem(buy(S.lan, 1, 78000), 409, 'price-changed', 'old price');
    check(problem.json.current_amount === 79000, `current_amount ${problem.json.current_amount}`);
    await wantProblem(api('POST', '/v1/me/orders', { token: S.lan.token, idem: true, body: { period_months: 2, expected_amount: 1, locale: 'vi' } }), 400, 'validation-failed', 'two months');
    ok('409 with the current amount; 2 months is 400');
  });

  await step('LB1E36 + LB1E39', 'the learner deletes the account with an order waiting; the money arrives after: needs_review account-deleted, the payer saved on the order, no period, no purchase row, no payer left in the stored event', async () => {
    const order = await createOrder(S.bao, 1);
    S.bao.pending = order;
    const res = await api('POST', '/v1/me/account/delete', { token: S.bao.token, body: { confirm_email: S.bao.email, acknowledged: true, password: PASSWORD } });
    check(res.status === 204, `delete ${brief(res)}`);
    check(psql(`SELECT count(*) FROM users WHERE id = '${S.bao.id}'`) === '0', 'the user is gone');
    check(psql(`SELECT user_id <> '${S.bao.id}' FROM billing_orders WHERE id = '${order.id}'`) === 't', 'the order keeps a random id');
    await page(order, 'paid');
    check(orderRow(order.id, "status || '|' || review_reason") === 'needs_review|account-deleted', `order ${orderRow(order.id, 'status, review_reason')}`);
    check(orderRow(order.id, 'refund_payer_name') === 'NGUYEN VAN FAKE' && orderRow(order.id, 'refund_payer_bank') === 'Fake Bank', 'payer saved on the order');
    check(periodsOf(order.id) === 0, 'a period for a deleted learner');
    check(psql(`SELECT count(*) FROM billing_transactions WHERE provider_transaction_id LIKE '${order.code}:%'`) === '0', 'a purchase row for a deleted learner');
    const tx = fakeTransactions(order.code)[0];
    const event = psql(`SELECT (payload ? 'payer')::text || '|' || (raw_payload::text LIKE '%counterAccount%')::text || '|' || status FROM billing_events WHERE dedupe_key = 'payos:sandbox:${order.code}:${tx.reference}'`);
    check(event === 'false|false|applied', `stored event: ${event} (payer in payload | payer in raw | status)`);
    const detail = await want(api('GET', `/v1/admin/orders/${order.id}`, { token: S.admin.token }), 200, 'admin detail');
    check(detail.refund?.payer_name === 'NGUYEN VAN FAKE' && detail.user.email === null, 'admin sees the refund information and no email');
    await wantProblem(api('POST', `/v1/admin/orders/${order.id}/confirm-payment`, { token: S.admin.token, idem: true, body: { reference: 'x', amount: 79000, reason: 'y' } }), 409, 'account-deleted', 'confirm for a deleted account');
    const closed = await want(api('POST', `/v1/admin/orders/${order.id}/resolve`, { token: S.admin.token, body: { note: 'refunded by hand' } }), 200, 'resolve');
    check(closed.status === 'closed' && closed.refund === null, 'resolve closes the order and clears the refund information');
    ok('T1: needs_review, refund info kept, nothing opened, event carries no payer; resolve closes it and clears the info');
  });

  await step('LB1E38', 'the three payer fields on an order are cleared 90 days after they were saved (the cleanup job), the order stays', async () => {
    const order = await createOrder(S.cuong, 1);
    const id = psql(`SELECT id FROM billing_orders WHERE order_code = ${order.code}`);
    psql(`UPDATE billing_orders SET status = 'needs_review', review_reason = 'account-deleted', refund_payer_name = 'X', refund_payer_account = 'Y', refund_payer_bank = 'Z', refund_saved_at = now() - interval '91 days' WHERE id = '${id}'`);
    maintenance();
    check(orderRow(id, "status || '|' || coalesce(refund_payer_name, '-') || '|' || coalesce(refund_payer_account, '-') || '|' || coalesce(refund_payer_bank, '-')") === 'needs_review|-|-|-', 'refund fields not cleared');
    ok('payer fields cleared, order still needs_review');
  });

  await step('Review I2', 'the return page counts the transfer first; the webhook then brings it under another reference (same amount, same moment): one period, one purchase row, the second payment attached, no flag', async () => {
    const order = await createOrder(S.cuong, 1);
    await page(order, 'paid', { webhook: false });
    check((await checkOrder(S.cuong, order.id)).status === 200, 'check');
    check(orderRow(order.id, "status || '|' || paid_via") === 'paid|reconcile', `order ${orderRow(order.id, 'status, paid_via')}`);
    const tx = fakeTransactions(order.code)[0];
    const sent = await postWebhook(order, { ...tx, reference: `${tx.reference}-B` });
    check(sent.status === 200, `webhook ${brief(sent)}`);
    await waitFor(async () => paymentsOf(order.id), (count) => count === 2, 'the second payment');
    check(periodsOf(order.id) === 1, `periods of the order: ${periodsOf(order.id)}`);
    check(psql(`SELECT count(*) FROM billing_transactions WHERE provider_transaction_id LIKE '${order.code}:%'`) === '1', 'one purchase row');
    check(psql(`SELECT string_agg(outcome, ',' ORDER BY received_at) FROM billing_order_payments WHERE order_id = '${order.id}'`) === 'opened-period,attached', 'outcomes');
    check(orderRow(order.id, "status || '|' || coalesce(review_reason, '-')") === 'paid|-', 'no flag on the order');
    ok('reconcile first, webhook second under another reference: one period, outcomes opened-period,attached');
  });

  await step('Review I1', 'the webhook for a real transfer is ignored (success false); the job then finds the transfer at payOS: the order goes to needs_review provider-mismatch instead of staying pending with the money taken', async () => {
    const order = await createOrder(S.cuong, 1);
    await page(order, 'paid', { webhook: false });
    const tx = fakeTransactions(order.code)[0];
    const sent = await postWebhook(order, tx, { success: false });
    check(sent.status === 200, `webhook ${brief(sent)}`);
    await waitFor(async () => eventStatus(order.code, tx.reference), (status) => status === 'ignored', 'the webhook row to be ignored');
    check(orderRow(order.id, 'status') === 'pending', 'still pending after the ignored webhook');
    psql(`UPDATE billing_orders SET created_at = now() - interval '10 minutes', checked_at = NULL WHERE id = '${order.id}'`);
    maintenance();
    check(orderRow(order.id, "status || '|' || coalesce(review_reason, '-')") === 'needs_review|provider-mismatch', `order ${orderRow(order.id, 'status, review_reason')}`);
    check(periodsOf(order.id) === 0 && paymentsOf(order.id) === 0, 'nothing was counted');
    ok('ignored webhook row + the job: needs_review provider-mismatch, nothing counted, staff can look');
  });

  await step('periods end', 'every period of Lan moved into the past (a year back): Pro ends and Lan is Free again, with no prepaid source and no pro_until', async () => {
    check(Number(psql(`SELECT count(*) FROM prepaid_periods WHERE user_id = '${S.lan.id}'`)) >= 2, 'Lan has several chained periods from the earlier steps');
    psql(`UPDATE prepaid_periods SET starts_at = starts_at - interval '400 days', ends_at = ends_at - interval '400 days' WHERE user_id = '${S.lan.id}'`);
    const e = await entitlements(S.lan);
    check(e.plan === 'free' && e.pro_until === null && !e.sources.some((s) => s.kind === 'prepaid'), `after the periods ended: ${JSON.stringify({ plan: e.plan, pro_until: e.pro_until })}`);
    ok('Free again, pro_until null');
  });

  await step('LB1A8', 'Eva was Pro on a prepaid period that ran out earlier this month: the AI unit she used while Pro is not charged to the Free allowance, the one used after the end is (launch prep A, design 6.3.4)', async () => {
    const order = await createOrder(S.eva, 1);
    await page(order, 'paid');
    const done = await view(S.eva, order.id);
    check(done.status === 'paid' && done.period !== null, `order ${JSON.stringify(done)}`);
    // The period ran out an hour ago, kept inside this calendar month of her zone (the Free window starts at its end, never before the 1st).
    const ended = psql(`SELECT to_char(greatest(now() - interval '1 hour', (date_trunc('month', now() AT TIME ZONE '${TIMEZONE}') AT TIME ZONE '${TIMEZONE}') + interval '1 second') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`);
    check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(ended), `end ${ended}`);
    psql(`UPDATE prepaid_periods SET starts_at = '${ended}'::timestamptz - interval '30 days', ends_at = '${ended}'::timestamptz WHERE order_id = '${order.id}'`);
    const use = (id, offsetSeconds, plan) => `('${S.eva.id}', 'ai_practice', '${id}', 'use', 'confirmed', current_date,
      '${ended}'::timestamptz + interval '${offsetSeconds} seconds', '${ended}'::timestamptz + interval '${offsetSeconds} seconds', '${plan}')`;
    psql(`INSERT INTO usage_records (user_id, pool, operation_id, kind, status, system_date, reserved_at, confirmed_at, plan)
      VALUES ${use('smoke-lb1a8-while-pro', -2, 'pro')}, ${use('smoke-lb1a8-after', 1, 'free')}`);
    const e = await entitlements(S.eva);
    check(e.plan === 'free' && !e.sources.some((s) => s.kind === 'prepaid') && e.pro_until === null, `Eva is Free again: ${JSON.stringify({ plan: e.plan, pro_until: e.pro_until })}`);
    check(e.pools.ai_practice.limit === 15, `the Free allowance is 15: ${JSON.stringify(e.pools.ai_practice)}`);
    check(e.pools.ai_practice.used === 1, `2 uses in the month, 1 of them while Pro: Free counts only the one after the end, not ${e.pools.ai_practice.used}`);
    ok(`Free window starts at ${ended}: used 1 of 15 (the Pro one is outside it)`);
  });

  await step('privacy', 'no log line of the API or the worker names an order code, a payer or a reference (checked on the process output the shell kept, if SMOKE_LOGS is set)', async () => {
    for (const file of (process.env.SMOKE_LOGS ?? '').split(',').filter(Boolean)) {
      const text = readFileSync(file, 'utf8');
      for (const secret of ['NGUYEN VAN FAKE', '0000000001', 'counterAccount', 'counter_account']) check(!text.includes(secret), `${file} contains ${secret}`);
    }
    ok(process.env.SMOKE_LOGS ? 'log files scanned' : 'no log files given (set SMOKE_LOGS=a.log,b.log)');
  });

  console.log(`\n== payments smoke: ${results.filter((r) => r.status === 'PASS').length}/${results.length} steps in ${Math.round((Date.now() - started) / 1000)} s ==`);
  for (const r of results) console.log(`${r.status}  ${r.code}${r.reason ? ` — ${r.reason}` : ''}`);
  if (results.some((r) => r.status === 'FAIL')) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nSMOKE FAILED: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
