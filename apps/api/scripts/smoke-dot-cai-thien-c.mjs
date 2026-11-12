// Smoke test for "đợt cải thiện C" (Học / Ôn, study streak, UK / US ipa and pre-made speech audio) against a REAL running API + worker
// (plan docs/superpowers/plans/2026-11-07-dot-cai-thien-c.md, Task 23). Start them first: `docker compose up -d` (repo root), create the
// database `english_learning_smoke_c`, then in this package: `pnpm db:setup && pnpm build && pnpm run:dev` with DATABASE_URL on that
// database, TURNSTILE_MODE=fake, TTS_FAKE_ENABLED=true, AUDIO_STORAGE_FAKE_ENABLED=true, AUDIO_STORAGE_FAKE_DIR on a scratch folder,
// AUDIO_PUBLIC_BASE_URL=<api origin>/v1/dev/audio and JOB_QUEUE_PREFIX=wordmet-c-smoke, on a fresh database; then
// `pnpm smoke:dot-cai-thien-c` (SMOKE_BASE_URL when the API does not listen on :3000). Needs DATABASE_URL (env, else .env), Mailpit and
// the compose Postgres container for psql (SMOKE_PG_CONTAINER, default english-learning-postgres-1). No real provider is called.
//
// What it checks: Học (new words move up, learned words do not, "Cần ôn lại" resets), the queue mode `new`, Ôn (a recall session next to
// an open practice session, no practice quota used, right answers on a due word, a priority word and a word that is not due, the summary,
// the practice history without recall answers), the study streak (first study of the day only; adding a word is not studying), and the
// transcription / recording path (admin quick-publish of two readings of one word, four new recordings made by the worker, two different
// UK files served as audio/mpeg, a CSV with only the transcription columns that keeps the meaning).
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
const QUEUE_PREFIX = 'wordmet-c-smoke';
const DATABASE = 'english_learning_smoke_c';
const run = randomUUID().slice(0, 8);

