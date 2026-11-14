// Pre-launch smoke K3 (deploy runbook, gate G0): the identity invariants no test has run on real Postgres since the backend e2e suite was
// removed (D38). Against a REAL running API + worker on a fresh database whose name contains `smoke` (`english_learning_smoke_id`):
//   K3.1 the OTP lock: 21 wrong codes in 24 h lock the codes of that purpose for a day; each failure is committed by the request that
//        made it (the response is an error, the counter still moves), a dead code's tries do not count, a locked account gets no new code;
//   K3.2 reusing a rotated refresh token after its 2 s grace revokes that whole chain (its successor and its access token), not the others;
//   K3.3 a password reset, K3.4 a password change and K3.5 a logout revoke the sessions they should, and only those;
//   K3.6 registration: 5 per IP per hour, the 6th is a 429 and writes nothing.
//
// Start the stack first: `docker compose up -d` (repo root); create the database; in this package `pnpm db:setup && pnpm build`; start
// `pnpm run:dev` with DATABASE_URL on that database and TURNSTILE_MODE=fake; then `pnpm smoke:identity` with the same environment
// (SMOKE_BASE_URL when the API does not listen on :3000). Needs Mailpit and `docker compose -p english-learning` for psql.
// SMOKE_CONTINUE=1 prints a PASS/FAIL per step and keeps going.
//
// The per-IP and per-email limits are counted in `rate_limit_counters`; from one machine this smoke would hit them, so it clears that table
// between requests (as smoke:buoc-8 does). K3.6 is the one step that lets them count.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import argon2 from 'argon2';
import { SMOKE_TURNSTILE_TOKEN, requireFakeTurnstile } from './smoke-turnstile.mjs';
requireFakeTurnstile();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const CONTINUE = process.env.SMOKE_CONTINUE === '1';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-Id-Pass-9!';
const NEW_PASSWORD = 'Smoke-Id-New-Pass-7!';
const run = randomUUID().slice(0, 8);

const fileEnv = !process.env.SMOKE_IGNORE_ENV_FILE && existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
if (!process.env.DATABASE_URL && fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);
// The script inserts accounts and clears the rate-limit table: never against a working database.
if (!DB_NAME.includes('smoke')) throw new Error(`Refusing to run against "${DB_NAME}": use a fresh smoke database (english_learning_smoke_id).`);

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
  return { status: res.status, json, text, retryAfter: res.headers.get('retry-after') };
}
const brief = (res) => `${res.status} ${res.text.replace(/"(access_token|refresh_token)":"[^"]*"/g, '"$1":"<redacted>"').slice(0, 300)}`;
async function api(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return read(await send(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}
async function want(promise, status, context) {
  const res = await promise;
  if (res.status !== status) throw new Error(`${context}: expected ${status}, got ${brief(res)}`);
  return res.json;
}
async function wantProblem(promise, status, type, context) {
  const res = await promise;
  const got = String(res.json?.type ?? '');
  if (res.status !== status || !got.endsWith(`/${type}`)) throw new Error(`${context}: expected ${status} ${type}, got ${brief(res)}`);
  return res;
}

const psqlArgs = ['compose', '-p', 'english-learning', 'exec', '-T', 'postgres', 'psql', '-U', 'dev', '-d', DB_NAME, '-v', 'ON_ERROR_STOP=1', '-tA'];
function psql(sql) { return execFileSync('docker', [...psqlArgs, '-c', sql], { encoding: 'utf8' }).trim(); }
const resetLimits = () => psql('DELETE FROM rate_limit_counters');
async function waitFor(readValue, done, what, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await readValue();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`${what} did not happen within ${timeoutMs}ms: ${JSON.stringify(value)}`);
    await sleep(250);
  }
}

