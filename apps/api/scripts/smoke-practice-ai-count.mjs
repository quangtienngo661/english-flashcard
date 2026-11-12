// Smoke test for the learner's AI count and the session maximum (owner, 09/11/2026: practice AI count design) against a REAL running
// API + worker. Start them first: `docker compose up -d` (repo root), create the database `english_learning_smoke_ai_count`, then in this
// package: `pnpm db:setup && pnpm build && pnpm run:dev` with DATABASE_URL on that database, AI_FAKE_ENABLED=true, no OPENAI_API_KEY /
// ANTHROPIC_API_KEY, TURNSTILE_MODE=fake and JOB_QUEUE_PREFIX=wordmet-aic-smoke, on a fresh database; then `pnpm smoke:practice-ai-count`
// (SMOKE_BASE_URL when the API does not listen on :3000). Needs DATABASE_URL (env, else .env), Mailpit and `docker compose -p
// english-learning` for psql. No real provider is called.
//
// What it checks, with the fake model `fake:ok` for generate_cloze, ten catalog verbs in one group, four of them priority:
//   1. /v1/me/app-config carries the five new practice settings and the scope ceiling 100;
//   2. default settings (fixed 20, AI 50 %, even): count 10 with ai_count 3 → 3 AI questions of 10, 3 units spent; ai_count 9 → 5;
//      count 25 → lowered to 20, not refused;
//   3. the admin switches to the scope's word count, a fixed AI cap of 2 and "learner chooses"; the history has the four changes;
//   4. the priority filter (4 words): ai_count 3 → target 4, 2 AI, random as asked; an old client (no ai_count) keeps the old split;
//   5. 400 for ai_count without an AI type and for AI-only types with fewer AI than questions; 403 when the units do not cover the plan.
// A failing step is reported and the run goes on with the next one; the exit code is 0 only when every step matched.
import { execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { publishModel } from './ai-config-publish.mjs';
import { SMOKE_TURNSTILE_TOKEN, requireFakeTurnstile } from './smoke-turnstile.mjs';
requireFakeTurnstile();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-Test-Pass-9!';
const QUEUE_PREFIX = 'wordmet-aic-smoke';
const DATABASE = 'english_learning_smoke_ai_count';
const AI_UNITS = 20;
const run = randomUUID().slice(0, 8);

// SMOKE_IGNORE_ENV_FILE=1: the API under test was started from exported variables, not from an env file that may hold real keys.
const fileEnv = !process.env.SMOKE_IGNORE_ENV_FILE && existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
if (!process.env.DATABASE_URL && fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
for (const [key, want] of [['AI_FAKE_ENABLED', 'true'], ['JOB_QUEUE_PREFIX', QUEUE_PREFIX]]) {
  const value = process.env[key] ?? fileEnv[key];
  if (value !== undefined && value !== want) throw new Error(`${key} is ${value}; the smoke needs ${want} (env or .env) and the API alike.`);
}
for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']) {
  if (process.env[key] || fileEnv[key]) throw new Error(`${key} is set: the smoke runs with the fake provider only.`);
}
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (DB_NAME !== DATABASE) throw new Error(`DATABASE_URL names ${DB_NAME}; the smoke runs on ${DATABASE} only (fresh).`);
const CHILD_ENV = { ...process.env, AI_FAKE_ENABLED: 'true', JOB_QUEUE_PREFIX: QUEUE_PREFIX, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' };

// ---------------------------------------------------------------------------------------------------------------------
// Steps: each prints `ok — …` lines or FAILED with the error; a fatal step (setup) stops the run.
let stepNo = 0;
const failures = [];
async function step(name, body, { fatal = false } = {}) {
  stepNo += 1;
  console.log(`\n[${stepNo}] ${new Date().toISOString().slice(11, 19)}Z ${name}`);
  try {
    await body();
  } catch (error) {
    failures.push({ step: stepNo, name, message: String(error.message ?? error).split('\n')[0] });
    console.log(`    FAILED — ${error.stack ?? error}`);
    if (fatal) throw new Error(`setup step ${stepNo} failed; nothing after it can run`);
  }
}
function ok(detail) { console.log(`    ok — ${detail}`); }
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
      console.log(`    (network error on ${init?.method ?? 'GET'} ${new URL(url).pathname}: ${error.cause?.code ?? error.cause?.message ?? error.message}; retrying)`);
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

/** One request; waits out a 429 and retries with the same Idempotency-Key. */
async function api(method, path, { as, body, idem = false, key, form } = {}) {
  const idempotencyKey = idem || key ? key ?? randomUUID() : undefined;
  for (let attempt = 0, relogged = false; ; attempt += 1) {
    const headers = {};
    if (as) headers.Authorization = `Bearer ${as.token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const res = await read(await send(`${BASE}${path}`, {
      method, headers, body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
    }));
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
  if (res.status !== status || !String(got).endsWith(type)) {
    throw new Error(`${context}: expected ${status} ${type}, got ${res.status}\n${res.text}`);
  }
  return res.json;
}

async function loginToken(email) {
  return (await want(api('POST', '/v1/auth/login', { body: { email, password: PASSWORD, client: 'web', turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 200, `login ${email}`)).access_token;
}

// ---------------------------------------------------------------------------------------------------------------------
// Database and CLIs.
function psql(sql) {
  return execFileSync('docker', ['compose', '-p', 'english-learning', 'exec', '-T', 'postgres', 'psql', '-U', 'dev', '-d', DB_NAME,
    '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql], { encoding: 'utf8' }).trim();
}
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
// Accounts.
async function mailsTo(email) {
  const list = await (await send(`${MAILPIT}/api/v1/messages?limit=500`)).json();
  return (list.messages ?? []).filter((m) => m.To?.some((to) => to.Address === email)).sort((a, b) => (a.Created < b.Created ? 1 : -1));
}

/** The newest 6-digit code once `atLeast` mails reached `email` (only the newest code is valid). */
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
// The words: ten catalog verbs in one topic and level, so the learner's group holds exactly these (a fresh database is required).
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(97 + randomInt(26))).join('');
const TOPIC = 'technology';
const LEVEL = 'A1';
const words = Array.from({ length: 10 }, (_, i) => {
  const base = `zq${letters(6)}`;
  return {
    lemma: base, past: `${base}ed`, third: `${base}s`, meaning: `nghĩa thử ${i + 1}`, definition: `A short smoke definition number ${i + 1}.`,
    example: `They ${base}ed the box yesterday.`, senseId: null,
  };
});
const PRIORITY = 4;
const bySense = (senseId) => {
  const word = words.find((w) => w.senseId === senseId);
  check(word, `sense ${senseId} is none of the script's words`);
  return word;
};

/** What the database kept of one asked item: the word, how the question was made, and the right choice of a multiple choice. */
function itemInfo(itemId) {
  const [row] = rows(`SELECT i.sense_id, q.source, q.type, coalesce(q.answer_key->>'correct_index', '') FROM practice_session_items i
    JOIN practice_questions q ON q.id = i.question_id WHERE i.id = '${itemId}'`);
  check(row, `item ${itemId} not found`);
  const [senseId, source, type, correctIndex] = row;
  return { senseId, source, type, correctIndex: correctIndex === '' ? null : Number(correctIndex) };
}

async function main() {
  const started = Date.now();
  let admin; let publisher; let L1; let groupId;
  const TYPES = ['mcq_definition', 'cloze'];

  const startRes = (as, body) => api('POST', '/v1/practice/sessions', { as, idem: true, body });
  const start = async (as, body) => (await want(startRes(as, body), 201, `start ${j(body)}`)).session;
  const next = (as, sessionId) => want(api('POST', `/v1/practice/sessions/${sessionId}/next`, { as }), 200, 'next');
  const answer = (as, itemId, body) => want(api('POST', `/v1/practice/items/${itemId}/answer`, { as, idem: true, body }), 200, `answer ${j(body)}`);
  const unitsLeft = async (as) => (await want(api('GET', '/v1/me/entitlements', { as }), 200, 'GET /v1/me/entitlements')).pools.ai_practice.remaining;
  const asPublisher = (method, path, { body, idem } = {}) => api(method, path, { as: publisher, body, idem });
  const group = (extra) => ({ source: 'group', group_id: groupId, types: TYPES, cloze_source: 'ai', ...extra });

  /** Walks a session to its end: answers each question right and returns what each asked item was. */
  async function walk(as, sessionId, count) {
    const asked = [];
    for (let i = 0; i < count; i += 1) {
      const shown = await next(as, sessionId);
      check(shown.state === 'question', `next ${i + 1}: ${j(shown)}`);
      const info = itemInfo(shown.item.item_id);
      const body = info.type === 'mcq_definition' ? { choice: info.correctIndex } : { text: bySense(info.senseId).lemma };
      const res = await answer(as, shown.item.item_id, body);
      check(res.result === 'correct', `answering ${info.type} (${info.source}) with ${j(body)}: ${j(res)}`);
      asked.push({ item: shown.item, info });
    }
    const end = await next(as, sessionId);
    check(end.state === 'finished', `after ${count} answers: ${j(end)}`);
    return asked;
  }

  // =====================================================================================================================
  await step('Wait for the API', async () => {
    await waitFor(async () => {
      try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; }
    }, Boolean, `API at ${BASE}`, 20_000);
    ok(`reachable at ${BASE}; database ${DB_NAME}; children run with AI_FAKE_ENABLED=true, JOB_QUEUE_PREFIX=${QUEUE_PREFIX}, no key`);
  }, { fatal: true });

  await step('Accounts: admin (CLI grant), a second admin that publishes configs, learner L1 (Pro)', async () => {
    const adminEmail = `smokeaic-admin-${run}@example.com`;
    admin = await registerVerified(adminEmail);
    execFileSync(process.execPath, [built('dist/cli/admin-grant.js'), adminEmail], { stdio: 'pipe', env: CHILD_ENV });
    admin.token = await loginToken(adminEmail);
    const publisherEmail = `smokeaic-publisher-${run}@example.com`;
    await want(api('POST', '/v1/admin/users', { as: admin, body: {
      email: publisherEmail, staff_role: 'admin', password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, 'create publisher');
    publisher = { email: publisherEmail, token: await loginToken(publisherEmail) };
    L1 = await registerLearner(`smokeaic-l1-${run}@example.com`);
    ok(`admin ${adminEmail}; publisher ${publisherEmail}; learner ${L1.email}`);
  }, { fatal: true });

  await step('AI setup: fake provider on; fake:ok published for generate_cloze and the operation is ready', async () => {
    const status = await want(api('GET', '/v1/admin/ai/status', { as: admin }), 200, 'AI status');
    check(status.providers.fake === true && status.providers.openai === false && status.providers.anthropic === false,
      `providers ${j(status.providers)}: start the API with AI_FAKE_ENABLED=true and no key`);
    await publishModel(asPublisher, { op: 'generate_cloze', modelId: 'fake:ok' });
    const row = (await want(api('GET', '/v1/admin/ai/status', { as: admin }), 200, 'AI status')).operations.find((item) => item.operation === 'generate_cloze');
    check(row?.ready === true, `generate_cloze after publishing fake:ok: ${j(row)}`);
    ok('fake:ok is the live model of generate_cloze and the operation is ready');
  }, { fatal: true });

  await step(`Content: import ${words.length} verbs in one ${TOPIC}/${LEVEL} bucket and publish`, async () => {
    const source = await want(api('POST', '/v1/admin/content/sources', {
      as: admin, body: { name: `SmokeAIC-${run}`, version: '1.0', license: 'test license', display_priority: 90 } }), 201, 'source');
    const csv = ['headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,inflections',
      ...words.map((w) => `${w.lemma},verb,${LEVEL},${w.meaning},${w.definition},${w.example},${TOPIC},past:${w.past}; third_person:${w.third}`),
    ].join('\r\n');
    const form = new FormData();
    form.set('level_source_id', source.id);
    form.set('file', new Blob([csv], { type: 'text/csv' }), 'smoke-aic.csv');
    const accepted = await want(api('POST', '/v1/admin/content/uploads', { as: admin, idem: true, form }), 202, 'upload');
    const batch = await waitFor(() => want(api('GET', `/v1/admin/content/uploads/${accepted.batch_id}`, { as: admin }), 200, 'batch'),
      (b) => b.status !== 'queued' && b.status !== 'running', 'import batch', 60_000, 500);
    check(batch.counters.created === words.length && batch.counters.rejected === 0, `import counters ${j(batch.counters)}`);
    const job = await want(api('POST', '/v1/admin/content/senses/publish-jobs', {
      as: admin, idem: true, body: { filter: { batch_id: accepted.batch_id } } }), 202, 'publish job');
    const published = await waitFor(() => want(api('GET', `/v1/admin/content/senses/publish-jobs/${job.job_id}`, { as: admin }), 200, 'job'),
      (x) => x.status !== 'queued' && x.status !== 'running', 'publish job', 60_000, 500);
    check(published.status === 'succeeded', `publish job ${j(published)}`);
    const ids = new Map(rows(`SELECT e.lemma, s.id FROM entries e JOIN senses s ON s.entry_id = e.id
      WHERE e.scope = 'catalog' AND e.lemma IN (${words.map((w) => `'${w.lemma}'`).join(',')}) AND s.live_revision_id IS NOT NULL`));
    for (const w of words) {
      w.senseId = ids.get(w.lemma);
      check(w.senseId, `no published sense for ${w.lemma}`);
    }
    ok(`batch ${accepted.batch_id}: ${words.length} created and published`);
  }, { fatal: true });

  await step(`Entitlements: L1 Pro with ${AI_UNITS} AI units and 200 sessions a day; group A holds the ten words, ${PRIORITY} of them priority`, async () => {
    const ends = new Date(Date.now() + 30 * 24 * 3_600_000).toISOString();
    const grant = (body) => want(api('POST', '/v1/admin/entitlements/grants', { as: admin, idem: true, body: { ends_at: ends, ...body } }), 201, `grant ${j(body)}`);
    await grant({ user_id: L1.id, kind: 'plan', plan: 'pro', reason: 'smoke:practice-ai-count' });
    await grant({ user_id: L1.id, kind: 'limits', limits: { ai_practice_per_cycle: AI_UNITS, practice_sessions_per_day: 200 }, reason: 'smoke:practice-ai-count' });
    const created = await want(api('POST', '/v1/groups', { as: L1, idem: true, body: { name: `A ${run}` } }), 201, 'group');
    const added = await want(api('POST', `/v1/groups/${created.id}/items/bulk`, { as: L1, idem: true, body: { topic: TOPIC, level: LEVEL } }), 200, 'bulk add');
    check(added.added === words.length, `the group got ${added.added} words, expected ${words.length}: run on a fresh database`);
    groupId = created.id;
    const priorityIds = words.slice(0, PRIORITY).map((w) => `'${w.senseId}'`).join(',');
    psql(`UPDATE learning_items SET priority = true WHERE user_id = '${L1.id}' AND sense_id IN (${priorityIds})`);
    const flagged = Number(psql(`SELECT count(*) FROM learning_items li JOIN group_items gi ON gi.item_id = li.id
      WHERE gi.group_id = '${groupId}' AND li.priority`));
    check(flagged === PRIORITY, `${flagged} priority items in group A`);
    const left = await unitsLeft(L1);
    check(left === AI_UNITS, `L1 has ${left} units, expected ${AI_UNITS}`);
    ok(`L1 pro, ${left} AI units; group ${groupId}: ${words.length} words, ${flagged} priority`);
  }, { fatal: true });

  await step('app-config: the five new practice settings at their defaults, and the scope ceiling 100', async () => {
    const config = await want(api('GET', '/v1/me/app-config', { as: L1 }), 200, 'GET /v1/me/app-config');
    const want6 = { session_max_mode: 'fixed', ai_max_mode: 'percent', ai_max_fixed: 5, ai_max_percent: 50, ai_placement: 'even', scope_questions_max: 100 };
    for (const [key, value] of Object.entries(want6)) check(config.practice[key] === value, `practice.${key} is ${j(config.practice[key])}, expected ${j(value)}`);
    check(config.practice.max_questions_per_session === 20 && config.practice.default_questions_per_session === 10, `old fields ${j(config.practice)}`);
    ok(`practice ${j(config.practice)}`);
  });

  await step('Defaults (fixed 20, AI 50 %, even): count 10, ai_count 3 → target 10, ai_planned 3, even; 3 of 10 asked by AI; units 20 → 17', async () => {
    const before = await unitsLeft(L1);
    const session = await start(L1, group({ group_filter: 'all', count: 10, ai_count: 3 }));
    check(session.target_count === 10 && session.ai_planned === 3 && session.ai_placement === 'even', `session ${j(session)}`);
    const asked = await walk(L1, session.id, 10);
    const ai = asked.filter((a) => a.item.ai);
    check(ai.length === 3 && ai.every((a) => a.info.source === 'ai' && a.info.type === 'cloze'), `AI items ${j(asked.map((a) => [a.info.type, a.info.source]))}`);
    check(asked.filter((a) => !a.item.ai).every((a) => a.info.type === 'mcq_definition'), 'non-AI items are mcq_definition');
    const after = await unitsLeft(L1);
    check(before === AI_UNITS && after === AI_UNITS - 3, `units ${before} → ${after}`);
    ok(`AI at positions ${asked.map((a, i) => (a.item.ai ? i + 1 : null)).filter(Boolean).join(', ')}; units ${before} → ${after}`);
  });

  await step('ai_count 9 with count 10 → lowered to the 50 % cap: ai_planned 5', async () => {
    const session = await start(L1, group({ group_filter: 'all', count: 10, ai_count: 9 }));
    check(session.target_count === 10 && session.ai_planned === 5, `session ${j(session)}`);
    ok(`target ${session.target_count}, ai_planned ${session.ai_planned}`);
  });

  await step('count 25 above the fixed maximum 20, only mcq_definition, ai_count 0 → target 20, not 400', async () => {
    const session = await start(L1, { source: 'group', group_id: groupId, group_filter: 'all', types: ['mcq_definition'], count: 25, ai_count: 0 });
    check(session.target_count === 20 && session.ai_planned === 0, `session ${j(session)}`);
    ok(`target ${session.target_count}, ai_planned ${session.ai_planned}, ai_placement ${session.ai_placement}`);
  });

  await step('Admin: scope_words, AI fixed 2, learner chooses → saved; the history has the four changes with old → new values', async () => {
    const current = await want(api('GET', '/v1/admin/settings', { as: admin }), 200, 'GET settings');
    const patch = { session_max_mode: 'scope_words', ai_max_mode: 'fixed', ai_max_fixed: 2, ai_placement: 'learner' };
    const saved = await want(api('PUT', '/v1/admin/settings', { as: admin, idem: true, body: { version: current.version, values: { practice: patch } } }),
      200, 'PUT settings');
    for (const [key, value] of Object.entries(patch)) check(saved.values.practice[key] === value, `saved practice.${key} ${j(saved.values.practice[key])}`);
    const history = await want(api('GET', '/v1/admin/settings/history?page_size=10', { as: admin }), 200, 'GET history');
    const got = new Map(history.items.slice(0, 4).map((row) => [row.key, [row.old_value, row.new_value]]));
    const expected = {
      'practice.session_max_mode': ['fixed', 'scope_words'], 'practice.ai_max_mode': ['percent', 'fixed'],
      'practice.ai_max_fixed': [5, 2], 'practice.ai_placement': ['even', 'learner'],
    };
    check(got.size === 4, `newest history rows ${j(history.items.slice(0, 4))}`);
    for (const [key, change] of Object.entries(expected)) check(j(got.get(key)) === j(change), `${key}: ${j(got.get(key))}, expected ${j(change)}`);
    ok(`version ${current.version} → ${saved.version}; history ${[...got].map(([k, [o, n]]) => `${k} ${o} → ${n}`).join('; ')}`);
  });

  await step('Priority filter (4 words), count 10, ai_count 3, ai_placement random → target 4, ai_planned 2, random', async () => {
    const session = await start(L1, group({ group_filter: 'priority', count: 10, ai_count: 3, ai_placement: 'random' }));
    check(session.target_count === 4 && session.ai_planned === 2 && session.ai_placement === 'random' && session.words === 4, `session ${j(session)}`);
    ok(`target ${session.target_count}, words ${session.words}, ai_planned ${session.ai_planned}, ${session.ai_placement}`);
  });

  await step('Old client (no ai_count), priority, count 4 → target 4, ai_planned 2 (ceil(4 × 1 ÷ 2)), ai_placement null', async () => {
    const session = await start(L1, group({ group_filter: 'priority', count: 4 }));
    check(session.target_count === 4 && session.ai_planned === 2 && session.ai_placement === null, `session ${j(session)}`);
    ok(`target ${session.target_count}, ai_planned ${session.ai_planned}, ai_placement ${session.ai_placement}`);
  });

  await step('400 validation-failed: ai_count without an AI type; AI-only types with fewer AI than questions', async () => {
    await wantProblem(startRes(L1, { source: 'group', group_id: groupId, group_filter: 'priority', types: ['mcq_definition'], ai_count: 2 }),
      400, 'validation-failed', 'ai_count 2 with mcq_definition only');
    await wantProblem(startRes(L1, { source: 'group', group_id: groupId, group_filter: 'priority', types: ['cloze'], cloze_source: 'ai', count: 4, ai_count: 1 }),
      400, 'validation-failed', 'ai_count 1 of 4 with cloze only');
    ok('both refused with 400 validation-failed');
  });

  await step('Not enough units: 1 left, the priority words have no unseen AI question, ai_count 2 → 403 remaining 1, needed 2; units restored', async () => {
    const before = await unitsLeft(L1);
    const priorityIds = words.slice(0, PRIORITY).map((w) => `'${w.senseId}'`).join(',');
    const unseen = Number(psql(`SELECT count(*) FROM practice_questions q WHERE q.user_id = '${L1.id}' AND q.source = 'ai'
      AND q.sense_id IN (${priorityIds}) AND NOT EXISTS (SELECT 1 FROM practice_session_items i WHERE i.question_id = q.id)`));
    check(unseen === 0, `${unseen} unseen AI questions on the priority words`);
    psql(`INSERT INTO usage_records (user_id, pool, operation_id, kind, status, system_date, reserved_at, confirmed_at, plan)
      SELECT '${L1.id}', 'ai_practice', 'smokeaic-${run}-' || n, 'use', 'confirmed', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, now(), now(), 'pro'
      FROM generate_series(1, ${before - 1}) AS n`);
    check(await unitsLeft(L1) === 1, `L1 has ${await unitsLeft(L1)} units, expected 1`);
    const refused = await wantProblem(startRes(L1, group({ group_filter: 'priority', ai_count: 2 })), 403, 'ai-quota-insufficient', 'ai_count 2 with one unit');
    check(refused.remaining === 1 && refused.needed === 2, `problem ${j(refused)}`);
    psql(`DELETE FROM usage_records WHERE user_id = '${L1.id}' AND operation_id LIKE 'smokeaic-${run}-%'`);
    const restored = await unitsLeft(L1);
    check(restored === before, `units ${restored} after the cleanup, expected ${before}`);
    ok(`remaining ${refused.remaining}, needed ${refused.needed}; units back to ${restored}`);
  });

  const seconds = Math.round((Date.now() - started) / 1000);
  if (failures.length > 0) {
    console.log(`\nSmoke practice ai count FAILED: ${failures.length} of ${stepNo} steps did not match (${seconds}s):`);
    for (const f of failures) console.log(`  [${f.step}] ${f.name}\n      ${f.message}`);
    process.exitCode = 1;
  } else {
    console.log(`\nSmoke practice ai count passed in ${seconds}s (${stepNo} steps).`);
  }
}

main().catch((error) => {
  console.error(`\nSmoke practice ai count FAILED at step ${stepNo}:\n${error.stack ?? error}`);
  process.exitCode = 1;
});
