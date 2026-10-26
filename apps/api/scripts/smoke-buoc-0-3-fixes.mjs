// Smoke test for the Bước 0–3 fixes (plan 2026-10-20-buoc-0-3-fixes, Task 25) against a REAL running API + worker on a fresh
// database (`english_learning_smoke_fixes`). Start them first: `docker compose up -d` (repo root), then `pnpm build && pnpm run:dev`
// (this package; the API needs TERMS_VERSION), then `pnpm smoke:buoc-0-3-fixes`.
// Needs DATABASE_URL (env, else .env), Mailpit, and `docker compose -p english-learning` for psql.
// SMOKE_CONTINUE=1 keeps going after a failed step and prints a PASS/FAIL line per step (used to show which steps detect
// the old bugs on a pre-fix commit). Exit code 0 only when every step matched.
//
// Accounts other than Lan are inserted with psql (registration allows 5 per IP per hour); their password hash is made here
// with the API's own argon2 options, so they sign in through the real login route.
import { execFileSync, spawn } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import argon2 from 'argon2';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const CONTINUE = process.env.SMOKE_CONTINUE === '1';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-Fixes-Pass-9!';
const run = randomUUID().slice(0, 8);

const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
if (!process.env.DATABASE_URL && fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);
// The script inserts admins, idempotency rows and locks accounts: never against a working database.
if (!DB_NAME.includes('smoke')) throw new Error(`Refusing to run against "${DB_NAME}": use a fresh smoke database (english_learning_smoke_fixes).`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(97 + randomInt(26))).join('');
const word = (prefix) => `zf${prefix}${letters(6)}`;
function ok(detail) { console.log(`    ok — ${detail}`); }
function check(condition, message) { if (!condition) throw new Error(message); }

/** `fetch`, retried on a network error (the API closes an idle keep-alive socket after 5 s). */
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

async function read(res) {
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, json, text, retryAfter: res.headers.get('retry-after') };
}

/**
 * One request. `idem: true` sends a fresh Idempotency-Key, a string sends that key. A 429 is waited out and retried with the
 * same key unless `raw` (the rate-limit step wants to see it).
 */
async function api(method, path, { token, body, idem = false, form, raw = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idem) headers['Idempotency-Key'] = idem === true ? randomUUID() : idem;
  for (let attempt = 0; ; attempt += 1) {
    const res = await send(`${BASE}${path}`, { method, headers, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
    if (raw || res.status !== 429 || attempt >= 5) return read(res);
    const wait = Number(res.headers.get('retry-after') ?? '5');
    console.log(`    (429 on ${method} ${path}; waiting ${wait}s)`);
    await sleep(wait * 1000 + 250);
  }
}

const brief = (res) => `${res.status} ${res.text.replace(/"(access_token|refresh_token)":"[^"]*"/g, '"$1":"<redacted>"').slice(0, 300)}`;

async function want(promise, status, context) {
  const res = await promise;
  if (res.status !== status) throw new Error(`${context}: expected ${status}, got ${brief(res)}`);
  return res.json;
}

async function wantProblem(promise, status, type, context) {
  const res = await promise;
  const got = String(res.json?.type ?? '');
  if (res.status !== status || (type && !got.endsWith(`/${type}`))) {
    throw new Error(`${context}: expected ${status}${type ? ` ${type}` : ''}, got ${brief(res)}`);
  }
  return res;
}

const psqlArgs = ['compose', '-p', 'english-learning', 'exec', '-T', 'postgres', 'psql', '-U', 'dev', '-d', DB_NAME, '-v', 'ON_ERROR_STOP=1', '-tA'];
function psql(sql) {
  return execFileSync('docker', [...psqlArgs, '-c', sql], { encoding: 'utf8' }).trim();
}
/** A psql session in the background (FE29 holds a lock with it); resolves with its exit code and output. */
function psqlBackground(sql) {
  return new Promise((resolve) => {
    const child = spawn('docker', psqlArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (out += chunk));
    child.on('close', (code) => resolve({ code, out: out.trim() }));
    child.stdin.end(sql);
  });
}

async function waitFor(readValue, done, what, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await readValue();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`${what} did not happen within ${timeoutMs}ms: ${JSON.stringify(value)}`);
    await sleep(250);
  }
}

