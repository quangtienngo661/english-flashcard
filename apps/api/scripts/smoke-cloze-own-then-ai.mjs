// Smoke test for the cloze source "own_then_ai" (owner, 09/11/2026: a word with a saved sentence is asked from it, a word without one gets
// an AI cloze) against a REAL running API + worker. Start them first: `docker compose up -d` (repo root), create the database
// `english_learning_smoke_cloze_mix`, then in this package: `pnpm db:setup && pnpm build && pnpm run:dev` with DATABASE_URL on that database,
// AI_FAKE_ENABLED=true, no OPENAI_API_KEY / ANTHROPIC_API_KEY, TURNSTILE_MODE=fake and JOB_QUEUE_PREFIX=wordmet-cm-smoke, on a fresh
// database; then `pnpm smoke:cloze-own-then-ai` (SMOKE_BASE_URL when the API does not listen on :3000). Needs DATABASE_URL (env, else
// .env), Mailpit and `docker compose -p english-learning` for psql. No real provider is called.
//
// What it checks, with the fake model `fake:ok` for generate_cloze (its sentence is "Lan will ___ it tomorrow."):
//   1. the database accepts the new value (the check on practice_sessions.cloze_source) and the API refuses an unknown one;
//   2. three words, one with a saved sentence: the session plans 2 AI questions; the saved-sentence word is asked from its own sentence
//      (source own_sentence, no AI request, item.ai false), the other two from AI (source ai, item.ai true); only 2 units are spent;
//   3. every word has a saved sentence: nothing is planned, nothing is spent, all three are asked from saved sentences;
//   4. not enough units: a session that needs 2 with 1 left is refused (403 ai-quota-insufficient) before it opens; a Free learner (15 AI
//      units a month since launch prep A) can open the mixed source; the old sources `own` and `ai` behave as before.
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
const QUEUE_PREFIX = 'wordmet-cm-smoke';
const DATABASE = 'english_learning_smoke_cloze_mix';
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
// The words: three catalog verbs in one topic and level, so the learner's group holds exactly these (a fresh database is required).
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(97 + randomInt(26))).join('');
const TOPIC = 'technology';
const LEVEL = 'A1';
const words = [1, 2, 3].map((n) => {
  const base = `zq${letters(6)}`;
  return {
    lemma: base, past: `${base}ed`, third: `${base}s`, meaning: `nghĩa thử ${n}`, definition: `A short smoke definition number ${n}.`,
    example: `They ${base}ed the box yesterday.`, saved: `We ${base}ed the boat today.`, senseId: null,
  };
});
const bySense = (senseId) => {
  const word = words.find((w) => w.senseId === senseId);
  check(word, `sense ${senseId} is none of the script's words`);
  return word;
};

/** What the database kept of one asked item: the word, how the question was made, and whether an AI request stands behind it. */
function itemInfo(itemId) {
  const [row] = rows(`SELECT i.sense_id, q.source, q.type, coalesce(q.ai_request_id::text, '') FROM practice_session_items i
    JOIN practice_questions q ON q.id = i.question_id WHERE i.id = '${itemId}'`);
  check(row, `item ${itemId} not found`);
  const [senseId, source, type, aiRequestId] = row;
  return { senseId, source, type, aiRequestId };
}