// --- mail --------------------------------------------------------------------------------------------------------------------
async function mailsTo(email) {
  const list = await (await send(`${MAILPIT}/api/v1/messages?limit=500`)).json();
  return (list.messages ?? []).filter((m) => m.To?.some((to) => to.Address === email)).sort((a, b) => (a.Created < b.Created ? 1 : -1));
}
const isLockMail = (m) => /Tạm khóa nhập mã|codes locked/i.test(m.Subject);
const isResetMail = (m) => /đã đặt lại|password was reset/i.test(m.Subject);
const isChangedMail = (m) => /đã đổi|password was changed/i.test(m.Subject);
async function codeOf(message) {
  const text = (await (await send(`${MAILPIT}/api/v1/message/${message.ID}`)).json()).Text;
  const match = text.match(/\b(\d{6})\b/);
  check(match, `no 6-digit code in "${message.Subject}"`);
  return match[1];
}
/** Asks for a reset code and returns it from the new mail. */
async function resetCode(email) {
  resetLimits();
  const before = (await mailsTo(email)).length;
  await want(api('POST', '/v1/auth/otp', { body: { purpose: 'reset_password', email, turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 202, `OTP request for ${email}`);
  const mails = await waitFor(() => mailsTo(email), (list) => list.length > before, `the reset code mail to ${email}`);
  return codeOf(mails[0]);
}

// --- accounts and sessions ---------------------------------------------------------------------------------------------------
let passwordHash;
async function sqlUser(label) {
  passwordHash ??= await argon2.hash(PASSWORD.normalize('NFC'), { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const email = `smokeid-${label}-${run}@example.com`;
  const id = psql(`WITH u AS (INSERT INTO users (email, timezone, email_verified_at, native_language, status, given_name, birth_date, terms_accepted_at, terms_version)
    VALUES ('${email}', '${TIMEZONE}', now(), 'vi', 'active', 'Lan', DATE '1999-01-01', now(), 'smoke') RETURNING id),
    c AS (INSERT INTO password_credentials (user_id, hash) SELECT id, '${passwordHash}' FROM u) SELECT id FROM u`);
  check(/^[0-9a-f-]{36}$/.test(id), `sqlUser ${label}: ${id}`);
  return { id, email };
}
/** A mobile session: the refresh token comes in the body, so the smoke handles it without a cookie jar. */
async function login(user, password = PASSWORD) {
  resetLimits();
  const body = await want(api('POST', '/v1/auth/login', { body: { email: user.email, password, client: 'mobile', turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 200, `login ${user.email}`);
  check(body.access_token && body.refresh_token, 'login answered without both tokens');
  return { access: body.access_token, refresh: body.refresh_token };
}
const refresh = (token) => api('POST', '/v1/auth/refresh', { body: { refresh_token: token } });
const me = (access) => api('GET', '/v1/me', { token: access });
const revokeReasons = (userId) => psql(`SELECT coalesce(revoke_reason, 'live') FROM session_chains WHERE user_id = '${userId}' ORDER BY created_at, id`).split('\n').filter(Boolean);
/** The session works: a refresh rotates it and /v1/me answers. Returns the rotated session. */
async function stillWorks(session, context) {
  const rotated = await refresh(session.refresh);
  check(rotated.status === 200, `${context}: refresh refused ${brief(rotated)}`);
  check((await me(rotated.json.access_token)).status === 200, `${context}: /v1/me refused the new access token`);
  return { access: rotated.json.access_token, refresh: rotated.json.refresh_token };
}
/** The session is dead: its refresh token and its access token are both refused with 401 invalid-token. */
async function isDead(session, context) {
  await wantProblem(refresh(session.refresh), 401, 'invalid-token', `${context}: refresh`);
  await wantProblem(me(session.access), 401, 'invalid-token', `${context}: access token`);
}

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

  await step('setup', 'API reachable on a smoke database', async () => {
    await waitFor(async () => { try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; } }, Boolean, `API at ${BASE}`, 20_000);
    ok(`database ${DB_NAME}, API ${BASE}`);
  });

  await step('K3.1', 'OTP lock: 21 wrong reset codes lock the codes for a day; every failure is committed; a dead code does not count; no new code while locked', async () => {
    const user = await sqlUser('otp');
    const failures = () => Number(psql(`SELECT coalesce((SELECT failures FROM otp_failure_windows WHERE user_id = '${user.id}' AND purpose = 'reset_password'), 0)`));
    const wrongReset = (code) => api('POST', '/v1/auth/password/reset', { body: { email: user.email, code, new_password: NEW_PASSWORD, turnstile_token: SMOKE_TURNSTILE_TOKEN } });
    const wrongOf = (code) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');
    let count = 0;
    // Four codes, five wrong tries each: a code allows 5 tries (attempts < 5), so 20 failures need 4 codes.
    for (let n = 1; n <= 4; n += 1) {
      const code = await resetCode(user.email);
      for (let i = 0; i < 5; i += 1) {
        resetLimits();
        await wantProblem(wrongReset(wrongOf(code)), 400, 'invalid-otp', `wrong code ${count + 1}`);
        count += 1;
        // Persisted by the request that failed: the counter moves although the answer is an error.
        check(failures() === count, `after wrong try ${count} the stored counter is ${failures()}`);
      }
      // Control: a sixth try on the same (now dead) code is refused and NOT counted.
      resetLimits();
      await wantProblem(wrongReset(wrongOf(code)), 400, 'invalid-otp', `a try on dead code ${n}`);
      check(failures() === count, `a dead code's try was counted: ${failures()} (want ${count})`);
      check(psql(`SELECT locked_until IS NULL FROM otp_failure_windows WHERE user_id = '${user.id}' AND purpose = 'reset_password'`) === 't', `locked before 21 (after ${count})`);
    }
    const lockMailsBefore = (await mailsTo(user.email)).filter(isLockMail).length;
    const fifth = await resetCode(user.email);
    resetLimits();
    await wantProblem(wrongReset(wrongOf(fifth)), 400, 'invalid-otp', 'wrong code 21');
    check(failures() === 21, `failures after the 21st: ${failures()}`);
    const lockedFor = Number(psql(`SELECT round(extract(epoch FROM locked_until - now()) / 3600) FROM otp_failure_windows WHERE user_id = '${user.id}' AND purpose = 'reset_password'`));
    check(lockedFor === 24, `locked_until is ${lockedFor} h ahead, want 24`);
    await waitFor(() => mailsTo(user.email), (list) => list.filter(isLockMail).length === lockMailsBefore + 1, 'the "codes locked" mail');
    // The right code of the live fifth code is refused while locked, and the password did not change.
    resetLimits();
    await wantProblem(api('POST', '/v1/auth/password/reset', { body: { email: user.email, code: fifth, new_password: NEW_PASSWORD, turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 400, 'invalid-otp', 'the right code while locked');
    await login(user, PASSWORD);
    // A new code is not issued while locked: the request answers 202 like any other, no code row, no mail.
    const codesBefore = psql(`SELECT count(*) FROM otp_codes WHERE user_id = '${user.id}'`);
    const mailsBefore = (await mailsTo(user.email)).length;
    resetLimits();
    await want(api('POST', '/v1/auth/otp', { body: { purpose: 'reset_password', email: user.email, turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 202, 'OTP request while locked');
    await sleep(2_500);
    check(psql(`SELECT count(*) FROM otp_codes WHERE user_id = '${user.id}'`) === codesBefore, 'a code was issued while locked');
    check((await mailsTo(user.email)).length === mailsBefore, 'a mail was sent while locked');
    // The other purpose is a separate window.
    check(psql(`SELECT count(*) FROM otp_failure_windows WHERE user_id = '${user.id}' AND purpose = 'verify_email'`) === '0', 'the verify_email window moved');
    ok('20 wrong tries over 4 codes, each committed (counter 1…20); dead-code tries not counted; the 21st → locked 24 h + one lock mail; the right code then refused, old password still signs in; a new request issues no code and no mail');
  });

  await step('K3.2', 'refresh reuse: inside the 2 s grace the successor comes back; after it the reuse revokes the whole chain (successor and access token); another device stays signed in', async () => {
    const user = await sqlUser('reuse');
    const phone = await login(user);
    const tablet = await login(user);
    const first = await refresh(phone.refresh);
    check(first.status === 200, `first rotation ${brief(first)}`);
    const next = { access: first.json.access_token, refresh: first.json.refresh_token };
    // Inside the grace (concurrent tabs): the same successor again, no revocation.
    const grace = await refresh(phone.refresh);
    check(grace.status === 200 && grace.json.refresh_token === next.refresh, `grace answer ${brief(grace)}`);
    check(revokeReasons(user.id).every((reason) => reason === 'live'), `a chain was revoked by the grace call: ${revokeReasons(user.id)}`);
    await sleep(2_600);
    await wantProblem(refresh(phone.refresh), 401, 'invalid-token', 'reuse after the grace');
    await isDead(next, 'the successor of the reused token');
    check(JSON.stringify(revokeReasons(user.id).sort()) === JSON.stringify(['live', 'reuse_detected']), `chains ${revokeReasons(user.id)}`);
    await stillWorks(tablet, 'the other device');
    ok('rotation 200; reuse inside 2 s → the same successor; after 2.6 s → 401 and the chain revoked (reuse_detected): successor refresh and access token 401; the other device still refreshes');
  });

  await step('K3.3', 'password reset: every session of the account is revoked; the new password signs in, the old one does not; login failures cleared', async () => {
    const user = await sqlUser('reset');
    const a = await login(user);
    const b = await login(user);
    resetLimits();
    await wantProblem(api('POST', '/v1/auth/login', { body: { email: user.email, password: 'Wrong-Pass-1!', client: 'mobile', turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 401, 'invalid-credentials', 'a wrong login');
    check(Number(psql(`SELECT count(*) FROM login_failures WHERE user_id = '${user.id}'`)) === 1, 'the wrong login was not recorded');
    const code = await resetCode(user.email);
    const mailsBefore = (await mailsTo(user.email)).filter(isResetMail).length;
    resetLimits();
    const res = await api('POST', '/v1/auth/password/reset', { body: { email: user.email, code, new_password: NEW_PASSWORD, turnstile_token: SMOKE_TURNSTILE_TOKEN } });
    check(res.status === 204, `reset ${brief(res)}`);
    await isDead(a, 'session A after the reset');
    await isDead(b, 'session B after the reset');
    check(JSON.stringify(revokeReasons(user.id)) === JSON.stringify(['password_reset', 'password_reset']), `chains ${revokeReasons(user.id)}`);
    check(psql(`SELECT count(*) FROM login_failures WHERE user_id = '${user.id}'`) === '0', 'login failures kept after the reset');
    resetLimits();
    await wantProblem(api('POST', '/v1/auth/login', { body: { email: user.email, password: PASSWORD, client: 'mobile', turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 401, 'invalid-credentials', 'the old password');
    await stillWorks(await login(user, NEW_PASSWORD), 'a new session with the new password');
    // The same code cannot be used twice.
    resetLimits();
    await wantProblem(api('POST', '/v1/auth/password/reset', { body: { email: user.email, code, new_password: PASSWORD, turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 400, 'invalid-otp', 'the used code again');
    await waitFor(() => mailsTo(user.email), (list) => list.filter(isResetMail).length === mailsBefore + 1, 'the "password reset" mail');
    ok('reset 204; both sessions 401 (refresh and access), chains revoked password_reset; login failures cleared; old password 401, new one signs in; the code is single-use; one "đặt lại" mail');
  });

  await step('K3.4', 'password change: every session is revoked, including the one that asked; the answer carries a new working session', async () => {
    const user = await sqlUser('change');
    const a = await login(user);
    const b = await login(user);
    resetLimits();
    await wantProblem(api('POST', '/v1/auth/password/change', { token: a.access, body: { current_password: 'Wrong-Pass-1!', new_password: NEW_PASSWORD } }), 400, 'invalid-current-password', 'a wrong current password');
    // The rotated session B is what must die below (its old refresh token is spent).
    const b2 = await stillWorks(b, 'session B after a refused change');
    check(revokeReasons(user.id).every((reason) => reason === 'live'), `a refused change revoked a chain: ${revokeReasons(user.id)}`);
    const mailsBefore = (await mailsTo(user.email)).filter(isChangedMail).length;
    resetLimits();
    const changed = await want(api('POST', '/v1/auth/password/change', { token: a.access, body: { current_password: PASSWORD, new_password: NEW_PASSWORD } }), 200, 'change');
    check(changed.access_token && changed.refresh_token, 'the change answered without a new session');
    await isDead(a, 'session A (asked for the change)');
    await isDead(b2, 'session B');
    await stillWorks({ access: changed.access_token, refresh: changed.refresh_token }, 'the session from the change');
    const reasons = revokeReasons(user.id);
    check(reasons.filter((r) => r === 'password_changed').length === 2 && reasons.filter((r) => r === 'live').length === 1, `chains ${reasons}`);
    resetLimits();
    await wantProblem(api('POST', '/v1/auth/login', { body: { email: user.email, password: PASSWORD, client: 'mobile', turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 401, 'invalid-credentials', 'the old password');
    await waitFor(() => mailsTo(user.email), (list) => list.filter(isChangedMail).length === mailsBefore + 1, 'the "password changed" mail');
    ok('wrong current password 400, nothing revoked; change 200 with a new session; A and B 401 (refresh and access), chains password_changed; the new session works; old password 401; one "đã được đổi" mail');
  });

  await step('K3.5', 'logout: that chain only; a second logout with the same token is a quiet 204; an unknown token revokes nothing', async () => {
    const user = await sqlUser('logout');
    const a = await login(user);
    const b = await login(user);
    resetLimits();
    const res = await api('POST', '/v1/auth/logout', { body: { refresh_token: a.refresh } });
    check(res.status === 204, `logout ${brief(res)}`);
    await isDead(a, 'the logged-out session');
    await stillWorks(b, 'the other session');
    check(JSON.stringify(revokeReasons(user.id).sort()) === JSON.stringify(['live', 'logout']), `chains ${revokeReasons(user.id)}`);
    resetLimits();
    check((await api('POST', '/v1/auth/logout', { body: { refresh_token: a.refresh } })).status === 204, 'a second logout');
    check((await api('POST', '/v1/auth/logout', { body: { refresh_token: `unknown-${run}` } })).status === 204, 'logout with an unknown token');
    check(JSON.stringify(revokeReasons(user.id).sort()) === JSON.stringify(['live', 'logout']), `chains after the extra logouts ${revokeReasons(user.id)}`);
    ok('logout 204; that session 401 (refresh and access), chain revoked logout; the other session still works; repeat and unknown token → 204, nothing else revoked');
  });

  await step('K3.6', 'registration limit: 5 per IP per hour; the 6th is 429 with Retry-After and creates no account', async () => {
    resetLimits();
    const register = (label) => api('POST', '/v1/auth/register', { body: {
      turnstile_token: SMOKE_TURNSTILE_TOKEN, email: `smokeid-reg${label}-${run}@example.com`, password: PASSWORD, timezone: TIMEZONE, client: 'web',
      given_name: 'Lan', birth_date: '2000-05-17', accept_terms: true,
    } });
    for (let i = 1; i <= 5; i += 1) await want(register(i), 201, `registration ${i}`);
    const sixth = await wantProblem(register(6), 429, 'rate-limited', 'registration 6');
    check(Number(sixth.retryAfter) > 0 && Number(sixth.retryAfter) <= 3600, `Retry-After ${sixth.retryAfter}`);
    check(psql(`SELECT count(*) FROM users WHERE email LIKE 'smokeid-reg%-${run}@example.com'`) === '5', 'not exactly 5 accounts');
    check(psql(`SELECT count(*) FROM users WHERE email = 'smokeid-reg6-${run}@example.com'`) === '0', 'the refused registration wrote an account');
    // The counter lives in Postgres (not in the API process): one more after the API answered still counts against the same window.
    const stored = psql(`SELECT count(*) FROM rate_limit_counters`);
    check(Number(stored) >= 1, 'no rate-limit counter row in the database');
    await wantProblem(register(7), 429, 'rate-limited', 'registration 7');
    ok(`registrations 1–5 → 201; 6th and 7th → 429 rate-limited, Retry-After ${sixth.retryAfter}s; 5 accounts, none for the refused ones; ${stored} counter row(s) in rate_limit_counters`);
    resetLimits();
  });

  console.log(`\n== identity smoke (K3): ${results.filter((r) => r.status === 'PASS').length}/${results.length} steps in ${Math.round((Date.now() - started) / 1000)} s ==`);
  for (const r of results) console.log(`${r.status}  ${r.code}${r.reason ? ` — ${r.reason}` : ''}`);
  if (results.some((r) => r.status === 'FAIL')) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nSMOKE FAILED: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