async function mailsTo(email) {
  const list = await (await send(`${MAILPIT}/api/v1/messages?limit=500`)).json();
  return (list.messages ?? []).filter((m) => m.To?.some((to) => to.Address === email))
    .sort((a, b) => (a.Created < b.Created ? 1 : -1));
}

async function otpCodeFor(email, atLeast) {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const mails = await mailsTo(email);
    const message = mails.length >= atLeast ? mails[0] : null;
    if (message) {
      const full = await (await send(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const match = (full.Text ?? '').match(/(\d{6})/);
      if (match) return match[1];
    }
    if (Date.now() > deadline) throw new Error(`No OTP mail found for ${email} after 10s`);
    await sleep(300);
  }
}

let passwordHash;
/** Verified users inserted with psql, with a password credential; `staffRole` 'admin' for the admin. Returns [{ id, email }]. */
async function sqlUsers(labels, { staffRole = null } = {}) {
  passwordHash ??= await argon2.hash(PASSWORD.normalize('NFC'), { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const rows = labels.map((label) => `('smokefx-${label}-${run}@example.com', '${TIMEZONE}', now(), 'vi', ${staffRole ? `'${staffRole}'` : 'NULL'})`);
  const out = psql(`WITH u AS (INSERT INTO users (email, timezone, email_verified_at, native_language, staff_role) VALUES ${rows.join(', ')}
    RETURNING id, email), c AS (INSERT INTO password_credentials (user_id, hash) SELECT id, '${passwordHash}' FROM u)
    SELECT id || '|' || email FROM u`);
  const users = out.split('\n').map((line) => { const [id, email] = line.split('|'); return { id, email }; });
  check(users.length === labels.length && users.every((u) => /^[0-9a-f-]{36}$/.test(u.id)), `sqlUsers: ${out}`);
  return labels.map((label) => users.find((u) => u.email === `smokefx-${label}-${run}@example.com`));
}

const loginRes = (email, client = 'web') => api('POST', '/v1/auth/login', { body: { email, password: PASSWORD, client } });
async function signIn(user) {
  const body = await want(loginRes(user.email), 200, `login ${user.email}`);
  return { ...user, token: body.access_token };
}

async function upload(token, sourceId, csv, name) {
  const form = new FormData();
  if (sourceId) form.set('level_source_id', sourceId);
  form.set('file', new Blob([csv], { type: 'text/csv' }), name);
  const accepted = await want(api('POST', '/v1/admin/content/uploads', { token, idem: true, form }), 202, `upload ${name}`);
  return waitFor(async () => want(api('GET', `/v1/admin/content/uploads/${accepted.batch_id}`, { token }), 200, 'batch'),
    (batch) => batch.status !== 'queued' && batch.status !== 'running', `batch ${name} to finish`, 30_000);
}
const senseOf = (lemma) => psql(`SELECT s.id FROM senses s JOIN entries e ON e.id = s.entry_id WHERE e.scope = 'catalog' AND e.lemma = '${lemma}' ORDER BY s.created_at LIMIT 1`);
const entryOf = (lemma) => psql(`SELECT id FROM entries WHERE scope = 'catalog' AND lemma = '${lemma}'`);

// ---------------------------------------------------------------------------------------------------------------------------
const S = {}; // state shared by the steps
const results = [];
let stepNo = 0;

async function step(code, name, body) {
  stepNo += 1;
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

/** Lan, registered by step M2; inserted with psql only when M2 could not register her (SMOKE_CONTINUE on old code). */
async function lan() {
  if (!S.lan) {
    const [user] = await sqlUsers(['lan']);
    S.lan = await signIn(user);
    console.log('    (Lan was not registered by M2; inserted with psql to carry on)');
  }
  return S.lan;
}

async function main() {
  const started = Date.now();

  await step('setup', 'API reachable; admin and learners (psql, signed in through the API); a content source', async () => {
    await waitFor(async () => { try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; } }, Boolean, `API at ${BASE}`, 20_000);
    const [admin] = await sqlUsers(['admin'], { staffRole: 'admin' });
    S.admin = await signIn(admin);
    const labels = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10', 'rate', 'b0e1', 'ta', 'tb'];
    const users = await sqlUsers(labels);
    S.learners = {};
    for (const [i, user] of users.entries()) S.learners[labels[i]] = await signIn(user);
    S.source = await want(api('POST', '/v1/admin/content/sources', { token: S.admin.token,
      body: { name: `Smokefx-${run}`, version: '1.0', license: 'test', display_priority: 90 } }), 201, 'content source');
    ok(`database ${DB_NAME}; admin ${S.admin.email}; ${labels.length} learners signed in; source ${S.source.id}`);
  });

  // ------------------------------------------------------------------------------------------------------------------------
  await step('M2', 'FE1 age, FE5 terms, register Lan with names, PATCH /v1/me birth_date', async () => {
    const twelve = new Date(); twelve.setFullYear(twelve.getFullYear() - 12);
    const reg = (email, extra) => api('POST', '/v1/auth/register', { body: { email, password: PASSWORD, timezone: TIMEZONE, client: 'web',
      given_name: 'Lan', family_name: 'Nguyen', birth_date: '2000-05-17', accept_terms: true, ...extra } });
    const kid = `smokefx-kid-${run}@example.com`;
    await wantProblem(reg(kid, { birth_date: twelve.toISOString().slice(0, 10) }), 400, 'age-below-minimum', 'FE1 12-year-old');
    const noTerms = `smokefx-noterms-${run}@example.com`;
    await wantProblem(reg(noTerms, { accept_terms: false }), 400, 'validation-failed', 'FE5 accept_terms false');
    check(psql(`SELECT count(*) FROM users WHERE email IN ('${kid}', '${noTerms}')`) === '0', 'FE1/FE5 created a user');
    ok('FE1 12-year-old → 400 age-below-minimum; FE5 accept_terms false → 400 validation-failed; no user created');

    const email = `smokefx-lan-${run}@example.com`;
    const before = (await mailsTo(email)).length;
    await want(reg(email, {}), 201, 'register Lan');
    const code = await otpCodeFor(email, before + 1);
    const verified = await want(api('POST', '/v1/auth/verify-email', { body: { email, code, password: PASSWORD, client: 'web' } }), 200, 'verify Lan');
    const me = await want(api('GET', '/v1/me', { token: verified.access_token }), 200, 'GET /v1/me');
    check(me.given_name === 'Lan' && me.family_name === 'Nguyen' && me.birth_date === '2000-05-17' && me.email_verified === true,
      `GET /v1/me: ${JSON.stringify({ given_name: me.given_name, family_name: me.family_name, birth_date: me.birth_date, email_verified: me.email_verified })}`);
    S.lan = { id: me.id, email, token: verified.access_token };
    ok(`Lan registered (${me.id}), verified through the Mailpit OTP; GET /v1/me shows given_name Lan, family_name Nguyen, birth_date 2000-05-17`);

    await wantProblem(api('PATCH', '/v1/me', { token: S.lan.token, body: { birth_date: '1999-01-01' } }), 400, 'validation-failed', 'PATCH birth_date');
    ok('PATCH /v1/me with birth_date → 400 validation-failed');
  });

  // ------------------------------------------------------------------------------------------------------------------------
  await step('C2', 'FE32 time zones: "+07:00" refused, "asia/ho_chi_minh" stored as Asia/Saigon', async () => {
    const { token } = await lan();
    await wantProblem(api('PATCH', '/v1/me', { token, body: { timezone: '+07:00' } }), 400, 'validation-failed', 'PATCH +07:00');
    const patched = await want(api('PATCH', '/v1/me', { token, body: { timezone: 'asia/ho_chi_minh' } }), 200, 'PATCH asia/ho_chi_minh');
    const me = await want(api('GET', '/v1/me', { token }), 200, 'GET /v1/me');
    check(patched.timezone === 'Asia/Saigon' && me.timezone === 'Asia/Saigon', `timezone ${patched.timezone} / ${me.timezone}`);
    ok('PATCH "+07:00" → 400 validation-failed; PATCH "asia/ho_chi_minh" → 200, GET /v1/me timezone Asia/Saigon');
  });

  // ------------------------------------------------------------------------------------------------------------------------
  // C1 is split into one step per behaviour, so SMOKE_CONTINUE shows each of them.
  const group = (learner, name, key = true) => api('POST', '/v1/groups', { token: learner.token, idem: key, body: { name } });
  await step('C1 FE26', '10 learners create a group at once', async () => {
    const L = S.learners;
    const fe26 = await Promise.all(Array.from({ length: 10 }, (_, i) => group(L[`l${i + 1}`], `FE26 ${run} ${i}`)));
    check(fe26.every((r) => r.status === 201), `FE26 statuses ${fe26.map((r) => r.status).join(',')}: ${fe26.filter((r) => r.status !== 201).map(brief).join(' | ')}`);
    ok('FE26 10 learners × POST /v1/groups at once → 10 × 201');
  });

  await step('C1 FE27', 'one learner creates 10 groups at once, 10 keys', async () => {
    const L = S.learners;
    const fe27 = await Promise.all(Array.from({ length: 10 }, (_, i) => group(L.l1, `FE27 ${run} ${i}`)));
    check(fe27.every((r) => r.status === 201), `FE27 statuses ${fe27.map((r) => r.status).join(',')}: ${fe27.filter((r) => r.status !== 201).map(brief).join(' | ')}`);
    check(new Set(fe27.map((r) => r.json.id)).size === 10, 'FE27 groups are not 10 distinct ids');
    ok('FE27 one learner, 10 keys at once → 10 × 201, 10 distinct groups');
  });

  await step('C1 FE29', 'same key twice while the first request waits on the Learning lock', async () => {
    const L = S.learners;
    // FE29: a background psql holds the learner's Learning lock for 3 s, so the first request waits inside its handler.
    const lockKey = `learning.user:${L.l2.id}`;
    const holder = psqlBackground(`SELECT pg_advisory_lock(hashtextextended('${lockKey}', 0)); SELECT pg_sleep(3); SELECT pg_advisory_unlock(hashtextextended('${lockKey}', 0));`);
    await waitFor(() => psql(`SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND granted AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`), (n) => Number(n) >= 1,
      'psql to hold the Learning lock', 5_000);
    const key = randomUUID();
    const sentAt = Date.now();
    const first = group(L.l2, `FE29 ${run}`, key).then((res) => ({ ...res, ms: Date.now() - sentAt }));
    await sleep(700);
    const second = await api('POST', '/v1/groups', { token: L.l2.token, idem: key, body: { name: `FE29 ${run}` } });
    const firstRes = await first;
    const held = await holder;
    check(held.code === 0, `FE29 psql lock holder: ${held.out}`);
    check(second.status === 409 && second.retryAfter === '2', `FE29 second call: ${brief(second)}, Retry-After ${second.retryAfter}`);
    check(firstRes.status === 201 && firstRes.ms > 1_500, `FE29 first call after ${firstRes.ms} ms: ${brief(firstRes)}`);
    const replay = await api('POST', '/v1/groups', { token: L.l2.token, idem: key, body: { name: `FE29 ${run}` } });
    check(replay.status === 201 && replay.json?.id === firstRes.json.id, `FE29 replay: ${brief(replay)}`);
    ok(`FE29 same key twice while the first waits on the Learning lock → second 409 Retry-After: 2; first 201 after ${firstRes.ms} ms; a third call replays it`);
  });

  await step('C1 B0E1', 'a key left in_progress past its lease', async () => {
    const L = S.learners;
    const abandoned = randomUUID();
    psql(`INSERT INTO idempotency_keys (key, user_id, endpoint, status, payload_hash, created_at, updated_at)
      VALUES ('${abandoned}', '${L.b0e1.id}', '/v1/groups', 'in_progress', 'smoke', now() - interval '1 hour', now() - interval '1 hour')`);
    await wantProblem(group(L.b0e1, `B0E1 ${run}`, abandoned), 409, 'idempotency-key-abandoned', 'B0E1');
    ok('B0E1 key left in_progress 1 h ago → 409 idempotency-key-abandoned');
  });

  await step('C1 key reuse', 'same key + different body', async () => {
    const L = S.learners;
    const reused = randomUUID();
    await want(group(L.b0e1, `same ${run}`, reused), 201, 'same key, first body');
    const differs = await group(L.b0e1, `different ${run}`, reused);
    check(differs.status === 400, `same key + different body: ${brief(differs)}`);
    ok('same key + different body → 400');
  });

  await step('C1 rate limit', 'the 31st user.write in a minute', async () => {
    const L = S.learners;
    // user.write is 30 a minute per user (DEFAULT_LIMITS); the window is the clock minute, so start early in one.
    const intoMinute = Date.now() % 60_000;
    if (intoMinute > 40_000) { console.log(`    (waiting ${Math.ceil((60_000 - intoMinute) / 1000)}s for a fresh rate-limit minute)`); await sleep(60_000 - intoMinute + 500); }
    const writes = [];
    for (let i = 0; i < 31; i += 1) writes.push(await api('PATCH', '/v1/me', { token: L.rate.token, body: { timezone: 'UTC' }, raw: true }));
    const firstThirty = writes.slice(0, 30).map((r) => r.status);
    const last = writes[30];
    check(firstThirty.every((s) => s === 200), `first 30 writes: ${firstThirty.join(',')}`);
    check(last.status === 429 && Number(last.retryAfter) > 0, `31st write: ${brief(last)}, Retry-After ${last.retryAfter}`);
    ok(`rate limit: 30 × PATCH /v1/me → 200, the 31st → 429 with Retry-After: ${last.retryAfter}`);
  });

  // ------------------------------------------------------------------------------------------------------------------------
  await step('N4/N5', 'lock Lan: refresh 401, login 403 account-locked; FE11 lock self 409; search q; unlock', async () => {
    const L = await lan();
    const signedIn = await want(loginRes(L.email, 'mobile'), 200, 'Lan login (mobile)');
    const control = await want(api('POST', '/v1/auth/refresh', { body: { refresh_token: signedIn.refresh_token } }), 200, 'refresh before lock (control)');
    await want(api('POST', `/v1/admin/users/${L.id}/lock`, { token: S.admin.token, body: { reason: `smoke ${run}` } }), 200, 'lock Lan');
    await wantProblem(api('POST', '/v1/auth/refresh', { body: { refresh_token: control.refresh_token } }), 401, null, 'refresh after lock');
    await wantProblem(loginRes(L.email), 403, 'account-locked', 'login after lock');
    ok('refresh before the lock → 200 (control); after: refresh → 401, login with the right password → 403 account-locked');

    const adminMe = await want(api('GET', '/v1/me', { token: S.admin.token }), 200, 'admin /v1/me');
    await wantProblem(api('POST', `/v1/admin/users/${adminMe.id}/lock`, { token: S.admin.token, body: { reason: 'self' } }), 409, null, 'FE11 lock self');
    ok('FE11 admin locks self → 409');

    const found = await want(api('GET', '/v1/admin/users?q=lan', { token: S.admin.token }), 200, 'list ?q=lan');
    check(found.items.some((u) => u.id === L.id && u.status === 'locked'), `?q=lan: ${JSON.stringify(found.items.map((u) => [u.email, u.status]))}`);
    await wantProblem(api('GET', '/v1/admin/users?q=a', { token: S.admin.token }), 400, 'validation-failed', 'list ?q=a');
    ok('list ?q=lan finds Lan (locked); ?q=a → 400 validation-failed');

    await want(api('POST', `/v1/admin/users/${L.id}/unlock`, { token: S.admin.token }), 200, 'unlock Lan');
    await want(loginRes(L.email), 200, 'login after unlock');
    ok('unlock → login 200');
  });

  // ------------------------------------------------------------------------------------------------------------------------
  const H = 'headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics';
  await step('T1', 'reject revision 2 → publish it refused revision-rejected; FE19 quick publish → revision 3', async () => {
    const { token } = S.admin;
    const lemma = word('t');
    await upload(token, S.source.id, [H, `${lemma},noun,A1,con mèo,A cat.,The cat sleeps.,food`].join('\r\n'), 't1.csv');
    const sense = senseOf(lemma);
    check(/^[0-9a-f-]{36}$/.test(sense), `T1 sense of ${lemma}: ${sense}`);
    await want(api('POST', '/v1/admin/content/senses/publish', { token, body: { items: [{ sense_id: sense, revision: 1 }] } }), 200, 'publish r1');
    await want(api('PUT', `/v1/admin/content/senses/${sense}/draft`, { token, body: { revision: 1, content: { examples_en: ['BAD rejected example.'] } } }), 200, 'draft r2');
    await want(api('POST', '/v1/admin/content/senses/review', { token, body: { items: [{ sense_id: sense, revision: 2, action: 'rejected' }] } }), 200, 'reject r2');
    const direct = await want(api('POST', '/v1/admin/content/senses/publish', { token, body: { items: [{ sense_id: sense, revision: 2 }] } }), 200, 'publish r2');
    check(direct.results?.[0]?.outcome === 'refused' && direct.results[0].reason === 'revision-rejected', `publish r2: ${JSON.stringify(direct)}`);
    const quick = await want(api('POST', `/v1/admin/content/senses/${sense}/quick-publish`, { token, body: { revision: 2, content: {} } }), 200, 'FE19 quick publish');
    check(quick.revision === 3 && quick.outcome === 'published', `quick publish: ${JSON.stringify(quick)}`);
    ok('publish of rejected revision 2 → refused revision-rejected; quick publish {revision: 2} → revision 3 published');
  });

  // ------------------------------------------------------------------------------------------------------------------------
  await step('T2', 'import A (go), import C (went form_of go), revert A → go kept entry-in-use', async () => {
    const { token } = S.admin;
    const go = word('g'); const went = word('w');
    const a = await upload(token, S.source.id, [H, `${go},verb,A1,đi,To move.,I ${go} home.,food`].join('\r\n'), 'A.csv');
    const c = await upload(token, S.source.id, [`${H},form_of`, `${went},verb,A1,đã đi,Moved.,I ${went} home.,food,${go}/verb:past`].join('\r\n'), 'C.csv');
    check(a.counters?.created === 1 && c.counters?.created === 1, `batches A ${a.status} ${JSON.stringify(a.counters)} / C ${c.status} ${JSON.stringify(c.counters)}`);
    const goEntry = entryOf(go);
    const reverted = await want(api('POST', `/v1/admin/content/uploads/${a.id}/revert`, { token, idem: true }), 200, 'revert A');
    const kept = reverted.report?.skipped?.some((s) => s.type === 'entry' && s.id === goEntry && s.reason === 'entry-in-use');
    check(kept && entryOf(go) === goEntry, `revert A: ${JSON.stringify(reverted.report)}; entry now "${entryOf(go)}"`);
    ok(`revert of A keeps ${go} (entry-in-use: ${went} is its past form)`);
  });

  // ------------------------------------------------------------------------------------------------------------------------
  await step('T3', 'FE17 re-upload of an unchanged file after a hand edit → row unchanged, live content still the edit', async () => {
    const { token } = S.admin;
    const lemma = word('f');
    const F = [H, `${lemma},noun,A1,quả cam,An orange.,Example X from file F.,food`].join('\r\n');
    await upload(token, S.source.id, F, 'F.csv');
    const sense = senseOf(lemma);
    await want(api('POST', '/v1/admin/content/senses/publish', { token, body: { items: [{ sense_id: sense, revision: 1 }] } }), 200, 'publish r1');
    await want(api('POST', `/v1/admin/content/senses/${sense}/quick-publish`, { token, body: { revision: 1, content: { examples_en: ['Example Y edited by hand.'] } } }), 200, 'hand edit');
    const again = await upload(token, S.source.id, F, 'F-again.csv');
    const outcome = psql(`SELECT string_agg(outcome, ',') FROM import_row_outcomes WHERE batch_id = '${again.id}'`);
    const detail = await want(api('GET', `/v1/admin/content/senses/${sense}`, { token }), 200, 'sense detail');
    check(again.counters?.unchanged === 1 && again.counters.created === 0 && again.counters.updated === 0 && outcome === 'unchanged',
      `re-upload: ${again.status} ${JSON.stringify(again.counters)}; row outcomes ${outcome}`);
    check(JSON.stringify(detail.content?.examples_en) === JSON.stringify(['Example Y edited by hand.']), `live examples ${JSON.stringify(detail.content?.examples_en)}`);
    ok('re-upload of F → row unchanged (no create/update); live example is still the hand edit');
  });

  // ------------------------------------------------------------------------------------------------------------------------
  await step('T4', 'round-2 rejected.csv re-uploaded as it is → accepted', async () => {
    const { token } = S.admin;
    const bad = word('r');
    const rejected = async (batch) => (await api('GET', `/v1/admin/content/uploads/${batch.id}/rejected.csv`, { token })).text;
    const round1 = await upload(token, S.source.id, [H, `${bad},xyz,A1,sai,Bad.,Bad row.,food`].join('\r\n'), 'rej1.csv');
    const round2 = await upload(token, S.source.id, await rejected(round1), 'rej2.csv');
    const file2 = await rejected(round2);
    const round3 = await upload(token, S.source.id, file2, 'rej3.csv');
    const file3 = await rejected(round3);
    const pairs = (csv) => csv.split(/\r?\n/)[0].split(',').filter((h) => h === '_row' || h === '_error').length;
    check(round3.status === 'partial' && round3.counters?.processed === 1 && round3.counters.rejected === 1 && pairs(file3) === 2,
      `round 3: ${round3.status} ${JSON.stringify(round3.counters)}; rejected.csv header ${file3.split(/\r?\n/)[0]}`);
    ok('round-2 rejected.csv re-uploaded → batch partial, the row rejected only for its bad pos; one _row/_error pair');
  });

  // ------------------------------------------------------------------------------------------------------------------------
  stepNo += 1;
  console.log(`\n[${stepNo}] C3: covered by unit test (no API step)`);
  results.push({ code: 'C3', status: 'SKIP', reason: 'covered by unit test (no API step)' });

  // ------------------------------------------------------------------------------------------------------------------------
  await step('T5', "user B's private word never appears in A's /v1/lookup (control: A's own does)", async () => {
    const { ta: tA, tb: tB } = S.learners;
    const lemma = word('p');
    const addPrivate = async (learner, meaning) => {
      const g = await want(api('POST', '/v1/groups', { token: learner.token, idem: true, body: { name: `T5 ${run}` } }), 201, 'group');
      return want(api('POST', '/v1/quick-add', { token: learner.token, idem: true, body: { group_id: g.id, new_word: { lemma, meaning } } }), 201, 'quick-add');
    };
    const look = async (learner) => (await want(api('GET', `/v1/lookup?q=${lemma}`, { token: learner.token }), 200, 'lookup')).senses;
    const bWord = await addPrivate(tB, 'của B');
    const before = await look(tA);
    check(before.length === 0, `A's lookup before A adds the word: ${JSON.stringify(before)}`);
    const aWord = await addPrivate(tA, 'của A');
    const after = await look(tA);
    check(after.some((s) => s.sense_id === aWord.sense_id && s.scope === 'private') && !after.some((s) => s.sense_id === bWord.sense_id),
      `A's lookup after: ${JSON.stringify(after.map((s) => [s.sense_id, s.scope]))}`);
    const ownerView = await look(tB);
    check(ownerView.some((s) => s.sense_id === bWord.sense_id) && !ownerView.some((s) => s.sense_id === aWord.sense_id),
      `B's lookup: ${JSON.stringify(ownerView.map((s) => [s.sense_id, s.scope]))}`);
    ok("A's lookup never shows B's private word; A's own private word shows for A (control), B's for B");
  });

  console.log(`\nSummary (${Math.round((Date.now() - started) / 1000)}s):`);
  for (const r of results) {
    console.log(r.status === 'SKIP' ? `  ${r.code}: ${r.reason}` : `  ${r.code}: ${r.status}${r.reason ? ` — ${r.reason}` : ''}`);
  }
  const failed = results.filter((r) => r.status === 'FAIL');
  if (failed.length > 0) {
    console.log(`\nFAILED: ${failed.map((r) => r.code).join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log('\nALL STEPS MATCHED');
  }
}

main().catch((error) => {
  console.error(`\nSMOKE FAILED: ${error.stack ?? error}`);
  for (const r of results) console.error(`  ${r.code}: ${r.status}`);
  process.exitCode = 1;
});
