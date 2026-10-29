// Smoke test for Bước 7 (Practice AI + Content AI) against a REAL running API + worker (design §17 AC1–AC12, §18; plan Task 24,
// Review Focus 1–5). Start them first: `docker compose up -d` (repo root), then `pnpm build && pnpm run:dev` (this package) with
// AI_FAKE_ENABLED=true, no OPENAI_API_KEY / ANTHROPIC_API_KEY and JOB_QUEUE_PREFIX=wordmet-b7-smoke, on a fresh database
// (`english_learning_smoke_b7`), then `pnpm smoke:buoc-7`. Needs DATABASE_URL (env, else .env), Mailpit, and
// `docker compose -p english-learning` for psql. No real provider is called (D3).
//
// Before any learner step the admin adds the fake models and chooses `fake:ok` for the five operations Bước 7 uses (design §18,
// R6); a step that needs another scenario switches `generate_cloze` and switches back. The API has no fake clock: "time passes"
// means back-dating columns with psql, then `pnpm maintenance:run`. Prompts never name the asked word for the AI types (the fake's
// sentences are fixed), so the script reads an item's sense from practice_session_items and works the right answer out from its
// own data. A failing step is reported and the run goes on with the next one; the exit code is 0 only when every step matched.
import { execFileSync } from 'node:child_process';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-Test-Pass-9!';
const QUEUE_PREFIX = 'wordmet-b7-smoke';
const WORD_MASK = '[từ riêng của người học]';
const MEANING_MASK = '[nghĩa của từ riêng]';
// What the fake provider returns (src/ai/adapters/fake/fake.adapter.ts, okValue).
const FAKE = {
  clozeSentence: 'Lan will ___ it tomorrow.', clozeVi: 'Lan sẽ làm việc đó vào ngày mai.',
  mcqSentence: 'Lan ___ it today.', dayVi: 'Hôm nay Lan làm việc đó.', lookupMeaning: 'nghĩa giả',
};
const AI_UNITS = 87;
const run = randomUUID().slice(0, 8);

const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
if (!process.env.DATABASE_URL && fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
// The CLIs read .env and a variable in their environment wins; the smoke sets both below, so it only refuses a .env that would
// make its own children disagree with the API it expects.
for (const [key, want] of [['AI_FAKE_ENABLED', 'true'], ['JOB_QUEUE_PREFIX', QUEUE_PREFIX]]) {
  const value = process.env[key] ?? fileEnv[key];
  if (value !== undefined && value !== want) throw new Error(`${key} is ${value}; the smoke needs ${want} (env or .env) and the API alike.`);
}
for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']) {
  if (process.env[key] || fileEnv[key]) throw new Error(`${key} is set: the smoke runs with the fake provider only (D3).`);
}
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);
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
/** JSON with object keys sorted: a replayed body comes back from jsonb with its keys in another order. */
const canon = (value) => (Array.isArray(value) ? `[${value.map(canon).join(',')}]`
  : value !== null && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canon(value[key])}`).join(',')}}` : JSON.stringify(value));

// ---------------------------------------------------------------------------------------------------------------------
// HTTP. An actor is { email, token, id }; a 401 logs the actor in again once (access tokens live 15 minutes).

/** `fetch`, retried on a network error: the API closes an idle keep-alive socket after 5 s (seen in Bước 5–6's smokes). */
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

/** One request; waits out a 429 (user.write 30/min, practice.answer 120/min) and retries with the same Idempotency-Key. */
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
  return (await want(api('POST', '/v1/auth/login', { body: { email, password: PASSWORD, client: 'web' } }), 200, `login ${email}`)).access_token;
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
function maintenance() {
  execFileSync(process.execPath, [built('dist/cli/run-maintenance.js')], { stdio: 'pipe', env: CHILD_ENV });
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
  email, password: PASSWORD, timezone: TIMEZONE, given_name: 'Smoke', birth_date: '2000-01-01', accept_terms: true, client: 'web',
});

