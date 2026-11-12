// Smoke test for "AI practice questions: synonyms inside a session" against a REAL running API + worker (design
// docs/superpowers/specs/2026-11-06-cloze-session-synonyms-design.md §13; plan Task 14). Start them first: `docker compose up -d`
// (repo root), create the database `english_learning_smoke_ss`, then in this package: `pnpm db:setup && pnpm build && pnpm run:dev` with
// DATABASE_URL on that database, AI_FAKE_ENABLED=true, no OPENAI_API_KEY / ANTHROPIC_API_KEY, TURNSTILE_MODE=fake and
// JOB_QUEUE_PREFIX=wordmet-ss-smoke, on a fresh database; then `pnpm smoke:session-synonyms` (SMOKE_BASE_URL when the API does not listen
// on :3000). Needs DATABASE_URL (env, else .env), Mailpit and `docker compose -p english-learning` for psql. No real provider is called.
//
// What it checks, with the fake model `fake:alternative` (it declares the first session word of the input as also fitting the blank):
// the writer is sent the session's other words with their meanings; answering with the declared word is a right answer marked as an
// alternative, with two rows (typed word first); a review must name its word and writes once per item and word; another session word that
// was not declared is a try-again that does not use up a try under a retry cap; the summary lists both words after a hint; Review all
// sends each row's own word; the history of a word shows the alternative item. The session's word order is not fixed, so the script reads
// each item's asked word and declared word from the stored AI input and works the expected rows out from its own data.
// A failing step is reported and the run goes on with the next one; the exit code is 0 only when every step matched.
import { execFileSync } from 'node:child_process';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { publishModel } from './ai-config-publish.mjs';
import { SMOKE_TURNSTILE_TOKEN, requireFakeTurnstile } from './smoke-turnstile.mjs';
requireFakeTurnstile();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-Test-Pass-9!';
const QUEUE_PREFIX = 'wordmet-ss-smoke';
const DATABASE = 'english_learning_smoke_ss';
const FAKE_SENTENCE = 'Lan will ___ it tomorrow.';
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
const sorted = (list) => [...list].sort();

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

