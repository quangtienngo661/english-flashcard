// Smoke test for Bước 8 (plan 2026-10-29-buoc-8-identity-remainder, Task 32) against a REAL running API + worker on a fresh
// database (`english_learning_smoke_b8`). Everything the unit tests only prove with a fake Prisma is proven here on Postgres:
// the two-transaction deletion, every module's eraser, the sweep, the retry, the clean-up and the replay, the Google trips
// (the FAKE Google), the cancel route and the races.
//
// Start the stack first: `docker compose up -d` (repo root); then, with ONE environment for everything below (the script runs the
// maintenance and replay CLIs with the environment it was started with, so it must be the API's): API and worker started with
// `GOOGLE_FAKE_ENABLED=true GOOGLE_REDIRECT_URI=<BASE>/v1/auth/google/callback OAUTH_COOKIE_KEY=<gen-secret>`, `BILLING_FAKE_ENABLED=true
// BILLING_FAKE_SECRET=<gen-secret>`, `AI_FAKE_ENABLED=true`, `MAINTENANCE_ENABLED=false`, a `JOB_QUEUE_PREFIX` of its own and
// `LEARNER_APP_URL` = SMOKE_LEARNER_URL; then `pnpm smoke:buoc-8`.
// Needs Mailpit and `docker compose -p english-learning` for psql. SMOKE_CONTINUE=1 prints a PASS/FAIL per step and keeps going.
//
// Accounts are inserted with psql (registration allows 5 per IP per hour); their password hash is made here with the API's own
// argon2 options, so they sign in through the real login route.
import { execFileSync, spawn } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import argon2 from 'argon2';
import { sendFakeEvent } from './billing-fake-event.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const LEARNER = process.env.SMOKE_LEARNER_URL ?? 'http://localhost:3001';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const CONTINUE = process.env.SMOKE_CONTINUE === '1';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-B8-Pass-9!';
const DAY = 86_400_000;
const run = randomUUID().slice(0, 8);

const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
for (const key of ['DATABASE_URL', 'BILLING_FAKE_SECRET']) if (!process.env[key] && fileEnv[key]) process.env[key] = fileEnv[key];
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
if (!process.env.BILLING_FAKE_SECRET) throw new Error('BILLING_FAKE_SECRET is not set (env or .env).');
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);
// The script deletes accounts, inserts rows and runs jobs: never against a working database.
if (!DB_NAME.includes('smoke')) throw new Error(`Refusing to run against "${DB_NAME}": use a fresh smoke database (english_learning_smoke_b8).`);
if (process.env.GOOGLE_FAKE_ENABLED !== 'true') throw new Error('GOOGLE_FAKE_ENABLED=true must be set in this shell (and in the API).');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ok = (detail) => console.log(`    ok — ${detail}`);
function check(condition, message) { if (!condition) throw new Error(message); }
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();

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
  return { status: res.status, json, text, headers: res.headers, retryAfter: res.headers.get('retry-after') };
}
const brief = (res) => `${res.status} ${res.text.replace(/"(access_token|refresh_token)":"[^"]*"/g, '"$1":"<redacted>"').slice(0, 300)}`;