async function main() {
  const started = Date.now();
  let admin; let publisher; let L1; let L2; let groupId;

  const start = async (as, body) => (await want(api('POST', '/v1/practice/sessions', { as, idem: true, body }), 201, `start ${j(body)}`)).session;
  const next = (as, sessionId) => want(api('POST', `/v1/practice/sessions/${sessionId}/next`, { as }), 200, 'next');
  const answer = (as, itemId, body) => want(api('POST', `/v1/practice/items/${itemId}/answer`, { as, idem: true, body }), 200, `answer ${j(body)}`);
  const unitsLeft = async (as) => (await want(api('GET', '/v1/me/entitlements', { as }), 200, 'GET /v1/me/entitlements')).pools.ai_practice.remaining;
  const asPublisher = (method, path, { body, idem } = {}) => api(method, path, { as: publisher, body, idem });

  /** Walks a session to its end: asks each word, answers it right, and returns what each asked item was. */
  async function walk(as, sessionId, count) {
    const asked = [];
    for (let i = 0; i < count; i += 1) {
      const shown = await next(as, sessionId);
      check(shown.state === 'question' && shown.item.type === 'cloze', `next ${i + 1}: ${j(shown)}`);
      const info = itemInfo(shown.item.item_id);
      const word = bySense(info.senseId);
      const typed = info.source === 'own_sentence' ? word.past : word.lemma;
      const res = await answer(as, shown.item.item_id, { text: typed });
      check(res.result === 'correct', `answering ${typed} for ${info.source}: ${j(res)}`);
      asked.push({ item: shown.item, info, word, sentence: shown.item.prompt.sentence });
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

  await step('Accounts: admin (CLI grant), a second admin that publishes configs, learner L1 (Pro) and learner L2 (Free)', async () => {
    const adminEmail = `smokecm-admin-${run}@example.com`;
    admin = await registerVerified(adminEmail);
    execFileSync(process.execPath, [built('dist/cli/admin-grant.js'), adminEmail], { stdio: 'pipe', env: CHILD_ENV });
    admin.token = await loginToken(adminEmail);
    const publisherEmail = `smokecm-publisher-${run}@example.com`;
    await want(api('POST', '/v1/admin/users', { as: admin, body: {
      email: publisherEmail, staff_role: 'admin', password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, 'create publisher');
    publisher = { email: publisherEmail, token: await loginToken(publisherEmail) };
    L1 = await registerLearner(`smokecm-l1-${run}@example.com`);
    L2 = await registerLearner(`smokecm-l2-${run}@example.com`);
    ok(`admin ${adminEmail}; publisher ${publisherEmail}; learners ${L1.email} and ${L2.email}`);
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
      as: admin, body: { name: `SmokeCM-${run}`, version: '1.0', license: 'test license', display_priority: 90 } }), 201, 'source');
    const csv = ['headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,inflections',
      ...words.map((w) => `${w.lemma},verb,${LEVEL},${w.meaning},${w.definition},${w.example},${TOPIC},past:${w.past}; third_person:${w.third}`),
    ].join('\r\n');
    const form = new FormData();
    form.set('level_source_id', source.id);
    form.set('file', new Blob([csv], { type: 'text/csv' }), 'smoke-cm.csv');
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

  await step(`Entitlements: L1 Pro with ${AI_UNITS} AI units and 200 sessions a day; L2 stays Free; L1's group holds the three words`, async () => {
    const ends = new Date(Date.now() + 30 * 24 * 3_600_000).toISOString();
    const grant = (body) => want(api('POST', '/v1/admin/entitlements/grants', { as: admin, idem: true, body: { ends_at: ends, ...body } }), 201, `grant ${j(body)}`);
    await grant({ user_id: L1.id, kind: 'plan', plan: 'pro', reason: 'smoke:cloze-own-then-ai' });
    await grant({ user_id: L1.id, kind: 'limits', limits: { ai_practice_per_cycle: AI_UNITS, practice_sessions_per_day: 200 }, reason: 'smoke:cloze-own-then-ai' });
    const group = await want(api('POST', '/v1/groups', { as: L1, idem: true, body: { name: `CM ${run}` } }), 201, 'group');
    const added = await want(api('POST', `/v1/groups/${group.id}/items/bulk`, { as: L1, idem: true, body: { topic: TOPIC, level: LEVEL } }), 200, 'bulk add');
    check(added.added === words.length, `the group got ${added.added} words, expected ${words.length}: run on a fresh database`);
    groupId = group.id;
    const left = await unitsLeft(L1);
    check(left === AI_UNITS, `L1 has ${left} units, expected ${AI_UNITS}`);
    ok(`L1 pro, ${left} AI units; group ${groupId} holds the three words; L2 is Free`);
  }, { fatal: true });

  await step('Source own_then_ai: the database accepts it; an unknown source, and the source without a cloze, are refused with 400', async () => {
    const session = await start(L1, { source: 'group', group_id: groupId, types: ['cloze'], cloze_source: 'own_then_ai', count: 1 });
    check(session.cloze_source === 'own_then_ai', `session ${j(session)}`);
    const [stored] = rows(`SELECT cloze_source FROM practice_sessions WHERE id = '${session.id}'`);
    check(stored?.[0] === 'own_then_ai', `stored ${j(stored)}`);
    await api('POST', `/v1/practice/sessions/${session.id}/finish`, { as: L1 });
    for (const body of [
      { source: 'group', group_id: groupId, types: ['cloze'], cloze_source: 'mixed', count: 1 },
      { source: 'group', group_id: groupId, types: ['type_word'], cloze_source: 'own_then_ai', count: 1 },
    ]) {
      const res = await api('POST', '/v1/practice/sessions', { as: L1, idem: true, body });
      check(res.status === 400, `${j(body)} → ${res.status} ${res.text}`);
    }
    ok(`session ${session.id} stored cloze_source own_then_ai (the CHECK accepts it); "mixed" and own_then_ai without cloze → 400`);
  });

  let first;
  await step('One saved sentence of three: ai_planned 2; the saved-sentence word is asked from it, the other two from AI; 2 units spent', async () => {
    await want(api('POST', `/v1/senses/${words[0].senseId}/sentences`, { as: L1, idem: true, body: { text: words[0].saved } }), 201, 'save a sentence');
    const before = await unitsLeft(L1);
    const session = await start(L1, { source: 'group', group_id: groupId, types: ['cloze'], cloze_source: 'own_then_ai', count: 3 });
    check(session.cloze_source === 'own_then_ai' && session.words === 3 && session.ai_planned === 2, `session ${j(session)}`);
    first = await walk(L1, session.id, 3);
    const own = first.filter((a) => a.info.source === 'own_sentence');
    const ai = first.filter((a) => a.info.source === 'ai');
    check(own.length === 1 && ai.length === 2, `sources ${j(first.map((a) => a.info.source))}`);
    check(own[0].word === words[0] && own[0].info.aiRequestId === '', `the saved-sentence word ${j(own[0].info)}`);
    check(own[0].sentence.includes('___') && !own[0].sentence.includes(words[0].past) && own[0].sentence.startsWith('We '), `own prompt ${own[0].sentence}`);
    check(own[0].item.ai === false && own[0].item.reportable === false, `own item flags ${j({ ai: own[0].item.ai, reportable: own[0].item.reportable })}`);
    for (const a of ai) {
      check(a.sentence === FAKE_SENTENCE && a.info.aiRequestId !== '' && a.word !== words[0], `AI item ${j({ sentence: a.sentence, info: a.info })}`);
      check(a.item.ai === true && a.item.reportable === true, `AI item flags ${j({ ai: a.item.ai, reportable: a.item.reportable })}`);
    }
    const after = await unitsLeft(L1);
    check(before - after === 2, `units went from ${before} to ${after}, expected 2 spent`);
    ok(`asked ${first.map((a) => `${a.word.lemma}:${a.info.source}`).join(', ')}; item.ai ${first.map((a) => a.item.ai).join('/')}; units ${before} → ${after}`);
  });

  await step('Every word has a saved sentence: ai_planned 0, three questions from saved sentences, no unit spent, no AI request', async () => {
    for (const w of words.slice(1)) {
      await want(api('POST', `/v1/senses/${w.senseId}/sentences`, { as: L1, idem: true, body: { text: w.saved } }), 201, `save a sentence for ${w.lemma}`);
    }
    const before = await unitsLeft(L1);
    const session = await start(L1, { source: 'group', group_id: groupId, types: ['cloze'], cloze_source: 'own_then_ai', count: 3 });
    check(session.ai_planned === 0, `session ${j(session)}`);
    const asked = await walk(L1, session.id, 3);
    check(asked.every((a) => a.info.source === 'own_sentence' && a.info.aiRequestId === '' && a.item.ai === false), `asked ${j(asked.map((a) => a.info))}`);
    check(j(sorted(asked.map((a) => a.word.lemma))) === j(sorted(words.map((w) => w.lemma))), `words ${j(asked.map((a) => a.word.lemma))}`);
    const requests = Number(psql(`SELECT count(*) FROM practice_ai_requests WHERE session_id = '${session.id}'`));
    const after = await unitsLeft(L1);
    check(requests === 0 && after === before, `${requests} AI requests; units ${before} → ${after}`);
    ok(`all three words from saved sentences, 0 AI requests, units stay ${after}`);
  });

  await step('Not enough units: two words need AI and L1 has 1 unit → 403 ai-quota-insufficient with remaining 1 and needed 2, before the session opens', async () => {
    // Remove the saved sentences of two words again so that two words need AI, then leave one unit.
    for (const w of words.slice(1)) {
      const ids = (await want(api('GET', `/v1/senses/${w.senseId}/sentences`, { as: L1 }), 200, 'sentences')).items.map((s) => s.id);
      for (const id of ids) await want(api('DELETE', `/v1/sentences/${id}`, { as: L1, idem: true }), 204, 'delete a sentence');
    }
    const used = await unitsLeft(L1) - 1;
    psql(`INSERT INTO usage_records (user_id, pool, operation_id, kind, status, system_date, reserved_at, confirmed_at, plan)
      SELECT '${L1.id}', 'ai_practice', 'smokecm-${run}-' || n, 'use', 'confirmed', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, now(), now(), 'pro'
      FROM generate_series(1, ${used}) AS n`);
    check(await unitsLeft(L1) === 1, `L1 has ${await unitsLeft(L1)} units, expected 1`);
    const refused = await wantProblem(api('POST', '/v1/practice/sessions', { as: L1, idem: true, body: {
      source: 'group', group_id: groupId, types: ['cloze'], cloze_source: 'own_then_ai', count: 3 } }), 403, 'ai-quota-insufficient', 'two AI words with one unit');
    check(refused.remaining === 1 && refused.needed === 2, `problem ${j(refused)}`);
    ok(`needed ${refused.needed}, remaining ${refused.remaining}: refused before the session opened`);
  });

  await step('A Free learner (15 AI units a month) opens the mixed source and plans AI for words without a saved sentence; the old sources behave as before', async () => {
    const e = await want(api('GET', '/v1/me/entitlements', { as: L2 }), 200, 'L2 entitlements');
    check(e.plan === 'free' && e.features['ai.practice'].allowed === true && e.pools.ai_practice.limit === 15 && e.pools.ai_practice.remaining === 15,
      `L2 ${j({ plan: e.plan, feature: e.features['ai.practice'], pool: e.pools.ai_practice })}`);
    const group = await want(api('POST', '/v1/groups', { as: L2, idem: true, body: { name: `CM free ${run}` } }), 201, 'L2 group');
    await want(api('POST', `/v1/groups/${group.id}/items/bulk`, { as: L2, idem: true, body: { topic: TOPIC, level: LEVEL } }), 200, 'bulk add');
    const free = await start(L2, { source: 'group', group_id: group.id, types: ['cloze'], cloze_source: 'own_then_ai', count: 3 });
    check(free.cloze_source === 'own_then_ai' && free.ai_planned === 3, `Free mixed ${j(free)}`);
    // Back to L1 with plenty of units: 'own' plans nothing, 'ai' plans three.
    psql(`DELETE FROM usage_records WHERE user_id = '${L1.id}' AND operation_id LIKE 'smokecm-${run}-%'`);
    const own = await start(L1, { source: 'group', group_id: groupId, types: ['cloze'], cloze_source: 'own', count: 3 });
    check(own.cloze_source === 'own' && own.ai_planned === 0, `own ${j(own)}`);
    const ai = await start(L1, { source: 'group', group_id: groupId, types: ['cloze'], cloze_source: 'ai', count: 3 });
    check(ai.cloze_source === 'ai' && ai.ai_planned === 3, `ai ${j(ai)}`);
    ok('L2 Free (feature allowed, 15/15 units) with own_then_ai → opens, ai_planned 3 (no saved sentence); L1 own → ai_planned 0; ai → ai_planned 3');
  });

  const seconds = Math.round((Date.now() - started) / 1000);
  if (failures.length > 0) {
    console.log(`\nSmoke cloze own_then_ai FAILED: ${failures.length} of ${stepNo} steps did not match (${seconds}s):`);
    for (const f of failures) console.log(`  [${f.step}] ${f.name}\n      ${f.message}`);
    process.exitCode = 1;
  } else {
    console.log(`\nSmoke cloze own_then_ai passed in ${seconds}s (${stepNo} steps).`);
  }
}

main().catch((error) => {
  console.error(`\nSmoke cloze own_then_ai FAILED at step ${stepNo}:\n${error.stack ?? error}`);
  process.exitCode = 1;
});