/** The key of one review in the learning log: the item id for the asked word, else a UUID from SHA-256 of `<item>:<sense>` (as the API does). */
function reviewIdFor(itemId, senseId, askedSenseId) {
  if (senseId === askedSenseId) return itemId;
  const bytes = createHash('sha256').update(`${itemId}:${senseId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
  let verified = await api('POST', '/v1/auth/verify-email', { body: { turnstile_token: SMOKE_TURNSTILE_TOKEN, email, code: await newestCode(email, before + 1), password: PASSWORD, client: 'web' } });
  if (verified.status !== 200) {
    const beforeResend = (await mailsTo(email)).length;
    await want(api('POST', '/v1/auth/otp', { body: { purpose: 'verify_email', email, turnstile_token: SMOKE_TURNSTILE_TOKEN } }), 202, 'request OTP');
    verified = await api('POST', '/v1/auth/verify-email', { body: { turnstile_token: SMOKE_TURNSTILE_TOKEN, email, code: await newestCode(email, beforeResend + 1), password: PASSWORD, client: 'web' } });
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
// The words: three catalog verbs in one topic and level, so the learner's group holds exactly these (a fresh database is required).
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(97 + randomInt(26))).join('');
const TOPIC = 'technology';
const LEVEL = 'A1';
const words = [1, 2, 3].map((n) => {
  const base = `zq${letters(6)}`;
  return {
    lemma: base, past: `${base}ed`, third: `${base}s`, meaning: `nghĩa thử ${n}`, definition: `A short smoke definition number ${n}.`,
    example: `They ${base}ed the box yesterday.`, senseId: null,
  };
});
const byLemma = (lemma) => {
  const word = words.find((w) => w.lemma === lemma);
  check(word, `${lemma} is none of the script's words`);
  return word;
};
const bySense = (senseId) => {
  const word = words.find((w) => w.senseId === senseId);
  check(word, `sense ${senseId} is none of the script's words`);
  return word;
};

// ---------------------------------------------------------------------------------------------------------------------
// Practice and ledger reads.
function itemInfo(itemId) {
  const [row] = rows(`SELECT i.sense_id, q.id, q.source, q.type, coalesce(q.ai_request_id, '') FROM practice_session_items i
    JOIN practice_questions q ON q.id = i.question_id WHERE i.id = '${itemId}'`);
  check(row, `item ${itemId} not found`);
  const [senseId, questionId, source, type, aiRequestId] = row;
  return { senseId, questionId, source, type, aiRequestId };
}
/** What the AI was sent for a question, and what Practice kept beside it (`practice_ai_requests.ai_input`). */
const requestInput = (requestId) => JSON.parse(psql(`SELECT ai_input FROM practice_ai_requests WHERE id = '${requestId}'`));
const itemRow = (itemId) => {
  const [row] = rows(`SELECT alternative, coalesce(alternative_sense_id::text, ''), coalesce(review_action, ''),
    coalesce(alternative_review_action, ''), tries, session_word_tries, result FROM practice_session_items WHERE id = '${itemId}'`);
  const [alternative, alternativeSenseId, reviewAction, alternativeReviewAction, tries, sessionWordTries, result] = row;
  return { alternative: alternative === 't', alternativeSenseId, reviewAction, alternativeReviewAction, tries: Number(tries), sessionWordTries: Number(sessionWordTries), result };
};

async function main() {
  const started = Date.now();
  let admin; let publisher; let L1; let groupId;
  let originalCap = null;

  const start = async (as, body) => (await want(api('POST', '/v1/practice/sessions', { as, idem: true, body }), 201, `start ${j(body)}`)).session;
  const next = (as, sessionId) => want(api('POST', `/v1/practice/sessions/${sessionId}/next`, { as }), 200, 'next');
  const answer = (as, itemId, body) => want(api('POST', `/v1/practice/items/${itemId}/answer`, { as, idem: true, body }), 200, `answer ${j(body)}`);
  const hint = (as, itemId, level) => want(api('POST', `/v1/practice/items/${itemId}/hint`, { as, body: { level } }), 200, `hint ${level}`);
  const reviewCall = (as, itemId, body) => api('POST', `/v1/practice/items/${itemId}/review`, { as, body });
  const summary = (as, sessionId) => want(api('GET', `/v1/practice/sessions/${sessionId}/summary`, { as }), 200, 'summary');
  const settings = async () => want(api('GET', '/v1/admin/settings', { as: admin }), 200, 'GET settings');
  const learningState = (senseId) => psql(`SELECT level || ':' || priority::text || ':' || due_date::text FROM learning_items
    WHERE user_id = '${L1.id}' AND sense_id = '${senseId}'`);

  const models = new Map();
  async function addModel(modelId) {
    if (models.has(modelId)) return models.get(modelId);
    const view = await want(api('POST', '/v1/admin/ai/models', { as: admin, body: { provider: 'fake', model_id: modelId } }), 201, `add ${modelId}`);
    models.set(modelId, view);
    return view;
  }
  const asPublisher = (method, path, { body, idem } = {}) => api(method, path, { as: publisher, body, idem });

  /** One AI fill-in of the session: the item, the asked word and what the writer was sent, read from the stored request. */
  async function askNext(sessionId) {
    const shown = await next(L1, sessionId);
    check(shown.state === 'question' && shown.item.type === 'cloze', `next: ${j(shown)}`);
    check(shown.item.prompt.sentence === FAKE_SENTENCE, `the fake sentence was expected: ${j(shown.item.prompt)}`);
    const info = itemInfo(shown.item.item_id);
    check(info.source === 'ai', `the question is not an AI one: ${j(info)}`);
    const input = requestInput(info.aiRequestId);
    const asked = bySense(info.senseId);
    const sent = input.data.session_words;
    check(Array.isArray(sent) && sent.length === 2, `session_words ${j(sent)}`);
    return { itemId: shown.item.item_id, item: shown.item, info, input, asked, sent, declared: byLemma(sent[0].word), other: byLemma(sent[1].word) };
  }

  // =====================================================================================================================
  await step('Wait for the API', async () => {
    await waitFor(async () => {
      try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; }
    }, Boolean, `API at ${BASE}`, 20_000);
    ok(`reachable at ${BASE}; database ${DB_NAME}; children run with AI_FAKE_ENABLED=true, JOB_QUEUE_PREFIX=${QUEUE_PREFIX}, no key`);
  }, { fatal: true });

  await step('Accounts: admin (CLI grant), a second admin that publishes configs, learner L1 (vi)', async () => {
    const adminEmail = `smokess-admin-${run}@example.com`;
    admin = await registerVerified(adminEmail);
    execFileSync(process.execPath, [built('dist/cli/admin-grant.js'), adminEmail], { stdio: 'pipe', env: CHILD_ENV });
    admin.token = await loginToken(adminEmail);
    const publisherEmail = `smokess-publisher-${run}@example.com`;
    await want(api('POST', '/v1/admin/users', { as: admin, body: {
      email: publisherEmail, staff_role: 'admin', password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, 'create publisher');
    publisher = { email: publisherEmail, token: await loginToken(publisherEmail) };
    L1 = await registerLearner(`smokess-l1-${run}@example.com`);
    ok(`admin ${adminEmail}; publisher (admin) ${publisherEmail}; learner ${L1.email}`);
  }, { fatal: true });

  await step('AI setup: fake provider on; fake:ok and fake:alternative added; fake:alternative published for generate_cloze', async () => {
    const status = await want(api('GET', '/v1/admin/ai/status', { as: admin }), 200, 'AI status');
    check(status.providers.fake === true && status.providers.openai === false && status.providers.anthropic === false,
      `providers ${j(status.providers)}: start the API with AI_FAKE_ENABLED=true and no key`);
    const prompt = await want(api('GET', '/v1/admin/ai/prompts/generate_cloze', { as: admin }), 200, 'cloze prompt');
    check(prompt.revision === 3, `generate_cloze prompt revision ${prompt.revision}, expected 3 on a fresh database`);
    check(prompt.input_fields.includes('session_words'), `input fields ${j(prompt.input_fields)}`);
    await addModel('fake:ok');
    await addModel('fake:alternative');
    await publishModel(asPublisher, { op: 'generate_cloze', modelId: 'fake:alternative' });
    const row = (await want(api('GET', '/v1/admin/ai/status', { as: admin }), 200, 'AI status')).operations.find((item) => item.operation === 'generate_cloze');
    check(row?.ready === true, `generate_cloze after publishing fake:alternative: ${j(row)}`);
    ok('generate_cloze prompt revision 3 with session_words in its input fields; fake:alternative is the live model and the operation is ready');
  }, { fatal: true });

  await step(`Content: import ${words.length} verbs in one ${TOPIC}/${LEVEL} bucket and publish`, async () => {
    const source = await want(api('POST', '/v1/admin/content/sources', {
      as: admin, body: { name: `SmokeSS-${run}`, version: '1.0', license: 'test license', display_priority: 90 } }), 201, 'source');
    const csv = ['headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,inflections',
      ...words.map((w) => `${w.lemma},verb,${LEVEL},${w.meaning},${w.definition},${w.example},${TOPIC},past:${w.past}; third_person:${w.third}`),
    ].join('\r\n');
    const form = new FormData();
    form.set('level_source_id', source.id);
    form.set('file', new Blob([csv], { type: 'text/csv' }), 'smoke-ss.csv');
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
    ok(`batch ${accepted.batch_id}: ${words.length} created and published; senses ${words.map((w) => w.lemma).join(', ')}`);
  }, { fatal: true });

  await step(`Entitlements and settings: L1 Pro with ${AI_UNITS} AI units and 200 sessions a day; type_word_max_retries 1; one group of the three words`, async () => {
    const ends = new Date(Date.now() + 30 * 24 * 3_600_000).toISOString();
    const grant = (body) => want(api('POST', '/v1/admin/entitlements/grants', { as: admin, idem: true, body: { ends_at: ends, ...body } }), 201, `grant ${j(body)}`);
    await grant({ user_id: L1.id, kind: 'plan', plan: 'pro', reason: 'smoke:session-synonyms' });
    await grant({ user_id: L1.id, kind: 'limits', limits: { ai_practice_per_cycle: AI_UNITS, practice_sessions_per_day: 200 }, reason: 'smoke:session-synonyms' });
    const current = await settings();
    originalCap = current.values.practice.type_word_max_retries;
    await want(api('PUT', '/v1/admin/settings', { as: admin, idem: true, body: { version: current.version, values: { practice: { type_word_max_retries: 1 } } } }), 200, 'set the retry cap');
    check((await settings()).values.practice.type_word_max_retries === 1, 'the retry cap is not 1');
    const group = await want(api('POST', '/v1/groups', { as: L1, idem: true, body: { name: `SS ${run}` } }), 201, 'group');
    const added = await want(api('POST', `/v1/groups/${group.id}/items/bulk`, { as: L1, idem: true, body: { topic: TOPIC, level: LEVEL } }), 200, 'bulk add');
    check(added.added === words.length, `the group got ${added.added} words, expected ${words.length}: run on a fresh database`);
    groupId = group.id;
    ok(`L1 pro with ${AI_UNITS} units; type_word_max_retries 1 (was ${originalCap}); group ${groupId} holds the three words`);
  }, { fatal: true });

  // =====================================================================================================================
  let session; let one; let two; let three;

  await step('Item 1: the writer is sent the other two words with their meanings; the declared word is an alternative answer with two rows', async () => {
    session = await start(L1, { source: 'group', group_id: groupId, types: ['cloze'], count: 3 });
    check(session.ai_planned === 3 && session.cloze_source === 'ai', `session ${j(session)}`);
    one = await askNext(session.id);
    const others = words.filter((w) => w !== one.asked);
    check(j(sorted(one.sent.map((w) => w.word))) === j(sorted(others.map((w) => w.lemma))), `session_words ${j(one.sent)}`);
    for (const entry of one.sent) check(entry.meaning_vi === byLemma(entry.word).meaning, `meaning of ${entry.word}: ${entry.meaning_vi}`);
    check(one.input.session.length === 2 && one.input.session.every((s) => s.scope === 'catalog')
      && j(sorted(one.input.session.map((s) => s.senseId))) === j(sorted(others.map((w) => w.senseId))), `stored session ${j(one.input.session)}`);
    check(one.input.data.word === one.asked.lemma && !one.sent.some((w) => w.word === one.asked.lemma), 'the asked word is among its own session words');
    const res = await answer(L1, one.itemId, { text: one.declared.lemma });
    check(res.result === 'correct' && res.show_known === false && res.highlight_needs_review === false && res.correct.lemma === one.asked.lemma, `answer ${j(res)}`);
    check(res.alternative?.typed === one.declared.lemma && j(res.alternative.rows.map((r) => r.role)) === j(['typed', 'asked'])
      && res.alternative.rows[0].sense_id === one.declared.senseId && res.alternative.rows[1].sense_id === one.asked.senseId
      && res.alternative.rows[0].lemma === one.declared.lemma && res.alternative.rows[0].meaning === one.declared.meaning, `alternative ${j(res.alternative)}`);
    const row = itemRow(one.itemId);
    check(row.alternative && row.alternativeSenseId === one.declared.senseId && row.result === 'correct', `item row ${j(row)}`);
    ok(`asked ${one.asked.lemma}, writer sent ${one.sent.map((w) => w.word).join(' + ')} with meanings and 2 catalog senses; typed ${one.declared.lemma} → right, alternative, rows typed then asked`);
  });

  await step('Review of an alternative answer: no word or a third word → 409 review-word-required; a row\'s button writes once for its own word and leaves the other alone', async () => {
    const asked = one.asked; const typed = one.declared;
    await wantProblem(reviewCall(L1, one.itemId, { action: 'needs_review' }), 409, 'review-word-required', 'review without a word');
    await wantProblem(reviewCall(L1, one.itemId, { action: 'needs_review', sense_id: one.other.senseId }), 409, 'review-word-required', 'review with a third word');
    check(count(`SELECT count(*) FROM learning_log WHERE user_id = '${L1.id}' AND review_id IN ('${one.itemId}', '${reviewIdFor(one.itemId, typed.senseId, asked.senseId)}')`) === 0,
      'a refused review wrote to the learning log');
    const askedBefore = learningState(asked.senseId);
    const first = await want(reviewCall(L1, one.itemId, { action: 'needs_review', sense_id: typed.senseId }), 200, 'review the typed word');
    check(first.sense_id === typed.senseId && first.action === 'needs_review' && first.item_id === one.itemId, `review reply ${j(first)}`);
    const again = await want(reviewCall(L1, one.itemId, { action: 'needs_review', sense_id: typed.senseId }), 200, 'press the same row again');
    check(again.sense_id === typed.senseId, `second press ${j(again)}`);
    check(count(`SELECT count(*) FROM learning_log WHERE user_id = '${L1.id}' AND review_id = '${reviewIdFor(one.itemId, typed.senseId, asked.senseId)}'`) === 1,
      'the typed word\'s review was not written exactly once');
    check(count(`SELECT count(*) FROM learning_log WHERE user_id = '${L1.id}' AND review_id = '${one.itemId}'`) === 0, 'the asked word was reviewed by the typed row');
    check(learningState(asked.senseId) === askedBefore, `the asked word moved: ${askedBefore} → ${learningState(asked.senseId)}`);
    check(learningState(typed.senseId).split(':')[1] === 'true', `the typed word did not get priority: ${learningState(typed.senseId)}`);
    const row = itemRow(one.itemId);
    check(row.alternativeReviewAction === 'needs_review' && row.reviewAction === '', `item columns ${j(row)}`);
    ok(`409 review-word-required twice with nothing written; ${typed.lemma} reviewed (priority), pressed twice → one learning_log row; ${asked.lemma} unchanged (${askedBefore})`);
  });

  await step('Item 2: an undeclared session word is a try-again that does not use up a try (cap 1); a word outside the session does', async () => {
    two = await askNext(session.id);
    const item = two.itemId;
    const first = await answer(L1, item, { text: two.other.lemma });
    check(first.result === 'try_again' && first.reason === 'session_word' && first.tries === 1 && !('correct' in first), `first session word ${j(first)}`);
    const second = await answer(L1, item, { text: two.other.lemma });
    check(second.result === 'try_again' && second.reason === 'session_word' && second.tries === 2, `second session word ${j(second)}`);
    const outside = await answer(L1, item, { text: 'zzzz' });
    check(outside.result === 'try_again' && outside.reason === null && outside.tries === 3 && !('correct' in outside), `outside word ${j(outside)}`);
    const last = await answer(L1, item, { text: 'zzzz' });
    check(last.result === 'wrong' && last.correct.lemma === two.asked.lemma && last.alternative === null, `final answer ${j(last)}`);
    const row = itemRow(item);
    check(row.tries === 4 && row.sessionWordTries === 2 && row.result === 'wrong' && !row.alternative, `item row ${j(row)}`);
    ok(`${two.other.lemma} twice → try_again/session_word (tries 1, 2); zzzz → try_again/null (3); zzzz again → final wrong under a cap of 1; session_word_tries 2`);
  });

  await step('Item 3: hint 1, then the declared word → alternative answer with no Know on either row', async () => {
    three = await askNext(session.id);
    const opened = await hint(L1, three.itemId, 1);
    check(opened.hint.kind === 'first_letter' && opened.hint.text.length === 1 && opened.hint.text === three.asked.lemma[0], `hint ${j(opened)}`);
    const res = await answer(L1, three.itemId, { text: three.declared.lemma });
    check(res.result === 'correct' && res.hint_level === 1 && res.alternative?.rows.length === 2 && res.alternative.rows.every((r) => r.show_known === false), `answer ${j(res)}`);
    check(j(res.alternative.rows.map((r) => r.sense_id)) === j([three.declared.senseId, three.asked.senseId]), `rows ${j(res.alternative.rows)}`);
    ok(`hint 1 = ${opened.hint.text} (the API sends the letter alone); typed ${three.declared.lemma} for ${three.asked.lemma} → alternative, neither row has Know`);
  });

  await step('Summary after a hint: Right counts both alternatives; the wrong word and both words of item 3 are listed; Review all sends each row\'s own word', async () => {
    check((await next(L1, session.id)).state === 'finished', 'the session is not finished after 3 answers');
    const data = await summary(L1, session.id);
    check(data.asked === 3 && data.correct === 2 && data.wrong === 1 && data.alternatives === 2, `counts ${j({ asked: data.asked, correct: data.correct, wrong: data.wrong, alternatives: data.alternatives })}`);
    const listedSenses = [...new Set([two.asked.senseId, three.asked.senseId, three.declared.senseId])];
    check(j(sorted(data.words.map((w) => w.sense_id))) === j(sorted(listedSenses)), `listed ${j(data.words.map((w) => w.lemma))}, expected ${j(listedSenses.map((id) => bySense(id).lemma))}`);
    const pressedBefore = (senseId) => (senseId === one.declared.senseId ? 'needs_review' : null);
    for (const word of data.words) check(word.action === pressedBefore(word.sense_id), `row ${word.lemma}: action ${word.action}`);
    const left = data.words.filter((w) => w.action === null);
    const added = await want(api('POST', `/v1/practice/sessions/${session.id}/review-all`, { as: L1, idem: true }), 200, 'review all');
    check(added.added === left.length, `Review all added ${added.added}, expected ${left.length}`);
    const after = await summary(L1, session.id);
    check(after.words.length === data.words.length && after.words.every((w) => w.action === 'needs_review'), `after Review all ${j(after.words)}`);
    for (const word of left) {
      const stamp = count(`SELECT count(*) FROM learning_log WHERE user_id = '${L1.id}' AND sense_id = '${word.sense_id}' AND review_id IS NOT NULL`);
      check(stamp >= 1, `${word.lemma} has no review in the learning log`);
    }
    if (three.declared.senseId !== one.declared.senseId && left.some((w) => w.sense_id === three.declared.senseId)) {
      const row = itemRow(three.itemId);
      check(row.alternativeReviewAction === 'needs_review', `item 3 typed column ${j(row)}`);
      check(count(`SELECT count(*) FROM learning_log WHERE user_id = '${L1.id}' AND review_id = '${reviewIdFor(three.itemId, three.declared.senseId, three.asked.senseId)}'`) === 1,
        'the typed word of item 3 was not reviewed once with its own key');
    }
    ok(`asked 3, right 2 (both alternatives), wrong 1; listed ${data.words.map((w) => w.lemma).join(', ')}; ${added.added} added by Review all; every row pressed afterwards`);
  });

  await step('History: the alternative item shows under both of its words and says alternative', async () => {
    for (const [role, senseId] of [['typed', one.declared.senseId], ['asked', one.asked.senseId]]) {
      const history = await want(api('GET', `/v1/practice/history?sense_id=${senseId}&page_size=100`, { as: L1 }), 200, `history of ${role}`);
      const found = history.items.find((h) => h.item_id === one.itemId);
      check(found && found.alternative === true && found.answer === one.declared.lemma && found.result === 'correct', `history of the ${role} word ${j(history.items.map((h) => h.item_id))}`);
    }
    const all = await want(api('GET', '/v1/practice/history?page_size=100', { as: L1 }), 200, 'history');
    check(all.items.filter((h) => h.alternative).length === 2 && all.items.filter((h) => !h.alternative).length === 1, `alternatives in history ${j(all.items.map((h) => h.alternative))}`);
    ok(`item 1 is in the history of ${one.declared.lemma} and of ${one.asked.lemma} with alternative true; the whole history has 2 alternative items and 1 other`);
  });

  await step('The key the API stores carries the declared word, and a plain session word typed outside a session is today\'s answer', async () => {
    const [stored] = rows(`SELECT q.answer_key->'also_accepted', q.answer_key->>'session_private' FROM practice_session_items i
      JOIN practice_questions q ON q.id = i.question_id WHERE i.id = '${one.itemId}'`);
    check(stored && j(JSON.parse(stored[0])) === j([{ form: one.declared.lemma, private: false }]) && stored[1] === 'false', `answer key ${j(stored)}`);
    // A session of one word has no other word: typing a group mate is today's try-again with reason null.
    const solo = await start(L1, { source: 'group', group_id: groupId, types: ['cloze'], count: 1 });
    const shown = await next(L1, solo.id);
    const asked = bySense(itemInfo(shown.item.item_id).senseId);
    const mate = words.find((w) => w !== asked);
    const tried = await answer(L1, shown.item.item_id, { text: mate.lemma });
    check(tried.result === 'try_again' && tried.reason === null && !('correct' in tried), `a group mate outside a one-word session ${j(tried)}`);
    await api('POST', `/v1/practice/sessions/${solo.id}/finish`, { as: L1 });
    ok(`answer_key.also_accepted = [{form: ${one.declared.lemma}, private: false}], session_private false; in a one-word session ${mate.lemma} is try_again with reason null`);
  });

  // The cap is a global setting; put it back for whoever uses this database next.
  const current = await settings();
  await api('PUT', '/v1/admin/settings', { as: admin, idem: true, body: { version: current.version, values: { practice: { type_word_max_retries: originalCap } } } });

  const seconds = Math.round((Date.now() - started) / 1000);
  if (failures.length > 0) {
    console.log(`\nSmoke session synonyms FAILED: ${failures.length} of ${stepNo} steps did not match (${seconds}s):`);
    for (const f of failures) console.log(`  [${f.step}] ${f.name}\n      ${f.message}`);
    process.exitCode = 1;
  } else {
    console.log(`\nSmoke session synonyms passed in ${seconds}s (${stepNo} steps).`);
  }
}

main().catch((error) => {
  console.error(`\nSmoke session synonyms FAILED at step ${stepNo}:\n${error.stack ?? error}`);
  process.exitCode = 1;
});
