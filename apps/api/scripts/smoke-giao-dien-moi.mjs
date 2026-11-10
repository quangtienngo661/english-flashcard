// Smoke test for "giao diện mới", API block (plan docs/superpowers/plans/2026-11-10-giao-dien-moi.md, Task A9) against a REAL running
// API + worker. Start them first: `docker compose up -d` (repo root), create the database `english_learning_smoke_gm`, then in this
// package: `pnpm db:setup && pnpm build && pnpm run:dev` with DATABASE_URL on that database, TURNSTILE_MODE=fake, AI_FAKE_ENABLED=true
// and JOB_QUEUE_PREFIX=wordmet-gm-smoke, on a fresh database; then `pnpm smoke:giao-dien-moi` (SMOKE_BASE_URL when the API does not
// listen on :3000). Needs DATABASE_URL (env, else .env), Mailpit and the compose Postgres container for psql (SMOKE_PG_CONTAINER,
// default english-learning-postgres-1). No real provider is called.
//
// What it checks (design §10.2–§10.6): GET /v1/public/prices; next_lemma and last_reviewed on GET /v1/groups against the queue;
// GET /v1/practice/sessions/last (204, then the session's counts and wrong lemmas); M5.1: an answer's `level` and the session view's
// `correct` / `wrong` after a reload; GET /v1/me/calendar and /days/:date (counts, items,
// kind filter, a page token bound to its kind); GET /v1/me/streak; a bad month → 400.
// A failing step is reported and the run goes on with the next one; the exit code is 0 only when every step matched.
import { execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { SMOKE_TURNSTILE_TOKEN, requireFakeTurnstile } from './smoke-turnstile.mjs';
requireFakeTurnstile();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const PG_CONTAINER = process.env.SMOKE_PG_CONTAINER ?? 'english-learning-postgres-1';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-Test-Pass-9!';
const QUEUE_PREFIX = 'wordmet-gm-smoke';
const DATABASE = 'english_learning_smoke_gm';
const run = randomUUID().slice(0, 8);

// SMOKE_IGNORE_ENV_FILE=1: the API under test was started from exported variables, not from an env file.
const fileEnv = !process.env.SMOKE_IGNORE_ENV_FILE && existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
if (!process.env.DATABASE_URL && fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
for (const [key, want] of [['AI_FAKE_ENABLED', 'true'], ['JOB_QUEUE_PREFIX', QUEUE_PREFIX]]) {
  const value = process.env[key] ?? fileEnv[key];
  if (value !== want) throw new Error(`${key} is ${value}; the smoke needs ${want} (env or .env) and the API alike.`);
}
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (DB_NAME !== DATABASE) throw new Error(`DATABASE_URL names ${DB_NAME}; the smoke runs on ${DATABASE} only (fresh).`);
const CHILD_ENV = { ...process.env };

// ---------------------------------------------------------------------------------------------------------------------
let stepNo = 0;
const failures = [];
async function step(name, body, { fatal = false } = {}) {
  stepNo += 1;
  console.log(`\n[${stepNo}] ${new Date().toISOString().slice(11, 19)}Z ${name}`);
  try {
    await body();
  } catch (error) {
    failures.push({ step: stepNo, name, message: String(error.message ?? error).split('\n')[0] });
    console.log(`    FAIL — ${error.stack ?? error}`);
    if (fatal) throw new Error(`setup step ${stepNo} failed; nothing after it can run`);
  }
}
function ok(detail) { console.log(`    OK — ${detail}`); }
function check(condition, message) { if (!condition) throw new Error(message); }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const j = (value) => JSON.stringify(value);

// ---------------------------------------------------------------------------------------------------------------------
// HTTP. An actor is { email, token, id }; a 401 logs the actor in again once (access tokens live 15 minutes).
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

async function api(method, path, { as, body, idem = false, form } = {}) {
  const idempotencyKey = idem ? randomUUID() : undefined;
  for (let attempt = 0, relogged = false; ; attempt += 1) {
    const headers = {};
    if (as) headers.Authorization = `Bearer ${as.token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const res = await read(await send(`${BASE}${path}`, { method, headers, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) }));
    if (res.status === 401 && as && !relogged) {
      relogged = true;
      as.token = await loginToken(as.email);
      continue;
    }
    if (res.status !== 429 || attempt >= 6) return res;
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

async function wantProblem(promise, status, type, context) {
  const res = await promise;
  const got = res.json?.type ?? '';
  if (res.status !== status || !String(got).endsWith(type)) throw new Error(`${context}: expected ${status} ${type}, got ${res.status}\n${res.text}`);
  return res.json;
}

async function loginToken(email) {
  return (await want(api('POST', '/v1/auth/login', { body: { email, password: PASSWORD, client: 'web', turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 200, `login ${email}`)).access_token;
}

// ---------------------------------------------------------------------------------------------------------------------
function psql(sql) {
  return execFileSync('docker', ['exec', '-i', PG_CONTAINER, 'psql', '-U', 'dev', '-d', DB_NAME, '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql], { encoding: 'utf8' }).trim();
}
const count = (sql) => Number(psql(sql));
const rows = (sql) => psql(sql).split('\n').filter(Boolean).map((line) => line.split('|'));
function built(file) {
  if (!existsSync(file)) throw new Error(`Missing ${file}; run \`pnpm build\` first.`);
  return file;
}
async function waitFor(readValue, done, what, timeoutMs = 15_000, everyMs = 250) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await readValue();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`${what} did not happen within ${timeoutMs}ms: ${j(value)}`);
    await sleep(everyMs);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
async function mailsTo(email) {
  const list = await (await send(`${MAILPIT}/api/v1/messages?limit=500`)).json();
  return (list.messages ?? []).filter((m) => m.To?.some((to) => to.Address === email)).sort((a, b) => (a.Created < b.Created ? 1 : -1));
}
async function newestCode(email, atLeast) {
  const deadline = Date.now() + 20_000;
  for (;;) {
    const mails = await mailsTo(email);
    if (mails.length >= atLeast) {
      const full = await (await send(`${MAILPIT}/api/v1/message/${mails[0].ID}`)).json();
      const match = (full.Text ?? '').match(/(\d{6})/);
      if (match) return match[1];
    }
    if (Date.now() > deadline) throw new Error(`No ${atLeast} OTP mail(s) for ${email} after 20s (found ${mails.length})`);
    await sleep(300);
  }
}
const registerBody = (email) => ({
  turnstile_token: SMOKE_TURNSTILE_TOKEN, email, password: PASSWORD, timezone: TIMEZONE, given_name: 'Smoke', birth_date: '2000-01-01', accept_terms: true, client: 'web',
});
async function registerVerified(email) {
  const before = (await mailsTo(email)).length;
  await want(api('POST', '/v1/auth/register', { body: registerBody(email) }), 201, `register ${email}`);
  let verified = await api('POST', '/v1/auth/verify-email', { body: { email, code: await newestCode(email, before + 1), password: PASSWORD, client: 'web' } });
  if (verified.status !== 200) {
    const beforeResend = (await mailsTo(email)).length;
    await want(api('POST', '/v1/auth/otp', { body: { purpose: 'verify_email', email, turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 202, 'request OTP');
    verified = await api('POST', '/v1/auth/verify-email', { body: { email, code: await newestCode(email, beforeResend + 1), password: PASSWORD, client: 'web' } });
  }
  check(verified.status === 200, `verify ${email}: ${verified.status} ${verified.text}`);
  return { email, token: verified.json.access_token };
}
async function registerLearner(email) {
  const actor = await registerVerified(email);
  await want(api('PATCH', '/v1/me', { as: actor, body: { native_language: 'vi' } }), 200, 'set native_language');
  actor.id = (await want(api('GET', '/v1/me', { as: actor }), 200, 'GET /v1/me')).id;
  return actor;
}

// ---------------------------------------------------------------------------------------------------------------------
// Dates in the learners' zone (they register with Asia/Ho_Chi_Minh).
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
const plusDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(97 + randomInt(26))).join('');
const TOPIC = 'technology';
const words = [1, 2, 3].map((n) => {
  const base = `zg${letters(6)}`;
  return { lemma: base, meaning: `nghĩa thử ${n} ${letters(4)}`, definition: `A short smoke definition number ${n}.`, example: `They use the ${base} daily.`, senseId: null, itemId: null };
});
const [W1, W2] = words;

async function main() {
  const started = Date.now();
  let admin; let L; let groupId; let wrongWord;

  const review = (body) => want(api('POST', '/v1/reviews', { as: L, body: { review_id: randomUUID(), ...body } }), 200, `review ${j(body)}`);
  const firstDueLemma = async () => {
    const queue = await want(api('GET', `/v1/groups/${groupId}/queue?mode=due`, { as: L }), 200, 'queue due');
    return queue.cards[0]?.content.lemma ?? null;
  };
  const myGroup = async () => {
    const list = await want(api('GET', '/v1/groups', { as: L }), 200, 'groups');
    const group = list.items.find((g) => g.id === groupId);
    check(group, `group ${groupId} missing from ${j(list.items.map((g) => g.id))}`);
    return group;
  };
  const wordOfPrompt = (prompt) => {
    const word = words.find((w) => w.meaning === prompt.meaning);
    check(word, `no script word has the meaning ${j(prompt.meaning)}`);
    return word;
  };

  await step('Wait for the API', async () => {
    await waitFor(async () => { try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; } }, Boolean, `API at ${BASE}`, 30_000);
    ok(`reachable at ${BASE}; database ${DB_NAME}`);
  }, { fatal: true });

  await step('1. GET /v1/public/prices without a token', async () => {
    const res = await api('GET', '/v1/public/prices');
    check(res.status === 200, `status ${res.status} ${res.text}`);
    check(j(res.json) === j({ currency: 'VND', prices: { '1': 79000, '3': 199000, '12': 599000 } }), `body ${res.text}`);
    ok(res.text);
  });

  // Catalog words need an admin to publish them: two registrations (admin + learner), under the 5-per-IP-per-hour limit.
  await step('Setup: admin (CLI grant) publishes three catalog words; learner L (vi) puts them in a group', async () => {
    const adminEmail = `smokegm-admin-${run}@example.com`;
    admin = await registerVerified(adminEmail);
    execFileSync(process.execPath, [built('dist/cli/admin-grant.js'), adminEmail], { stdio: 'pipe', env: CHILD_ENV });
    admin.token = await loginToken(adminEmail);
    L = await registerLearner(`smokegm-l-${run}@example.com`);
    const source = await want(api('POST', '/v1/admin/content/sources', {
      as: admin, body: { name: `SmokeGM-${run}`, version: '1.0', license: 'test license', display_priority: 90 } }), 201, 'source');
    const csv = ['headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,context_label',
      ...words.map((w) => `${w.lemma},noun,A1,${w.meaning},${w.definition},${w.example},${TOPIC},`)].join('\r\n');
    const form = new FormData();
    form.set('level_source_id', source.id);
    form.set('file', new Blob([csv], { type: 'text/csv' }), 'smoke-gm.csv');
    const accepted = await want(api('POST', '/v1/admin/content/uploads', { as: admin, idem: true, form }), 202, 'upload');
    const batch = await waitFor(() => want(api('GET', `/v1/admin/content/uploads/${accepted.batch_id}`, { as: admin }), 200, 'batch'),
      (b) => b.status !== 'queued' && b.status !== 'running', 'import batch', 60_000, 500);
    check(batch.counters.rejected === 0 && batch.counters.created >= 3, `import counters ${j(batch.counters)}`);
    const job = await want(api('POST', '/v1/admin/content/senses/publish-jobs', { as: admin, idem: true, body: { filter: { batch_id: accepted.batch_id } } }), 202, 'publish job');
    const published = await waitFor(() => want(api('GET', `/v1/admin/content/senses/publish-jobs/${job.job_id}`, { as: admin }), 200, 'job'),
      (x) => x.status !== 'queued' && x.status !== 'running', 'publish job', 60_000, 500);
    check(published.status === 'succeeded', `publish job ${j(published)}`);
    const ids = new Map(rows(`SELECT e.lemma, s.id FROM entries e JOIN senses s ON s.entry_id = e.id
      WHERE e.scope = 'catalog' AND e.lemma IN (${words.map((w) => `'${w.lemma}'`).join(',')}) AND s.live_revision_id IS NOT NULL`));
    for (const w of words) { w.senseId = ids.get(w.lemma); check(w.senseId, `no published sense for ${w.lemma}`); }
    const group = await want(api('POST', '/v1/groups', { as: L, idem: true, body: { name: 'GM smoke' } }), 201, 'group');
    const added = await want(api('POST', `/v1/groups/${group.id}/items/bulk`, { as: L, idem: true, body: { topic: TOPIC, level: 'A1' } }), 200, 'bulk add');
    check(added.added === 3, `the group got ${added.added} words, expected 3: run on a fresh database`);
    groupId = group.id;
    for (const w of words) w.itemId = rows(`SELECT id FROM learning_items WHERE user_id = '${L.id}' AND sense_id = '${w.senseId}'`)[0][0];
    ok(`admin ${adminEmail}; learner ${L.email}; group ${groupId} with ${words.map((w) => w.lemma).join(', ')}`);
  }, { fatal: true });

  await step('2. Before studying: next_lemma = first card of queue?mode=due, last_reviewed null, sessions/last 204, streak 0', async () => {
    const group = await myGroup();
    const first = await firstDueLemma();
    check(first !== null && group.next_lemma === first, `next_lemma ${group.next_lemma} vs queue ${first}`);
    check(group.last_reviewed === null, `last_reviewed ${j(group.last_reviewed)}`);
    const last = await api('GET', '/v1/practice/sessions/last', { as: L });
    check(last.status === 204 && last.text === '', `sessions/last ${last.status} ${last.text}`);
    const streak = await want(api('GET', '/v1/me/streak', { as: L }), 200, 'streak');
    check(j(streak) === j({ days: 0, studied_today: false }), `streak ${j(streak)}`);
    ok(`next_lemma ${group.next_lemma}; last_reviewed null; sessions/last 204; streak ${j(streak)}`);
  });

  await step('3. Learn W1 and W2 ("known"), then flip W1 again from ?mode=all', async () => {
    const r1 = await review({ item_id: W1.itemId, group_id: groupId, answer: 'known' });
    const r2 = await review({ item_id: W2.itemId, group_id: groupId, answer: 'known' });
    check(r1.level === 1 && r2.level === 1, `levels ${r1.level} ${r2.level}`);
    const all = await want(api('GET', `/v1/groups/${groupId}/queue?mode=all`, { as: L }), 200, 'queue all');
    check(all.cards.some((c) => c.item_id === W1.itemId), 'W1 not in mode=all');
    const again = await review({ item_id: W1.itemId, group_id: groupId, answer: 'known' });
    check(again.level === 1, `W1 re-flip level ${again.level}`);
    ok('W1, W2 → level 1; W1 flipped again (level stays 1, logged)');
  });

  await step('4. Practice one session over the group: one right, one wrong, finish', async () => {
    const session = (await want(api('POST', '/v1/practice/sessions', { as: L, idem: true, body: {
      source: 'group', group_id: groupId, types: ['type_word'], count: 2, prompt_style: 'meaning' } }), 201, 'start')).session;
    L.sessionId = session.id;
    for (let i = 0; i < 2; i += 1) {
      const shown = await want(api('POST', `/v1/practice/sessions/${session.id}/next`, { as: L }), 200, 'next');
      check(shown.state === 'question', `next ${j(shown)}`);
      const word = wordOfPrompt(shown.item.prompt);
      if (i === 0) {
        const res = await want(api('POST', `/v1/practice/items/${shown.item.item_id}/answer`, { as: L, idem: true, body: { text: word.lemma } }), 200, 'right');
        check(res.result === 'correct', `right answer ${j(res)}`);
        // M5.1 (QR2): the answer carries the item's current stage, as Learning stores it.
        const stored = Number(psql(`SELECT level FROM learning_items WHERE user_id = '${L.id}' AND sense_id = '${word.senseId}'`));
        check(res.level === stored, `answer level ${j(res.level)} vs learning_items.level ${stored}`);
      } else {
        // M5.1 (QR2): a reload halfway (GET current) returns the counts so far and the same unanswered question.
        const current = await want(api('GET', '/v1/practice/sessions/current', { as: L }), 200, 'current');
        check(current.session.correct === 1 && current.session.wrong === 0, `current counts ${j(current.session)}`);
        check(current.item?.item_id === shown.item.item_id, `current item ${j(current.item)} vs ${shown.item.item_id}`);
        let res = await api('POST', `/v1/practice/items/${shown.item.item_id}/answer`, { as: L, idem: true, body: { text: 'zzzzzz' } });
        if (res.json?.result === 'try_again') res = await api('POST', `/v1/practice/items/${shown.item.item_id}/skip`, { as: L });
        check(res.status === 200 && res.json.result === 'wrong', `wrong answer ${res.status} ${res.text}`);
        wrongWord = word;
      }
    }
    await want(api('POST', `/v1/practice/sessions/${session.id}/finish`, { as: L }), 200, 'finish');
    const status = psql(`SELECT status FROM practice_sessions WHERE id = '${session.id}'`);
    check(status === 'finished', `session status ${status}`);
    ok(`session ${session.id}: one right (level matches learning_items), one wrong (${wrongWord.lemma}); reload counts 1/0; finished`);
  });

  await step('5. GET /v1/me/calendar?month=<this month>', async () => {
    const month = today().slice(0, 7);
    const view = await want(api('GET', `/v1/me/calendar?month=${month}`, { as: L }), 200, 'calendar');
    const day = view.days.find((d) => d.date === today());
    check(j(day) === j({ date: today(), learned: 2, reviewed: 1, practice_sessions: 1 }), `today ${j(day)} in ${j(view)}`);
    check(view.totals.study_days === 1, `totals ${j(view.totals)}`);
    ok(j(view));
  });

  await step('6. GET /v1/me/calendar/days/<today>: counts, items, kind filter, a token bound to its kind', async () => {
    const counts = { learned: 2, reviewed: 1, reviewed_known: 1, reviewed_again: 0, learned_groups: 1, practice_questions: 2 };
    const all = await want(api('GET', `/v1/me/calendar/days/${today()}`, { as: L }), 200, 'day');
    check(j(all.counts) === j(counts), `counts ${j(all.counts)}`);
    check(all.items.length === 3 && all.items.every((i) => i.lemma !== null), `items ${j(all.items)}`);
    check(all.practice_sessions.length === 1 && all.practice_sessions[0].session_id === L.sessionId, `practice_sessions ${j(all.practice_sessions)}`);
    const reviewed = await want(api('GET', `/v1/me/calendar/days/${today()}?kind=reviewed`, { as: L }), 200, 'day reviewed');
    check(reviewed.items.length === 1 && reviewed.items[0].lemma === W1.lemma && j(reviewed.counts) === j(counts), `reviewed ${j(reviewed)}`);
    const paged = await want(api('GET', `/v1/me/calendar/days/${today()}?page_size=1`, { as: L }), 200, 'day page 1');
    check(paged.items.length === 1 && typeof paged.next_page_token === 'string', `page 1 ${j(paged)}`);
    await wantProblem(api('GET', `/v1/me/calendar/days/${today()}?kind=learned&page_token=${paged.next_page_token}`, { as: L }), 400, 'validation-failed', 'token of kind all with kind=learned');
    ok(`counts ${j(all.counts)}; items ${j(all.items.map((i) => [i.kind, i.lemma, i.result, i.times]))}; kind=reviewed → 1; foreign token → 400`);
  });

  await step('7. GET /v1/practice/sessions/last', async () => {
    const last = await want(api('GET', '/v1/practice/sessions/last', { as: L }), 200, 'sessions/last');
    check(last.id === L.sessionId && last.questions === 2 && last.correct === 1 && last.wrong_count === 1 && last.finished === true
      && j(last.wrong_lemmas) === j([wrongWord.lemma]) && last.group_id === groupId && last.local_date === today(), `last ${j(last)}`);
    ok(j(last));
  });

  await step('8. GET /v1/groups after studying: last_reviewed = W1, next_lemma = first card of queue?mode=due', async () => {
    const group = await myGroup();
    check(group.last_reviewed?.lemma === W1.lemma, `last_reviewed ${j(group.last_reviewed)}`);
    const first = await firstDueLemma();
    check(group.next_lemma === first, `next_lemma ${group.next_lemma} vs queue ${first}`);
    ok(`last_reviewed ${j(group.last_reviewed)}; next_lemma ${group.next_lemma} (queue ${first})`);
  });

  await step('9. GET /v1/me/streak: 1 today, 2 after a studied yesterday', async () => {
    const first = await want(api('GET', '/v1/me/streak', { as: L }), 200, 'streak');
    check(j(first) === j({ days: 1, studied_today: true }), `streak ${j(first)}`);
    psql(`INSERT INTO learning_activity_days (user_id, local_date, studied) VALUES ('${L.id}', '${plusDays(today(), -1)}', true)`);
    const second = await want(api('GET', '/v1/me/streak', { as: L }), 200, 'streak again');
    check(j(second) === j({ days: 2, studied_today: true }), `streak ${j(second)}`);
    ok(`${j(first)} → ${j(second)}`);
  });

  await step('10. GET /v1/me/calendar?month=2026-13 → 400 naming month', async () => {
    const problem = await wantProblem(api('GET', '/v1/me/calendar?month=2026-13', { as: L }), 400, 'validation-failed', 'bad month');
    check(Array.isArray(problem.violations) && problem.violations.some((v) => v.startsWith('month')), `violations ${j(problem.violations)}`);
    ok(j(problem.violations));
  });

  console.log(`\n${failures.length === 0 ? 'ALL OK' : `${failures.length} step(s) FAILED`} — ${stepNo} steps in ${Math.round((Date.now() - started) / 1000)}s`);
  for (const f of failures) console.log(`  [${f.step}] ${f.name}: ${f.message}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

await main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