/** Register sends one verification mail; its code is valid until another is issued. If it is refused, ask for a second one. */
async function registerVerified(email) {
  const before = (await mailsTo(email)).length;
  await want(api('POST', '/v1/auth/register', { body: registerBody(email) }), 201, `register ${email}`);
  let verified = await api('POST', '/v1/auth/verify-email', { body: { email, code: await newestCode(email, before + 1), password: PASSWORD, client: 'web' } });
  if (verified.status !== 200) {
    const beforeResend = (await mailsTo(email)).length;
    await want(api('POST', '/v1/auth/otp', { body: { purpose: 'verify_email', email } }), 202, 'request OTP');
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
// The words: one CSV of catalog verbs, one bucket (topic, level) per group so every step works on words no other step touched,
// and so the bulk add of a group takes exactly its own words (a fresh database is required).
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(97 + randomInt(26))).join('');
const usedLemmas = new Set();
function lemma(prefix) {
  for (;;) {
    const value = `${prefix}${letters(6)}`;
    if (!usedLemmas.has(value)) { usedLemmas.add(value); return value; }
  }
}
// Group key → [topic, level, words]. G117's group reuses GL2's bucket (another learner's group).
const BUCKETS = {
  G1: ['technology', 'A1', 10], G4: ['technology', 'A2', 4], G5: ['technology', 'B1', 2], G6: ['technology', 'B2', 1],
  G7: ['marketing', 'A1', 4], GR1: ['marketing', 'A2', 2], GR2: ['marketing', 'B1', 1], GR3: ['business', 'A1', 1],
  GR5: ['business', 'A2', 3], G57: ['business', 'B1', 1], GL3: ['food', 'A1', 5], GL2: ['daily-life', 'A1', 2],
};
let n = 0;
const words = Object.entries(BUCKETS).flatMap(([group, [topic, level, size]]) => Array.from({ length: size }, () => {
  n += 1;
  const base = lemma('zq');
  return {
    group, topic, level, lemma: base, past: `${base}ed`, third: `${base}s`, meaning: `nghĩa thử ${n}`,
    definition: `A short smoke definition number ${n}.`, example: `They ${base}ed the box yesterday.`, senseId: null, private: false,
  };
}));
const bySense = new Map();
const wordsOf = (group) => words.filter((w) => w.group === group);
function wordOf(senseId) {
  const word = bySense.get(senseId);
  check(word, `sense ${senseId} is none of the script's words`);
  return word;
}

/** The right answer, worked out from the script's own data (the API never sends the key before an answer). */
function rightAnswer(item, word, { clozeAnswer } = {}) {
  const { prompt } = item;
  let body;
  switch (prompt.kind) {
    case 'mcq': body = { choice: prompt.options.indexOf(word.lemma) }; break;
    case 'true_false': body = { is_true: word.meaning === prompt.meaning }; break;
    case 'type_meaning': body = { text: word.lemma }; break;
    case 'type_sentence': body = { text: word.past }; break;
    case 'cloze': body = { text: clozeAnswer ?? word.lemma }; break;
    case 'meaning_in_sentence': body = { choice: prompt.options.indexOf(word.meaning) }; break;
    // Every form of a word starts with its lemma (the CSV gives -ed and -s; private words have none).
    case 'mcq_sentence': body = { choice: prompt.options.findIndex((o) => o.toLowerCase().startsWith(word.lemma.toLowerCase())) }; break;
    default: throw new Error(`unknown prompt ${j(prompt)}`);
  }
  check(body.choice === undefined || body.choice >= 0, `${word.lemma} is not among the options of ${j(prompt)}`);
  return body;
}

/** B7E55: what next/current send never holds the key, the hint texts or the translation. */
function noLeak(item) {
  const text = j(item);
  check(!('answer_key' in item) && !('hints' in item) && !/translation|correct_index|accepted|option_private/.test(text),
    `the item leaks the answer: ${text}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Practice and ledger reads.
function itemInfo(itemId) {
  const [row] = rows(`SELECT i.sense_id, i.position, q.id, q.source, q.type, coalesce(q.ai_request_id, ''), q.ai_charged,
    coalesce(q.sense_revision_id::text, '') FROM practice_session_items i JOIN practice_questions q ON q.id = i.question_id
    WHERE i.id = '${itemId}'`);
  check(row, `item ${itemId} not found`);
  const [senseId, position, questionId, source, type, aiRequestId, aiCharged, senseRevisionId] = row;
  return { senseId, position: Number(position), questionId, source, type, aiRequestId, aiCharged: aiCharged === 't', senseRevisionId };
}
function sessionRow(sessionId) {
  const [[senseIds, aiSenseIds, status, pending, aiStopped]] = rows(`SELECT array_to_string(sense_ids, ','),
    array_to_string(ai_sense_ids, ','), status, coalesce(pending_ai_request_id::text, ''), coalesce(ai_stopped, '')
    FROM practice_sessions WHERE id = '${sessionId}'`);
  const list = (text) => (text ? text.split(',') : []);
  return { senseIds: list(senseIds), aiSenseIds: list(aiSenseIds), status, pending, aiStopped };
}
function requestsOf(sessionId) {
  return rows(`SELECT id, sense_id, state, coalesce(failure, ''), coalesce(question_id::text, ''), type, round
    FROM practice_ai_requests WHERE session_id = '${sessionId}' ORDER BY created_at, id`)
    .map(([id, senseId, state, failure, questionId, type, round]) => ({ id, senseId, state, failure, questionId, type, round: Number(round) }));
}
const usageOf = (operationId) => psql(`SELECT coalesce(string_agg(kind || ':' || status, ',' ORDER BY created_at), '')
  FROM usage_records WHERE operation_id = '${operationId}' AND kind = 'use'`);
const creditsOf = (operationId) => count(`SELECT count(*) FROM usage_records WHERE operation_id = '${operationId}' AND kind = 'credit'`);
const outcomesOf = (operationId) => psql(`SELECT coalesce(string_agg(outcome, ',' ORDER BY created_at, attempt), '')
  FROM ai_calls WHERE operation_id = '${operationId}'`);
const itemsIn = (sessionId) => count(`SELECT count(*) FROM practice_session_items WHERE session_id = '${sessionId}'`);
const unseenAi = (userId) => rows(`SELECT q.id, q.sense_id FROM practice_questions q WHERE q.user_id = '${userId}' AND q.source = 'ai'
  AND NOT EXISTS (SELECT 1 FROM practice_session_items i WHERE i.question_id = q.id) ORDER BY q.created_at`)
  .map(([id, senseId]) => ({ id, senseId }));

async function main() {
  const started = Date.now();
  let admin; let editor; let L1; let L2; let L3;
  const groups = {};
  const items = {};

  const entitlements = async (as) => want(api('GET', '/v1/me/entitlements', { as }), 200, 'GET /v1/me/entitlements');
  const aiLeft = async (as) => (await entitlements(as)).pools.ai_practice.remaining;
  const lookupLeft = async (as) => (await entitlements(as)).pools.ai_lookup.remaining;
  const startSession = (as, body) => api('POST', '/v1/practice/sessions', { as, idem: true, body });
  const start = async (as, body) => (await want(startSession(as, body), 201, `start ${j(body)}`)).session;
  const nextCall = (as, sessionId, body) => api('POST', `/v1/practice/sessions/${sessionId}/next`, { as, body });
  const next = (as, sessionId, body) => want(nextCall(as, sessionId, body), 200, 'next');
  const prepare = (as, sessionId) => want(api('POST', `/v1/practice/sessions/${sessionId}/prepare`, { as }), 200, 'prepare');
  const answer = (as, itemId, body) => want(api('POST', `/v1/practice/items/${itemId}/answer`, { as, idem: true, body }), 200,
    `answer ${j(body)}`);
  const hint = (as, itemId, level) => api('POST', `/v1/practice/items/${itemId}/hint`, { as, body: { level } });
  const finish = (as, sessionId) => api('POST', `/v1/practice/sessions/${sessionId}/finish`, { as });
  const report = (as, itemId, body) => api('POST', `/v1/practice/items/${itemId}/report`, { as, body });
  const staffReports = async (as = editor) => (await want(api('GET', '/v1/admin/practice/reports?source=ai&page_size=100', { as }), 200,
    'staff reports')).items;
  const resolve = (as, reportId, status) => api('POST', `/v1/admin/practice/reports/${reportId}/resolve`, { as, idem: true, body: { status } });
  const lookupAi = (as, body, key = randomUUID()) => api('POST', '/v1/lookup/ai', { as, body, key });

  const models = new Map();
  async function addModel(modelId) {
    if (models.has(modelId)) return models.get(modelId);
    const view = await want(api('POST', '/v1/admin/ai/models', { as: admin, body: { provider: 'fake', model_id: modelId } }), 201, `add ${modelId}`);
    models.set(modelId, view);
    return view;
  }
  async function choose(op, modelId) {
    const model = modelId === null ? null : await addModel(modelId);
    const list = await want(api('GET', '/v1/admin/ai/operations', { as: admin }), 200, 'GET operations');
    const current = list.items.find((row) => row.operation === op);
    check(current, `operation ${op} is not listed`);
    await want(api('PUT', `/v1/admin/ai/operations/${op}`, { as: admin, body: {
      expected_version: current.version, model_ref: model?.id ?? null, effort: null, thinking: null, max_output_tokens: null,
    } }), 200, `choose ${modelId} for ${op}`);
  }
  const opStatus = async (op) => (await want(api('GET', '/v1/admin/ai/status', { as: admin }), 200, 'AI status')).operations
    .find((row) => row.operation === op);
  const settings = async () => want(api('GET', '/v1/admin/settings', { as: admin }), 200, 'GET settings');

  /** Shows one question, answers it right, and returns what it saw. */
  async function askAndAnswer(as, sessionId, { prepareAfter = false } = {}) {
    const shown = await next(as, sessionId);
    check(shown.state === 'question', `next: ${j(shown)}`);
    noLeak(shown.item);
    const info = itemInfo(shown.item.item_id);
    const prepared = prepareAfter ? await prepare(as, sessionId) : null;
    const result = await answer(as, shown.item.item_id, rightAnswer(shown.item, wordOf(info.senseId)));
    check(result.result === 'correct', `answer ${shown.item.type}: ${j(result)}`);
    return { shown, info, prepared, result };
  }

  // =====================================================================================================================
  await step('Wait for the API', async () => {
    await waitFor(async () => {
      try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; }
    }, Boolean, `API at ${BASE}`, 20_000);
    ok(`reachable at ${BASE}; database ${DB_NAME}; children run with AI_FAKE_ENABLED=true, JOB_QUEUE_PREFIX=${QUEUE_PREFIX}, no key`);
  }, { fatal: true });

  await step('Accounts: admin (CLI grant), editor (created by the admin), learners L1, L2, L3 (vi)', async () => {
    const adminEmail = `smoke7-admin-${run}@example.com`;
    admin = await registerVerified(adminEmail);
    execFileSync(process.execPath, [built('dist/cli/admin-grant.js'), adminEmail], { stdio: 'pipe', env: CHILD_ENV });
    admin.token = await loginToken(adminEmail);
    const editorEmail = `smoke7-editor-${run}@example.com`;
    await want(api('POST', '/v1/admin/users', { as: admin, body: {
      email: editorEmail, staff_role: 'editor', password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, 'create editor');
    editor = { email: editorEmail, token: await loginToken(editorEmail) };
    editor.id = (await want(api('GET', '/v1/me', { as: editor }), 200, 'editor profile')).id;
    L1 = await registerLearner(`smoke7-l1-${run}@example.com`);
    L2 = await registerLearner(`smoke7-l2-${run}@example.com`);
    L3 = await registerLearner(`smoke7-l3-${run}@example.com`);
    ok(`admin ${adminEmail}; editor ${editorEmail}; learners ${L1.email}, ${L2.email}, ${L3.email} (native_language vi)`);
  }, { fatal: true });

  await step('AI setup (design §18, R6): fake provider on; the new operations seeded without a model; fake:ok chosen for five operations', async () => {
    const status = await want(api('GET', '/v1/admin/ai/status', { as: admin }), 200, 'AI status');
    check(status.providers.fake === true && status.providers.openai === false && status.providers.anthropic === false,
      `providers ${j(status.providers)}: start the API with AI_FAKE_ENABLED=true and no key`);
    const ops = ['generate_cloze', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word', 'lookup_word'];
    for (const op of ops) {
      const row = status.operations.find((item) => item.operation === op);
      check(row && row.ready === false && row.reason === 'model-not-set', `${op} on a fresh database: ${j(row)}`);
    }
    const cloze = await want(api('GET', '/v1/admin/ai/prompts/generate_cloze', { as: admin }), 200, 'cloze prompt');
    check(cloze.revision === 2, `generate_cloze prompt revision ${cloze.revision}, expected 2 on a fresh database (plan choice 1)`);
    for (const model of ['fake:ok', 'fake:refuse', 'fake:slow', 'fake:503-then-ok', 'fake:bad-form', 'fake:not-recognized']) await addModel(model);
    for (const op of ops) await choose(op, 'fake:ok');
    for (const op of ops) check((await opStatus(op)).ready === true, `${op} not ready after choosing fake:ok`);
    const practice = (await settings()).values.practice;
    check(practice.ai_prefetch_count === 2, `practice.ai_prefetch_count ${practice.ai_prefetch_count}, expected the default 2`);
    ok(`five operations were model-not-set; generate_cloze prompt at revision 2; six fake models added; fake:ok chosen, all five ready; ai_prefetch_count 2`);
  }, { fatal: true });

  await step(`Content: import ${words.length} verbs (gloss, short definition, example, inflections) in ${Object.keys(BUCKETS).length} topic/level buckets and publish`, async () => {
    const source = await want(api('POST', '/v1/admin/content/sources', {
      as: admin, body: { name: `Smoke7-${run}`, version: '1.0', license: 'test license', display_priority: 90 } }), 201, 'source');
    const csv = ['headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,inflections',
      ...words.map((w) => `${w.lemma},verb,${w.level},${w.meaning},${w.definition},${w.example},${w.topic},past:${w.past}; third_person:${w.third}`),
    ].join('\r\n');
    const form = new FormData();
    form.set('level_source_id', source.id);
    form.set('file', new Blob([csv], { type: 'text/csv' }), 'smoke7.csv');
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
      bySense.set(w.senseId, w);
    }
    const probe = await want(api('GET', `/v1/senses/search?q=${words[0].lemma}`, { as: L1 }), 200, 'search');
    check(probe.items.some((item) => item.sense_id === words[0].senseId && item.meaning.text === words[0].meaning), 'a learner cannot see the words');
    ok(`batch ${accepted.batch_id}: ${words.length} created, published by job ${job.job_id}; a learner sees them`);
  }, { fatal: true });

  await step(`Entitlements: L1 Pro with ${AI_UNITS} AI practice units and 200 sessions a day; L2 stays Free; L3 Pro with 3 units`, async () => {
    const ends = new Date(Date.now() + 30 * 24 * 3_600_000).toISOString();
    const grant = (body) => want(api('POST', '/v1/admin/entitlements/grants', { as: admin, idem: true, body: { ends_at: ends, ...body } }), 201,
      `grant ${j(body)}`);
    await grant({ user_id: L1.id, kind: 'plan', plan: 'pro', reason: 'smoke:buoc-7' });
    await grant({ user_id: L1.id, kind: 'limits', limits: { ai_practice_per_cycle: AI_UNITS, practice_sessions_per_day: 200 }, reason: 'smoke:buoc-7' });
    await grant({ user_id: L3.id, kind: 'plan', plan: 'pro', reason: 'smoke:buoc-7 AC3' });
    await grant({ user_id: L3.id, kind: 'limits', limits: { ai_practice_per_cycle: 3 }, reason: 'smoke:buoc-7 AC3' });
    const one = await entitlements(L1);
    check(one.plan === 'pro' && one.pools.ai_practice.limit === AI_UNITS && one.pools.ai_practice.remaining === AI_UNITS
      && one.features['ai.practice'].allowed === true && one.features['ai.lookup'].allowed === true, `L1 ${j(one)}`);
    const two = await entitlements(L2);
    check(two.plan === 'free' && two.features['ai.practice'].allowed === false && two.features['ai.lookup'].allowed === false, `L2 ${j(two)}`);
    const three = await entitlements(L3);
    check(three.plan === 'pro' && three.pools.ai_practice.remaining === 3, `L3 ${j(three.pools.ai_practice)}`);
    ok(`L1 pro, ai_practice ${one.pools.ai_practice.remaining}/${one.pools.ai_practice.limit}, ai_lookup ${one.pools.ai_lookup.remaining}; L2 free (no AI); L3 pro, ai_practice 3`);
  }, { fatal: true });

  await step('Groups: one per bucket (bulk add by topic and level), plus an empty one for a saved AI suggestion', async () => {
    const make = async (as, key, bucket = key) => {
      const group = await want(api('POST', '/v1/groups', { as, idem: true, body: { name: `${key} ${run}` } }), 201, `group ${key}`);
      if (bucket) {
        const [topic, level, size] = BUCKETS[bucket];
        const added = await want(api('POST', `/v1/groups/${group.id}/items/bulk`, { as, idem: true, body: { topic, level } }), 200, `bulk ${key}`);
        check(added.added === size, `group ${key} (${topic}/${level}) got ${added.added} words, expected ${size}: run on a fresh database`);
      }
      return group.id;
    };
    for (const key of ['G1', 'G4', 'G5', 'G6', 'G7', 'GR1', 'GR2', 'GR3', 'GR5', 'G57']) groups[key] = await make(L1, key);
    groups.G117 = await make(L1, 'G117', 'GL2');
    groups.G9 = await make(L1, 'G9', null);
    groups.GL2 = await make(L2, 'GL2');
    groups.GL3 = await make(L3, 'GL3');
    ok(`L1: ${Object.keys(groups).filter((k) => !k.startsWith('GL')).join(', ')}; L2: GL2; L3: GL3`);
  }, { fatal: true });

  // =====================================================================================================================
  await step('AC1 (B7E45, B7E7): Pro learner, 87 units, "gõ từ + điền từ AI", 10 questions, prepare after opening and after each question', async () => {
    check(await aiLeft(L1) === AI_UNITS, 'L1 does not start with 87 units');
    const session = await start(L1, { source: 'group', group_id: groups.G1, types: ['type_word', 'cloze'], count: 10 });
    check(session.ai_planned === 5 && session.cloze_source === 'ai', `session ${j(session)}`);
    const row = sessionRow(session.id);
    const marked = [1, 3, 5, 7, 9].map((i) => row.senseIds[i]);
    check(row.senseIds.length === 10 && j(row.aiSenseIds) === j(marked), `marked ${j(row.aiSenseIds)}, expected positions 2,4,6,8,10 of ${j(row.senseIds)}`);
    const first = await prepare(L1, session.id);
    check(first.prepared === 2 && first.failed === 0, `prepare after opening ${j(first)}`);
    let preparedTotal = first.prepared;
    for (let k = 1; k <= 10; k += 1) {
      const isAi = k % 2 === 0;
      if (isAi) {
        const made = requestsOf(session.id).find((r) => r.senseId === row.senseIds[k - 1]);
        check(made?.state === 'ready', `position ${k}: the AI question was not ready before next (${j(made)})`);
      }
      const shown = await next(L1, session.id);
      check(shown.state === 'question' && shown.item.position === k, `position ${k}: ${j(shown)}`);
      noLeak(shown.item);
      const info = itemInfo(shown.item.item_id);
      check(info.senseId === row.senseIds[k - 1], `position ${k} asks ${info.senseId}`);
      check(isAi ? shown.item.type === 'cloze' && info.source === 'ai' && shown.item.prompt.sentence === FAKE.clozeSentence
        : shown.item.type === 'type_word' && info.source === 'rule', `position ${k}: ${shown.item.type}/${info.source}`);
      preparedTotal += (await prepare(L1, session.id)).prepared;
      const res = await answer(L1, shown.item.item_id, rightAnswer(shown.item, wordOf(info.senseId)));
      check(res.result === 'correct' && res.translation === (isAi ? FAKE.clozeVi : null), `position ${k} answer ${j(res)}`);
    }
    check((await next(L1, session.id)).state === 'finished', 'not finished after 10 answers');
    const made = requestsOf(session.id);
    check(made.length === 5 && made.every((r) => r.state === 'ready' && usageOf(r.id) === 'use:confirmed'), `requests ${j(made)}`);
    check(preparedTotal === 5, `prepare made ${preparedTotal} questions, expected 5`);
    const left = await aiLeft(L1);
    check(left === AI_UNITS - 5, `${left} units left, expected 82`);
    ok(`ai_planned 5, marked positions 2,4,6,8,10; every AI question made by prepare before next; 5 cloze (AI) + 5 typing, all right; ${left} units left; 5 confirmed use rows`);
  });

  await step('AC2 (B7E59, B7E15): the same session again, stopped at question 4 and abandoned; the next session reuses the unseen AI questions at 0 units', async () => {
    const before = await aiLeft(L1);
    const body = { source: 'group', group_id: groups.G1, types: ['type_word', 'cloze'], count: 10 };
    const s2 = await start(L1, body);
    await prepare(L1, s2.id);
    const askedQuestions = new Set();
    for (let k = 1; k <= 4; k += 1) {
      const shown = await next(L1, s2.id);
      check(shown.state === 'question' && shown.item.position === k, `session 2 position ${k}: ${j(shown)}`);
      const info = itemInfo(shown.item.item_id);
      askedQuestions.add(info.questionId);
      await prepare(L1, s2.id);
      if (k < 4) await answer(L1, shown.item.item_id, rightAnswer(shown.item, wordOf(info.senseId)));
    }
    const made2 = requestsOf(s2.id);
    const unseen = made2.filter((r) => r.state === 'ready' && !askedQuestions.has(r.questionId));
    check(made2.length === 4 && made2.every((r) => r.state === 'ready') && unseen.length === 2, `session 2 requests ${j(made2)}`);
    check(await aiLeft(L1) === before - 4, 'session 2 did not spend 4 units');
    const s3 = await start(L1, body);
    check(sessionRow(s2.id).status === 'abandoned', 'session 2 not abandoned by opening session 3');
    const row3 = sessionRow(s3.id);
    check(s3.ai_planned === 5 && unseen.every((r) => row3.aiSenseIds.includes(r.senseId)), `session 3 ${j(s3)} marked ${j(row3.aiSenseIds)}`);
    await prepare(L1, s3.id);
    const reused = [];
    for (let k = 1; k <= 10; k += 1) {
      const { shown, info } = await askAndAnswer(L1, s3.id, { prepareAfter: true });
      check(shown.item.position === k, `session 3 position ${k}`);
      const old = unseen.find((r) => r.senseId === info.senseId);
      if (old) {
        check(info.questionId === old.questionId && shown.item.type === 'cloze', `session 3 asked ${info.senseId} with question ${info.questionId}, not the unseen ${old.questionId}`);
        reused.push(info.questionId);
      }
    }
    check((await next(L1, s3.id)).state === 'finished', 'session 3 not finished');
    const made3 = requestsOf(s3.id);
    check(reused.length === 2, `reused ${reused.length} unseen questions, expected 2`);
    check(made3.length === 3 && made3.every((r) => r.state === 'ready') && !made3.some((r) => unseen.some((u) => u.senseId === r.senseId)),
      `session 3 requests ${j(made3)}`);
    const left = await aiLeft(L1);
    check(left === before - 4 - 3, `${left} units left, expected ${before - 7}`);
    ok(`session 2: 4 AI questions made (2 shown, 2 unseen), 4 units; abandoned by session 3, which marked both unseen words, reused their questions (0 units) and made 3 new ones; ${left} units left`);
  });

  await step('AC3 (B7E2): L3 has 3 units left; a session that needs 5 is refused, one that needs 3 opens', async () => {
    const refused = await wantProblem(startSession(L3, { source: 'group', group_id: groups.GL3, types: ['cloze'], count: 5 }), 403,
      'ai-quota-insufficient', 'session needing 5');
    check(refused.remaining === 3 && refused.needed === 5 && typeof refused.resets_at === 'string', `problem ${j(refused)}`);
    check(count(`SELECT count(*) FROM usage_records WHERE user_id = '${L3.id}'`) === 0, 'the refusal held or used a unit');
    const opened = await start(L3, { source: 'group', group_id: groups.GL3, types: ['cloze'], count: 3 });
    check(opened.ai_planned === 3, `session needing 3: ${j(opened)}`);
    await finish(L3, opened.id);
    check(await aiLeft(L3) === 3, 'opening a session spent units');
    ok(`count 5 → 403 ai-quota-insufficient (remaining 3, needed 5, resets_at ${refused.resets_at}), no usage row; count 3 → opens (ai_planned 3), still 3 units`);
  });

  await step('AC4 (B7E49, B7E10, B7E30): AI fails (fake:refuse) twice in a mixed session, no prepare → typing for those words, one ai-fallback notice, no unit', async () => {
    const before = await aiLeft(L1);
    await choose('generate_cloze', 'fake:refuse');
    try {
      const session = await start(L1, { source: 'group', group_id: groups.G4, types: ['type_word', 'cloze'], count: 4 });
      check(session.ai_planned === 2, `session ${j(session)}`);
      const marked = sessionRow(session.id).aiSenseIds;
      const notices = [];
      for (let k = 1; k <= 4; k += 1) {
        const shown = await next(L1, session.id);
        check(shown.state === 'question' && shown.item.type === 'type_word', `position ${k}: ${j(shown)}`);
        const info = itemInfo(shown.item.item_id);
        notices.push(shown.notice ?? null);
        if (marked.includes(info.senseId)) {
          check(k === 2 || k === 4, `marked word at position ${k}`);
          check(k === 2 ? shown.notice === 'ai-fallback' && shown.ai_reason === 'ai-failed' : shown.notice === undefined,
            `position ${k} notice ${shown.notice}/${shown.ai_reason}`);
        } else check(shown.notice === undefined, `position ${k} notice ${shown.notice}`);
        await answer(L1, shown.item.item_id, rightAnswer(shown.item, wordOf(info.senseId)));
      }
      check((await next(L1, session.id)).state === 'finished', 'not finished');
      const made = requestsOf(session.id);
      check(made.length === 2 && made.every((r) => r.state === 'failed' && r.failure === 'ai-failed' && usageOf(r.id) === 'use:released'
        && outcomesOf(r.id) === 'refused'), `requests ${j(made.map((r) => ({ ...r, usage: usageOf(r.id), calls: outcomesOf(r.id) })))}`);
      check(await aiLeft(L1) === before, 'units were spent');
      ok(`positions 2 and 4 fell back to typing on the same word; notices ${j(notices)}; both requests failed/ai-failed with the unit released; ${before} units left`);
    } finally {
      await choose('generate_cloze', 'fake:ok');
    }
  });

  await step('AC4 with prepare (B7E113, §6.4, §6.6): prepare fails both AI words; next switches type at once, calls AI no more, shows ai-fallback once', async () => {
    await choose('generate_cloze', 'fake:refuse');
    try {
      const session = await start(L1, { source: 'group', group_id: groups.G4, types: ['type_word', 'cloze'], count: 4 });
      const marked = sessionRow(session.id).aiSenseIds;
      const made = await prepare(L1, session.id);
      check(made.prepared === 0 && made.failed === 2, `prepare ${j(made)}`);
      const calls = () => count(`SELECT count(*) FROM ai_calls WHERE operation_id IN (SELECT id::text FROM practice_ai_requests WHERE session_id = '${session.id}')`);
      const callsAfterPrepare = calls();
      const notices = [];
      for (let k = 1; k <= 4; k += 1) {
        const shown = await next(L1, session.id);
        check(shown.state === 'question' && shown.item.type === 'type_word', `position ${k}: ${j(shown)}`);
        const info = itemInfo(shown.item.item_id);
        notices.push({ k, marked: marked.includes(info.senseId), notice: shown.notice ?? null, ai_reason: shown.ai_reason ?? null });
        await prepare(L1, session.id);
        await answer(L1, shown.item.item_id, rightAnswer(shown.item, wordOf(info.senseId)));
      }
      check(calls() === callsAfterPrepare && requestsOf(session.id).length === 2, 'next called AI again after prepare failed');
      check(sessionRow(session.id).status === 'finished' || (await next(L1, session.id)).state === 'finished', 'not finished');
      ok(`prepare: ${j(made)}; both AI words asked as typing at once, no further AI call (${callsAfterPrepare} calls, all from prepare)`);
      const firstMarked = notices.find((x) => x.marked);
      check(firstMarked?.notice === 'ai-fallback' && notices.filter((x) => x.notice === 'ai-fallback').length === 1,
        `ai-fallback notice expected once, on the first word whose AI failed in prepare; got ${j(notices)}; practice_sessions.ai_notice_shown = ${
          psql(`SELECT ai_notice_shown FROM practice_sessions WHERE id = '${session.id}'`)}; requests ${j(requestsOf(session.id).map((r) => `${r.state}/${r.failure}`))}`);
      ok(`typing on both words, no further AI call; notices ${j(notices)}`);
    } finally {
      await choose('generate_cloze', 'fake:ok');
    }
  });

  await step('AC5 (B7E48, B7E31): AI-only session, AI times out (fake:slow) → ai_unavailable; next again → same, no AI call; retry_ai once AI is back (fake:503-then-ok) → AI question', async () => {
    const before = await aiLeft(L1);
    await choose('generate_cloze', 'fake:slow');
    try {
      const session = await start(L1, { source: 'group', group_id: groups.G5, types: ['cloze'], count: 2 });
      const t0 = Date.now();
      const first = await next(L1, session.id);
      const elapsed = Date.now() - t0;
      check(first.state === 'ai_unavailable' && first.reason === 'ai-failed', `first next ${j(first)}`);
      const [failed] = requestsOf(session.id);
      check(failed?.state === 'failed' && outcomesOf(failed.id) === 'timeout' && usageOf(failed.id) === 'use:released', `request ${j(failed)}`);
      const again = await next(L1, session.id);
      check(again.state === 'ai_unavailable' && again.reason === 'ai-failed', `next without retry_ai ${j(again)}`);
      check(requestsOf(session.id).length === 1 && outcomesOf(failed.id) === 'timeout', 'next without retry_ai called AI');
      await choose('generate_cloze', 'fake:503-then-ok');
      const retried = await next(L1, session.id, { retry_ai: true });
      check(retried.state === 'question' && retried.item.type === 'cloze', `retry ${j(retried)}`);
      const info = itemInfo(retried.item.item_id);
      const second = requestsOf(session.id).at(-1);
      check(info.source === 'ai' && info.aiRequestId === second.id && second.state === 'ready', `retried question ${j(info)}`);
      check(outcomesOf(second.id) === 'provider-error,succeeded' && usageOf(second.id) === 'use:confirmed',
        `retry calls ${outcomesOf(second.id)}, usage ${usageOf(second.id)}`);
      // Plan choice 6: skip works for cloze too.
      const wrong = await answer(L1, retried.item.item_id, { text: 'zzzzwrong' });
      check(wrong.result === 'try_again', `wrong cloze answer ${j(wrong)}`);
      const skipped = await want(api('POST', `/v1/practice/items/${retried.item.item_id}/skip`, { as: L1 }), 200, 'skip cloze');
      check(skipped.result === 'wrong' && skipped.skipped === true && skipped.correct.text === wordOf(info.senseId).lemma, `skip ${j(skipped)}`);
      await finish(L1, session.id);
      check(await aiLeft(L1) === before - 1, 'expected exactly 1 unit spent');
      ok(`timeout after ${elapsed} ms → ai_unavailable/ai-failed (unit released); again → same, no new call; retry_ai with fake:503-then-ok → cloze (calls ${outcomesOf(second.id)}), 1 unit; cloze wrong → try_again, skip → wrong/skipped`);
    } finally {
      await choose('generate_cloze', 'fake:ok');
    }
  });

  await step('AC6 (B7E34, B7E96, B7E97): fake:bad-form → rejected twice (#2), the form is recorded; staff accept it → the next AI question passes', async () => {
    const [word] = wordsOf('G6');
    const form = `${word.lemma}ment`;
    await choose('generate_cloze', 'fake:bad-form');
    try {
      const session = await start(L1, { source: 'group', group_id: groups.G6, types: ['cloze'], count: 1 });
      const first = await next(L1, session.id);
      check(first.state === 'ai_unavailable' && first.reason === 'ai-failed', `first next ${j(first)}`);
      const [rejected] = requestsOf(session.id);
      check(rejected?.state === 'failed' && rejected.failure === 'rejected', `request ${j(rejected)}`);
      check(outcomesOf(rejected.id) === 'succeeded' && outcomesOf(`${rejected.id}#2`) === 'succeeded' && usageOf(rejected.id) === 'use:released',
        `calls ${outcomesOf(rejected.id)} / #2 ${outcomesOf(`${rejected.id}#2`)}, usage ${usageOf(rejected.id)}`);
      const recorded = psql(`SELECT rejected_count FROM practice_unknown_forms WHERE lemma_key = '${word.lemma}' AND form_key = '${form}'`);
      check(recorded === '2', `practice_unknown_forms rejected_count ${recorded || 'none'}`);
      const listed = await want(api('GET', '/v1/admin/practice/unknown-forms?page_size=100', { as: editor }), 200, 'unknown forms');
      check(listed.items.some((row) => row.form === form && row.rejected_count === 2), `list ${j(listed.items)}`);
      const accepted = await want(api('POST', '/v1/admin/content/word-forms', { as: editor, idem: true, body: { lemma: word.lemma, form } }), 201, 'accept form');
      check(accepted.form === form, `accepted ${j(accepted)}`);
      await wantProblem(api('POST', '/v1/admin/content/word-forms', { as: editor, idem: true, body: { lemma: word.lemma, form } }), 409,
        'word-form-exists', 'accept the same form again');
      const after = await want(api('GET', '/v1/admin/practice/unknown-forms?page_size=100', { as: editor }), 200, 'unknown forms after');
      check(!after.items.some((row) => row.form === form), 'the accepted form is still listed');
      const retried = await next(L1, session.id, { retry_ai: true });
      check(retried.state === 'question' && retried.item.type === 'cloze', `retry ${j(retried)}`);
      const second = requestsOf(session.id).at(-1);
      check(second.state === 'ready' && outcomesOf(second.id) === 'succeeded' && outcomesOf(`${second.id}#2`) === ''
        && usageOf(second.id) === 'use:confirmed', `second request ${j(second)} calls ${outcomesOf(second.id)}`);
      const res = await answer(L1, retried.item.item_id, { text: form });
      check(res.result === 'correct' && res.correct.text === form, `answer ${j(res)}`);
      await finish(L1, session.id);
      ok(`first request rejected (reason ${first.reason}) after ${rejected.id} and #2; "${form}" recorded twice and listed; editor accepted it (again → 409); list hides it; retry → cloze accepted "${form}", one call, 1 unit`);
    } finally {
      await choose('generate_cloze', 'fake:ok');
    }
  });

  await step('AC7 (B7E50–B7E56, B7E18, B7E124, plan choice 6): the three AI types and cloze from a saved sentence: hints, grading, translation', async () => {
    const before = await aiLeft(L1);
    // mcq_sentence
    let session = await start(L1, { source: 'group', group_id: groups.G7, types: ['mcq_sentence'], count: 1 });
    let shown = await next(L1, session.id);
    check(shown.state === 'question' && shown.item.type === 'mcq_sentence' && shown.item.prompt.sentence === FAKE.mcqSentence
      && shown.item.prompt.options.length === 4 && shown.item.reportable === true, `mcq_sentence ${j(shown)}`);
    noLeak(shown.item);
    check(j(shown.item.hints_available) === j({ level1: true, level2: false, level3: false }), `hints ${j(shown.item.hints_available)}`);
    let info = itemInfo(shown.item.item_id);
    let word = wordOf(info.senseId);
    await wantProblem(hint(L1, shown.item.item_id, 2), 409, 'hint-unavailable', 'mcq_sentence hint 2');
    await wantProblem(hint(L1, shown.item.item_id, 3), 409, 'hint-unavailable', 'mcq_sentence hint 3');
    const h1 = await want(hint(L1, shown.item.item_id, 1), 200, 'mcq_sentence hint 1');
    check(h1.hint.kind === 'definition' && h1.hint.text === word.definition, `hint 1 ${j(h1)}`);
    let body = rightAnswer(shown.item, word);
    let res = await answer(L1, shown.item.item_id, body);
    check(res.result === 'correct' && res.correct.choice_index === body.choice && res.correct.text === shown.item.prompt.options[body.choice]
      && res.translation === FAKE.dayVi && res.show_known === false, `mcq_sentence answer ${j(res)}`);
    items.mcq = { itemId: shown.item.item_id, ...info };
    const mcqText = res.correct.text;
    // meaning_in_sentence
    session = await start(L1, { source: 'group', group_id: groups.G7, types: ['meaning_in_sentence'], count: 1 });
    shown = await next(L1, session.id);
    info = itemInfo(shown.item.item_id);
    word = wordOf(info.senseId);
    check(shown.item.type === 'meaning_in_sentence' && shown.item.prompt.highlight === word.lemma
      && shown.item.prompt.sentence === `Lan ${word.lemma} it today.` && shown.item.prompt.meaning_language === 'vi'
      && shown.item.prompt.options.length === 4 && shown.item.prompt.options.includes(word.meaning), `meaning_in_sentence ${j(shown)}`);
    noLeak(shown.item);
    check(j(shown.item.hints_available) === j({ level1: true, level2: false, level3: false }), `hints ${j(shown.item.hints_available)}`);
    body = rightAnswer(shown.item, word);
    res = await answer(L1, shown.item.item_id, body);
    check(res.result === 'correct' && res.correct.text === word.meaning && res.translation === FAKE.dayVi,
      `meaning_in_sentence answer ${j(res)}`);
    items.meaning = { itemId: shown.item.item_id, ...info };
    // cloze (AI)
    session = await start(L1, { source: 'group', group_id: groups.G7, types: ['cloze'], count: 1 });
    shown = await next(L1, session.id);
    info = itemInfo(shown.item.item_id);
    word = wordOf(info.senseId);
    check(shown.item.type === 'cloze' && info.source === 'ai' && j(shown.item.hints_available) === j({ level1: true, level2: true, level3: true }),
      `cloze ${j(shown)}`);
    noLeak(shown.item);
    const hints = [];
    for (const level of [1, 2, 3]) hints.push((await want(hint(L1, shown.item.item_id, level), 200, `cloze hint ${level}`)).hint);
    check(j(hints) === j([{ kind: 'first_letter', text: word.lemma[0] }, { kind: 'definition', text: word.definition },
      { kind: 'meaning', text: word.meaning }]), `cloze hints ${j(hints)}`);
    const other = wordsOf('G7').find((w) => w !== word);
    const tryAgain = await answer(L1, shown.item.item_id, { text: other.lemma });
    check(tryAgain.result === 'try_again' && !('correct' in tryAgain), `another word typed: ${j(tryAgain)}`);
    res = await answer(L1, shown.item.item_id, { text: `${word.lemma[0].toUpperCase()}${word.lemma.slice(1)}.` });
    check(res.result === 'correct' && res.tries === 2 && res.correct.text === word.lemma && res.translation === FAKE.clozeVi
      && res.hint_level === 3, `cloze answer ${j(res)}`);
    items.cloze = { itemId: shown.item.item_id, ...info };
    // cloze from a saved sentence (no AI, no unit)
    const own = wordsOf('G7').find((w) => w !== word);
    await want(api('POST', `/v1/senses/${own.senseId}/sentences`, { as: L1, idem: true, body: { text: `We ${own.past} the boat today.` } }), 201,
      'save a context sentence');
    const usageRows = count(`SELECT count(*) FROM usage_records WHERE user_id = '${L1.id}' AND pool = 'ai_practice'`);
    session = await start(L1, { source: 'group', group_id: groups.G7, types: ['cloze'], cloze_source: 'own', count: 1 });
    check(session.ai_planned === 0 && session.cloze_source === 'own', `own session ${j(session)}`);
    shown = await next(L1, session.id);
    info = itemInfo(shown.item.item_id);
    check(shown.item.type === 'cloze' && shown.item.prompt.sentence === 'We ___ the boat today.' && info.source === 'own_sentence'
      && info.senseId === own.senseId && shown.item.reportable === false
      && j(shown.item.hints_available) === j({ level1: true, level2: true, level3: true }), `own cloze ${j(shown)} ${j(info)}`);
    res = await answer(L1, shown.item.item_id, { text: own.past });
    check(res.result === 'correct' && res.translation === null, `own cloze answer ${j(res)}`);
    check(requestsOf(session.id).length === 0 && count(`SELECT count(*) FROM usage_records WHERE user_id = '${L1.id}' AND pool = 'ai_practice'`) === usageRows,
      'cloze from a saved sentence held a unit or made an AI request (B7E18)');
    await wantProblem(report(L1, shown.item.item_id, { reason: 'other' }), 409, 'report-not-available', 'report a saved-sentence cloze (B7E82)');
    // History (B7E124)
    const history = await want(api('GET', `/v1/practice/history?sense_id=${items.mcq.senseId}&page_size=100`, { as: L1 }), 200, 'history');
    const row = history.items.find((h) => h.item_id === items.mcq.itemId);
    check(row && row.prompt.kind === 'mcq_sentence' && row.correct.text === mcqText && row.translation === FAKE.dayVi, `history ${j(row)}`);
    check(await aiLeft(L1) === before - 3, 'expected 3 units for the three AI questions');
    ok(`mcq_sentence: hint 1 = definition, hint 2/3 → 409, right option "${mcqText}", translation; meaning_in_sentence: highlight, 4 meanings, right = meaning, translation; cloze: hints d…/definition/meaning, another word → try_again, "${word.lemma[0].toUpperCase()}…." → correct; saved-sentence cloze: no unit, not reportable, translation null; history shows option and translation; 3 units`);
  });

  await step('AC8 (B7E70, B7E73, B7E76, B7E84): L1 reports the AI cloze; the editor confirms; the unit comes back; the admin sees it in refunds', async () => {
    const reasons = await want(api('GET', '/v1/practice/report-reasons?kind=ai', { as: L1 }), 200, 'reasons ai');
    const nonAi = await want(api('GET', '/v1/practice/report-reasons?kind=non_ai', { as: L1 }), 200, 'reasons non_ai');
    const codes = reasons.items.map((r) => r.code);
    check(j(codes) === j(['meaning_wrong', 'graded_wrong', 'hint_wrong', 'ai_sentence_unnatural', 'ai_more_than_one_answer', 'ai_wrong_meaning', 'other']),
      `ai reasons ${j(codes)}`);
    check(j(nonAi.items.map((r) => r.code)) === j(['meaning_wrong', 'graded_wrong', 'hint_wrong', 'other']), `non_ai reasons ${j(nonAi.items)}`);
    const chosen = reasons.items.find((r) => r.code === 'ai_more_than_one_answer');
    check(chosen.label === 'Có hơn một đáp án đúng' && chosen.detail_hint === 'Từ nào khác cũng đúng?', `reason ${j(chosen)}`);
    const before = await aiLeft(L1);
    const created = await want(report(L1, items.cloze.itemId, { reason: 'ai_more_than_one_answer', note: 'smoke: another word fits' }), 201, 'report');
    check(created.reason_label === chosen.label && created.status === 'open', `report ${j(created)}`);
    const staffRow = (await staffReports()).find((r) => r.id === created.id);
    check(staffRow && staffRow.question_source === 'ai' && staffRow.ai_operation_id === items.cloze.aiRequestId
      && staffRow.call_operation_id === items.cloze.aiRequestId && staffRow.model === 'fake:ok' && Number.isInteger(staffRow.prompt_revision)
      && staffRow.ai_charged === true, `staff row ${j(staffRow)}`);
    await wantProblem(resolve(editor, created.id, 'fixed'), 409, 'resolve-status-not-allowed', 'fixed for an AI question (B7E84)');
    const confirmed = await want(resolve(editor, created.id, 'confirmed'), 200, 'confirm');
    check(confirmed.status === 'confirmed' && confirmed.refunded === true && confirmed.resolved_by === editor.id && confirmed.resolved_by_role === 'editor',
      `resolve ${j(confirmed)}`);
    check(await aiLeft(L1) === before + 1, 'the unit did not come back');
    check(creditsOf(items.cloze.aiRequestId) === 1, 'expected one credit row for the question');
    await wantProblem(resolve(editor, created.id, 'confirmed'), 409, 'report-not-open', 'second resolve (B7E76)');
    check(creditsOf(items.cloze.aiRequestId) === 1, 'a second resolve added a credit');
    const mine = await want(api('GET', '/v1/practice/reports', { as: L1 }), 200, 'my reports');
    const myRow = mine.items.find((r) => r.id === created.id);
    check(myRow && myRow.status === 'confirmed' && myRow.refunded === true && myRow.resolved_at, `my report ${j(myRow)}`);
    const refunds = await want(api('GET', '/v1/admin/practice/refunds?page_size=100', { as: admin }), 200, 'refunds');
    const refundRow = refunds.items.find((r) => r.report_id === created.id);
    check(refundRow && refundRow.resolved_by === editor.id && refundRow.resolved_by_role === 'editor' && refundRow.self_resolved === false
      && refundRow.refunded === true && refundRow.user_id === L1.id, `refund row ${j(refundRow)}`);
    await wantProblem(api('GET', '/v1/admin/practice/refunds', { as: editor }), 403, 'forbidden', 'editor on refunds');
    ok(`7 reasons for ai, 4 for non_ai; report ${created.id} open with label "${created.reason_label}"; staff row has op id, model fake:ok, prompt_revision ${staffRow.prompt_revision}; fixed → 409; confirmed by the editor → refunded, ${before} → ${before + 1} units, one credit row; again → 409 report-not-open; L1 sees refunded true; admin refunds row (self_resolved false); editor → 403`);
  });

  let suggestion;
  await step('AC9 (B7E19, B7E21, B7E93): AI lookup of an unknown word; the same key again; saved as a private word with 2 examples', async () => {
    const text = `rizz${letters(4)}`;
    const before = await lookupLeft(L1);
    const key = randomUUID();
    const first = await want(lookupAi(L1, { text }, key), 200, 'lookup');
    check(first.suggestion.lemma === text && first.suggestion.part_of_speech === 'noun' && first.suggestion.meaning.text === FAKE.lookupMeaning
      && first.suggestion.meaning.language === 'vi' && first.suggestion.examples.length === 1 && first.catalog_senses.length === 0, `lookup ${j(first)}`);
    const op = `lookup:${createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
    check(outcomesOf(op) === 'succeeded' && usageOf(op) === 'use:confirmed', `lookup op ${op}: calls ${outcomesOf(op)}, usage ${usageOf(op)}`);
    check(await lookupLeft(L1) === before - 1, 'lookup did not spend 1 unit');
    const replay = await want(lookupAi(L1, { text }, key), 200, 'lookup replay');
    check(canon(replay) === canon(first), `the same key gave another body: ${j(replay)} vs ${j(first)}`);
    check(outcomesOf(op) === 'succeeded' && usageOf(op) === 'use:confirmed' && await lookupLeft(L1) === before - 1, 'the same key called AI or spent again');
    const examples = [`She has so much ${text}.`, `His ${text} is famous.`];
    const newWord = { lemma: text, pos: 'noun', meaning: first.suggestion.meaning.text, ai_suggestion: true };
    await wantProblem(api('POST', '/v1/quick-add', { as: L1, idem: true, body: { group_id: groups.G9, new_word: { ...newWord,
      examples: [...examples, 'A third one.'] } } }), 400, 'validation-failed', 'three examples (B7E93)');
    const added = await want(api('POST', '/v1/quick-add', { as: L1, idem: true, body: { group_id: groups.G9, new_word: { ...newWord, examples } } }),
      201, 'save the suggestion');
    check(added.created_word === true, `quick-add ${j(added)}`);
    const looked = await want(api('GET', `/v1/lookup?q=${text}`, { as: L1 }), 200, 'lookup page');
    const sense = looked.senses.find((s) => s.sense_id === added.sense_id);
    check(sense && sense.scope === 'private' && sense.ai_suggested === true && j(sense.examples) === j(examples), `word ${j(sense)}`);
    const draft = psql(`SELECT r.draft_source || '|' || cardinality(r.examples) FROM senses s JOIN sense_revisions r ON r.id = s.live_revision_id
      WHERE s.id = '${added.sense_id}'`);
    check(draft === 'ai_suggestion|2', `live revision ${draft}`);
    check(await lookupLeft(L1) === before - 1, 'saving spent a lookup unit');
    suggestion = { text, senseId: added.sense_id, entryId: sense.entry_id, before };
    ok(`"${text}": suggestion noun / "${FAKE.lookupMeaning}", no catalog sense; 1 lookup unit; same key → same body, no call, no unit; 3 examples → 400; saved with 2 examples, draft_source ai_suggestion, ai_suggested true`);
  });

  await step('AC10 (B7E91, B7E92): AI lookup of a catalog lemma, then of the word L1 just saved', async () => {
    check(suggestion, 'AC9 did not save a word');
    const before = await lookupLeft(L1);
    const target = wordsOf('G1')[0];
    const catalog = await want(lookupAi(L1, { text: target.lemma }), 200, 'lookup a catalog lemma');
    check(catalog.catalog_senses.length > 0 && catalog.catalog_senses[0].sense_id === target.senseId && catalog.catalog_senses[0].scope === 'catalog',
      `catalog_senses ${j(catalog.catalog_senses)}`);
    const mine = await want(lookupAi(L1, { text: suggestion.text }), 200, 'lookup the saved word');
    check(mine.catalog_senses.some((s) => s.sense_id === suggestion.senseId && s.scope === 'private'), `catalog_senses ${j(mine.catalog_senses)}`);
    check(await lookupLeft(L1) === before - 2, 'expected 2 lookup units');
    ok(`"${target.lemma}" → catalog_senses [${target.senseId}]; "${suggestion.text}" → catalog_senses has L1's private sense; 2 units`);
  });

  await step('Plan choices 3–4: a lemma-only edit keeps "AI gợi ý"; an examples edit publishes a new revision and drops it', async () => {
    check(suggestion, 'AC9 did not save a word');
    const renamed = `${suggestion.text}x`;
    await want(api('PATCH', `/v1/my-words/${suggestion.entryId}`, { as: L1, idem: true, body: { lemma: renamed } }), 204, 'PATCH lemma');
    let sense = (await want(api('GET', `/v1/lookup?q=${renamed}`, { as: L1 }), 200, 'lookup')).senses.find((s) => s.sense_id === suggestion.senseId);
    check(sense?.ai_suggested === true, `after a lemma edit ${j(sense)}`);
    await want(api('PATCH', `/v1/my-words/${suggestion.entryId}`, { as: L1, idem: true, body: {
      senses: [{ sense_id: suggestion.senseId, examples: ['Only one now.'] }] } }), 204, 'PATCH examples');
    sense = (await want(api('GET', `/v1/lookup?q=${renamed}`, { as: L1 }), 200, 'lookup')).senses.find((s) => s.sense_id === suggestion.senseId);
    const draft = psql(`SELECT r.draft_source FROM senses s JOIN sense_revisions r ON r.id = s.live_revision_id WHERE s.id = '${suggestion.senseId}'`);
    check(sense?.ai_suggested === false && j(sense.examples) === j(['Only one now.']) && draft === 'user', `after an examples edit ${j(sense)} ${draft}`);
    ok('lemma edit → ai_suggested true; examples edit → new revision (draft_source user), ai_suggested false, 1 example');
  });

  await step('AC11 (B7E1, B7E22, đợt cải thiện A C3): Free cloze own opens; AI practice and lookup stay gated', async () => {
    const group = { source: 'group', group_id: groups.GL2 };
    const own = await start(L2, { ...group, types: ['type_word', 'cloze'], cloze_source: 'own' });
    check(own.ai_planned === 0 && own.cloze_source === 'own', `Free own session ${j(own)}`);
    // No final answer: opening and finishing spends none of Free's 3 daily sessions.
    await finish(L2, own.id);
    await wantProblem(startSession(L2, { ...group, types: ['cloze'] }), 403, 'entitlement-required', 'Free, cloze ai');
    await wantProblem(startSession(L2, { ...group, types: ['meaning_in_sentence'] }), 403, 'entitlement-required', 'Free, meaning_in_sentence');
    await wantProblem(lookupAi(L2, { text: 'rizz' }), 403, 'entitlement-required', 'Free, lookup');
    check(count(`SELECT count(*) FROM usage_records WHERE user_id = '${L2.id}' AND pool <> 'practice_sessions'`) === 0, 'a Free refusal held a unit');
    const plain = await start(L2, { ...group, types: ['type_word'] });
    await finish(L2, plain.id);
    ok('cloze own opens (đợt cải thiện A C3); cloze ai, meaning_in_sentence, AI lookup → 403 entitlement-required; no AI usage row; typing alone still opens');
  });

  await step('AC12 (B7E71, B7E72, B7E78): the admin adds, edits and turns off a report reason; L1 sees each list', async () => {
    const code = `smoke_${run}`;
    const list = async (kind) => (await want(api('GET', `/v1/practice/report-reasons?kind=${kind}`, { as: L1 }), 200, `reasons ${kind}`)).items;
    const created = await want(api('POST', '/v1/admin/practice/report-reasons', { as: admin, idem: true, body: {
      code, label_vi: 'Lý do thử', label_en: 'Smoke reason', applies_to: 'ai', note_required: true, refundable: false, position: 8 } }), 201, 'add reason');
    check(created.code === code && created.active === true, `created ${j(created)}`);
    await wantProblem(api('POST', '/v1/admin/practice/report-reasons', { as: admin, idem: true, body: {
      code, label_vi: 'x', label_en: 'x', applies_to: 'ai', note_required: false, refundable: false, position: 9 } }), 409, 'report-reason-exists', 'same code');
    // Editors read the list since the admin round (4c2bfc3, 28/10/2026); writes stay with the admin.
    await want(api('GET', '/v1/admin/practice/report-reasons', { as: editor }), 200, 'editor reads reasons');
    await wantProblem(api('POST', '/v1/admin/practice/report-reasons', { as: editor, idem: true, body: {
      code: `${code}x`, label_vi: 'x', label_en: 'x', applies_to: 'ai', note_required: false, refundable: false, position: 9 } }), 403, 'forbidden', 'editor adds a reason');
    let ai = await list('ai');
    // Position 8 lands after the seed reasons but before "other", which 939cf0e moved to position 1000 (always last).
    check(ai.at(-2)?.code === code && ai.at(-2).label === 'Lý do thử' && ai.at(-2).note_required === true && ai.at(-1)?.code === 'other',
      `ai list ${j(ai)}`);
    check(!(await list('non_ai')).some((r) => r.code === code), 'an ai reason in the non_ai list');
    await wantProblem(report(L1, items.meaning.itemId, { reason: code }), 400, 'validation-failed', 'note_required without a note (B7E72)');
    await want(api('PATCH', `/v1/admin/practice/report-reasons/${code}`, { as: admin, body: { label_vi: 'Lý do đã sửa', applies_to: 'non_ai' } }), 200, 'edit');
    ai = await list('ai');
    const nonAi = await list('non_ai');
    check(!ai.some((r) => r.code === code) && nonAi.some((r) => r.code === code && r.label === 'Lý do đã sửa'), `after edit ai ${j(ai)} non_ai ${j(nonAi)}`);
    await wantProblem(report(L1, items.meaning.itemId, { reason: code, note: 'smoke' }), 400, 'validation-failed', 'a non_ai reason on an AI question (B7E71)');
    await want(api('PATCH', `/v1/admin/practice/report-reasons/${code}`, { as: admin, body: { active: false, applies_to: 'all' } }), 200, 'turn off');
    check(!(await list('ai')).some((r) => r.code === code) && !(await list('non_ai')).some((r) => r.code === code), 'a reason turned off is still listed');
    await wantProblem(report(L1, items.meaning.itemId, { reason: code, note: 'smoke' }), 400, 'validation-failed', 'a reason turned off (B7E71)');
    ok(`"${code}" added (same code → 409, editor → 403) and listed for ai; no note → 400; renamed + moved to non_ai → lists follow; on an AI question → 400; turned off → gone from both lists, report → 400`);
  });

  // =====================================================================================================================
  await step('Review Focus 1 (B7E16, B7E111, B7E112): five next calls at once on one AI slot → one item, one request, one unit', async () => {
    await choose('generate_cloze', 'fake:503-then-ok');
    try {
      const session = await start(L1, { source: 'group', group_id: groups.GR1, types: ['cloze'], count: 2 });
      const results = await Promise.all(Array.from({ length: 5 }, () => nextCall(L1, session.id)));
      check(results.every((r) => r.status === 200), `statuses ${j(results.map((r) => `${r.status} ${r.text}`))}`);
      const states = results.map((r) => r.json.state);
      check(states.every((s) => s === 'question' || s === 'preparing'), `states ${j(states)}`);
      const itemIds = new Set(results.filter((r) => r.json.state === 'question').map((r) => r.json.item.item_id));
      check(itemIds.size === 1, `question replies name ${itemIds.size} items`);
      const made = requestsOf(session.id);
      check(itemsIn(session.id) === 1 && made.length === 1 && made[0].state === 'ready' && usageOf(made[0].id) === 'use:confirmed',
        `items ${itemsIn(session.id)}, requests ${j(made)}, usage ${made[0] && usageOf(made[0].id)}`);
      const follow = await next(L1, session.id);
      check(follow.state === 'question' && itemIds.has(follow.item.item_id), `follow-up next ${j(follow)}`);
      await finish(L1, session.id);
      const tally = states.reduce((acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }), {});
      ok(`5 parallel replies ${j(tally)}, all naming one item; 1 item, 1 request (ready), usage use:confirmed; a later next returns the same item`);
    } finally {
      await choose('generate_cloze', 'fake:ok');
    }
  });

  await step('Review Focus 2 (B7E32, B7E114, B7E65): a generation stuck past the stale time is taken over with the same request id and input; one unit', async () => {
    await choose('generate_cloze', 'fake:slow');
    let first;
    try {
      const session = await start(L1, { source: 'group', group_id: groups.GR2, types: ['cloze'], count: 1 });
      const t0 = Date.now();
      // The first run holds the request: input saved, unit reserved, provider call running (fake:slow, ~10 s) — the state a server
      // that died after step E leaves behind.
      let firstSettledAt = null;
      first = nextCall(L1, session.id).finally(() => { firstSettledAt = Date.now(); });
      const [stuck] = await waitFor(() => rows(`SELECT r.id, r.state, (r.ai_input IS NOT NULL),
        (SELECT coalesce(string_agg(u.kind || ':' || u.status, ','), '') FROM usage_records u WHERE u.operation_id = r.id::text),
        (SELECT count(*) FROM ai_operations o WHERE o.operation_id = r.id::text AND o.status = 'running')
        FROM practice_ai_requests r WHERE r.session_id = '${session.id}'`),
      (found) => found.length === 1 && found[0][1] === 'generating' && found[0][2] === 't' && found[0][3] === 'use:reserved' && found[0][4] === '1',
      'the first run to reach the provider call', 8_000, 200);
      const requestId = stuck[0];
      const input = psql(`SELECT ai_input::text FROM practice_ai_requests WHERE id = '${requestId}'`);
      const current = await want(api('GET', '/v1/practice/sessions/current', { as: L1 }), 200, 'current while generating');
      check(current.item === null && current.preparing === true && outcomesOf(requestId) === '', `current (B7E65) ${j(current)}`);
      await choose('generate_cloze', 'fake:ok');
      psql(`UPDATE practice_ai_requests SET updated_at = now() - interval '3 minutes' WHERE id = '${requestId}'`);
      psql(`UPDATE ai_operations SET deadline_at = now() - interval '1 minute' WHERE operation_id = '${requestId}'`);
      const second = await next(L1, session.id);
      const overlap = Date.now() - t0;
      // The runs overlap when the first request is still waiting on its provider call as the takeover answers. A fixed bound
      // (overlap < 9.5 s) failed on a loaded machine: the time also holds this script's own docker/psql calls.
      check(firstSettledAt === null, `the first run answered ${firstSettledAt - t0} ms after it started, before the takeover (${overlap} ms): the runs did not overlap`);
      check(second.state === 'question' && second.item.type === 'cloze', `takeover next ${j(second)}`);
      const info = itemInfo(second.item.item_id);
      check(info.aiRequestId === requestId && info.aiCharged === true, `question ${j(info)}`);
      const firstRes = await first;
      check(firstRes.status === 200 && firstRes.json.state === 'question' && firstRes.json.item.item_id === second.item.item_id,
        `first next after its provider call timed out: ${firstRes.status} ${firstRes.text}`);
      const made = requestsOf(session.id);
      const calls = outcomesOf(requestId).split(',').sort().join(',');
      check(itemsIn(session.id) === 1 && made.length === 1 && made[0].state === 'ready' && usageOf(requestId) === 'use:confirmed'
        && psql(`SELECT ai_input::text FROM practice_ai_requests WHERE id = '${requestId}'`) === input && calls === 'succeeded,timeout',
      `items ${itemsIn(session.id)}, requests ${j(made)}, usage ${usageOf(requestId)}, calls ${calls}`);
      await finish(L1, session.id);
      ok(`request ${requestId}: stuck generating with a reserved unit; current → item null, preparing true, no call; after back-dating (3 min) the next call took it over with the same id and stored input → cloze in ${overlap} ms; the first run's late timeout left it ready; 1 item, usage use:confirmed, calls timeout + succeeded`);
    } finally {
      if (first) await first.catch(() => {});
      await choose('generate_cloze', 'fake:ok');
    }
  });

  await step('Review Focus 3 (B7E115, CR23, B7E23): a private word deleted between prepare and next leaves no question, request or check of it', async () => {
    const P3 = { lemma: lemma('zp'), meaning: 'chiếc thuyền nhỏ' };
    const added = await want(api('POST', '/v1/quick-add', { as: L1, idem: true, body: { group_id: groups.GR3, new_word: { lemma: P3.lemma, meaning: P3.meaning } } }),
      201, 'quick-add P3');
    P3.senseId = added.sense_id;
    const entryId = psql(`SELECT entry_id FROM senses WHERE id = '${P3.senseId}'`);
    const [other] = wordsOf('GR3');
    const session = await start(L1, { source: 'group', group_id: groups.GR3, types: ['cloze'], count: 2 });
    check(session.ai_planned === 2, `session ${j(session)}`);
    const made = await prepare(L1, session.id);
    check(made.prepared === 2, `prepare ${j(made)}`);
    const of = (table, column = 'sense_id') => count(`SELECT count(*) FROM ${table} WHERE ${column} = '${P3.senseId}'`);
    const p3Request = requestsOf(session.id).find((r) => r.senseId === P3.senseId);
    check(of('practice_questions') === 1 && of('practice_ai_requests') === 1 && psql(`SELECT verdict FROM practice_word_checks WHERE sense_id = '${P3.senseId}'`) === 'ok',
      'before the delete: no question, request or check of P3');
    check(outcomesOf(`${p3Request.id}:wc`) === 'succeeded' && usageOf(`${p3Request.id}:wc`) === '', 'the word check was not called, or held a unit (B7E23)');
    await want(api('DELETE', `/v1/my-words/${entryId}`, { as: L1, idem: true }), 204, 'delete P3');
    check(of('practice_questions') === 0 && of('practice_ai_requests') === 0 && of('practice_word_checks') === 0 && of('practice_session_items') === 0,
      `after the delete: questions ${of('practice_questions')}, requests ${of('practice_ai_requests')}, checks ${of('practice_word_checks')}`);
    const shown = await next(L1, session.id);
    const info = shown.state === 'question' ? itemInfo(shown.item.item_id) : null;
    check(info?.senseId === other.senseId && info.source === 'ai', `next after the delete ${j(shown)}`);
    await finish(L1, session.id);
    ok(`prepare made P3's question (word check ok, no unit for the check) and the other word's; DELETE /v1/my-words → P3's question, request, check and items gone (psql); next asks the other word`);
  });

  await step('Review Focus 4 (B7E75, B7E118): confirming an AI question that was given for free gives no credit', async () => {
    check(items.mcq, 'AC7 did not leave an mcq_sentence item');
    // The fake provider cannot stall a successful call past the reservation, so the free question of B7E12/B7E33 (confirm answered
    // released / not-found, or the server died before confirm) is made by clearing ai_charged on an answered AI question.
    psql(`UPDATE practice_questions SET ai_charged = false WHERE id = '${items.mcq.questionId}'`);
    const before = await aiLeft(L1);
    const created = await want(report(L1, items.mcq.itemId, { reason: 'ai_wrong_meaning' }), 201, 'report');
    const staffRow = (await staffReports()).find((r) => r.id === created.id);
    check(staffRow?.ai_charged === false, `staff row ${j(staffRow)}`);
    const resolved = await want(resolve(editor, created.id, 'confirmed'), 200, 'confirm');
    check(resolved.status === 'confirmed' && resolved.refunded === false, `resolve ${j(resolved)}`);
    check(creditsOf(items.mcq.aiRequestId) === 0 && await aiLeft(L1) === before, 'a free question was refunded');
    ok(`report ${created.id} snapshots ai_charged false; confirmed → refunded false, no credit row, ${before} units unchanged`);
  });

  await step('Review Focus 5 (B7E79, B7E80, §7.8): staff see a private word in an AI option only as a mask; the asked private word only with consent', async () => {
    const P5 = { lemma: lemma('zp'), meaning: 'cánh đồng lúa' };
    const added = await want(api('POST', '/v1/quick-add', { as: L1, idem: true, body: { group_id: groups.GR5, new_word: { lemma: P5.lemma, meaning: P5.meaning } } }),
      201, 'quick-add P5');
    P5.senseId = added.sense_id;
    bySense.set(P5.senseId, { ...P5, private: true });
    const found = { mcq: null, meaning: null, consent: null };
    for (const type of ['mcq_sentence', 'meaning_in_sentence']) {
      const session = await start(L1, { source: 'group', group_id: groups.GR5, types: [type], count: 4 });
      for (let k = 0; k < 4; k += 1) {
        const shown = await next(L1, session.id);
        if (shown.state !== 'question') break;
        check(shown.item.type === type, `${type} asked ${shown.item.type}`);
        const info = itemInfo(shown.item.item_id);
        const word = wordOf(info.senseId);
        if (word.private) {
          check(shown.item.reportable === true, 'an AI question about a private word is not reportable');
          await answer(L1, shown.item.item_id, rightAnswer(shown.item, word));
          if (type === 'mcq_sentence') {
            // Learner UI D12 (GF1): no consent box any more; the report goes through and the team sees the asked word.
            found.consent = (await want(report(L1, shown.item.item_id, { reason: 'ai_sentence_unnatural' }), 201, 'no consent needed (GF1)')).id;
          }
          continue;
        }
        const privateOption = type === 'mcq_sentence' ? shown.item.prompt.options.findIndex((o) => o.startsWith(P5.lemma))
          : shown.item.prompt.options.indexOf(P5.meaning);
        check(privateOption >= 0, `${type} options ${j(shown.item.prompt.options)} lack P5`);
        if (!found[type === 'mcq_sentence' ? 'mcq' : 'meaning']) {
          const res = await answer(L1, shown.item.item_id, { choice: privateOption });
          check(res.result === 'wrong', `choosing P5 ${j(res)}`);
          found[type === 'mcq_sentence' ? 'mcq' : 'meaning'] = (await want(report(L1, shown.item.item_id, { reason: 'ai_wrong_meaning' }), 201, 'report')).id;
        } else {
          await answer(L1, shown.item.item_id, rightAnswer(shown.item, word));
        }
      }
      await finish(L1, session.id);
    }
    check(found.mcq && found.meaning && found.consent, `reports ${j(found)}`);
    const staff = await staffReports();
    const mcqRow = staff.find((r) => r.id === found.mcq);
    const meaningRow = staff.find((r) => r.id === found.meaning);
    const consentRow = staff.find((r) => r.id === found.consent);
    for (const [row, mask] of [[mcqRow, WORD_MASK], [meaningRow, MEANING_MASK]]) {
      const text = j(row);
      check(row && !text.includes(P5.lemma) && !text.includes(P5.meaning) && row.question_snapshot.prompt.options.includes(mask)
        && row.question_snapshot.learner.answer === mask, `staff row ${text}`);
    }
    check(consentRow && consentRow.question_snapshot.correct.lemma === P5.lemma
      && consentRow.question_snapshot.prompt.options.some((o) => o.startsWith(P5.lemma)), `consent row ${j(consentRow)}`);
    ok(`mcq_sentence option P5 → staff see "${WORD_MASK}" (also as the chosen answer); meaning_in_sentence option → "${MEANING_MASK}"; P5 asked: no consent → 400, with consent → staff see P5`);
  });

  let staleQuestion;
  await step('B7E57: a catalog sense revised after its AI question was made ahead → that question is not reused; a new one is made', async () => {
    const [word] = wordsOf('G57');
    const first = await start(L1, { source: 'group', group_id: groups.G57, types: ['cloze'], count: 1 });
    const made = await prepare(L1, first.id);
    check(made.prepared === 1, `prepare ${j(made)}`);
    await finish(L1, first.id);
    const [old] = unseenAi(L1.id).filter((q) => q.senseId === word.senseId);
    check(old, 'no unseen question after prepare + finish');
    const firstRequest = requestsOf(first.id)[0];
    const revisionBefore = psql(`SELECT live_revision_id FROM senses WHERE id = '${word.senseId}'`);
    const revisionNo = Number(psql(`SELECT max(revision_no) FROM sense_revisions WHERE sense_id = '${word.senseId}'`));
    await want(api('POST', `/v1/admin/content/senses/${word.senseId}/quick-publish`, { as: admin, body: {
      revision: revisionNo, content: { definition_en: 'A revised smoke definition.' } } }), 200, 'quick-publish');
    const revisionAfter = psql(`SELECT live_revision_id FROM senses WHERE id = '${word.senseId}'`);
    check(revisionAfter !== revisionBefore, 'the live revision did not change');
    const before = await aiLeft(L1);
    const second = await start(L1, { source: 'group', group_id: groups.G57, types: ['cloze'], count: 1 });
    const shown = await next(L1, second.id);
    const info = itemInfo(shown.item.item_id);
    check(info.questionId !== old.id && info.senseRevisionId === revisionAfter && info.source === 'ai', `question ${j(info)}`);
    check(count(`SELECT count(*) FROM practice_session_items WHERE question_id = '${old.id}'`) === 0, 'the stale question was asked');
    check(await aiLeft(L1) === before - 1, 'the new question did not cost 1 unit');
    await answer(L1, shown.item.item_id, rightAnswer(shown.item, word));
    await finish(L1, second.id);
    staleQuestion = { id: old.id, firstRequestId: firstRequest.id, secondRequestId: requestsOf(second.id)[0]?.id };
    ok(`unseen question ${old.id} made on revision ${revisionBefore}; after quick-publish (live ${revisionAfter}) the next session made a new question (1 unit) and never asked the old one`);
  });

  await step('B7E60 and §12.1: the hourly job keeps an unseen AI question from yesterday, deletes one past history_months, and requests older than 7 days', async () => {
    check(staleQuestion, 'B7E57 did not leave an unseen question');
    const exists = (table, id) => count(`SELECT count(*) FROM ${table} WHERE id = '${id}'`) === 1;
    psql(`UPDATE practice_questions SET created_at = now() - interval '1 day' WHERE id = '${staleQuestion.id}'`);
    maintenance();
    check(exists('practice_questions', staleQuestion.id), 'an unseen AI question from yesterday was deleted (B7E60)');
    const months = (await settings()).values.practice.history_months;
    psql(`UPDATE practice_questions SET created_at = now() - interval '${months} months' - interval '1 day' WHERE id = '${staleQuestion.id}'`);
    psql(`UPDATE practice_ai_requests SET created_at = now() - interval '8 days' WHERE id = '${staleQuestion.firstRequestId}'`);
    maintenance();
    check(!exists('practice_questions', staleQuestion.id), `an unseen AI question older than ${months} months was kept`);
    check(!exists('practice_ai_requests', staleQuestion.firstRequestId), 'a request older than 7 days was kept');
    check(exists('practice_ai_requests', staleQuestion.secondRequestId), 'a recent request was deleted');
    ok(`back-dated 1 day → kept; back-dated ${months} months + 1 day → deleted; request back-dated 8 days → deleted, a recent one kept`);
  });

  await step('B7E117: an operation with no model → a session with its type is 503 ai-unavailable model-not-set and nothing is created', async () => {
    await choose('generate_meaning_question', null);
    try {
      const sessions = () => count(`SELECT count(*) FROM practice_sessions WHERE user_id = '${L1.id}'`);
      const before = sessions();
      const refused = await wantProblem(startSession(L1, { source: 'group', group_id: groups.G117, types: ['meaning_in_sentence'] }), 503,
        'ai-unavailable', 'no model');
      check(refused.reason === 'model-not-set' && sessions() === before, `problem ${j(refused)}`);
      const plain = await start(L1, { source: 'group', group_id: groups.G117, types: ['type_word'] });
      await finish(L1, plain.id);
      ok('503 ai-unavailable, reason model-not-set, no session row; typing alone opens');
    } finally {
      await choose('generate_meaning_question', 'fake:ok');
    }
  });

  await step('B7E98, B7E58, B7E23 (fake:not-recognized): an unrecognised private word falls back with notice word-not-recognized, and has no AI type until edited', async () => {
    const P9 = { lemma: lemma('zp'), meaning: 'con đường làng', private: true };
    const group = await want(api('POST', '/v1/groups', { as: L1, idem: true, body: { name: `G98 ${run}` } }), 201, 'group G98');
    const added = await want(api('POST', '/v1/quick-add', { as: L1, idem: true, body: { group_id: group.id, new_word: { lemma: P9.lemma, meaning: P9.meaning } } }),
      201, 'quick-add P9');
    P9.senseId = added.sense_id;
    bySense.set(P9.senseId, P9);
    const entryId = psql(`SELECT entry_id FROM senses WHERE id = '${P9.senseId}'`);
    const verdict = () => psql(`SELECT verdict FROM practice_word_checks WHERE sense_id = '${P9.senseId}'`);
    await choose('check_private_word', 'fake:not-recognized');
    try {
      const before = await aiLeft(L1);
      const mixed = await start(L1, { source: 'group', group_id: group.id, types: ['type_word', 'cloze'], count: 2 });
      check(mixed.ai_planned === 1 && sessionRow(mixed.id).aiSenseIds[0] === P9.senseId, `session ${j(mixed)}`);
      const shown = await next(L1, mixed.id);
      check(shown.state === 'question' && shown.item.type === 'type_word' && shown.notice === 'word-not-recognized' && shown.sense_id === P9.senseId,
        `next ${j(shown)}`);
      const [request] = requestsOf(mixed.id);
      check(request?.state === 'failed' && request.failure === 'word-not-recognized' && usageOf(request.id) === ''
        && outcomesOf(`${request.id}:wc`) === 'succeeded' && outcomesOf(request.id) === '' && verdict() === 'not_recognized',
      `request ${j(request)}, usage ${request && usageOf(request.id)}, check calls ${request && outcomesOf(`${request.id}:wc`)}, verdict ${verdict()}`);
      await answer(L1, shown.item.item_id, rightAnswer(shown.item, P9));
      await finish(L1, mixed.id);
      await wantProblem(startSession(L1, { source: 'group', group_id: group.id, types: ['cloze'] }), 409, 'practice-no-words',
        'cloze only on the unrecognised word');
      const edited = 'con đường nhỏ';
      await want(api('PATCH', `/v1/my-words/${entryId}`, { as: L1, idem: true, body: { senses: [{ sense_id: P9.senseId, meaning: edited }] } }),
        204, 'edit P9');
      P9.meaning = edited;
      await choose('check_private_word', 'fake:ok');
      const again = await start(L1, { source: 'group', group_id: group.id, types: ['cloze'], count: 1 });
      const shown2 = await next(L1, again.id);
      check(shown2.state === 'question' && shown2.item.type === 'cloze' && verdict() === 'ok', `after the edit ${j(shown2)}, verdict ${verdict()}`);
      await answer(L1, shown2.item.item_id, rightAnswer(shown2.item, P9));
      await finish(L1, again.id);
      check(await aiLeft(L1) === before - 1, 'expected 1 unit (the question after the edit), none for the checks');
      ok('not_recognized → typing with notice word-not-recognized (sense_id), no unit held, verdict stored; cloze only → 409 practice-no-words; after a meaning edit the word is checked again (ok) and gets an AI cloze, 1 unit');
    } finally {
      await choose('check_private_word', 'fake:ok');
    }
  });

  await step('B7E98 with prepare (§6.5 A, §6.6 last row): the check rejects the word during prepare; next switches type with notice word-not-recognized', async () => {
    const P10 = { lemma: lemma('zp'), meaning: 'ngọn đồi thấp', private: true };
    const group = await want(api('POST', '/v1/groups', { as: L1, idem: true, body: { name: `G99 ${run}` } }), 201, 'group G99');
    const added = await want(api('POST', '/v1/quick-add', { as: L1, idem: true, body: { group_id: group.id, new_word: { lemma: P10.lemma, meaning: P10.meaning } } }),
      201, 'quick-add P10');
    P10.senseId = added.sense_id;
    bySense.set(P10.senseId, P10);
    await choose('check_private_word', 'fake:not-recognized');
    try {
      const session = await start(L1, { source: 'group', group_id: group.id, types: ['type_word', 'cloze'], count: 2 });
      check(session.ai_planned === 1, `session ${j(session)}`);
      const made = await prepare(L1, session.id);
      const [request] = requestsOf(session.id);
      check(made.failed === 1 && request?.state === 'failed' && request.failure === 'word-not-recognized', `prepare ${j(made)}, request ${j(request)}`);
      const shown = await next(L1, session.id);
      check(shown.state === 'question' && shown.item.type === 'type_word' && itemInfo(shown.item.item_id).senseId === P10.senseId, `next ${j(shown)}`);
      check(shown.notice === 'word-not-recognized' && shown.sense_id === P10.senseId,
        `notice word-not-recognized with sense_id expected on this reply; got notice ${shown.notice ?? 'none'}, sense_id ${shown.sense_id ?? 'none'}`);
      await answer(L1, shown.item.item_id, rightAnswer(shown.item, P10));
      await finish(L1, session.id);
      ok(`prepare: ${j(made)}, request failed/word-not-recognized; next asks P10 as typing at once, with notice word-not-recognized and sense_id`);
    } finally {
      await choose('check_private_word', 'fake:ok');
    }
  });

  const seconds = Math.round((Date.now() - started) / 1000);
  if (failures.length > 0) {
    console.log(`\nSmoke Bước 7 FAILED: ${failures.length} of ${stepNo} steps did not match (${seconds}s):`);
    for (const f of failures) console.log(`  [${f.step}] ${f.name}\n      ${f.message}`);
    process.exitCode = 1;
  } else {
    console.log(`\nSmoke Bước 7 passed in ${seconds}s (${stepNo} steps).`);
  }
}

main().catch((error) => {
  console.error(`\nSmoke Bước 7 FAILED at step ${stepNo}:\n${error.stack ?? error}`);
  process.exitCode = 1;
});