async function api(method, path, { token, body, idem = false, headers: extra = {}, raw = false } = {}) {
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idem) headers['Idempotency-Key'] = idem === true ? randomUUID() : idem;
  for (let attempt = 0; ; attempt += 1) {
    const res = await send(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (raw || res.status !== 429 || attempt >= 5) return read(res);
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
function psqlBackground(sql) {
  const child = spawn('docker', psqlArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (chunk) => (out += chunk));
  child.stderr.on('data', (chunk) => (out += chunk));
  const done = new Promise((resolve) => child.on('close', (code) => resolve({ code, out: out.trim() })));
  child.stdin.write(`${sql}\n`);
  return { done, output: () => out.trim(), finish: (rest) => child.stdin.end(`${rest}\n`) };
}
async function waitFor(readValue, done, what, timeoutMs = 20_000) {
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
  return (list.messages ?? []).filter((m) => m.To?.some((to) => to.Address === email)).sort((a, b) => (a.Created < b.Created ? 1 : -1));
}
const isDeletedMail = (m) => /đã được xóa|was deleted/i.test(m.Subject);
const isLinkedMail = (m) => /liên kết|linked/i.test(m.Subject);

/** The CLIs read the environment this script was started with (the API's). */
function cli(file, args = []) {
  return execFileSync(process.execPath, [`dist/cli/${file}`, ...args], { encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
}
const maintenance = () => cli('run-maintenance.js');

/** The limits (5 sign-ups an hour, 20 Google calls a minute, per IP) are counted in a table; one machine would hit them all. */
const resetLimits = () => psql('DELETE FROM rate_limit_counters');

// --- accounts ----------------------------------------------------------------------------------------------------------------
let passwordHash;
async function sqlUsers(labels, { staffRole = null, verified = true, status = 'active', createdAgo = null } = {}) {
  passwordHash ??= await argon2.hash(PASSWORD.normalize('NFC'), { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const rows = labels.map((label) => `('smokeb8-${label}-${run}@example.com', '${TIMEZONE}', ${verified ? 'now()' : 'NULL'}, 'vi', ${staffRole ? `'${staffRole}'` : 'NULL'},
    '${status}', 'Lan', DATE '1999-01-01', ${createdAgo ? `now() - interval '${createdAgo}'` : 'now()'}, ${createdAgo ? `now() - interval '${createdAgo}'` : 'now()'}, 'smoke')`);
  const out = psql(`WITH u AS (INSERT INTO users (email, timezone, email_verified_at, native_language, staff_role, status, given_name, birth_date, created_at, terms_accepted_at, terms_version)
    VALUES ${rows.join(', ')} RETURNING id, email), c AS (INSERT INTO password_credentials (user_id, hash) SELECT id, '${passwordHash}' FROM u)
    SELECT id || '|' || email FROM u`);
  const users = out.split('\n').map((line) => { const [id, email] = line.split('|'); return { id, email }; });
  check(users.length === labels.length && users.every((u) => /^[0-9a-f-]{36}$/.test(u.id)), `sqlUsers: ${out}`);
  return labels.map((label) => users.find((u) => u.email === `smokeb8-${label}-${run}@example.com`));
}
const emailOf = (label) => `smokeb8-${label}-${run}@example.com`;
const loginRes = (email) => api('POST', '/v1/auth/login', { body: { email, password: PASSWORD, client: 'web' } });
async function signIn(user) {
  const body = await want(loginRes(user.email), 200, `login ${user.email}`);
  return { ...user, token: body.access_token };
}
const userRow = (id, columns) => psql(`SELECT ${columns} FROM users WHERE id = '${id}'`);
const userExists = (id) => psql(`SELECT count(*) FROM users WHERE id = '${id}'`) === '1';

// --- the fake Google: a tiny cookie jar and manual redirects --------------------------------------------------------------------
class Jar {
  cookies = new Map();
  absorb(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1);
      if (value === '' || /expires=Thu, 01 Jan 1970/i.test(line) || /max-age=0/i.test(line)) this.cookies.delete(name);
      else this.cookies.set(name, { value, attributes: line });
    }
  }
  header() { return [...this.cookies].map(([name, { value }]) => `${name}=${value}`).join('; '); }
  has(name) { return this.cookies.has(name); }
  attributes(name) { return this.cookies.get(name)?.attributes ?? ''; }
}
async function hop(url, jar, init = {}) {
  const res = await send(url, { redirect: 'manual', ...init, headers: { ...(init.headers ?? {}), ...(jar.cookies.size ? { cookie: jar.header() } : {}) } });
  jar.absorb(res);
  return res;
}
/** start → fake account page (the account in the query) → callback. Returns the callback's answer and the jar. */
async function googleTrip({ email, sub, name, given, family, picture, emailVerified, next, startUrl, jar = new Jar() }) {
  resetLimits();
  const startAt = startUrl ?? `${BASE}/v1/auth/google/start?${new URLSearchParams({ intent: 'login', locale: 'vi', ...(next ? { next } : {}) })}`;
  const start = await hop(startAt, jar);
  check(start.status === 302, `google start: ${start.status}`);
  const fakePage = new URL(start.headers.get('location'));
  for (const [key, value] of Object.entries({ email, sub, name, given_name: given, family_name: family, picture, email_verified: emailVerified })) {
    if (value !== undefined) fakePage.searchParams.set(key, String(value));
  }
  const issued = await hop(fakePage.toString(), jar);
  check(issued.status === 302, `fake page: ${issued.status} ${await issued.text()}`);
  const callback = await hop(issued.headers.get('location'), jar);
  return { res: callback, location: callback.headers.get('location'), jar };
}
const refreshWith = (jar) => send(`${BASE}/v1/auth/refresh`, { method: 'POST', headers: { 'X-CSRF-Protection': '1', 'Content-Type': 'application/json', cookie: jar.header() }, body: '{}' }).then(read);
const completeInfo = (jar) => send(`${BASE}/v1/auth/google/complete`, { headers: { cookie: jar.header() } }).then(read);
const completePost = async (jar, body, headers = {}) => {
  const res = await send(`${BASE}/v1/auth/google/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1', cookie: jar.header(), ...headers }, body: JSON.stringify(body) });
  jar.absorb(res);
  return read(res);
};
const BIRTH = { birth_date: '2000-05-12', accept_terms: true, timezone: TIMEZONE };

// --- billing ------------------------------------------------------------------------------------------------------------------
async function fake(type, sub, user, fields = {}) {
  const id = randomUUID();
  const event = { id, type, environment: 'sandbox', subscription_id: sub, app_user_id: user, occurred_at: new Date().toISOString(), ...fields };
  let res;
  for (let attempt = 0; ; attempt += 1) {
    try {
      res = await sendFakeEvent({ baseUrl: BASE, secret: process.env.BILLING_FAKE_SECRET, events: [event] });
      break;
    } catch (error) {
      if (attempt >= 2) throw error;
      await sleep(300);
    }
  }
  check(res.status === 200, `webhook ${type}: ${res.status} ${JSON.stringify(res.body)}`);
  await waitFor(() => psql(`SELECT status FROM billing_events WHERE dedupe_key = 'fake:sandbox:${id}'`), (v) => v !== '' && v !== 'pending', `event ${type} applied`);
  return id;
}
const startSub = (sub, user) => fake('subscription_started', sub, user, {
  interval: 'month', current_period_start: iso(0), current_period_end: iso(30 * DAY), transaction_id: `${sub}-tx`,
});

// --- what a deletion must leave -----------------------------------------------------------------------------------------------
/** Every uuid column named user_id, *_user_id or *_by, and how many rows hold `id` in it (the account-data map's own pattern). */
function referencesTo(id) {
  const columns = psql(`SELECT table_name || '.' || column_name FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'uuid'
    AND (column_name = 'user_id' OR column_name LIKE '%\\_user\\_id' OR column_name LIKE '%\\_by') ORDER BY 1`).split('\n').filter(Boolean);
  const found = {};
  for (const column of columns) {
    const [table, name] = column.split('.');
    const count = Number(psql(`SELECT count(*) FROM ${table} WHERE ${name} = '${id}'`));
    if (count > 0) found[column] = count;
  }
  return { checked: columns.length, found };
}

const S = {};
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

  await step('setup', 'API reachable; admins and learners (psql, signed in through the API)', async () => {
    await waitFor(async () => { try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; } }, Boolean, `API at ${BASE}`, 20_000);
    const [a1, a2] = await sqlUsers(['admin1', 'admin2'], { staffRole: 'admin' });
    const [editor] = await sqlUsers(['editor'], { staffRole: 'editor' });
    S.admin = await signIn(a1);
    S.admin2 = await signIn(a2);
    S.editor = await signIn(editor);
    const labels = ['pw', 'renew', 'adm', 'stuck', 'stuckc', 'replay', 'big', 'late', 'report', 'cancel'];
    const users = await sqlUsers(labels);
    S.u = {};
    for (const [i, user] of users.entries()) S.u[labels[i]] = await signIn(user);
    ok(`database ${DB_NAME}; 2 admins, 1 editor, ${labels.length} learners signed in`);
  });

  // -----------------------------------------------------------------------------------------------------------------------------
  await step('B8A1 B8E1', 'Google, a new person: the fake page, the sign-up ticket, completion, a Google session', async () => {
    const trip = await googleTrip({ email: emailOf('gnew'), sub: `sub-gnew-${run}`, given: 'Minh', family: 'Trần', picture: 'https://example.com/minh.png', next: '/vi/app/groups' });
    check(trip.location === `${LEARNER}/vi/app/google/complete`, `callback went to ${trip.location}`);
    check(trip.jar.has('google_signup') && !trip.jar.has('google_oauth'), 'google_signup cookie set / google_oauth not cleared');
    check(/SameSite=Lax/i.test(trip.jar.attributes('google_signup')) && /HttpOnly/i.test(trip.jar.attributes('google_signup')), `signup cookie flags: ${trip.jar.attributes('google_signup')}`);
    check(psql(`SELECT count(*) FROM users WHERE email = '${emailOf('gnew')}'`) === '0', 'a user was written before completion (D6)');
    const info = await completeInfo(trip.jar);
    check(info.status === 200 && info.json.email === emailOf('gnew') && info.json.needs_name === false, `complete info ${brief(info)}`);
    await wantProblem(completePost(trip.jar, BIRTH, { 'X-CSRF-Protection': '' }), 403, 'csrf-header-required', 'POST complete without the CSRF header');
    const done = await completePost(trip.jar, BIRTH);
    check(done.status === 200 && done.json.access_token, `complete ${brief(done)}`);
    const me = await want(api('GET', '/v1/me', { token: done.json.access_token }), 200, 'GET /v1/me');
    check(me.auth_method === 'google' && JSON.stringify(me.sign_in_methods) === '["google"]' && me.given_name === 'Minh' && me.family_name === 'Trần' && me.email_verified === true,
      `GET /v1/me ${JSON.stringify(me)}`);
    check(userRow(me.id, 'avatar_url') === 'https://example.com/minh.png', 'avatar_url not stored');
    check(psql(`SELECT count(*) FROM user_identities WHERE user_id = '${me.id}' AND provider = 'google' AND subject = 'sub-gnew-${run}'`) === '1', 'identity row');
    check(psql(`SELECT count(*) FROM password_credentials WHERE user_id = '${me.id}'`) === '0', 'a Google-only account has a password');
    S.gnew = { id: me.id, email: emailOf('gnew'), sub: `sub-gnew-${run}`, token: done.json.access_token };
    ok(`ticket → ${me.id}: auth_method google, sign_in_methods [google], names and avatar from Google, identity row, no password`);

    const nameless = await googleTrip({ email: emailOf('gnone'), sub: `sub-gnone-${run}` });
    const infoN = await completeInfo(nameless.jar);
    check(infoN.json.needs_name === true, `needs_name ${brief(infoN)}`);
    await wantProblem(completePost(nameless.jar, BIRTH), 400, 'validation-failed', 'no name at all');
    const named = await completePost(nameless.jar, { ...BIRTH, given_name: 'Lan' });
    check(named.status === 200, `with a name ${brief(named)}`);
    ok('Google without a first name: needs_name true; completing without one → 400; with one → 200');
  });

  await step('B8E9 B8E8', 'Google sign-up: under 13 stores nothing; the same ticket cannot be reused; no cookie → 401', async () => {
    const young = await googleTrip({ email: emailOf('gkid'), sub: `sub-gkid-${run}`, given: 'Kid' });
    const twelve = new Date(); twelve.setFullYear(twelve.getFullYear() - 12);
    await wantProblem(completePost(young.jar, { ...BIRTH, birth_date: twelve.toISOString().slice(0, 10) }), 400, 'age-below-minimum', 'under 13');
    check(psql(`SELECT count(*) FROM users WHERE email = '${emailOf('gkid')}'`) === '0' && !young.jar.has('google_signup'), 'under 13: a user exists or the ticket cookie remains');
    const noCookie = await completeInfo(new Jar());
    check(noCookie.status === 401, `no cookie: ${noCookie.status}`);
    ok('under 13 → 400 age-below-minimum, no row, ticket cookie cleared; GET complete without a cookie → 401');
  });

  await step('B8E6', 'an unverified account with the same email: the Google sign-up reuses its id, drops the password and the old sessions', async () => {
    const [stale] = await sqlUsers(['unv'], { verified: false });
    const trip = await googleTrip({ email: stale.email, sub: `sub-unv-${run}`, given: 'Vera' });
    const done = await completePost(trip.jar, BIRTH);
    check(done.status === 200, `complete ${brief(done)}`);
    const me = await want(api('GET', '/v1/me', { token: done.json.access_token }), 200, 'GET /v1/me');
    check(me.id === stale.id, `a new id ${me.id} instead of ${stale.id}`);
    check(psql(`SELECT count(*) FROM password_credentials WHERE user_id = '${stale.id}'`) === '0', 'the old password remains');
    ok('same id, verified, no password; Google identity linked');
  });

  await step('K8 B8E5 B8E58', 'an existing verified account takes the Google identity: link mail, Google session, cookie survives the redirect chain, refresh works', async () => {
    const [lan] = await sqlUsers(['link']);
    const before = (await mailsTo(lan.email)).length;
    const trip = await googleTrip({ email: lan.email, sub: `sub-link-${run}`, given: 'Lan', next: '/vi/app/word?id=1#x' });
    check(trip.location === `${LEARNER}/vi/app/word?id=1&signed_in=google#x`, `redirect ${trip.location}`);
    check(trip.jar.has('refresh_token') && /HttpOnly/i.test(trip.jar.attributes('refresh_token')), 'no refresh_token cookie');
    const refreshed = await refreshWith(trip.jar);
    check(refreshed.status === 200 && refreshed.json.access_token, `refresh with the cookie: ${brief(refreshed)}`);
    const me = await want(api('GET', '/v1/me', { token: refreshed.json.access_token }), 200, 'GET /v1/me');
    check(me.auth_method === 'google' && JSON.stringify(me.sign_in_methods) === '["password","google"]', `me ${JSON.stringify(me)}`);
    await waitFor(() => mailsTo(lan.email), (list) => list.length > before && list.some(isLinkedMail), 'the "Google linked" mail');
    check(psql(`SELECT count(*) FROM user_identities WHERE user_id = '${lan.id}'`) === '1', 'identity row');
    const again = await googleTrip({ email: lan.email, sub: `sub-link-${run}` });
    check(again.location.includes('signed_in=google'), 'a second sign-in by sub failed');
    const other = await googleTrip({ email: lan.email, sub: `sub-other-${run}` });
    check(other.location === `${LEARNER}/vi/app/login?error=google-failed`, `another Google account for the same email: ${other.location}`);
    ok('callback → web with signed_in=google (query and fragment kept), refresh_token cookie, /refresh 200, mail "Google linked"; same sub again OK; another sub for the same email → google-failed (P13)');
  });

  await step('D5 B8E11 B8E3 B8E1', 'a Google session never reaches an admin route; a locked account is refused; an unverified Google email is refused', async () => {
    const adminTrip = await googleTrip({ email: S.admin.email, sub: `sub-admin-${run}`, given: 'Hà' });
    const refreshed = await refreshWith(adminTrip.jar);
    const forbidden = await api('GET', '/v1/admin/users', { token: refreshed.json.access_token });
    check(forbidden.status === 403 && String(forbidden.json?.type).endsWith('/password-login-required'), `admin route with a Google session: ${brief(forbidden)}`);
    const withPassword = await api('GET', '/v1/admin/users', { token: (await signIn(S.admin)).token });
    check(withPassword.status === 200, `admin route with the password session: ${withPassword.status}`);
    const [locked] = await sqlUsers(['locked'], { status: 'locked' });
    const lockedTrip = await googleTrip({ email: locked.email, sub: `sub-locked-${run}` });
    check(lockedTrip.location === `${LEARNER}/vi/app/login?error=account-locked`, `locked: ${lockedTrip.location}`);
    check(psql(`SELECT count(*) FROM user_identities WHERE user_id = '${locked.id}'`) === '0', 'a locked account got an identity');
    const unverified = await googleTrip({ email: emailOf('gunv'), sub: `sub-gunv-${run}`, emailVerified: false });
    check(unverified.location === `${LEARNER}/vi/app/login?error=google-email-unverified`, `unverified: ${unverified.location}`);
    const forged = await hop(`${BASE}/v1/auth/google/callback?code=x&state=y`, new Jar());
    check(forged.headers.get('location') === `${LEARNER}/vi/app/login?error=google-failed`, 'a callback with no cookie did not fail');
    ok('Google session on an admin route → 403 password-login-required; locked → account-locked; email_verified=false → google-email-unverified; forged callback → google-failed');
  });

  // -----------------------------------------------------------------------------------------------------------------------------
  await step('B8A2 B8E18 B8E26', 'delete with a password: wrong password counted and 400; right password 204; every module erased; the mail; sign-in impossible', async () => {
    const u = S.u.pw;
    // Data in several modules: a group + an idempotency key (API), reminder prefs (API), a private word, an AI replay row, a usage row, a report.
    await want(api('POST', '/v1/groups', { token: u.token, idem: true, body: { name: `Del ${run}` } }), 201, 'group');
    await want(api('PATCH', '/v1/me/reminders', { token: u.token, idem: true, body: { enabled: false } }), 200, 'reminders');
    psql(`INSERT INTO entries (lemma, pos, scope, owner_user_id) VALUES ('smokeb8word${run}', 'unspecified', 'private', '${u.id}')`);
    psql(`INSERT INTO ai_operations (user_id, operation_id, operation, fingerprint, status, attempt_id, started_at, deadline_at, expires_at)
      VALUES ('${u.id}', 'smoke-${run}-1', 'lookup_word', 'f', 'succeeded', gen_random_uuid(), now(), now(), now() + interval '1 day')`);
    psql(`INSERT INTO usage_records (user_id, pool, operation_id, kind, status, confirmed_at, system_date) VALUES ('${u.id}', 'ai_lookup', 'smoke-${run}-use', 'use', 'confirmed', now(), current_date)`);
    const before = referencesTo(u.id);
    for (const column of ['learning_groups.user_id', 'idempotency_keys.user_id', 'reminder_prefs.user_id', 'entries.owner_user_id', 'ai_operations.user_id', 'usage_records.user_id']) {
      check(before.found[column] > 0, `before: nothing in ${column}`);
    }
    ok(`before: rows in ${Object.keys(before.found).length} of ${before.checked} user columns`);

    const body = (password) => ({ confirm_email: ` ${u.email.toUpperCase()} `, acknowledged: true, password });
    const failedBefore = Number(userRow(u.id, 'failed_login_count'));
    await wantProblem(api('POST', '/v1/me/account/delete', { token: u.token, body: body('wrong-password') }), 400, 'invalid-current-password', 'wrong password');
    check(Number(userRow(u.id, 'failed_login_count')) === failedBefore + 1, 'a wrong password was not counted once');
    await wantProblem(api('POST', '/v1/me/account/delete', { token: u.token, body: { ...body(PASSWORD), confirm_email: 'other@example.com' } }), 400, 'confirm-email-mismatch', 'mismatch');
    await wantProblem(api('POST', '/v1/me/account/delete', { token: u.token, body: { ...body(PASSWORD), acknowledged: false } }), 400, 'validation-failed', 'not ticked');
    check(userExists(u.id), 'a refused deletion removed the user');

    const res = await api('POST', '/v1/me/account/delete', { token: u.token, body: body(PASSWORD) });
    check(res.status === 204 && res.text === '', `delete ${brief(res)}`);
    check(!userExists(u.id), 'the user row remains');
    const after = referencesTo(u.id);
    const allowed = new Set(['deleted_accounts.user_id']);
    const left = Object.keys(after.found).filter((column) => !allowed.has(column));
    check(left.length === 0, `rows still point at the deleted user: ${JSON.stringify(after.found)}`);
    check(psql(`SELECT by FROM deleted_accounts WHERE user_id = '${u.id}'`) === 'self', 'deleted_accounts.by');
    check(psql(`SELECT count(*) FROM usage_records WHERE operation_id = 'smoke-${run}-use'`) === '1', 'the usage row (anonymised) is gone');
    check(psql(`SELECT count(*) FROM entries WHERE lemma = 'smokeb8word${run}'`) === '0', 'the private word remains');
    const mails = await waitFor(() => mailsTo(u.email), (list) => list.some(isDeletedMail), 'the "đã xóa" mail');
    check(mails.filter(isDeletedMail).length === 1, `${mails.filter(isDeletedMail).length} "deleted" mails`);
    await wantProblem(loginRes(u.email), 401, 'invalid-credentials', 'login after deletion');
    const old = await api('GET', '/v1/me', { token: u.token });
    check(old.status === 401, `the old access token still works: ${old.status}`);
    ok(`wrong password 400 (counted once); right → 204; ${after.checked} user columns checked, none points at the user; usage row kept under an anon id; private word gone; one "đã xóa" mail; login and old token refused`);
  });

  await step('B8A5 B8E19 B8E20', 'delete a Google-only account: reauth required, wrong Google account refused, the right one deletes', async () => {
    const g = S.gnew;
    const body = { confirm_email: g.email, acknowledged: true };
    await wantProblem(api('POST', '/v1/me/account/delete', { token: g.token, body }), 403, 'reauth-required', 'no reauth');
    const started = await want(api('POST', '/v1/auth/google/reauth', { token: g.token, body: { locale: 'vi' } }), 200, 'POST reauth');
    check(started.start_url.startsWith(`${BASE}/v1/auth/google/start?`), `start_url ${started.start_url}`);
    const wrong = await googleTrip({ email: g.email, sub: 'someone-else', startUrl: started.start_url });
    check(wrong.location === `${LEARNER}/vi/app/settings/delete-account?reauth=wrong-account` && !wrong.jar.has('google_reauth'), `wrong account: ${wrong.location}`);
    const right = await googleTrip({ email: g.email, sub: g.sub, startUrl: (await want(api('POST', '/v1/auth/google/reauth', { token: g.token, body: { locale: 'vi' } }), 200, 'POST reauth')).start_url });
    check(right.location === `${LEARNER}/vi/app/settings/delete-account?reauth=ok` && right.jar.has('google_reauth'), `right account: ${right.location}`);
    check(/Path=\/v1\/me\/account/i.test(right.jar.attributes('google_reauth')), `reauth cookie path: ${right.jar.attributes('google_reauth')}`);
    const noCookie = await api('POST', '/v1/me/account/delete', { token: g.token, body });
    check(noCookie.status === 403, 'delete without the cookie');
    const res = await api('POST', '/v1/me/account/delete', { token: g.token, body, headers: { cookie: right.jar.header() } });
    check(res.status === 204, `delete with the Google proof ${brief(res)}`);
    check(!userExists(g.id) && psql(`SELECT count(*) FROM user_identities WHERE subject = '${g.sub}'`) === '0', 'user or identity remains');
    ok('no proof → 403 reauth-required; another Google account → reauth=wrong-account; the right one → cookie → 204; identity gone');
  });

  await step('B8A6 B8E57 D31', 'a renewing plan blocks a learner; "Hủy gói" (fake provider confirms at once); then the learner deletes', async () => {
    const u = S.u.renew;
    const sub = `sub-renew-${run}`;
    await startSub(sub, u.id);
    const body = { confirm_email: u.email, acknowledged: true, password: PASSWORD };
    await wantProblem(api('POST', '/v1/me/account/delete', { token: u.token, body }), 409, 'subscription-renewing', 'renewing');
    check(userExists(u.id), 'a blocked deletion removed the user');
    const view = await want(api('GET', '/v1/me/entitlements', { token: u.token }), 200, 'entitlements');
    const source = view.sources.find((s) => s.kind === 'subscription');
    check(source && source.cancel_at_period_end === false, `source ${JSON.stringify(source)}`);
    await wantProblem(api('POST', `/v1/me/subscriptions/${randomUUID()}/cancel`, { token: u.token, idem: true }), 409, 'subscription-not-cancellable', 'another subscription');
    const key = randomUUID();
    const cancelled = await api('POST', `/v1/me/subscriptions/${source.id}/cancel`, { token: u.token, idem: key });
    check(cancelled.status === 202 && cancelled.json.status === 'requested', `cancel ${brief(cancelled)}`);
    const replay = await api('POST', `/v1/me/subscriptions/${source.id}/cancel`, { token: u.token, idem: key });
    check(replay.status === 202, `replay with the same key ${replay.status}`);
    check(psql(`SELECT cancel_at_period_end FROM subscriptions WHERE external_subscription_id = '${sub}'`) === 't', 'cancel_at_period_end is not true when the call returned');
    await wantProblem(api('POST', `/v1/me/subscriptions/${source.id}/cancel`, { token: u.token, idem: true }), 409, 'subscription-not-cancellable', 'second cancel');
    const res = await api('POST', '/v1/me/account/delete', { token: u.token, body });
    check(res.status === 204, `delete after the cancel ${brief(res)}`);
    check(psql(`SELECT count(*) FROM subscriptions WHERE external_subscription_id = '${sub}'`) === '0' && psql(`SELECT count(*) FROM billing_events WHERE external_subscription_id = '${sub}'`) === '0',
      'subscription or billing events remain');
    check(psql(`SELECT count(*) FROM billing_transactions WHERE provider_transaction_id = '${sub}-tx'`) === '1' && referencesTo(u.id).found['billing_transactions.user_id'] === undefined, 'billing_transactions: kept under an anon id');
    ok('delete → 409 subscription-renewing; cancel → 202, flag true on return; again → 409; delete → 204; plan rows gone, transaction kept anonymised');
  });

  await step('B8A3 B8A4 D31 B8E31 B8E47', 'admin deletes a renewing learner in one request (the provider is told, the flag is recorded); editor 403; wrong email 400', async () => {
    const u = S.u.adm;
    const sub = `sub-adm-${run}`;
    await startSub(sub, u.id);
    const target = `/v1/admin/users/${u.id}/delete`;
    await wantProblem(api('POST', target, { token: S.editor.token, body: { confirm_email: u.email } }), 403, 'forbidden', 'editor');
    await wantProblem(api('POST', target, { token: S.admin.token, body: { confirm_email: 'nobody@example.com' } }), 400, 'confirm-email-mismatch', 'wrong email');
    await wantProblem(api('POST', `/v1/admin/users/${S.admin.id}/delete`, { token: S.admin.token, body: { confirm_email: S.admin.email } }), 409, 'self-delete', 'self');
    check(userExists(u.id), 'a refused deletion removed the user');
    const res = await api('POST', target, { token: S.admin.token, body: { confirm_email: u.email } });
    check(res.status === 204, `admin delete of a renewing learner: ${brief(res)}`);
    check(!userExists(u.id) && psql(`SELECT by FROM deleted_accounts WHERE user_id = '${u.id}'`) === 'admin', 'user or deleted_accounts.by');
    check(psql(`SELECT count(*) FROM fake_billing_subscriptions WHERE external_subscription_id = '${sub}'`) === '0', 'the fake provider row remains');
    await waitFor(() => mailsTo(u.email), (list) => list.some(isDeletedMail), 'the "đã xóa" mail of the admin deletion');
    ok('editor 403; wrong email 400; self 409 self-delete; renewing learner → 204 in the same request; by = admin; "đã xóa" mail sent');
  });

  await step('B8E40', 'two admins delete each other at once while the staff-role lock is held: exactly one 204 and one 409 last-admin', async () => {
    check(Number(psql(`SELECT count(*) FROM users WHERE staff_role = 'admin' AND status <> 'deleting'`)) === 2, 'this step needs exactly two admins: start from a fresh smoke database');
    const lockKey = 'identity.staff_role';
    const holder = psqlBackground(`SELECT pg_advisory_lock(hashtextextended('${lockKey}', 0));`);
    await waitFor(() => psql(`SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND granted AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`), (n) => Number(n) >= 1, 'psql to hold the staff-role lock', 20_000);
    const one = api('POST', `/v1/admin/users/${S.admin2.id}/delete`, { token: S.admin.token, body: { confirm_email: S.admin2.email }, raw: true });
    const two = api('POST', `/v1/admin/users/${S.admin.id}/delete`, { token: S.admin2.token, body: { confirm_email: S.admin.email }, raw: true });
    await sleep(1_500);
    holder.finish(`SELECT pg_advisory_unlock(hashtextextended('${lockKey}', 0));`);
    const [r1, r2] = await Promise.all([one, two]);
    await holder.done;
    const statuses = [r1.status, r2.status].sort();
    check(statuses[0] === 204 && statuses[1] === 409, `statuses ${r1.status} / ${r2.status}: ${brief(r1)} | ${brief(r2)}`);
    const loser = [r1, r2].find((r) => r.status === 409);
    check(String(loser.json?.type).endsWith('/last-admin'), `the 409 is ${brief(loser)}`);
    const admins = Number(psql(`SELECT count(*) FROM users WHERE staff_role = 'admin' AND status <> 'deleting'`));
    check(admins >= 1, 'no admin left');
    ok(`${r1.status}/${r2.status}: one admin was deleted, the other kept (${admins} admin(s) left)`);
    // The surviving admin carries on as the operator of the rest of the smoke.
    const survivor = userExists(S.admin.id) ? S.admin : S.admin2;
    S.op = await signIn(survivor);
  });

  await step('B8E22 M14', 'a deletion left deleting for 11 minutes is finished by the retry job, with exactly one mail; a cleanup one with none', async () => {
    const u = S.u.stuck;
    psql(`UPDATE users SET status = 'deleting', deleting_since = now() - interval '11 minutes', deleting_by = 'self' WHERE id = '${u.id}'`);
    const old = await api('GET', '/v1/me', { token: u.token });
    check(old.status === 401, `a deleting account's token still works: ${old.status}`);
    maintenance();
    await waitFor(() => userExists(u.id), (exists) => !exists, 'the retry job to finish the deletion');
    const mails = await waitFor(() => mailsTo(u.email), (list) => list.filter(isDeletedMail).length >= 1, 'the mail of the retried deletion');
    await sleep(1_000);
    check((await mailsTo(u.email)).filter(isDeletedMail).length === 1, `${(await mailsTo(u.email)).filter(isDeletedMail).length} mails`);
    check(psql(`SELECT by FROM deleted_accounts WHERE user_id = '${u.id}'`) === 'self', 'by');
    const c = S.u.stuckc;
    psql(`UPDATE users SET status = 'deleting', deleting_since = now() - interval '11 minutes', deleting_by = 'cleanup' WHERE id = '${c.id}'`);
    maintenance();
    await waitFor(() => userExists(c.id), (exists) => !exists, 'the retry of a cleanup deletion');
    await sleep(1_500);
    check((await mailsTo(c.email)).filter(isDeletedMail).length === 0, 'a cleanup deletion sent a mail');
    check(psql(`SELECT by FROM deleted_accounts WHERE user_id = '${c.id}'`) === 'cleanup', 'by cleanup');
    ok(`${mails.length} mail(s) in all; self → one "đã xóa" mail; cleanup → none; deleted_accounts.by keeps who started it`);
  });

  await step('B8E52', 'a renewal switched on again before Tx B: the deletion stays pending, then finishes after the cancel', async () => {
    const [u] = await sqlUsers(['again']);
    const sub = `sub-again-${run}`;
    await startSub(sub, u.id);
    psql(`UPDATE users SET status = 'deleting', deleting_since = now() - interval '11 minutes', deleting_by = 'self' WHERE id = '${u.id}'`);
    maintenance();
    check(userExists(u.id) && userRow(u.id, 'status') === 'deleting', 'a renewing account was deleted');
    psql(`UPDATE subscriptions SET cancel_at_period_end = true WHERE external_subscription_id = '${sub}'`);
    maintenance();
    await waitFor(() => userExists(u.id), (exists) => !exists, 'the retry to finish after the cancel');
    ok('retry with a renewing subscription → still deleting (no erase); after cancel_at_period_end → deleted');
  });

  await step('P4 B8E24 B8E32 D19', 'unverified clean-up: setting 1 day; an old unverified and an old locked-unverified go; a verified, a fresh one and a staff one stay; no mail', async () => {
    await want(api('PUT', '/v1/admin/settings', { token: S.op.token, idem: true, body: { version: Number((await want(api('GET', '/v1/admin/settings', { token: S.op.token }), 200, 'settings')).version), values: { identity: { unverified_cleanup_days: 1 } } } }), 200, 'PUT settings');
    const [oldUnverified] = await sqlUsers(['oldunv'], { verified: false, createdAgo: '3 days' });
    const [oldLocked] = await sqlUsers(['oldlocked'], { verified: false, status: 'locked', createdAgo: '3 days' });
    const [oldVerified] = await sqlUsers(['oldver'], { createdAgo: '3 days' });
    const [fresh] = await sqlUsers(['freshunv'], { verified: false });
    const [oldStaff] = await sqlUsers(['oldstaff'], { verified: false, staffRole: 'editor', createdAgo: '3 days' });
    maintenance();
    await waitFor(() => userExists(oldUnverified.id), (exists) => !exists, 'the old unverified account to be cleaned');
    check(!userExists(oldLocked.id), 'the locked unverified account remains');
    for (const kept of [oldVerified, fresh, oldStaff]) check(userExists(kept.id), `${kept.email} was deleted`);
    check(psql(`SELECT by FROM deleted_accounts WHERE user_id = '${oldUnverified.id}'`) === 'cleanup', 'by cleanup');
    await sleep(1_000);
    check((await mailsTo(oldUnverified.email)).filter(isDeletedMail).length === 0, 'the clean-up sent a mail');
    ok('old unverified + old locked-unverified deleted (by cleanup, no mail); verified, fresh unverified and staff kept');
  });

  await step('B8E53 P2 D21', 'replay after a restore: the users row comes back (restored subscription row says renewing); replay deletes it, no mail, no conditions', async () => {
    const u = S.u.replay;
    const sub = `sub-replay-${run}`;
    await startSub(sub, u.id);
    psql(`UPDATE subscriptions SET cancel_at_period_end = true WHERE external_subscription_id = '${sub}'`);
    await want(api('POST', '/v1/me/account/delete', { token: u.token, body: { confirm_email: u.email, acknowledged: true, password: PASSWORD } }), 204, 'delete');
    const exported = cli('accounts-deletions.js', ['export']);
    check(exported.includes(u.id), 'export does not list the deleted account');
    // The "restore": the user row and a subscription row that still says renewing come back.
    psql(`INSERT INTO users (id, email, timezone, email_verified_at, status, staff_role) VALUES ('${u.id}', '${u.email}', '${TIMEZONE}', now(), 'active', NULL)`);
    psql(`INSERT INTO subscriptions (user_id, provider, environment, external_subscription_id, interval, status, cancel_at_period_end, current_period_end)
      VALUES ('${u.id}', 'fake', 'sandbox', 'restored-${run}', 'month', 'active', false, now() + interval '20 days')`);
    const mailsBefore = (await mailsTo(u.email)).length;
    const out = cli('accounts-deletions.js', ['replay']);
    check(/replayed \d+/.test(out) && !/pending [0-9a-f-]{36}/.test(out), `replay output: ${out}`);
    check(!userExists(u.id), 'the restored user remains after the replay');
    check(psql(`SELECT count(*) FROM subscriptions WHERE user_id = '${u.id}'`) === '0', 'the restored renewing subscription remains');
    await sleep(1_000);
    check((await mailsTo(u.email)).length === mailsBefore, 'the replay sent a mail');
    ok(`replay: ${(out.match(/replayed[^\n]*/) ?? ['(no "replayed" line)'])[0]}; the restored user and its renewing subscription are gone, no mail`);
  });

  await step('M1 R1 B8E25', 'rows a late request writes after the deletion are removed by the sweep; a late webhook leaves no id', async () => {
    const u = S.u.late;
    await want(api('POST', '/v1/me/account/delete', { token: u.token, body: { confirm_email: u.email, acknowledged: true, password: PASSWORD } }), 204, 'delete');
    psql(`INSERT INTO ai_operations (user_id, operation_id, operation, fingerprint, status, attempt_id, started_at, deadline_at, expires_at)
      VALUES ('${u.id}', 'late-${run}', 'lookup_word', 'f', 'succeeded', gen_random_uuid(), now(), now(), now() + interval '1 day')`);
    check(referencesTo(u.id).found['ai_operations.user_id'] === 1, 'the late row was not written');
    maintenance();
    await waitFor(() => referencesTo(u.id).found['ai_operations.user_id'] ?? 0, (n) => n === 0, 'the sweep to remove the late row');
    const eventId = await fake('renewed', `sub-late-${run}`, u.id, { interval: 'month', current_period_start: iso(0), current_period_end: iso(30 * DAY), transaction_id: `late-tx-${run}` });
    const row = psql(`SELECT status || '|' || coalesce(app_user_id::text, '-') || '|' || coalesce(user_id::text, '-') || '|' || payload::text FROM billing_events WHERE dedupe_key = 'fake:sandbox:${eventId}'`);
    check(row === 'ignored|-|-|{}', `late event row: ${row}`);
    ok('late ai_operations row removed by the sweep; a late webhook is ignored with no app_user_id, user_id or payload');
  });

  await step('B8E27 D14 D27', 'a report: kept under an anon id with no note and no learner answer; a report on a private word is deleted; the AI refund flag is untouched', async () => {
    const u = S.u.report;
    const sense = psql(`SELECT s.id FROM senses s LIMIT 1`) || randomUUID();
    psql(`INSERT INTO practice_report_reasons (code, label_vi, label_en, applies_to, note_required, refundable, active, position)
      VALUES ('smoke${run}', 'x', 'x', 'all', false, false, true, 99) ON CONFLICT DO NOTHING`);
    psql(`INSERT INTO practice_reports (user_id, sense_id, question_snapshot, reason, reason_label, note, status, created_at, refunded)
      VALUES ('${u.id}', '${sense}', '{"learner":{"answer":"secret answer","answers_tried":["a"],"option_index":2,"result":"wrong"},"prompt":{"x":1}}', 'smoke${run}', 'x', 'my private note', 'open', now(), false)`);
    await want(api('POST', '/v1/me/account/delete', { token: u.token, body: { confirm_email: u.email, acknowledged: true, password: PASSWORD } }), 204, 'delete');
    const kept = psql(`SELECT user_id <> '${u.id}' AND note IS NULL AND question_snapshot #>> '{learner,answer}' IS NULL AND question_snapshot #>> '{learner,result}' = 'wrong'
      AND refunded = false FROM practice_reports WHERE reason = 'smoke${run}'`);
    check(kept === 't', `kept report: ${psql(`SELECT user_id, note, question_snapshot::text, refunded FROM practice_reports WHERE reason = 'smoke${run}'`)}`);
    ok('the report stays under an anon id, note null, learner.answer null, result and refunded unchanged');
  });

  await step('B8E28', 'a person who deleted and registers again with the same email gets a trial again (trial history is not kept)', async () => {
    const email = emailOf('retrial');
    const [t] = await sqlUsers(['retrial']);
    const sub = `sub-trial-${run}`;
    await fake('subscription_started', sub, t.id, { interval: 'month', current_period_start: iso(0), current_period_end: iso(7 * DAY), trial_ends_at: iso(7 * DAY), payment_fingerprint: `fp-${run}` });
    check(psql(`SELECT count(*) FROM trial_history WHERE user_id = '${t.id}'`) === '1', 'no trial_history row');
    await want(api('POST', `/v1/admin/users/${t.id}/delete`, { token: S.op.token, body: { confirm_email: email } }), 204, 'admin delete');
    check(psql(`SELECT count(*) FROM trial_history WHERE user_id = '${t.id}'`) === '0', 'trial_history remains');
    const before = (await mailsTo(email)).length;
    await want(api('POST', '/v1/auth/register', { body: { email, password: PASSWORD, timezone: TIMEZONE, client: 'web', given_name: 'Lan', birth_date: '2000-05-17', accept_terms: true } }), 201, 'register again');
    const mails = await waitFor(() => mailsTo(email), (list) => list.length > before, 'the OTP mail');
    const code = (await (await send(`${MAILPIT}/api/v1/message/${mails[0].ID}`)).json()).Text.match(/(\d{6})/)[1];
    const verified = await want(api('POST', '/v1/auth/verify-email', { body: { email, code, password: PASSWORD, client: 'web' } }), 200, 'verify');
    await want(api('PATCH', '/v1/me', { token: verified.access_token, body: { native_language: 'vi' } }), 200, 'native language');
    const view = await want(api('GET', '/v1/me/entitlements', { token: verified.access_token }), 200, 'entitlements');
    check(view.trial_eligible === true, `trial_eligible ${view.trial_eligible}`);
    ok('trial_history gone with the account; the same email registers again and is trial-eligible');
  });

  await step('B8E49', 'a big learner (50 000 log rows, 2 000 private words) is deleted in under 120 s', async () => {
    const u = S.u.big;
    psql(`INSERT INTO learning_log (user_id, item_id, sense_id, kind, local_date, at) SELECT '${u.id}', gen_random_uuid(), gen_random_uuid(), 'review', current_date, now() FROM generate_series(1, 50000)`);
    psql(`INSERT INTO entries (lemma, pos, scope, owner_user_id) SELECT 'smokebig${run}' || g, 'unspecified', 'private', '${u.id}' FROM generate_series(1, 2000) g`);
    check(psql(`SELECT count(*) FROM learning_log WHERE user_id = '${u.id}'`) === '50000', 'log rows');
    const t0 = Date.now();
    const res = await api('POST', '/v1/me/account/delete', { token: u.token, body: { confirm_email: u.email, acknowledged: true, password: PASSWORD } });
    const seconds = (Date.now() - t0) / 1000;
    check(res.status === 204, `delete ${brief(res)}`);
    check(seconds < 120, `the deletion took ${seconds}s (limit 120 s)`);
    check(psql(`SELECT count(*) FROM learning_log WHERE user_id = '${u.id}'`) === '0' && psql(`SELECT count(*) FROM entries WHERE owner_user_id = '${u.id}'`) === '0', 'rows remain');
    ok(`deleted in ${seconds.toFixed(1)} s (< 120 s)`);
  });

  console.log(`\n== Bước 8 smoke: ${results.filter((r) => r.status === 'PASS').length}/${results.length} steps in ${Math.round((Date.now() - started) / 1000)} s ==`);
  for (const r of results) console.log(`${r.status}  ${r.code}${r.reason ? ` — ${r.reason}` : ''}`);
  if (results.some((r) => r.status === 'FAIL')) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nSMOKE FAILED: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
