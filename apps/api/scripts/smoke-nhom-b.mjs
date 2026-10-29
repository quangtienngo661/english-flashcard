// Smoke test for nhóm B (AI quality round: golden set, config lifecycle, judge, real questions, dashboard, D7/D30) against a REAL running API +
// worker (design §13; plan `docs/superpowers/plans/2026-10-29-nhom-b.md`, contract §7). Start them first: `docker compose up -d` (repo root), create the
// database `english_learning_smoke_nb`, then in this package: `pnpm db:setup && pnpm build && pnpm run:dev` with DATABASE_URL on that database,
// AI_FAKE_ENABLED=true, no OPENAI_API_KEY / ANTHROPIC_API_KEY and JOB_QUEUE_PREFIX=wordmet-nb-smoke, on a fresh database; then `pnpm smoke:nhom-b`
// (SMOKE_BASE_URL when the API does not listen on :3000). Needs DATABASE_URL (env, else .env), Mailpit, and `docker compose -p english-learning` for
// psql. No real provider is called.
//
// Shape: `setup()` makes the first admin, the fake models and one catalog verb import (it chooses no model: since M2 a model comes from a config,
// `partM1()` through drafts it never publishes, `partM2()` through publishes); each milestone adds one `partM<n>()`
// (contract §7). The `ai.test` limit is 20 uses per hour per user and every eval run and prompt test uses one, so `setup()`, `partM1()` and
// `partM2()` run as the first admin (M1 uses 5 of the 20, M2 uses 6) and every later part as a new admin made with `POST /v1/admin/users`
// (staff_role admin: no registration spent). The steps of `partM2()` that race two requests or time one against a running eval run send them as
// a second admin with a fresh `user.write` budget (30 a minute per user): a 429 wait would otherwise serialize the race or outlast the run.
// A failing step is reported and the run goes on with the next one; the exit code is 0 only when every step matched.
import { execFile, execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { rollbackConfig, turnOff } from './ai-config-publish.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-Test-Pass-9!';
const QUEUE_PREFIX = 'wordmet-nb-smoke';
const run = randomUUID().slice(0, 8);

// SMOKE_IGNORE_ENV_FILE=1: the API under test was started from exported variables, not from a .env that may hold real keys.
const fileEnv = !process.env.SMOKE_IGNORE_ENV_FILE && existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
if (!process.env.DATABASE_URL && fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
// The CLIs read .env and a variable in their environment wins; the smoke sets both below, so it only refuses a .env that would
// make its own children disagree with the API it expects.
for (const [key, want] of [['AI_FAKE_ENABLED', 'true'], ['JOB_QUEUE_PREFIX', QUEUE_PREFIX]]) {
  const value = process.env[key] ?? fileEnv[key];
  if (value !== undefined && value !== want) throw new Error(`${key} is ${value}; the smoke needs ${want} (env or .env) and the API alike.`);
}
for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']) {
  if (process.env[key] || fileEnv[key]) throw new Error(`${key} is set: the smoke runs with the fake provider only.`);
}
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (DB_NAME !== 'english_learning_smoke_nb') throw new Error(`DATABASE_URL names ${DB_NAME}; the smoke runs on english_learning_smoke_nb only (fresh).`);
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

/** One request; waits out a 429 (user.write 30/min) and retries with the same Idempotency-Key. */
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
/** A psql statement started in the background; resolves with its output when it ends. */
function psqlLater(sql) {
  return new Promise((resolve, reject) => {
    execFile('docker', ['compose', '-p', 'english-learning', 'exec', '-T', 'postgres', 'psql', '-U', 'dev', '-d', DB_NAME,
      '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql], { encoding: 'utf8' }, (error, stdout) => (error ? reject(error) : resolve(stdout.trim())));
  });
}
const count = (sql) => Number(psql(sql));

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

// ---------------------------------------------------------------------------------------------------------------------
// Words: four verbs W1–W4 in the catalog (`zq<6 letters>`, past `<w>ed`, third person `<w>s`) and N, a word the catalog does not have.
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(97 + randomInt(26))).join('');
const WORDS = Array.from({ length: 4 }, () => `zq${letters(6)}`);
const [W1, W2, W3, W4] = WORDS;
const N = `nq${letters(6)}`;
const clozeData = (word) => ({ word, part_of_speech: 'verb', level: 'A2', meaning_vi: 'hoàn thành', context_label: null });
const catalogForms = (word) => sorted([word, `${word}ed`, `${word}s`]);

// ---------------------------------------------------------------------------------------------------------------------
// Shared state of the run.
const S = { admin: null, adminId: null, admin2: null, models: new Map() };
const asAdmin = (method, path, options = {}) => api(method, path, { as: S.admin, ...options });
const asOther = (method, path, options = {}) => api(method, path, { as: S.admin2, ...options });

async function addModel(modelId) {
  if (S.models.has(modelId)) return S.models.get(modelId);
  const view = await want(asAdmin('POST', '/v1/admin/ai/models', { body: { provider: 'fake', model_id: modelId } }), 201, `add ${modelId}`);
  S.models.set(modelId, view);
  return view;
}
// Config drafts (nhóm B M2): an operation's model, prompt and limits come from a config; the smoke gives one a model through its draft
// (`partM1()`, never published) or through a publish (`partM2()`).
const OPERATIONS = ['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'];
const configsOf = (op) => want(asAdmin('GET', `/v1/admin/ai/configs/${op}`), 200, `GET configs of ${op}`);
const createDraft = (op) => want(asAdmin('POST', `/v1/admin/ai/configs/${op}/draft`, { body: {} }), 201, `create the ${op} draft`);
/** The body that saves `draft` as it is except for `changes`; `expected_version` is the draft's own version. */
const draftBody = (draft, changes = {}) => ({
  expected_version: draft.version, instructions: draft.instructions, examples: draft.examples, model_ref: draft.model?.id ?? null,
  effort: draft.effort, thinking: draft.thinking, max_output_tokens: draft.max_output_tokens, note: draft.note, ...changes,
});
const saveDraft = (op, draft, changes) => want(asAdmin('PUT', `/v1/admin/ai/configs/${op}/draft`, { body: draftBody(draft, changes) }), 200, `save the ${op} draft`);
/** Saves the draft of `op` as the server holds it now, with the model `modelId` (`null` = no model); returns the saved draft. */
async function setDraftModel(op, modelId) {
  const { draft } = await configsOf(op);
  check(draft, `${op} has no draft`);
  return saveDraft(op, draft, { model_ref: modelId === null ? null : (await addModel(modelId)).id });
}
const checkOf = (op) => want(asAdmin('GET', `/v1/admin/ai/configs/${op}/publish-check`), 200, `GET publish-check of ${op}`);
/** What the publish check names, sent back as a publish; `changes` overrides single keys. */
const publishBody = (pc, changes = {}) => ({
  expected_version: pc.draft.version, candidate_run_id: pc.candidate_run_id, baseline_run_id: pc.baseline.run_id, acknowledge_warnings: false, ...changes,
});
const publishDraft = (op, body) => asAdmin('POST', `/v1/admin/ai/configs/${op}/publish`, { body });

// Learner calls go through `pnpm ai:fake-call` (dist/cli/ai-fake-call.js) as smoke-buoc-6.mjs does: the gateway runs on the live config in its own
// process. The AppLogger writes JSON lines to stdout too, so only the lines whose kind is `ai_fake_call` are read.
const LEARNER = randomUUID();
function learnerCall(op = 'generate_cloze', data = clozeData(`zq${letters(6)}`)) {
  const out = execFileSync(process.execPath, [built('dist/cli/ai-fake-call.js'), op, '--user', LEARNER, '--data', j(data)], { encoding: 'utf8', env: CHILD_ENV });
  const lines = out.split(/\r?\n/).filter((line) => line.startsWith('{')).map((line) => JSON.parse(line)).filter((line) => line.kind === 'ai_fake_call');
  check(lines.length === 1, `ai:fake-call printed ${lines.length} result lines`);
  return lines[0].result;
}

const startRun = (body) => asAdmin('POST', '/v1/admin/ai/eval/runs', { idem: true, body });
async function runAndWait(body) {
  const created = await want(startRun(body), 202, `start run ${j(body)}`);
  return waitFor(() => want(asAdmin('GET', `/v1/admin/ai/eval/runs/${created.run_id}`), 200, 'GET run'),
    (row) => row.status === 'finished' || row.status === 'failed', `run ${created.run_id} finishing`, 60_000);
}
const runItems = (runId) => want(asAdmin('GET', `/v1/admin/ai/eval/runs/${runId}/items`), 200, 'GET run items');
const listExamples = async (operation = 'generate_cloze') => (await want(asAdmin('GET', `/v1/admin/ai/eval/examples?operation=${operation}`), 200, 'list examples')).items;
const listSets = async (operation = 'generate_cloze') => (await want(asAdmin('GET', `/v1/admin/ai/eval/sets?operation=${operation}`), 200, 'list sets')).items;
const callsOf = async (operationId) => (await want(asAdmin('GET', `/v1/admin/ai/calls?operation_id=${operationId}`), 200, 'GET calls')).items;
const formsOf = (word, partOfSpeech = 'verb') => want(asAdmin('GET', `/v1/admin/ai/eval/examples/forms?word=${word}&part_of_speech=${partOfSpeech}`), 200, 'GET forms');

// ---------------------------------------------------------------------------------------------------------------------
async function setup() {
  await step('Wait for the API', async () => {
    await waitFor(async () => {
      try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; }
    }, Boolean, `API at ${BASE}`, 20_000);
    ok(`reachable at ${BASE}; database ${DB_NAME}; children run with AI_FAKE_ENABLED=true, JOB_QUEUE_PREFIX=${QUEUE_PREFIX}, no key`);
  }, { fatal: true });

  await step('Admin (registered, then granted by the CLI)', async () => {
    const email = `smokenb-admin-${run}@example.com`;
    S.admin = await registerVerified(email);
    execFileSync(process.execPath, [built('dist/cli/admin-grant.js'), email], { stdio: 'pipe', env: CHILD_ENV });
    S.admin.token = await loginToken(email);
    S.adminId = (await want(asAdmin('GET', '/v1/me'), 200, 'admin profile')).id;
    ok(`admin ${email} (${S.adminId})`);
  }, { fatal: true });

  await step('AI setup: fake provider on, fake:ok and fake:bad-form added (no model is chosen: the operations have none until a config is published)', async () => {
    const status = await want(asAdmin('GET', '/v1/admin/ai/status'), 200, 'AI status');
    check(status.providers.fake === true && status.providers.openai === false && status.providers.anthropic === false,
      `providers ${j(status.providers)}: start the API with AI_FAKE_ENABLED=true and no key`);
    for (const model of ['fake:ok', 'fake:bad-form']) await addModel(model);
    ok('providers: fake only; models fake:ok and fake:bad-form');
  }, { fatal: true });

  await step(`Content: import ${WORDS.length} catalog verbs (past -ed, third person -s) and publish`, async () => {
    const source = await want(asAdmin('POST', '/v1/admin/content/sources', {
      body: { name: `SmokeNb-${run}`, version: '1.0', license: 'test license', display_priority: 90 } }), 201, 'source');
    const csv = ['headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,inflections',
      ...WORDS.map((w, i) => `${w},verb,B1,nghĩa thử ${i + 1},A short smoke definition number ${i + 1}.,They ${w}ed the box yesterday.,technology,past:${w}ed; third_person:${w}s`),
    ].join('\r\n');
    const form = new FormData();
    form.set('level_source_id', source.id);
    form.set('file', new Blob([csv], { type: 'text/csv' }), 'smokenb.csv');
    const accepted = await want(asAdmin('POST', '/v1/admin/content/uploads', { idem: true, form }), 202, 'upload');
    const batch = await waitFor(() => want(asAdmin('GET', `/v1/admin/content/uploads/${accepted.batch_id}`), 200, 'batch'),
      (b) => b.status !== 'queued' && b.status !== 'running', 'import batch', 60_000, 500);
    check(batch.counters.created === WORDS.length && batch.counters.rejected === 0, `import counters ${j(batch.counters)}`);
    const job = await want(asAdmin('POST', '/v1/admin/content/senses/publish-jobs', { idem: true, body: { filter: { batch_id: accepted.batch_id } } }), 202, 'publish job');
    const published = await waitFor(() => want(asAdmin('GET', `/v1/admin/content/senses/publish-jobs/${job.job_id}`), 200, 'job'),
      (x) => x.status !== 'queued' && x.status !== 'running', 'publish job', 60_000, 500);
    check(published.status === 'succeeded', `publish job ${j(published)}`);
    const live = count(`SELECT count(*) FROM entries e JOIN senses s ON s.entry_id = e.id WHERE e.scope = 'catalog'
      AND e.lemma IN (${WORDS.map((w) => `'${w}'`).join(',')}) AND s.live_revision_id IS NOT NULL`);
    check(live === WORDS.length, `${live} of ${WORDS.length} words have a live sense`);
    ok(`batch ${accepted.batch_id}: ${WORDS.length} created and published; ${N} is not in the catalog`);
  }, { fatal: true });
}

// =====================================================================================================================
// M1 — golden set (design K1, plan M1-T18).
async function partM1() {
  const ids = {};
  let version1;
  let okRun;
  let badRun;
  let workingRun;

  await step('M1.1 forms of the catalog (B2): the three forms of W1 by part of speech and unspecified; null for a word the catalog lacks', async () => {
    const verb = await formsOf(W1, 'verb');
    const any = await formsOf(W1, 'unspecified');
    const missing = await formsOf(N, 'verb');
    check(j(sorted(verb.forms ?? [])) === j(catalogForms(W1)), `forms ${j(verb)}`);
    check(j(sorted(any.forms ?? [])) === j(catalogForms(W1)), `forms (unspecified) ${j(any)}`);
    check(missing.forms === null, `forms of the unknown word ${j(missing)}`);
    ok(`${W1}: ${verb.forms.join(', ')}; unspecified the same; ${N} → null`);
  });

  await step('M1.2 B2, B3, E10: an example without expected → 422; W1, W2, N, W3, W4 land held-out, dev, dev, dev, held-out; a held-out one lists only { id, split }', async () => {
    const refused = await wantProblem(asAdmin('POST', '/v1/admin/ai/eval/examples', { body: { operation: 'generate_cloze', input: clozeData(W1) } }),
      422, 'expected-invalid', 'create without expected');
    check(j(refused.violations) === j(['expected: required for generate_cloze']), `violations ${j(refused.violations)}`);
    check(count(`SELECT count(*) FROM ai_eval_examples WHERE operation = 'generate_cloze'`) === 0, 'a refused example was stored');
    const words = [W1, W2, N, W3, W4];
    const splits = [];
    for (const word of words) {
      const forms = word === N ? [N] : (await formsOf(word)).forms;
      const created = await want(asAdmin('POST', '/v1/admin/ai/eval/examples', {
        body: { operation: 'generate_cloze', input: clozeData(word), expected: { forms } } }), 201, `create ${word}`);
      ids[word] = created.id;
      splits.push(created.split);
      if (created.split === 'held_out') check(j(Object.keys(created).sort()) === j(['id', 'split']), `a held-out example was echoed: ${j(created)}`);
    }
    check(j(splits) === j(['held_out', 'dev', 'dev', 'dev', 'held_out']), `splits ${j(splits)}`);
    const list = await listExamples();
    const heldOut = list.filter((row) => row.split === 'held_out');
    check(heldOut.length === 2 && heldOut.every((row) => j(Object.keys(row).sort()) === j(['id', 'split'])), `held-out rows ${j(heldOut)}`);
    check(heldOut.map((row) => row.id).sort().join() === [ids[W1], ids[W4]].sort().join(), `held-out ids ${j(heldOut)}`);
    ok(`splits ${splits.join(', ')}; the list shows only { id, split } for ${W1} and ${W4}`);
  });

  await step('M1.3 B1, B37: freezing is refused without expected / held-out; version 1 has 3 dev + 2 held-out; two admins at once never share a version', async () => {
    const stray = randomUUID();
    psql(`INSERT INTO ai_eval_examples (id, operation, input, created_by, split) VALUES ('${stray}', 'generate_cloze',
      '${j(clozeData(`zq${letters(6)}`))}'::jsonb, '${S.adminId}', 'dev')`);
    const incomplete = await wantProblem(asAdmin('POST', '/v1/admin/ai/eval/sets', { body: { operation: 'generate_cloze' } }), 422, 'eval-set-incomplete', 'freeze incomplete');
    check(j(incomplete.missing_expected) === j([stray]) && incomplete.no_held_out === false, `incomplete ${j(incomplete)}`);
    psql(`DELETE FROM ai_eval_examples WHERE id = '${stray}'`);
    version1 = await want(asAdmin('POST', '/v1/admin/ai/eval/sets', { body: { operation: 'generate_cloze' } }), 201, 'freeze');
    check(version1.version === 1 && version1.dev_count === 3 && version1.held_out_count === 2 && version1.revealed_count === 0, `version ${j(version1)}`);

    // B37: another transaction holds version 2 for 3 s, so the API's insert waits for it and then meets the unique index.
    const holder = psqlLater(`BEGIN; INSERT INTO ai_eval_sets (operation, version, held_out_ratio, frozen_by) VALUES ('generate_cloze', 2, 0.3, '${S.adminId}');
      SELECT pg_sleep(3); COMMIT;`);
    await sleep(500);
    await wantProblem(asAdmin('POST', '/v1/admin/ai/eval/sets', { body: { operation: 'generate_cloze' } }), 409, 'eval-set-conflict', 'freeze against a held version');
    await holder;
    psql(`DELETE FROM ai_eval_sets WHERE operation = 'generate_cloze' AND version = 2`);
    const both = await Promise.all([1, 2].map(() => asAdmin('POST', '/v1/admin/ai/eval/sets', { body: { operation: 'generate_cloze' } })));
    check(both.every((res) => res.status === 201 || res.status === 409), `parallel freezes ${both.map((r) => r.status).join(', ')}`);
    check(both.some((res) => res.status === 201), 'no parallel freeze succeeded');
    const versions = (await listSets()).map((set) => set.version);
    check(new Set(versions).size === versions.length && versions.includes(1), `versions ${j(versions)}`);
    ok(`version 1: 3 dev, 2 held-out; stray example refused with its id; a held version 2 → 409 eval-set-conflict; two parallel freezes (${both.map((r) => r.status).join(', ')}) → versions ${versions.join(', ')}`);
  });

  await step('M1.4 B3, B8, B9: a generate_cloze draft on fake:ok runs on version 1 and on the working set; rule and expected results; held-out only as numbers', async () => {
    const created = await createDraft('generate_cloze');
    check(created.status === 'draft' && created.version === 0 && created.model === null, `new draft ${j({ status: created.status, version: created.version, model: created.model })}`);
    const draft = await setDraftModel('generate_cloze', 'fake:ok');
    check(draft.version === 1 && draft.model?.model_id === 'fake:ok', `saved draft ${j({ version: draft.version, model: draft.model })}`);
    okRun = await runAndWait({ operation: 'generate_cloze', config: 'draft', set_id: version1.id });
    workingRun = await runAndWait({ operation: 'generate_cloze', config: 'draft' });
    check(okRun.status === 'finished' && okRun.complete === true && okRun.set_id === version1.id && okRun.set_version === 1 && okRun.total === 5, `run ${j(okRun)}`);
    check(okRun.config_id === draft.id && okRun.config_version === draft.version && okRun.config_number === draft.number && workingRun.config_id === draft.id, `config of the runs ${j({ ok: okRun.config_id, version: okRun.config_version, number: okRun.config_number, working: workingRun.config_id })}`);
    check(workingRun.status === 'finished' && workingRun.set_id === null && workingRun.set_version === null, `working run ${j(workingRun)}`);
    const { items, stats } = await runItems(okRun.id);
    const byWord = new Map(items.map((item) => [item.input.word, item]));
    check(j([...byWord.keys()].sort()) === j([W2, N, W3].sort()), `dev items ${j([...byWord.keys()])}`);
    for (const word of [W2, W3]) {
      check(byWord.get(word).rule.status === 'pass' && byWord.get(word).expected_result === 'pass', `${word} ${j(byWord.get(word))}`);
    }
    check(byWord.get(N).rule.status === 'skipped' && byWord.get(N).rule.reason === 'not-in-catalog' && byWord.get(N).expected_result === 'pass', `${N} ${j(byWord.get(N))}`);
    check(stats.held_out.total === 2 && stats.dev.total === 3, `stats ${j(stats)}`);
    check(okRun.items.every((item) => item.input.word !== W1 && item.input.word !== W4) && okRun.items.length === 3, `GET run items ${j(okRun.items.map((i) => i.input?.word))}`);
    ok(`version run complete (5 items, held-out only as stats.held_out.total ${stats.held_out.total}); ${W2}/${W3} rule pass, ${N} skipped/not-in-catalog (B8), expected pass; GET run lists no ${W1}/${W4}`);
  });

  await step('M1.5 D11, B10: fake:bad-form fails the rules and the expected answers; the comparison lists the dev regressions and counts the held-out ones; the working set cannot be compared', async () => {
    const badDraft = await setDraftModel('generate_cloze', 'fake:bad-form');
    check(badDraft.version === 2 && badDraft.model?.model_id === 'fake:bad-form', `bad-form draft ${j({ version: badDraft.version, model: badDraft.model })}`);
    try {
      badRun = await runAndWait({ operation: 'generate_cloze', config: 'draft', set_id: version1.id });
    } finally {
      await setDraftModel('generate_cloze', 'fake:ok');
    }
    check(badRun.config_id === okRun.config_id && badRun.config_version === 2, `bad run config ${j({ id: badRun.config_id, version: badRun.config_version })}`);
    const { items } = await runItems(badRun.id);
    const byWord = new Map(items.map((item) => [item.input.word, item]));
    for (const word of [W2, W3]) {
      const item = byWord.get(word);
      check(item.rule.status === 'fail' && item.rule.problems.includes(`unknown-form:${word}ment`) && item.expected_result === 'fail', `${word} ${j(item)}`);
    }
    const compared = await want(asAdmin('GET', `/v1/admin/ai/eval/runs/compare?a=${okRun.id}&b=${badRun.id}`), 200, 'compare');
    const regressed = compared.regressions.dev.map((entry) => entry.input.word).sort();
    check(j(regressed) === j([W2, N, W3].sort()) && compared.regressions.held_out === 2, `regressions ${j(compared.regressions)}`);
    check(compared.regressions.dev.every((entry) => entry.failed.includes('expected')), `failed criteria ${j(compared.regressions.dev)}`);
    await wantProblem(asAdmin('GET', `/v1/admin/ai/eval/runs/compare?a=${okRun.id}&b=${workingRun.id}`), 409, 'eval-set-mismatch', 'compare with a working-set run');
    const self = await want(asAdmin('GET', `/v1/admin/ai/eval/runs/compare?a=${okRun.id}&b=${okRun.id}`), 200, 'compare with itself');
    check(self.regressions.dev.length === 0 && self.regressions.held_out === 0, `self ${j(self.regressions)}`);
    ok(`bad-form: ${W2}/${W3} rule fail unknown-form:<w>ment, expected fail; regressions dev ${regressed.join(', ')}, held-out 2; set mismatch → 409; a run against itself → none`);
  });

  await step('M1.6 B6, R7: the calls page shows the content of a dev example and hides the content of a held-out one', async () => {
    const dev = await callsOf(`eval-${okRun.id}-${ids[W2]}`);
    check(dev.length >= 1 && dev[0].held_out === false && dev[0].content?.request && dev[0].content?.response, `dev call ${j(dev)}`);
    const hidden = await callsOf(`eval-${okRun.id}-${ids[W1]}`);
    check(hidden.length >= 1 && hidden.every((call) => call.held_out === true && call.content === null), `held-out call ${j(hidden)}`);
    ok(`eval-<run>-${W2}: content shown; eval-<run>-${W1}: held_out true, content null`);
  });

  await step('M1.7 B7, Review focus 3: a draft test takes dev examples only; a held-out id is refused', async () => {
    const body = {};
    const tested = await want(asAdmin('POST', '/v1/admin/ai/configs/generate_cloze/draft/test', { body }), 200, 'draft test');
    check(tested.items.length === 3 && j(tested.items.map((item) => item.input.word).sort()) === j([W2, N, W3].sort()), `test inputs ${j(tested.items.map((i) => i.input.word))}`);
    const refused = await wantProblem(asAdmin('POST', '/v1/admin/ai/configs/generate_cloze/draft/test', { body: { ...body, example_ids: [ids[W1]] } }), 400, 'validation-failed', 'test a held-out id');
    check(j(refused.violations) === j(['example_ids: every id must be a dev example of generate_cloze']), `violations ${j(refused.violations)}`);
    ok(`3 items (${[W2, N, W3].join(', ')}); example_ids with a held-out id → 400`);
  });

  await step('M1.8 B4: revealing a held-out example moves it to dev, shows its calls, counts on its versions; revealing a deleted one reads its snapshot', async () => {
    const shown = await want(asAdmin('POST', `/v1/admin/ai/eval/examples/${ids[W1]}/reveal`), 200, 'reveal W1');
    check(shown.split === 'dev' && shown.input.word === W1 && shown.deleted === false && shown.revealed_at, `reveal ${j(shown)}`);
    const row = (await listExamples()).find((example) => example.id === ids[W1]);
    check(row.split === 'dev' && row.revealed_at && row.input.word === W1, `list row ${j(row)}`);
    const v1 = (await listSets()).find((set) => set.version === 1);
    check(v1.revealed_count === 1, `version 1 ${j(v1)}`);
    const calls = await callsOf(`eval-${okRun.id}-${ids[W1]}`);
    check(calls.length >= 1 && calls[0].held_out === false && calls[0].content?.request, `calls after reveal ${j(calls)}`);
    await wantProblem(asAdmin('POST', `/v1/admin/ai/eval/examples/${ids[W1]}/reveal`), 409, 'example-not-held-out', 'reveal again');
    await want(asAdmin('DELETE', `/v1/admin/ai/eval/examples/${ids[W4]}`), 204, 'delete W4');
    const gone = await want(asAdmin('POST', `/v1/admin/ai/eval/examples/${ids[W4]}/reveal`), 200, 'reveal deleted W4');
    check(gone.deleted === true && gone.input.word === W4 && gone.note === null, `reveal deleted ${j(gone)}`);
    const after = (await listSets()).find((set) => set.version === 1);
    check(after.revealed_count === 2, `version 1 after ${j(after)}`);
    const detail = await want(asAdmin('GET', `/v1/admin/ai/eval/sets/${version1.id}`), 200, 'set detail');
    const w4 = detail.items.find((item) => item.example_id === ids[W4]);
    check(w4.in_working_set === false && w4.revealed_at && w4.input.word === W4, `set item ${j(w4)}`);
    ok(`${W1} → dev with revealed_at, its calls show content, version 1 revealed_count 1; again → 409; ${W4} deleted then revealed from its snapshot (deleted true), revealed_count 2`);
  });

  await step('M1.9 B5: editing a dev example changes neither the frozen version nor an earlier run', async () => {
    const before = (await want(asAdmin('GET', `/v1/admin/ai/eval/sets/${version1.id}`), 200, 'set detail')).items.find((item) => item.example_id === ids[W2]);
    check(j(sorted(before.expected.forms)) === j(catalogForms(W2)), `frozen expected ${j(before.expected)}`);
    await want(asAdmin('PATCH', `/v1/admin/ai/eval/examples/${ids[W2]}`, { body: { expected: { forms: [W2] } } }), 200, 'patch W2');
    const set = (await want(asAdmin('GET', `/v1/admin/ai/eval/sets/${version1.id}`), 200, 'set detail')).items.find((item) => item.example_id === ids[W2]);
    check(j(sorted(set.expected.forms)) === j(catalogForms(W2)), `frozen expected after the edit ${j(set.expected)}`);
    const item = (await runItems(okRun.id)).items.find((entry) => entry.example_id === ids[W2]);
    check(j(sorted(item.expected.forms)) === j(catalogForms(W2)), `run item expected after the edit ${j(item.expected)}`);
    const live = (await listExamples()).find((example) => example.id === ids[W2]);
    check(j(live.expected) === j({ forms: [W2] }), `working example ${j(live.expected)}`);
    ok(`${W2}: the working example now accepts only ${W2}; version 1 and the finished run still hold ${catalogForms(W2).join(', ')}`);
  });

  await step('M1.10 B9: a check_private_word draft on fake:ok runs one example (bulk, dev) of the working set: rule not applicable, expected pass', async () => {
    await createDraft('check_private_word');
    const draft = await setDraftModel('check_private_word', 'fake:ok');
    check(draft.version === 1 && draft.model?.model_id === 'fake:ok', `draft ${j({ version: draft.version, model: draft.model })}`);
    const added = await want(asAdmin('POST', '/v1/admin/ai/eval/examples/bulk', { body: {
      operation: 'check_private_word',
      rows: [{ input: { word: 'rizz', part_of_speech: 'noun', meaning_vi: 'sức hút' }, expected: { verdict: 'ok' }, split: 'dev' }],
    } }), 200, 'bulk private word');
    check(added.created === 1 && added.invalid.length === 0, `bulk ${j(added)}`);
    const finished = await runAndWait({ operation: 'check_private_word', config: 'draft' });
    check(finished.status === 'finished' && finished.set_id === null && finished.config_id === draft.id, `run ${j(finished)}`);
    const { items } = await runItems(finished.id);
    check(items.length === 1 && items[0].rule.status === 'not_applicable' && items[0].expected_result === 'pass', `items ${j(items)}`);
    ok('rule not_applicable, expected pass');
  });

  // Part-level read of the bulk validation (Review focus 5): one bad expected cell rejects only its row.
  await step('M1.11 Review focus 5, D8.2: a bulk row whose expected is plain text is rejected by line, a bad split too; the good row is stored', async () => {
    const answer = await want(asAdmin('POST', '/v1/admin/ai/eval/examples/bulk', { body: {
      operation: 'generate_cloze',
      rows: [
        { input: clozeData(W3), expected: 'deploy, deployed' },
        { input: clozeData(W3), expected: { forms: [W3] }, split: 'x' },
        { input: clozeData(W3), expected: { forms: [W3] }, split: 'dev' },
      ],
    } }), 200, 'bulk with faults');
    check(answer.created === 1 && answer.invalid.length === 2, `bulk ${j(answer)}`);
    const [first, second] = answer.invalid;
    check(first.row === 1 && first.violations[0] === 'expected: must be an object', `first ${j(first)}`);
    check(second.row === 2 && second.violations[0] === 'split: dev or held_out', `second ${j(second)}`);
    ok('row 1 → expected: must be an object; row 2 → split: dev or held_out; row 3 stored');
  });

  // M1 never publishes: both drafts go (204), and every live config is still without a model for partM2().
  await step('M1.12 the two drafts of this part are deleted (204); no draft is left and the live configs have no model', async () => {
    for (const name of ['generate_cloze', 'check_private_word']) await want(asAdmin('DELETE', `/v1/admin/ai/configs/${name}/draft`), 204, `delete the ${name} draft`);
    for (const name of ['generate_cloze', 'check_private_word']) {
      const view = await configsOf(name);
      check(view.draft === null && view.live.model === null && view.live_version === 0, `${name} ${j({ draft: view.draft?.id, model: view.live.model, live_version: view.live_version })}`);
    }
    ok('drafts deleted; generate_cloze and check_private_word live configs: no model, live_version 0');
  });
}

// =====================================================================================================================
// M2 — config lifecycle (design K3, plan M2-T13): draft → test and eval → publish through the gate → rollback, on generate_cloze.
// Every live config has no model when this part starts (M1 worked on drafts only); it ends with the fake:ok config live again.
async function partM2() {
  const op = 'generate_cloze';
  const base = `/v1/admin/ai/configs/${op}`;
  const helperCall = (method, path, options) => asAdmin(method, path, options);
  const T = {};

  await step('M2.0 a second admin (created with POST /v1/admin/users) will send the requests that race or are timed: its write budget is fresh, so no 429 wait can serialize them', async () => {
    const email = `smokenb-admin2-${run}@example.com`;
    await want(asAdmin('POST', '/v1/admin/users', { body: { email, staff_role: 'admin', password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, `create ${email}`);
    S.admin2 = { email, token: await loginToken(email) };
    const me = await want(asOther('GET', '/v1/me'), 200, 'second admin profile');
    check(me.id !== S.adminId, 'the second admin is the first admin');
    ok(`admin ${email} (${me.id})`);
  });

  await step('M2.1 fresh state: for the six operations live.number = ai_prompts.revision, no model, nothing before it, live_version 0, no draft; no config event; both old PUTs → 404', async () => {
    const revisions = new Map(psql('SELECT operation || \' \' || revision FROM ai_prompts').split(/\r?\n/).map((line) => line.trim().split(' ')));
    check(revisions.size === OPERATIONS.length, `ai_prompts rows ${j([...revisions])}`);
    const seen = [];
    for (const name of OPERATIONS) {
      const view = await configsOf(name);
      check(view.live.number === Number(revisions.get(name)) && view.live.status === 'published' && view.live.model === null,
        `${name} live ${j({ number: view.live.number, status: view.live.status, model: view.live.model })} vs revision ${revisions.get(name)}`);
      check(view.previous === null && view.draft === null && view.live_version === 0, `${name} previous ${j(view.previous)} draft ${j(view.draft)} live_version ${view.live_version}`);
      seen.push(`${name}=${view.live.number}`);
    }
    check(count('SELECT count(*) FROM ai_config_events') === 0, 'a config event exists before any publish');
    // Control: the reads next to the two removed PUTs still answer, so a 404 below means "no such route", not "the path is wrong".
    for (const path of ['/v1/admin/ai/prompts/generate_cloze', '/v1/admin/ai/operations']) await want(asAdmin('GET', path), 200, `GET ${path}`);
    const old = [];
    for (const path of ['/v1/admin/ai/prompts/generate_cloze', '/v1/admin/ai/operations/generate_cloze']) {
      const res = await asAdmin('PUT', path, { body: { expected_version: 0, instructions: 'x', examples: [], model_ref: null, effort: null, thinking: null, max_output_tokens: null } });
      check(res.status === 404, `PUT ${path} answered ${res.status}: ${res.text}`);
      old.push(`${res.status} ${res.json?.type ?? res.text}`);
    }
    ok(`${seen.join(', ')}; live_version 0, no draft, no event; PUT prompts → ${old[0]}; PUT operations → ${old[1]}`);
  });

  await step('M2.2 B29, D37: the first model by hand — a fake:ok draft, a complete run on the newest frozen set, a publish check without a baseline, publish with baseline null → 200, the learner call carries the new number', async () => {
    const sets = await listSets(op);
    T.set = sets.reduce((a, b) => (b.version > a.version ? b : a));
    const before = await configsOf(op);
    const draft = await createDraft(op);
    check(draft.status === 'draft' && draft.version === 0 && draft.model === null && draft.number > before.live.number && draft.created_from === before.live.id,
      `new draft ${j({ status: draft.status, version: draft.version, model: draft.model, number: draft.number, from: draft.created_from })}`);
    check(draft.number === before.live.number + 2, `draft number ${draft.number}: partM1's deleted draft took ${before.live.number + 1} and a number is never handed out twice`);
    const saved = await setDraftModel(op, 'fake:ok');
    check(saved.version === 1 && saved.model?.model_id === 'fake:ok', `saved draft ${j({ version: saved.version, model: saved.model })}`);
    const run = await runAndWait({ operation: op, config: 'draft', set_id: T.set.id });
    check(run.status === 'finished' && run.complete === true && run.set_id === T.set.id && run.config_id === saved.id && run.config_version === saved.version
      && run.config_number === saved.number, `run ${j(run)}`);
    const pc = await checkOf(op);
    check(j({ turn_off: pc.turn_off, baseline: pc.baseline, blockers: pc.blockers, warnings: pc.warnings })
      === j({ turn_off: false, baseline: { required: false, run_id: null }, blockers: [], warnings: [] }), `publish-check ${j(pc)}`);
    check(pc.candidate_run_id === run.id && pc.set?.id === T.set.id && pc.draft.id === saved.id && pc.draft.version === saved.version, `candidate ${j(pc)}`);
    check(count(`SELECT count(*) FROM ai_eval_runs WHERE config_id = '${before.live.id}'`) === 0, 'a run of the model-less live config exists');
    const published = await want(publishDraft(op, publishBody(pc)), 200, 'publish the first model');
    check(published.live.id === saved.id && published.live.number === saved.number && published.live.model?.model_id === 'fake:ok' && published.live_version === 1,
      `published ${j({ id: published.live.id, number: published.live.number, model: published.live.model, live_version: published.live_version })}`);
    check(published.previous?.id === before.live.id && published.draft === null, `previous ${j(published.previous?.id)} draft ${j(published.draft)}`);
    T.first = published.live;
    T.firstRun = run;
    const called = learnerCall();
    check(called.status === 'succeeded' && called.meta.prompt_revision === T.first.number, `learner call ${j(called)}`);
    ok(`config ${T.first.number} (fake:ok) made live with run ${run.id} on version ${T.set.version}, no baseline needed; learner call prompt_revision ${called.meta.prompt_revision}`);
  });

  await step('M2.3 B23, B36: a second draft → 409 draft-exists with the first; a few-shot answer that is no form of a catalog word → 422 few-shot-invalid naming only that example (a good one saves)', async () => {
    const first = await createDraft(op);
    check(first.version === 0 && first.model?.model_id === 'fake:ok' && first.created_from === T.first.id && first.number > T.first.number,
      `draft ${j({ version: first.version, model: first.model, from: first.created_from, number: first.number })}`);
    const again = await wantProblem(asAdmin('POST', `${base}/draft`, { body: {} }), 409, 'draft-exists', 'a second draft');
    check(again.draft?.id === first.id, `the 409 names draft ${again.draft?.id}, not ${first.id}`);
    const shot = (answers) => ({
      input: clozeData(W1), output: { sentence: 'Lan will ___ it tomorrow.', accepted_answers: answers, translation_vi: 'Lan sẽ làm việc đó vào ngày mai.' } });
    const refused = await wantProblem(asAdmin('PUT', `${base}/draft`, { body: draftBody(first, { examples: [...first.examples, shot([`${W1}ment`])] }) }),
      422, 'few-shot-invalid', 'save a bad few-shot example');
    check(j(refused.examples) === j([{ index: first.examples.length, problems: [`unknown-form:${W1}ment`] }]), `few-shot violations ${j(refused.examples)}`);
    const still = (await configsOf(op)).draft;
    check(still.version === first.version && still.examples.length === first.examples.length, `the refused save changed the draft: ${j({ version: still.version, examples: still.examples.length })}`);
    const saved = await saveDraft(op, first, { examples: [...first.examples, shot([W1])] });
    check(saved.version === first.version + 1 && saved.examples.length === first.examples.length + 1, `good example ${j({ version: saved.version, examples: saved.examples.length })}`);
    ok(`draft ${first.id}: 2nd create → draft-exists (same id); ${W1}ment at index ${first.examples.length} → few-shot-invalid unknown-form:${W1}ment, draft untouched; ${W1} saves (version ${saved.version})`);
  });

  await step('M2.4 B24, E19: two saves of the draft at once with the same expected_version → 200 and 409 draft-version-conflict', async () => {
    const { draft } = await configsOf(op);
    const both = await Promise.all(['a', 'b'].map((tag) => asOther('PUT', `${base}/draft`, { body: draftBody(draft, { note: `race ${tag}` }) })));
    const statuses = both.map((res) => res.status).sort();
    check(j(statuses) === j([200, 409]), `statuses ${statuses.join(', ')}: ${both.map((res) => res.text).join(' / ')}`);
    const lost = both.find((res) => res.status === 409);
    const won = both.find((res) => res.status === 200);
    check(String(lost.json?.type).endsWith('draft-version-conflict'), `409 type ${lost.json?.type}`);
    const after = (await configsOf(op)).draft;
    check(after.version === draft.version + 1 && after.note === won.json.note, `draft after ${j({ version: after.version, note: after.note })}, winner note ${won.json.note}`);
    ok(`version ${draft.version} → ${after.version}; statuses ${statuses.join(', ')}; the draft keeps the winner's note "${after.note}"`);
  });

  await step('M2.5 B26: a draft whose run is queued or running cannot be deleted (409 draft-busy); cancel the run, then the delete is 204', async () => {
    const saved = await setDraftModel(op, 'fake:slow');
    check(saved.model?.model_id === 'fake:slow', `draft model ${j(saved.model)}`);
    const created = await want(startRun({ operation: op, config: 'draft', set_id: T.set.id }), 202, 'start a run of the slow draft');
    const running = await want(asAdmin('GET', `/v1/admin/ai/eval/runs/${created.run_id}`), 200, 'GET the slow run');
    check(running.status === 'queued' || running.status === 'running', `the slow run is ${running.status}`);
    await wantProblem(asOther('DELETE', `${base}/draft`), 409, 'draft-busy', 'delete a draft with an active run');
    check((await configsOf(op)).draft?.id === saved.id, 'the draft was removed although a run was active');
    const cancelled = await want(asOther('POST', `/v1/admin/ai/eval/runs/${created.run_id}/cancel`), 200, 'cancel the slow run');
    check(cancelled.status === 'failed' && cancelled.error === 'cancelled', `cancelled run ${j({ status: cancelled.status, error: cancelled.error })}`);
    await want(asOther('DELETE', `${base}/draft`), 204, 'delete the draft after the cancel');
    check((await configsOf(op)).draft === null, 'the draft is still there');
    ok(`run ${created.run_id} was ${running.status} → 409 draft-busy; cancelled (failed / cancelled) → delete 204`);
  });

  await step('M2.6 B27, B25: a fake:two-blanks draft cannot publish without a run (409 eval-required); saving it again makes its run stale; the live config\'s first candidate run is its baseline', async () => {
    await createDraft(op);
    const saved = await setDraftModel(op, 'fake:two-blanks');
    await wantProblem(publishDraft(op, { expected_version: saved.version, candidate_run_id: null, baseline_run_id: null, acknowledge_warnings: false }),
      409, 'eval-required', 'publish without a run');
    const none = await checkOf(op);
    check(j(none.blockers) === j(['eval-required']) && none.candidate_run_id === null && none.baseline.required === true && none.baseline.run_id === T.firstRun.id,
      `check without a run ${j(none)}`);
    T.run1 = await runAndWait({ operation: op, config: 'draft', set_id: T.set.id });
    check(T.run1.status === 'finished' && T.run1.complete === true && T.run1.config_version === saved.version, `first run ${j(T.run1)}`);
    const resaved = await saveDraft(op, saved, { note: 'saved again' });
    check(resaved.version === saved.version + 1, `second save ${resaved.version}`);
    const stale = await checkOf(op);
    check(j(stale.blockers) === j(['eval-required']) && stale.candidate_run_id === null, `check after the second save ${j(stale)}`);
    const run2 = await runAndWait({ operation: op, config: 'draft', set_id: T.set.id });
    const ready = await checkOf(op);
    check(j(ready.blockers) === j([]) && ready.candidate_run_id === run2.id && ready.baseline.run_id === T.firstRun.id && ready.warnings.length > 0, `check after the second run ${j(ready)}`);
    ok(`no run → eval-required (baseline = run ${T.firstRun.id} of config ${T.first.number}); run at version ${saved.version} went stale after the save; run at version ${resaved.version} → no blocker, ${ready.warnings.length} warnings`);
  });

  await step('M2.7 B28: a new frozen set S2 → the draft alone is baseline-required (409); with the live config run on S2 → no blocker and a rate-drop shape warning', async () => {
    const added = await want(asAdmin('POST', '/v1/admin/ai/eval/examples/bulk', { body: {
      operation: op, rows: [{ input: clozeData(W4), expected: { forms: catalogForms(W4) }, split: 'held_out' }] } }), 200, 'one more example');
    check(added.created === 1 && added.invalid.length === 0, `bulk ${j(added)}`);
    T.set2 = await want(asAdmin('POST', '/v1/admin/ai/eval/sets', { body: { operation: op } }), 201, 'freeze S2');
    check(T.set2.version > T.set.version && T.set2.held_out_count >= 1, `S2 ${j(T.set2)}`);
    const total = T.set2.dev_count + T.set2.held_out_count;
    T.candidate = await runAndWait({ operation: op, config: 'draft', set_id: T.set2.id });
    const needBase = await checkOf(op);
    check(j(needBase.blockers) === j(['baseline-required']) && needBase.candidate_run_id === T.candidate.id && needBase.baseline.required === true
      && needBase.baseline.run_id === null && needBase.set?.id === T.set2.id && needBase.warnings.length === 0, `check without a baseline ${j(needBase)}`);
    await wantProblem(publishDraft(op, publishBody(needBase)), 409, 'baseline-required', 'publish without a baseline on S2');
    T.baseline = await runAndWait({ operation: op, config: 'live', set_id: T.set2.id });
    check(T.baseline.status === 'finished' && T.baseline.config_id === T.first.id && T.baseline.config_version === T.first.version && T.baseline.set_id === T.set2.id,
      `baseline run ${j(T.baseline)}`);
    const ready = await checkOf(op);
    check(j(ready.blockers) === j([]) && ready.baseline.run_id === T.baseline.id && ready.candidate_run_id === T.candidate.id, `check with the baseline ${j(ready)}`);
    const drop = ready.warnings.find((warning) => warning.code === 'rate-drop' && warning.criterion === 'shape');
    check(drop && drop.before.passed === total && drop.before.counted === total && drop.after.passed === 0 && drop.after.counted === total, `rate-drop ${j(drop)} of ${total} items`);
    ok(`S2 = version ${T.set2.version} (${total} items); the draft's run on S2 alone → baseline-required; with run ${T.baseline.id} of the live config → no blocker; warnings: ${ready.warnings.map((w) => `${w.code}${w.criterion ? `:${w.criterion}` : ''}`).join(', ')}`);
  });

  await step('M2.8 B30: publish without acknowledging the warnings → 409 publish-warnings listing them; a wrong baseline or candidate run id → 409 publish-stale', async () => {
    const pc = await checkOf(op);
    check(pc.warnings.length > 0, 'no warnings to acknowledge');
    const refused = await wantProblem(publishDraft(op, publishBody(pc)), 409, 'publish-warnings', 'publish without acknowledging');
    check(j(refused.warnings) === j(pc.warnings), `warnings in the 409 ${j(refused.warnings)} vs the check ${j(pc.warnings)}`);
    await wantProblem(publishDraft(op, publishBody(pc, { baseline_run_id: randomUUID(), acknowledge_warnings: true })), 409, 'publish-stale', 'publish with a wrong baseline');
    await wantProblem(publishDraft(op, publishBody(pc, { candidate_run_id: pc.baseline.run_id, acknowledge_warnings: true })), 409, 'publish-stale', 'publish with a wrong candidate');
    const view = await configsOf(op);
    check(view.live.id === T.first.id && view.live_version === 1 && view.draft?.id === pc.draft.id, `nothing may have moved: live ${view.live.id} version ${view.live_version}`);
    ok(`${pc.warnings.length} warnings listed in the 409; wrong baseline → publish-stale; wrong candidate → publish-stale; the live config did not move`);
  });

  await step('M2.9 B31, E19: two identical acknowledged publishes at once → 200 and 409 publish-stale, one new publish event', async () => {
    const pc = await checkOf(op);
    const body = publishBody(pc, { acknowledge_warnings: true });
    const events = () => count(`SELECT count(*) FROM ai_config_events WHERE operation = '${op}' AND kind = 'publish'`);
    const eventsBefore = events();
    const both = await Promise.all([1, 2].map(() => asOther('POST', `${base}/publish`, { body })));
    const statuses = both.map((res) => res.status).sort();
    check(j(statuses) === j([200, 409]), `statuses ${statuses.join(', ')}: ${both.map((res) => res.text.slice(0, 200)).join(' / ')}`);
    check(String(both.find((res) => res.status === 409).json?.type).endsWith('publish-stale'), `409 type ${both.find((res) => res.status === 409).json?.type}`);
    check(events() === eventsBefore + 1, `publish events ${eventsBefore} → ${events()}`);
    const view = await configsOf(op);
    check(view.live.model?.model_id === 'fake:two-blanks' && view.live_version === 2 && view.previous?.id === T.first.id && view.draft === null,
      `after the publish ${j({ model: view.live.model, live_version: view.live_version, previous: view.previous?.id, draft: view.draft?.id })}`);
    T.blanks = view.live;
    const newest = psql(`SELECT kind || '|' || coalesce(candidate_run_id::text, 'NULL') || '|' || coalesce(baseline_run_id::text, 'NULL') || '|' || jsonb_array_length(warnings)::text
      FROM ai_config_events WHERE operation = '${op}' ORDER BY at DESC, id DESC LIMIT 1`);
    check(newest === `publish|${T.candidate.id}|${T.baseline.id}|${pc.warnings.length}`, `newest event ${newest}`);
    ok(`statuses ${statuses.join(', ')}; publish events ${eventsBefore} → ${eventsBefore + 1}; config ${T.blanks.number} (fake:two-blanks) live, config ${T.first.number} before it; the event keeps both run ids and ${pc.warnings.length} warnings`);
  });

  await step('M2.10 B33, B34: runs a publish names are evidence (409 run-is-evidence); the models of the live and the previous config cannot be deleted nor lose their price (409 model-in-use); an unused model goes', async () => {
    for (const id of [T.candidate.id, T.baseline.id, T.firstRun.id]) await wantProblem(asAdmin('DELETE', `/v1/admin/ai/eval/runs/${id}`), 409, 'run-is-evidence', `delete run ${id}`);
    await want(asAdmin('DELETE', `/v1/admin/ai/eval/runs/${T.run1.id}`), 204, 'delete an ordinary finished run (control)');
    const models = (await want(asAdmin('GET', '/v1/admin/ai/models?provider=fake'), 200, 'list models')).items;
    const idOf = (modelId) => models.find((row) => row.model_id === modelId)?.id;
    for (const modelId of ['fake:two-blanks', 'fake:ok', 'fake:slow']) check(idOf(modelId), `model ${modelId} is not listed`);
    for (const modelId of ['fake:two-blanks', 'fake:ok']) await wantProblem(asAdmin('DELETE', `/v1/admin/ai/models/${idOf(modelId)}`), 409, 'model-in-use', `delete ${modelId}`);
    await wantProblem(asAdmin('PATCH', `/v1/admin/ai/models/${idOf('fake:two-blanks')}`, { body: { price_input: null } }), 409, 'model-in-use', 'clear the price of the live model');
    await want(asAdmin('DELETE', `/v1/admin/ai/models/${idOf('fake:slow')}`), 204, 'delete fake:slow (no config names it any more)');
    S.models.delete('fake:slow');
    ok('candidate, baseline and the first run → run-is-evidence, an ordinary run deletes (204); fake:two-blanks and fake:ok → model-in-use on delete, fake:two-blanks also on price null; fake:slow (named by no config) deletes (204)');
  });

  await step('M2.11 B32: a stale rollback → 409 publish-stale; rollback → fake:ok live again with nothing before it; again → 409 no-previous; the learner call carries its number; history lists rollback, publish, publish; a retired config keeps its model', async () => {
    const view = await configsOf(op);
    await wantProblem(asAdmin('POST', `${base}/rollback`, { body: { expected_live_version: view.live_version - 1 } }), 409, 'publish-stale', 'rollback with a stale version');
    check((await configsOf(op)).live.id === T.blanks.id, 'a stale rollback moved the live config');
    const rolled = await want(asAdmin('POST', `${base}/rollback`, { body: { expected_live_version: view.live_version } }), 200, 'roll back');
    check(rolled.live.id === T.first.id && rolled.live.model?.model_id === 'fake:ok' && rolled.previous === null && rolled.live_version === view.live_version + 1,
      `rolled back ${j({ live: rolled.live.id, model: rolled.live.model, previous: rolled.previous?.id, live_version: rolled.live_version })}`);
    await wantProblem(asAdmin('POST', `${base}/rollback`, { body: { expected_live_version: rolled.live_version } }), 409, 'no-previous', 'rollback again');
    const called = learnerCall();
    check(called.status === 'succeeded' && called.meta.prompt_revision === T.first.number, `learner call ${j(called)}`);
    const history = await want(asAdmin('GET', `${base}/history`), 200, 'history');
    check(j(history.items.map((item) => item.kind)) === j(['rollback', 'publish', 'publish']), `history kinds ${j(history.items.map((item) => item.kind))}`);
    const [rollback, second, firstEvent] = history.items;
    check(rollback.config.number === T.first.number && rollback.from_config?.number === T.blanks.number, `rollback event ${j(rollback)}`);
    check(second.config.number === T.blanks.number && second.config.model_id === 'fake:two-blanks' && second.candidate_run_id === T.candidate.id && second.baseline_run_id === T.baseline.id, `second publish ${j(second)}`);
    check(firstEvent.config.number === T.first.number && firstEvent.candidate_run_id === T.firstRun.id && firstEvent.baseline_run_id === null, `first publish ${j(firstEvent)}`);
    const models = (await want(asAdmin('GET', '/v1/admin/ai/models?provider=fake'), 200, 'list models')).items;
    await wantProblem(asAdmin('DELETE', `/v1/admin/ai/models/${models.find((row) => row.model_id === 'fake:two-blanks').id}`), 409, 'model-in-use', 'delete the model of a retired config');
    ok(`stale → publish-stale; rolled back to config ${T.first.number}, previous null; again → no-previous; learner prompt_revision ${called.meta.prompt_revision}; history rollback, publish, publish; fake:two-blanks (retired config) still model-in-use`);
  });

  await step('M2.12 B48, D38: turning the operation off needs no run (model null, the fake:ok config stays before it, status model-not-set, the learner call is unavailable); a rollback turns it on again', async () => {
    const before = await configsOf(op);
    const runsBefore = count('SELECT count(*) FROM ai_eval_runs');
    const off = await turnOff(helperCall, op);
    check(count('SELECT count(*) FROM ai_eval_runs') === runsBefore, 'turning off made an eval run');
    const view = await configsOf(op);
    check(view.live.id === off.id && view.live.model === null && view.previous?.id === T.first.id && view.draft === null && view.live_version === before.live_version + 1,
      `turned off ${j({ live: view.live.id, model: view.live.model, previous: view.previous?.id, draft: view.draft?.id, live_version: view.live_version })}`);
    const status = await want(asAdmin('GET', '/v1/admin/ai/status'), 200, 'AI status');
    const row = status.operations.find((item) => item.operation === op);
    check(row.ready === false && row.reason === 'model-not-set', `status row ${j(row)}`);
    const unavailable = learnerCall();
    check(unavailable.status === 'unavailable' && unavailable.reason === 'model-not-set', `learner call while off ${j(unavailable)}`);
    const newest = psql(`SELECT kind || '|' || coalesce(candidate_run_id::text, 'NULL') || '|' || coalesce(baseline_run_id::text, 'NULL')
      FROM ai_config_events WHERE operation = '${op}' ORDER BY at DESC, id DESC LIMIT 1`);
    check(newest === 'publish|NULL|NULL', `newest event ${newest}`);
    const back = await rollbackConfig(helperCall, op);
    check(back.id === T.first.id && back.model?.model_id === 'fake:ok', `rolled back to ${j({ id: back.id, model: back.model })}`);
    const called = learnerCall();
    check(called.status === 'succeeded' && called.meta.prompt_revision === T.first.number, `learner call after the rollback ${j(called)}`);
    ok(`off without a run (ai_eval_runs stays at ${runsBefore}); status ready false / model-not-set; learner call unavailable / model-not-set; newest event publish with no run ids; rollback → config ${T.first.number} (fake:ok), learner call succeeded`);
  });
}

async function main() {
  const started = Date.now();
  await setup();
  await partM1();
  await partM2();

  const seconds = Math.round((Date.now() - started) / 1000);
  if (failures.length > 0) {
    console.log(`\nSmoke nhóm B FAILED: ${failures.length} of ${stepNo} steps did not match (${seconds}s):`);
    for (const f of failures) console.log(`  [${f.step}] ${f.name}\n      ${f.message}`);
    process.exitCode = 1;
  } else {
    console.log(`\nSmoke nhóm B passed in ${seconds}s (${stepNo} steps).`);
  }
}

main().catch((error) => {
  console.error(`\nSmoke nhóm B FAILED at step ${stepNo}:\n${error.stack ?? error}`);
  process.exitCode = 1;
});