// SMOKE_IGNORE_ENV_FILE=1: the API under test was started from exported variables, not from an env file.
const fileEnv = !process.env.SMOKE_IGNORE_ENV_FILE && existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
if (!process.env.DATABASE_URL && fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
for (const [key, want] of [['TTS_FAKE_ENABLED', 'true'], ['AUDIO_STORAGE_FAKE_ENABLED', 'true'], ['JOB_QUEUE_PREFIX', QUEUE_PREFIX]]) {
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
const words = [1, 2, 3, 4].map((n) => {
  const base = `zq${letters(6)}`;
  return { lemma: base, meaning: `nghĩa thử ${n} ${letters(4)}`, definition: `A short smoke definition number ${n}.`, example: `They use the ${base} daily.`, senseId: null, itemId: null };
});
const [W1, W2, W3, W4] = words;
const LEAD = `zqlead${letters(4)}`;
const leadSenses = [
  { label: 'metal', meaning: `chì ${letters(3)}`, definition: 'A soft heavy metal.', example: `Old pipes were made of ${LEAD}.`, uk: 'lɛd', us: 'lɛd', senseId: null },
  { label: 'guide', meaning: `dẫn đầu ${letters(3)}`, definition: 'The position in front.', example: `She took the ${LEAD}.`, uk: 'liːd', us: 'liːd', senseId: null },
];

const state = (user, senseId) => {
  const [row] = rows(`SELECT level, due_date::text, priority FROM learning_items WHERE user_id = '${user.id}' AND sense_id = '${senseId}'`);
  check(row, `no learning item for ${senseId}`);
  return { level: Number(row[0]), due: row[1], priority: row[2] === 't' };
};
const setState = (user, senseId, level, due, priority = false) => psql(
  `UPDATE learning_items SET level = ${level}, due_date = '${due}', priority = ${priority} WHERE user_id = '${user.id}' AND sense_id = '${senseId}'`);

async function main() {
  const started = Date.now();
  let admin; let L1; let L2; let groupId;

  const start = async (as, body) => (await want(api('POST', '/v1/practice/sessions', { as, idem: true, body }), 201, `start ${j(body)}`)).session;
  const next = (as, sessionId) => want(api('POST', `/v1/practice/sessions/${sessionId}/next`, { as }), 200, 'next');
  const answerRes = (as, itemId, body) => api('POST', `/v1/practice/items/${itemId}/answer`, { as, idem: true, body });
  const answer = (as, itemId, body) => want(answerRes(as, itemId, body), 200, `answer ${j(body)}`);
  const review = (as, body) => want(api('POST', '/v1/reviews', { as, body: { review_id: randomUUID(), ...body } }), 200, `review ${j(body)}`);
  const wordOfPrompt = (prompt) => {
    const word = words.find((w) => w.meaning === prompt.meaning);
    check(word, `no script word has the meaning ${j(prompt.meaning)}`);
    return word;
  };
  /** The right answer (or a wrong one) for an item of the script's words. */
  const body = (prompt, right) => {
    const word = wordOfPrompt(prompt);
    if (prompt.kind === 'mcq') {
      const at = prompt.options.indexOf(word.lemma);
      check(at >= 0, `the options have no ${word.lemma}`);
      return { word, answer: { choice: right ? at : (at + 1) % prompt.options.length } };
    }
    return { word, answer: { text: right ? word.lemma : 'zzzzzz' } };
  };

  await step('Wait for the API', async () => {
    await waitFor(async () => { try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; } }, Boolean, `API at ${BASE}`, 30_000);
    const probe = await send(`${BASE}/v1/dev/audio/${'0'.repeat(64)}.mp3`);
    check(probe.status === 404, `the local audio route answered ${probe.status}; it must be on (AUDIO_STORAGE_FAKE_ENABLED=true) and answer 404 for a missing file`);
    ok(`reachable at ${BASE}; database ${DB_NAME}; fake speech provider and local audio folder on`);
  }, { fatal: true });

  await step('Accounts: admin (CLI grant), learners L1 and L2 (vi)', async () => {
    const adminEmail = `smokec-admin-${run}@example.com`;
    admin = await registerVerified(adminEmail);
    execFileSync(process.execPath, [built('dist/cli/admin-grant.js'), adminEmail], { stdio: 'pipe', env: CHILD_ENV });
    admin.token = await loginToken(adminEmail);
    L1 = await registerLearner(`smokec-l1-${run}@example.com`);
    L2 = await registerLearner(`smokec-l2-${run}@example.com`);
    ok(`admin ${adminEmail}; learners ${L1.email}, ${L2.email}`);
  }, { fatal: true });

  await step('Content: import four words (A1) and the two senses of one word (B1), publish them', async () => {
    const source = await want(api('POST', '/v1/admin/content/sources', {
      as: admin, body: { name: `SmokeC-${run}`, version: '1.0', license: 'test license', display_priority: 90 } }), 201, 'source');
    const csv = ['headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,context_label',
      ...words.map((w) => `${w.lemma},noun,A1,${w.meaning},${w.definition},${w.example},${TOPIC},`),
      ...leadSenses.map((s) => `${LEAD},noun,B1,${s.meaning},${s.definition},${s.example},${TOPIC},${s.label}`),
    ].join('\r\n');
    const form = new FormData();
    form.set('level_source_id', source.id);
    form.set('file', new Blob([csv], { type: 'text/csv' }), 'smoke-c.csv');
    const accepted = await want(api('POST', '/v1/admin/content/uploads', { as: admin, idem: true, form }), 202, 'upload');
    const batch = await waitFor(() => want(api('GET', `/v1/admin/content/uploads/${accepted.batch_id}`, { as: admin }), 200, 'batch'),
      (b) => b.status !== 'queued' && b.status !== 'running', 'import batch', 60_000, 500);
    check(batch.counters.rejected === 0 && batch.counters.created >= 5, `import counters ${j(batch.counters)}`);
    const job = await want(api('POST', '/v1/admin/content/senses/publish-jobs', { as: admin, idem: true, body: { filter: { batch_id: accepted.batch_id } } }), 202, 'publish job');
    const published = await waitFor(() => want(api('GET', `/v1/admin/content/senses/publish-jobs/${job.job_id}`, { as: admin }), 200, 'job'),
      (x) => x.status !== 'queued' && x.status !== 'running', 'publish job', 60_000, 500);
    check(published.status === 'succeeded', `publish job ${j(published)}`);
    const ids = new Map(rows(`SELECT coalesce(s.context_label, e.lemma), s.id FROM entries e JOIN senses s ON s.entry_id = e.id
      WHERE e.scope = 'catalog' AND (e.lemma IN (${words.map((w) => `'${w.lemma}'`).join(',')}) OR e.lemma = '${LEAD}') AND s.live_revision_id IS NOT NULL`));
    for (const w of words) { w.senseId = ids.get(w.lemma); check(w.senseId, `no published sense for ${w.lemma}`); }
    for (const s of leadSenses) { s.senseId = ids.get(s.label); check(s.senseId, `no published sense for ${LEAD} ${s.label}`); }
    ok(`batch ${accepted.batch_id}: ${batch.counters.created} created and published`);
  }, { fatal: true });

  await step('L1: Pro with 200 sessions a day; a group of the four words; the L2 group', async () => {
    const ends = new Date(Date.now() + 30 * 24 * 3_600_000).toISOString();
    await want(api('POST', '/v1/admin/entitlements/grants', { as: admin, idem: true, body: {
      user_id: L1.id, kind: 'limits', limits: { practice_sessions_per_day: 200 }, ends_at: ends, reason: 'smoke:dot-cai-thien-c' } }), 201, 'grant');
    const group = await want(api('POST', '/v1/groups', { as: L1, idem: true, body: { name: `C ${run}` } }), 201, 'group');
    const added = await want(api('POST', `/v1/groups/${group.id}/items/bulk`, { as: L1, idem: true, body: { topic: TOPIC, level: 'A1' } }), 200, 'bulk add');
    check(added.added === 4, `the group got ${added.added} words, expected 4: run on a fresh database`);
    groupId = group.id;
    for (const w of words) w.itemId = rows(`SELECT id FROM learning_items WHERE user_id = '${L1.id}' AND sense_id = '${w.senseId}'`)[0][0];
    ok(`group ${groupId} holds the four words, all new`);
  }, { fatal: true });

  // ==================================================================================================================
  await step('Học: mode=new lists only new words; "Đã biết" moves a new word up; a learned word does not move; "Cần ôn lại" resets to level 1', async () => {
    const fresh = await want(api('GET', `/v1/groups/${groupId}/queue?mode=new`, { as: L1 }), 200, 'queue new');
    check(fresh.cards.length === 4 && fresh.cards.every((c) => c.level === 0), `queue new ${j(fresh.cards.map((c) => c.level))}`);
    await wantProblem(api('GET', `/v1/groups/${groupId}/queue?mode=bogus`, { as: L1 }), 400, 'validation-failed', 'bad mode');
    const first = await review(L1, { item_id: W1.itemId, group_id: groupId, answer: 'known' });
    check(first.level === 1 && first.due_date === plusDays(today(), 1) && first.priority === false, `W1 known ${j(first)}`);
    check(first.streak?.days === 1, `the first study of the day reports a streak of 1: ${j(first.streak)}`);
    setState(L1, W2.senseId, 3, today());
    const logBefore = count(`SELECT count(*) FROM learning_log WHERE user_id = '${L1.id}' AND item_id = '${W2.itemId}'`);
    const second = await review(L1, { item_id: W2.itemId, group_id: groupId, answer: 'known' });
    check(second.level === 3 && second.due_date === today() && second.streak === null, `W2 known (level 3, due) ${j(second)}`);
    const w2 = state(L1, W2.senseId);
    check(w2.level === 3 && w2.due === today() && !w2.priority, `W2 changed: ${j(w2)}`);
    check(count(`SELECT count(*) FROM learning_log WHERE user_id = '${L1.id}' AND item_id = '${W2.itemId}'`) === logBefore + 1, 'the learned card was not logged for the daily cap');
    setState(L1, W3.senseId, 3, today());
    const third = await review(L1, { item_id: W3.itemId, group_id: groupId, answer: 'review' });
    check(third.level === 1 && third.priority === true, `W3 review ${j(third)}`);
    const left = await want(api('GET', `/v1/groups/${groupId}/queue?mode=new`, { as: L1 }), 200, 'queue new again');
    check(left.cards.length === 1 && left.cards[0].item_id === W4.itemId, `queue new after studying ${j(left.cards.map((c) => c.item_id))}`);
    ok('mode=new → 4 new cards then only W4; W1 known → level 1 due tomorrow with streak 1; W2 (level 3, due) known → unchanged but logged, no streak; W3 review → level 1, priority; bad mode → 400');
  });

  await step('Ôn: a recall session opens beside an open practice session and uses no practice quota', async () => {
    setState(L1, W1.senseId, 1, today());
    setState(L1, W2.senseId, 3, today());
    setState(L1, W3.senseId, 1, today(), true);
    // A practice session with one answer spends one session of the day.
    const practice = await start(L1, { source: 'group', group_id: groupId, types: ['type_word'], count: 3, prompt_style: 'meaning' });
    check(practice.kind === 'practice', `practice session ${j(practice)}`);
    const shown = await next(L1, practice.id);
    await answer(L1, shown.item.item_id, body(shown.item.prompt, true).answer);
    const used = count(`SELECT count(*) FROM usage_records WHERE user_id = '${L1.id}' AND pool = 'practice_sessions'`);
    check(used === 1, `usage rows after one practice answer: ${used}`);
    const recall = await start(L1, { kind: 'recall', source: 'group', group_id: groupId });
    check(recall.kind === 'recall' && recall.target_count === 3 && recall.status === 'active', `recall session ${j(recall)}`);
    const current = await want(api('GET', '/v1/practice/sessions/current', { as: L1 }), 200, 'current');
    check(current.session.id === practice.id && current.session.kind === 'practice', `current is ${j(current.session)}`);
    check(count(`SELECT count(*) FROM practice_sessions WHERE id = '${practice.id}' AND status = 'active'`) === 1, 'the practice session was closed');
    check(count(`SELECT count(*) FROM usage_records WHERE user_id = '${L1.id}' AND pool = 'practice_sessions'`) === 1, 'starting a recall session used the practice quota');
    await wantProblem(api('POST', '/v1/practice/sessions', { as: L1, idem: true, body: { kind: 'recall', source: 'today' } }), 400, 'validation-failed', 'recall of today');
    const group2 = await want(api('POST', '/v1/groups', { as: L1, idem: true, body: { name: `Empty ${run}` } }), 201, 'group2');
    const problem = await wantProblem(api('POST', '/v1/practice/sessions', { as: L1, idem: true, body: { kind: 'recall', source: 'group', group_id: group2.id } }), 409, 'practice-no-words', 'nothing learned');
    check(problem.reason === 'nothing-learned', `reason ${j(problem)}`);
    L1.recallId = recall.id;
    L1.practiceId = practice.id;
    ok('recall session (3 words, W4 is new so left out) opened while the practice session stays active; usage_records unchanged (1); /current shows the practice session; today → 400; empty group → 409 nothing-learned');
  });

  await step('Ôn: right answers: a due word levels up, a priority word only loses the flag; not-due words keep their level; summary', async () => {
    const outcomes = new Map();
    for (let i = 0; i < 3; i += 1) {
      const shown = await next(L1, L1.recallId);
      check(shown.state === 'question', `next ${j(shown)}`);
      const { word, answer: given } = body(shown.item.prompt, true);
      const res = await answer(L1, shown.item.item_id, given);
      check(res.result === 'correct' && res.show_known === false, `answer ${word.lemma}: ${j(res)}`);
      outcomes.set(word.lemma, res);
    }
    const w1 = state(L1, W1.senseId); const w2 = state(L1, W2.senseId); const w3 = state(L1, W3.senseId);
    check(j(w1) === j({ level: 2, due: plusDays(today(), 3), priority: false }), `W1 ${j(w1)}`);
    check(j(w2) === j({ level: 4, due: plusDays(today(), 14), priority: false }), `W2 ${j(w2)}`);
    check(j(w3) === j({ level: 1, due: plusDays(today(), 1), priority: false }), `W3 (priority, DC26) ${j(w3)}`);
    check(outcomes.get(W1.lemma).schedule.outcome === 'leveled_up' && outcomes.get(W2.lemma).schedule.level === 4 && outcomes.get(W3.lemma).schedule.outcome === 'kept', `schedules ${j([...outcomes.values()].map((o) => o.schedule))}`);
    const finished = await next(L1, L1.recallId);
    check(finished.state === 'finished', `after three answers: ${j(finished)}`);
    const summary = await want(api('GET', `/v1/practice/sessions/${L1.recallId}/summary`, { as: L1 }), 200, 'summary');
    check(summary.session.kind === 'recall' && summary.recall.leveled_up === 2 && summary.recall.correct_kept === 1 && summary.wrong === 0, `summary ${j(summary)}`);
    const practiceSummary = await want(api('GET', `/v1/practice/sessions/${L1.practiceId}/summary`, { as: L1 }), 200, 'practice summary');
    check(practiceSummary.recall === null, `practice summary recall ${j(practiceSummary.recall)}`);
    ok(`W1 1→2 due +3, W2 3→4 due +14, W3 priority → level 1 due +1 without the flag; summary { leveled_up: 2, correct_kept: 1 }, wrong 0; a practice summary has recall: null`);
  });

  await step('Ôn: a second session with nothing due keeps every level; a wrong answer changes nothing; "Cần ôn lại" resets', async () => {
    const recall = await start(L1, { kind: 'recall', source: 'group', group_id: groupId });
    const before = [W1, W2, W3].map((w) => j(state(L1, w.senseId)));
    let wrongItem = null;
    for (let i = 0; i < 3; i += 1) {
      const shown = await next(L1, recall.id);
      const right = i !== 0;
      const { word, answer: given } = body(shown.item.prompt, right);
      if (!right) {
        // A type-in word may be tried again without limit: after one wrong try it is skipped, which is a final wrong answer.
        let res = await answerRes(L1, shown.item.item_id, given);
        if (res.json.result === 'try_again') res = await api('POST', `/v1/practice/items/${shown.item.item_id}/skip`, { as: L1 });
        check(res.status === 200 && res.json.result === 'wrong' && res.json.schedule.outcome === 'kept', `wrong answer ${j(res.json)}`);
        wrongItem = { item: shown.item.item_id, word };
      } else {
        const res = await answer(L1, shown.item.item_id, given);
        check(res.result === 'correct' && res.schedule.outcome === 'kept', `right but not due ${j(res)}`);
      }
    }
    const after = [W1, W2, W3].map((w) => j(state(L1, w.senseId)));
    check(j(before) === j(after), `a level moved although nothing was due: ${before} → ${after}`);
    const reset = await want(api('POST', `/v1/practice/items/${wrongItem.item}/review`, { as: L1, body: { action: 'needs_review' } }), 200, 'needs_review');
    const wrongState = state(L1, wrongItem.word.senseId);
    check(reset.level === 1 && wrongState.level === 1 && wrongState.priority, `"Cần ôn lại" ${j(reset)} ${j(wrongState)}`);
    await wantProblem(api('POST', `/v1/practice/items/${wrongItem.item}/review`, { as: L1, body: { action: 'known' } }), 409, 'review-already-set', '"Đã biết" after "Cần ôn lại"');
    ok(`no level moved (${before.join(' ')}); the wrong ${wrongItem.word.lemma} was kept, then reset to level 1 with priority by "Cần ôn lại"`);
    L1.secondRecallId = recall.id;
  });

  await step('The practice history leaves out recall answers', async () => {
    const history = await want(api('GET', '/v1/practice/history?page_size=100', { as: L1 }), 200, 'history');
    const recallSessionIds = new Set(rows(`SELECT id FROM practice_sessions WHERE user_id = '${L1.id}' AND kind = 'recall'`).map(([id]) => id));
    check(recallSessionIds.size === 2, `recall sessions in the database: ${recallSessionIds.size}`);
    check(history.items.length === 1 && history.items.every((item) => !recallSessionIds.has(item.session_id)), `history ${j(history.items.map((i) => i.session_id))}`);
    ok('history has 1 answer (the practice one); the six recall answers are not listed');
  });

  await step('Ôn: two identical final answers sent together change the level once', async () => {
    setState(L1, W1.senseId, 2, today());
    const recall = await start(L1, { kind: 'recall', source: 'group', group_id: groupId });
    // The word the session asks first is not known beforehand: read it, make that word due at level 2, then send its answer twice at once.
    const shown = await next(L1, recall.id);
    const { word, answer: given } = body(shown.item.prompt, true);
    setState(L1, word.senseId, 2, today());
    const both = await Promise.all([answerRes(L1, shown.item.item_id, given), answerRes(L1, shown.item.item_id, given)]);
    const statuses = both.map((r) => r.status).sort();
    const final = both.find((r) => r.status === 200 && r.json.result === 'correct');
    check(final, `no answer was final: ${j(both.map((r) => [r.status, r.json]))}`);
    check(state(L1, word.senseId).level === 3, `level after two parallel answers: ${state(L1, word.senseId).level}, expected 3`);
    ok(`${word.lemma} 2→3 once; the two requests answered ${statuses.join(' and ')}`);
  });

  await step('Streak: adding a word is not studying; the first flashcard of the day reports it, the second does not', async () => {
    const group = await want(api('POST', '/v1/groups', { as: L2, idem: true, body: { name: `C2 ${run}` } }), 201, 'group');
    await want(api('POST', `/v1/groups/${group.id}/items/bulk`, { as: L2, idem: true, body: { topic: TOPIC, level: 'A1' } }), 200, 'bulk add');
    const day = rows(`SELECT local_date::text, studied FROM learning_activity_days WHERE user_id = '${L2.id}'`);
    check(day.length === 1 && day[0][1] === 'f', `activity days after adding words: ${j(day)}`);
    const items = rows(`SELECT id FROM learning_items WHERE user_id = '${L2.id}' ORDER BY id`).map(([id]) => id);
    const first = await review(L2, { item_id: items[0], group_id: group.id, answer: 'known' });
    check(first.streak?.days === 1, `first flashcard ${j(first)}`);
    const second = await review(L2, { item_id: items[1], group_id: group.id, answer: 'known' });
    check(second.streak === null, `second flashcard ${j(second)}`);
    const after = rows(`SELECT local_date::text, studied FROM learning_activity_days WHERE user_id = '${L2.id}'`);
    check(after.length === 1 && after[0][1] === 't', `activity days after studying: ${j(after)}`);
    // Yesterday studied too: the streak counts back.
    psql(`INSERT INTO learning_activity_days (user_id, local_date, studied) VALUES ('${L2.id}', '${plusDays(today(), -1)}', true), ('${L2.id}', '${plusDays(today(), -2)}', true)`);
    const streak = rows(`SELECT count(*) FROM learning_activity_days WHERE user_id = '${L2.id}' AND studied`)[0][0];
    ok(`adding words left studied = false; the first flashcard returned { days: 1 } and flipped the day; the second returned null (days studied now ${streak})`);
  });

  // ==================================================================================================================
  await step(`Phiên âm: quick-publish two readings of ${LEAD} → four new recordings, made by the worker`, async () => {
    const recordings = () => count(`SELECT count(*) FROM speech_audio`);
    const readyAfterPublish = await waitFor(() => count(`SELECT count(*) FROM speech_audio WHERE status = 'ready'`), (n) => n >= 1, 'recordings of the published senses', 30_000);
    const before = recordings();
    for (const s of leadSenses) {
      const view = await want(api('GET', `/v1/admin/content/senses/${s.senseId}`, { as: admin }), 200, 'sense');
      await want(api('POST', `/v1/admin/content/senses/${s.senseId}/quick-publish`, { as: admin, body: { revision: view.revision, content: { ipa_uk: s.uk, ipa_us: s.us } } }), 200, `quick-publish ${s.label}`);
    }
    await waitFor(() => count(`SELECT count(*) FROM speech_audio WHERE status = 'ready'`), (n) => n >= before + 4, 'four new ready recordings', 30_000, 500);
    const added = recordings() - before;
    check(added === 4, `new speech_audio rows: ${added}, expected 4 (a UK and a US recording for each reading)`);
    check(count(`SELECT count(*) FROM speech_audio WHERE status = 'failed' OR (status = 'pending' AND updated_at < now() - interval '1 minute')`) === 0, 'a recording failed or is stuck');
    ok(`${readyAfterPublish} recording(s) after the first publish; ${added} new ones (2 UK + 2 US) became ready within 30 s`);
  });

  await step('The word page gives two different UK files; each URL plays as audio/mpeg', async () => {
    const page = await want(api('GET', `/v1/words/${LEAD}`, { as: L1 }), 200, 'word page');
    const senses = page.sections.flatMap((s) => s.senses).filter((s) => leadSenses.some((l) => l.senseId === s.sense_id));
    check(senses.length === 2, `senses on the page: ${senses.length}`);
    const [a, b] = senses.map((s) => s.pronunciation);
    check(a.uk && b.uk && a.uk !== b.uk && a.us && b.us && a.us !== b.us, `audio ${j([a.audio, b.audio])}`);
    check(j(senses.map((s) => s.pronunciation.uk).sort()) === j(leadSenses.map((l) => l.uk).sort()), `ipa ${j(senses.map((s) => s.pronunciation))}`);
    for (const url of [a.audio.uk, b.audio.uk, a.audio.us, b.audio.us]) {
      check(url, `a url is missing: ${j([a.audio, b.audio])}`);
      const res = await send(url);
      const bytes = Buffer.from(await res.arrayBuffer());
      check(res.status === 200 && res.headers.get('content-type')?.startsWith('audio/mpeg') && bytes.subarray(0, 3).toString('latin1') === 'ID3', `GET ${url}: ${res.status} ${res.headers.get('content-type')}`);
    }
    ok(`UK ${a.uk} / ${b.uk} have different files; all four URLs answer 200 audio/mpeg with an mp3 body`);
  });

  await step('A CSV with only the transcription columns keeps the meaning and the examples', async () => {
    const sense = leadSenses[0];
    const view = await want(api('GET', `/v1/admin/content/senses/${sense.senseId}`, { as: admin }), 200, 'sense');
    const csv = `headword,pos,sense_id,revision,ipa_uk,ipa_us\r\n${LEAD},noun,${sense.senseId},${view.revision},ˈlɛd,ˈlɛd\r\n`;
    const form = new FormData();
    form.set('file', new Blob([csv], { type: 'text/csv' }), 'ipa-only.csv');
    const accepted = await want(api('POST', '/v1/admin/content/uploads', { as: admin, idem: true, form }), 202, 'upload');
    const batch = await waitFor(() => want(api('GET', `/v1/admin/content/uploads/${accepted.batch_id}`, { as: admin }), 200, 'batch'),
      (b) => b.status !== 'queued' && b.status !== 'running', 'ipa batch', 60_000, 500);
    check(batch.counters.rejected === 0, `ipa-only csv ${j(batch.counters)}`);
    const after = await want(api('GET', `/v1/admin/content/senses/${sense.senseId}`, { as: admin }), 200, 'sense after');
    check(after.content.ipa_uk === 'ˈlɛd' && after.content.gloss_vi === view.content.gloss_vi && after.content.definition_en === view.content.definition_en
      && j(after.content.examples_en) === j(view.content.examples_en), `content after ${j(after.content)}`);
    check(after.revision === view.revision + 1 && after.status === 'draft', `revision ${after.revision} status ${after.status}`);
    ok(`revision ${view.revision} → ${after.revision} (draft): ipa_uk ˈlɛd; gloss_vi, definition_en and examples unchanged`);
  });

  console.log(`\n${failures.length === 0 ? 'ALL OK' : `${failures.length} step(s) FAILED`} — ${stepNo} steps in ${Math.round((Date.now() - started) / 1000)}s`);
  for (const f of failures) console.log(`  [${f.step}] ${f.name}: ${f.message}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

await main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
