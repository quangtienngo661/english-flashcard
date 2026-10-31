// Smoke test for nhóm B (AI quality round: golden set, config lifecycle, judge, real questions, dashboard, D7/D30) against a REAL running API +
// worker (design §13; plan `docs/superpowers/plans/2026-10-29-nhom-b.md`, contract §7). Start them first: `docker compose up -d` (repo root), create the
// database `english_learning_smoke_nb`, then in this package: `pnpm db:setup && pnpm build && pnpm run:dev` with DATABASE_URL on that database,
// AI_FAKE_ENABLED=true, no OPENAI_API_KEY / ANTHROPIC_API_KEY and JOB_QUEUE_PREFIX=wordmet-nb-smoke, on a fresh database; then `pnpm smoke:nhom-b`
// (SMOKE_BASE_URL when the API does not listen on :3000). Needs DATABASE_URL (env, else .env), Mailpit, and `docker compose -p english-learning` for
// psql. No real provider is called.
//
// Shape: `setup()` makes the first admin, the fake models and one catalog verb import (it chooses no model: since M2 a model comes from a config,
// `partM1()` through drafts it never publishes, `partM2()` through publishes, `partM3()` through the judge and its passes, `partM4()` through the real
// questions of an editor and a learner); each milestone adds one
// `partM<n>()` (contract §7). The `ai.test` limit is 20 uses per hour per user and every eval run and prompt test uses one, so `setup()`, `partM1()` and
// `partM2()` run as the first admin (M1 uses 5 of the 20, M2 uses 6) and every later part as a new admin made with `POST /v1/admin/users`
// (staff_role admin: no registration spent). The steps of `partM2()` that race two requests or time one against a running eval run send them as
// a second admin with a fresh `user.write` budget (30 a minute per user): a 429 wait would otherwise serialize the race or outlast the run.
// `partM3()` runs as a third admin (it starts 5 eval runs) and sets `ai.admin_daily_usd_cap` to null for good: a part after it is never capped.
// `partM4()` runs as a fourth admin (a real-judge pass spends no `ai.test` hit) and lets a fifth, the publisher, publish three configs.
// `partM5()` runs as a sixth admin (its eval runs spend its own `ai.test` hits) and reads the dashboard against psql.
// A failing step is reported and the run goes on with the next one; the exit code is 0 only when every step matched.
import { execFile, execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { publishModel, rollbackConfig, turnOff } from './ai-config-publish.mjs';

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

    // B37: another transaction holds version 2 for 8 s, so the API's insert waits for it and then meets the unique index. The request goes out only once
    // the holder is seen sleeping inside its transaction (a fixed pause lost the race when `docker compose exec` started slowly on a busy machine).
    const holder = psqlLater(`BEGIN; INSERT INTO ai_eval_sets (operation, version, held_out_ratio, frozen_by) VALUES ('generate_cloze', 2, 0.3, '${S.adminId}');
      SELECT pg_sleep(8); COMMIT;`);
    await waitFor(() => count(`SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND pid <> pg_backend_pid() AND query LIKE '%pg_sleep(8)%'`),
      (holding) => holding > 0, 'the holder of version 2 sleeping in its transaction', 20_000, 100);
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

// =====================================================================================================================
// M3 — judge (design K2, plan M3-T20): the seeded judge, its revisions and clone, judge passes on eval runs, labels and agreement, the judge
// criteria in the publish gate, the daily USD cap of admin work, and what deleting a labelled run hides. The part acts as a third admin (a
// fresh `ai.test` budget: it starts 5 runs of the 20 an hour) and ends with `ai.admin_daily_usd_cap` null, so later parts are never capped.
// A fake model costs 100 input + 50 output tokens a call (`FAKE_USAGE`): at 1000 / 1000 USD per 1M tokens that is 0.15 USD a call.
async function partM3() {
  const op = 'generate_cloze';
  const ai = '/v1/admin/ai';
  const T = {};
  const outer = { admin: S.admin, adminId: S.adminId };

  const listJudges = async () => (await want(asAdmin('GET', `${ai}/judges`), 200, 'GET judges')).items;
  const getJudge = async (id) => {
    const found = (await listJudges()).find((judge) => judge.id === id);
    check(found, `judge ${id} is not listed`);
    return found;
  };
  /** The body that saves `view` as it is except for `changes`; `expected_revision` is the revision the view shows. */
  const judgeBody = (view, changes = {}) => ({
    expected_revision: view.latest.revision, name: view.name, operations: view.operations, active: view.active, criteria: view.latest.criteria,
    instructions: view.latest.instructions, examples: view.latest.examples, model_ref: view.latest.model?.id ?? null, effort: view.latest.effort,
    thinking: view.latest.thinking, max_output_tokens: view.latest.max_output_tokens, ...changes,
  });
  const putJudge = (view, changes) => asAdmin('PUT', `${ai}/judges/${view.id}`, { body: judgeBody(view, changes) });
  const saveJudge = (view, changes) => want(putJudge(view, changes), 200, `save judge ${view.name}`);
  const startPass = (runId, judgeId) => asAdmin('POST', `${ai}/eval/runs/${runId}/judge-passes`, { idem: true, body: { judge_id: judgeId } });
  const passDone = (id, timeoutMs = 60_000) => waitFor(() => want(asAdmin('GET', `${ai}/judge-passes/${id}`), 200, 'GET judge pass'),
    (pass) => pass.status === 'finished' || pass.status === 'failed', `judge pass ${id} ending`, timeoutMs);
  const runDone = (id) => waitFor(() => want(asAdmin('GET', `${ai}/eval/runs/${id}`), 200, 'GET run'),
    (row) => row.status === 'finished' || row.status === 'failed', `run ${id} ending`, 60_000);
  const statusOf = () => want(asAdmin('GET', `${ai}/status`), 200, 'AI status');
  const agreementOf = (judgeId) => want(asAdmin('GET', `${ai}/judges/${judgeId}/agreement`), 200, 'GET agreement');
  const putLabel = (itemId, verdict, criterion = 'single_answer') => asAdmin('PUT', `${ai}/labels`, { body: { subject_kind: 'eval_item', subject_id: itemId, criterion, verdict } });
  /** `PUT /v1/admin/settings` for the `ai` section (an idempotent write at the current version); returns the `ai` values as saved. */
  async function setAi(patch) {
    const current = await want(asAdmin('GET', '/v1/admin/settings'), 200, 'GET settings');
    const saved = await want(asAdmin('PUT', '/v1/admin/settings', { idem: true, body: { version: current.version, values: { ai: patch } } }), 200, `PUT settings ${j(patch)}`);
    for (const [key, value] of Object.entries(patch)) check(saved.values.ai[key] === value, `setting ai.${key} is ${j(saved.values.ai[key])} after saving ${j(value)}`);
    return saved.values.ai;
  }
  /** A cap that lets one more 0.15 USD call start and blocks every call after it: today's admin spend rounded up to the cent, plus 0.10. */
  const capAboveSpent = async () => (Math.ceil(Number((await statusOf()).today.admin_cost_usd) * 100 - 1e-6) + 10) / 100;
  const vnDayStart = `(date_trunc('day', now() AT TIME ZONE '${TIMEZONE}') AT TIME ZONE '${TIMEZONE}')`;
  const callsToday = (where) => count(`SELECT count(*) FROM ai_calls WHERE created_at >= ${vnDayStart} AND ${where}`);
  const judgeCalls = () => count(`SELECT count(*) FROM ai_calls WHERE purpose = 'judge'`);
  const itemSql = (runId, where = 'true') => `SELECT id FROM ai_eval_run_items WHERE run_id = '${runId}' AND ${where} ORDER BY position`;
  const ids = (sql) => psql(sql).split(/\r?\n/).filter(Boolean);
  const judgeable = (runId) => count(`SELECT count(*) FROM ai_eval_run_items WHERE run_id = '${runId}' AND input IS NOT NULL AND output IS NOT NULL`);
  /** The three-key tally the API gives for a split. */
  const tally = (pass, failMajor = 0, failMinor = 0, unjudged = 0) => ({ pass, fail_major: failMajor, fail_minor: failMinor, unjudged });

  try {
    await step('M3.0 a third admin (POST /v1/admin/users) acts for this part, so its ai.test budget is fresh; the judge settings start at their contract defaults', async () => {
      const email = `smokenb-admin3-${run}@example.com`;
      await want(asAdmin('POST', '/v1/admin/users', { body: { email, staff_role: 'admin', password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, `create ${email}`);
      S.admin = { email, token: await loginToken(email) };
      const me = await want(asAdmin('GET', '/v1/me'), 200, 'third admin profile');
      check(me.id !== outer.adminId, 'the third admin is the first admin');
      S.adminId = me.id;
      const { values } = await want(asAdmin('GET', '/v1/admin/settings'), 200, 'GET settings');
      check(j([values.ai.admin_daily_usd_cap, values.ai.judge_label_min, values.ai.judge_agreement_min]) === j([2, 30, 0.85]), `ai settings ${j(values.ai)}`);
      T.dailyCap = values.ai.daily_provider_calls_cap;
      ok(`admin ${email} (${me.id}); admin_daily_usd_cap 2, judge_label_min 30, judge_agreement_min 0.85; daily_provider_calls_cap ${T.dailyCap}`);
    });

    await step('M3.1 the seeded judge "Chỉ một đáp án" (one judge, revision 1, no model, criterion single_answer); without a model a pass and a run with it are refused (409 model-not-set) and the refused run makes nothing', async () => {
      const list = await listJudges();
      check(list.length === 1, `judges ${j(list.map((judge) => judge.name))}`);
      const seeded = list[0];
      check(seeded.name === 'Chỉ một đáp án' && j(seeded.operations) === j([op]) && seeded.active === true && seeded.latest.revision === 1 && seeded.latest.model === null
        && j(seeded.latest.criteria.map((criterion) => criterion.code)) === j(['single_answer']),
      `seeded judge ${j({ name: seeded.name, operations: seeded.operations, active: seeded.active, revision: seeded.latest.revision, model: seeded.latest.model, criteria: seeded.latest.criteria })}`);
      T.J = seeded.id;
      T.name = seeded.name;
      T.set = (await listSets(op)).reduce((a, b) => (b.version > a.version ? b : a));
      const earlier = (await want(asAdmin('GET', `${ai}/eval/runs?operation=${op}&page_size=10`), 200, 'list runs')).items.find((row) => row.status === 'finished' || row.status === 'failed');
      check(earlier, 'no earlier run to start a pass on');
      await wantProblem(startPass(earlier.id, T.J), 409, 'model-not-set', 'a pass with the model-less judge');
      const runsBefore = count('SELECT count(*) FROM ai_eval_runs');
      await wantProblem(startRun({ operation: op, config: 'live', set_id: T.set.id, judge_id: T.J }), 409, 'model-not-set', 'a run with the model-less judge');
      check(count('SELECT count(*) FROM ai_eval_runs') === runsBefore && count('SELECT count(*) FROM ai_judge_passes') === 0, 'a refused request left a run or a pass behind');
      await wantProblem(asAdmin('GET', `${ai}/judges/${randomUUID()}/revisions`), 404, 'not-found', 'revisions of an unknown judge');
      ok(`judge ${T.J}: revision 1, operations [${op}], no model; the pass on run ${earlier.id} and the run with the judge → 409 model-not-set, ai_eval_runs stays at ${runsBefore}, no pass; unknown judge → 404`);
    });

    await step('M3.2 B12, E4, Review focus 4: openai → 422 judge-provider, no criteria → 400; fake:ok → revision 2; stale expected_revision → 409 judge-revision-conflict; a new name alone adds no revision; clone → revision 1; two saves at once → 200 + 409', async () => {
      const seeded = await getJudge(T.J);
      const openai = randomUUID();
      psql(`INSERT INTO ai_models (id, provider, model_id, info_checked_at, created_by) VALUES ('${openai}', 'openai', 'gpt-smoke-nb', now(), '${S.adminId}')`);
      try {
        await wantProblem(putJudge(seeded, { model_ref: openai }), 422, 'judge-provider', 'save with an openai model');
      } finally {
        psql(`DELETE FROM ai_models WHERE id = '${openai}'`);
      }
      const noCriteria = await wantProblem(putJudge(seeded, { criteria: [] }), 400, 'validation-failed', 'save without criteria');
      check(Array.isArray(noCriteria.violations) && noCriteria.violations.length > 0, `violations ${j(noCriteria.violations)}`);
      check((await getJudge(T.J)).latest.revision === 1, 'a refused save added a revision');
      const fakeOk = await addModel('fake:ok');
      const saved = await saveJudge(seeded, { model_ref: fakeOk.id });
      check(saved.latest.revision === 2 && saved.latest.model?.model_id === 'fake:ok' && saved.latest.model.provider === 'fake', `saved ${j({ revision: saved.latest.revision, model: saved.latest.model })}`);
      await wantProblem(putJudge(seeded, { model_ref: fakeOk.id, instructions: `${seeded.latest.instructions}\n\nStale.` }), 409, 'judge-revision-conflict', 'save with the stale revision 1');
      const renamed = await saveJudge(saved, { name: `${saved.name} (renamed)` });
      check(renamed.latest.revision === 2 && renamed.latest.id === saved.latest.id && renamed.name === `${saved.name} (renamed)`, `renamed ${j({ revision: renamed.latest.revision, name: renamed.name })}`);
      const restored = await saveJudge(renamed, { name: seeded.name });
      check(restored.name === T.name && restored.latest.revision === 2 && restored.latest.id === saved.latest.id, `restored ${j({ name: restored.name, revision: restored.latest.revision })}`);
      const revisions = (await want(asAdmin('GET', `${ai}/judges/${T.J}/revisions`), 200, 'revisions')).items;
      check(j(revisions.map((revision) => revision.revision)) === j([2, 1]) && revisions[0].model?.model_id === 'fake:ok' && revisions[1].model === null, `revisions ${j(revisions.map((r) => [r.revision, r.model?.model_id ?? null]))}`);
      const clone = await want(asAdmin('POST', `${ai}/judges/${T.J}/clone`, { body: { name: 'Smoke clone' } }), 201, 'clone the judge');
      check(clone.id !== T.J && clone.name === 'Smoke clone' && clone.active === true && j(clone.operations) === j([op]) && clone.latest.revision === 1
        && j(clone.latest.criteria) === j(restored.latest.criteria) && clone.latest.model?.model_id === 'fake:ok', `clone ${j({ id: clone.id, name: clone.name, revision: clone.latest.revision, model: clone.latest.model })}`);
      T.clone = clone.id;
      const both = await Promise.all(['a', 'b'].map((tag) => putJudge(clone, { instructions: `${clone.latest.instructions}\n\nSmoke race ${tag}.` })));
      const statuses = both.map((res) => res.status).sort();
      check(j(statuses) === j([200, 409]), `statuses ${statuses.join(', ')}: ${both.map((res) => res.text.slice(0, 200)).join(' / ')}`);
      check(String(both.find((res) => res.status === 409).json?.type).endsWith('judge-revision-conflict'), `409 type ${both.find((res) => res.status === 409).json?.type}`);
      const after = await getJudge(T.clone);
      check(after.latest.revision === 2 && after.latest.instructions === both.find((res) => res.status === 200).json.latest.instructions, `clone after the race ${j({ revision: after.latest.revision })}`);
      ok(`openai → judge-provider (the row is deleted again), criteria [] → 400; fake:ok → revision 2; stale revision 1 → judge-revision-conflict; rename and rename back kept revision 2 (id ${saved.latest.id}); clone ${T.clone} at revision 1 with the same criteria, then two saves at once → ${statuses.join(', ')}, revision 2`);
    });

    await step('M3.3 D14, D3, B6, R7: a live run on the newest frozen set with judge_id → 202 + judge_pass_id; the pass judges every output; dev items carry a pass score, held-out only tallies; a judge call carries exactly { target_operation, input, output, criteria, context }', async () => {
      const created = await want(startRun({ operation: op, config: 'live', set_id: T.set.id, judge_id: T.J }), 202, 'start a run with a judge');
      check(typeof created.judge_pass_id === 'string', `response ${j(created)}`);
      T.p1 = created.judge_pass_id;
      T.r1 = await runDone(created.run_id);
      check(T.r1.status === 'finished' && T.r1.complete === true && T.r1.set_id === T.set.id, `run ${j({ status: T.r1.status, complete: T.r1.complete, set_id: T.r1.set_id })}`);
      const pass = await passDone(T.p1);
      T.n1 = judgeable(T.r1.id);
      T.held1 = ids(itemSql(T.r1.id, `split = 'held_out'`));
      check(pass.status === 'finished' && pass.error === null && pass.kind === 'eval_run' && pass.eval_run_id === T.r1.id && pass.total === T.n1 && pass.judged === T.n1 && pass.unjudged === 0
        && pass.judge.id === T.J && pass.judge_revision.revision === 2 && pass.judge_revision.model?.model_id === 'fake:ok' && T.held1.length >= 1, `pass ${j(pass)}`);
      const raw = await asAdmin('GET', `${ai}/eval/runs/${T.r1.id}/items`);
      check(raw.status === 200, `GET items ${raw.status}`);
      const { items, stats, passes, judge_stats: judgeStats } = raw.json;
      check(items.length === stats.dev.total && items.length + T.held1.length === T.n1 && items.length >= 3, `dev items ${items.length}, held-out ${T.held1.length}, judged ${T.n1}`);
      for (const item of items) {
        const mine = item.scores.filter((score) => score.revision === 2);
        check(mine.length === 1 && mine[0].criterion === 'single_answer' && mine[0].verdict === 'pass' && mine[0].problem === null && mine[0].reason === 'fake judge' && item.labels.length === 0,
          `item ${item.item_id} ${j({ scores: item.scores, labels: item.labels })}`);
      }
      check(judgeStats.length === 1 && judgeStats[0].revision === 2 && judgeStats[0].criterion === 'single_answer' && judgeStats[0].judge_name === T.name && judgeStats[0].calibrated === false
        && j(judgeStats[0].dev) === j(tally(items.length)) && j(judgeStats[0].held_out) === j(tally(T.held1.length)), `judge_stats ${j(judgeStats)}`);
      check(passes.length === 1 && passes[0].id === T.p1 && passes[0].status === 'finished', `passes ${j(passes.map((p) => [p.id, p.status]))}`);
      const heldExamples = ids(`SELECT example_id FROM ai_eval_run_items WHERE run_id = '${T.r1.id}' AND split = 'held_out'`);
      check(items.every((item) => raw.text.includes(item.item_id)), 'control: the response does not list a dev item id');
      for (const hidden of [...T.held1, ...heldExamples]) check(!raw.text.includes(hidden), `the items response names the held-out id ${hidden}`);
      const passItem = (subject) => psql(`SELECT id FROM ai_judge_pass_items WHERE pass_id = '${T.p1}' AND subject_id = '${subject}'`);
      const devCalls = await callsOf(`judge-${T.p1}-${passItem(items[0].item_id)}`);
      check(devCalls.length === 1 && devCalls[0].purpose === 'judge' && devCalls[0].operation === 'judge' && devCalls[0].held_out === false && devCalls[0].content?.request, `dev judge call ${j(devCalls)}`);
      const sent = devCalls[0].content.request;
      check(j(Object.keys(sent.data).sort()) === j(['context', 'criteria', 'input', 'output', 'target_operation']) && sent.data.target_operation === op && sent.data.context === null
        && j(sent.data.input) === j(items[0].input) && j(sent.data.output) === j(items[0].output) && j(sent.data.criteria.map((c) => c.code)) === j(['single_answer']), `request.data ${j(sent.data)}`);
      const wire = JSON.stringify(sent);
      check(wire.includes(items[0].input.word), 'control: the request does not hold the word it asks about');
      for (const secret of [T.r1.id, T.p1, 'fake:ok']) check(!wire.includes(secret), `the judge request names ${secret}`);
      const heldCalls = await callsOf(`judge-${T.p1}-${passItem(T.held1[0])}`);
      check(heldCalls.length === 1 && heldCalls[0].purpose === 'judge' && heldCalls[0].held_out === true && heldCalls[0].content === null, `held-out judge call ${j(heldCalls)}`);
      T.judgeCalls = judgeCalls();
      check(T.judgeCalls === T.n1, `judge calls ${T.judgeCalls} vs ${T.n1} outputs`);
      ok(`run ${T.r1.id} finished (${T.n1} outputs: ${items.length} dev, ${T.held1.length} held-out); pass ${T.p1} judged ${pass.judged}/${pass.total}; every dev item has single_answer pass; judge_stats dev ${j(judgeStats[0].dev)}, held-out ${j(judgeStats[0].held_out)} with no held-out id in the response; the dev call sends only [context, criteria, input, output, target_operation] and names no run, pass or model; the held-out call: held_out true, content null`);
    });

    await step('M3.4 B16: one queued or running pass per judge revision — a queued pass of the clone makes a start 409 judge-pass-running', async () => {
      const clone = await getJudge(T.clone);
      const queued = randomUUID();
      const passesBefore = count('SELECT count(*) FROM ai_judge_passes');
      psql(`INSERT INTO ai_judge_passes (id, judge_revision_id, kind, operation, eval_run_id, status, started_by)
        VALUES ('${queued}', '${clone.latest.id}', 'eval_run', '${op}', '${T.r1.id}', 'queued', '${S.adminId}')`);
      try {
        await wantProblem(startPass(T.r1.id, T.clone), 409, 'judge-pass-running', 'a second pass of the clone revision');
        check(count('SELECT count(*) FROM ai_judge_passes') === passesBefore + 1, 'the refused start inserted a pass');
      } finally {
        psql(`DELETE FROM ai_judge_passes WHERE id = '${queued}'`);
      }
      ok(`a queued pass of revision ${clone.latest.revision} of the clone → 409 judge-pass-running, nothing inserted; the row is deleted again`);
    });

    await step('M3.5 B15: a second pass of the same judge revision on the same run judges nothing (202, finished, total 0) and makes no judge call', async () => {
      const calls = judgeCalls();
      const again = await want(startPass(T.r1.id, T.J), 202, 'the same pass again');
      check(again.status === 'finished' && again.total === 0 && again.judged === 0 && again.id !== T.p1 && again.eval_run_id === T.r1.id, `pass ${j(again)}`);
      check(judgeCalls() === calls, `judge calls ${calls} → ${judgeCalls()}`);
      ok(`pass ${again.id}: finished, total 0; judge calls stay at ${calls}`);
    });

    await step('M3.6 D15, D16, B17, R7: labels on two dev items (pass, fail_major) → 200; a held-out output → 409 example-held-out; a label can be taken back; agreement revision 2 = labeled 2, agree 1, not calibrated', async () => {
      const { items } = await runItems(T.r1.id);
      T.devItems = items.map((item) => item.item_id);
      const first = await want(putLabel(T.devItems[0], 'pass'), 200, 'label pass');
      check(first.verdict === 'pass' && first.criterion === 'single_answer' && first.subject_kind === 'eval_item' && first.subject_id === T.devItems[0] && first.labeled_by_user?.id === S.adminId && first.labeled_at, `label ${j(first)}`);
      await want(putLabel(T.devItems[1], 'fail_major'), 200, 'label fail_major');
      await wantProblem(putLabel(T.held1[0], 'pass'), 409, 'example-held-out', 'label a held-out output');
      check(count(`SELECT count(*) FROM ai_labels WHERE subject_id = '${T.held1[0]}'`) === 0, 'a held-out output got a label');
      await wantProblem(putLabel(randomUUID(), 'pass'), 404, 'not-found', 'label an unknown output');
      await want(putLabel(T.devItems[2], 'fail_minor'), 200, 'a third label');
      const back = await want(putLabel(T.devItems[2], null), 200, 'take the third label back');
      check(back.verdict === null && back.labeled_by_user === null && back.labeled_at === null, `taken back ${j(back)}`);
      const shown = (await runItems(T.r1.id)).items;
      check(shown[0].labels.length === 1 && shown[0].labels[0].verdict === 'pass' && shown[1].labels.length === 1 && shown[1].labels[0].verdict === 'fail_major' && shown[2].labels.length === 0,
        `labels on the items ${j(shown.slice(0, 3).map((item) => item.labels.map((l) => l.verdict)))}`);
      const view = await agreementOf(T.J);
      check(view.label_min === 30 && view.agreement_min === 0.85, `limits ${view.label_min} ${view.agreement_min}`);
      const row = view.items.find((entry) => entry.revision === 2 && entry.criterion === 'single_answer');
      check(j({ labeled: row.labeled, agree: row.agree, agree_exact: row.agree_exact, rate: row.rate, exact_rate: row.exact_rate, calibrated: row.calibrated })
        === j({ labeled: 2, agree: 1, agree_exact: 1, rate: 0.5, exact_rate: 0.5, calibrated: false }), `agreement revision 2 ${j(row)}`);
      const old = view.items.find((entry) => entry.revision === 1);
      check(old.labeled === 0 && old.rate === null && old.calibrated === false, `agreement revision 1 ${j(old)}`);
      ok('labels pass + fail_major kept, the held-out output → example-held-out, an unknown output → 404, a label put and taken back; agreement revision 2: labeled 2, agree 1 (rate 0.5), calibrated false (30 labels needed); revision 1: labeled 0');
    });

    await step('M3.7 B11, B16: a second live run R2 without a judge → compare R1 / R2 lists judge_unmatched; two judge passes started at once never judge an output twice; then the comparison holds one judge row', async () => {
      T.r2 = await runAndWait({ operation: op, config: 'live', set_id: T.set.id });
      check(T.r2.status === 'finished' && T.r2.complete === true && T.r2.set_id === T.set.id, `R2 ${j({ status: T.r2.status, complete: T.r2.complete })}`);
      T.n2 = judgeable(T.r2.id);
      T.held2 = ids(itemSql(T.r2.id, `split = 'held_out'`));
      const compareUrl = `${ai}/eval/runs/compare?a=${T.r1.id}&b=${T.r2.id}`;
      const unmatched = await want(asAdmin('GET', compareUrl), 200, 'compare R1 and R2');
      check(j(unmatched.judge) === '[]' && unmatched.judge_unmatched.length === 1 && unmatched.judge_unmatched[0].revision === 2 && unmatched.judge_unmatched[0].scored === 'a'
        && unmatched.judge_unmatched[0].judge_name === T.name, `unmatched ${j({ judge: unmatched.judge, judge_unmatched: unmatched.judge_unmatched })}`);
      const calls = judgeCalls();
      const both = await Promise.all([1, 2].map(() => startPass(T.r2.id, T.J)));
      const accepted = both.filter((res) => res.status === 202).map((res) => res.json);
      check(accepted.length >= 1 && both.every((res) => res.status === 202 || (res.status === 409 && String(res.json?.type).endsWith('judge-pass-running'))), `starts ${both.map((r) => `${r.status} ${r.json?.type ?? ''}`).join(' | ')}`);
      const working = accepted.filter((pass) => pass.total > 0);
      check(working.length === 1 && working[0].total === T.n2 && accepted.filter((pass) => pass.total === 0).length === accepted.length - 1, `accepted passes ${j(accepted.map((p) => [p.total, p.status]))}`);
      T.p2 = working[0].id;
      const pass = await passDone(T.p2);
      check(pass.status === 'finished' && pass.judged === T.n2 && pass.total === T.n2, `pass ${j(pass)}`);
      check(judgeCalls() === calls + T.n2, `judge calls ${calls} + ${T.n2} expected, found ${judgeCalls()}`);
      const res = await asAdmin('GET', compareUrl);
      check(res.status === 200, `compare ${res.status}`);
      const compared = res.json;
      const devN = T.n1 - T.held1.length;
      check(compared.judge.length === 1 && j(compared.judge_unmatched) === '[]', `compare judge ${j(compared.judge)} unmatched ${j(compared.judge_unmatched)}`);
      const row = compared.judge[0];
      check(row.revision === 2 && row.criterion === 'single_answer' && j(row.a.dev) === j(tally(devN)) && j(row.b.dev) === j(tally(devN))
        && j(row.a.held_out) === j(tally(T.held1.length)) && j(row.b.held_out) === j(tally(T.held2.length)), `judge row ${j(row)}`);
      for (const hidden of [...T.held1, ...T.held2]) check(!res.text.includes(hidden), `the comparison names the held-out id ${hidden}`);
      ok(`compare before the pass: judge [], judge_unmatched revision 2 scored a; two starts at once → ${both.map((r) => r.status).join(' + ')} (one working pass of ${T.n2}, judge calls ${calls} → ${calls + T.n2}); after it one judge row (dev ${j(row.a.dev)}, held-out as numbers only)`);
    });

    await step('M3.8 design §6.3 step 3: a fake:bad-form draft judged by J on the same set → the publish check warns judge-rate-drop (revision 2, single_answer, 0 passed); publish without acknowledging → 409 publish-warnings with it; the draft goes', async () => {
      await createDraft(op);
      await setDraftModel(op, 'fake:bad-form');
      const created = await want(startRun({ operation: op, config: 'draft', set_id: T.set.id, judge_id: T.J }), 202, 'run the bad-form draft with a judge');
      T.r3 = await runDone(created.run_id);
      check(T.r3.status === 'finished' && T.r3.complete === true && T.r3.set_id === T.set.id, `R3 ${j({ status: T.r3.status, complete: T.r3.complete })}`);
      const pass = await passDone(created.judge_pass_id);
      T.n3 = judgeable(T.r3.id);
      check(pass.status === 'finished' && pass.total === T.n3 && pass.judged === T.n3, `pass ${j(pass)}`);
      const pc = await checkOf(op);
      check(pc.candidate_run_id === T.r3.id && pc.baseline.run_id === T.r2.id, `candidate ${pc.candidate_run_id}, baseline ${pc.baseline.run_id}`);
      const drop = pc.warnings.find((warning) => warning.code === 'judge-rate-drop');
      check(drop && drop.revision === 2 && drop.criterion === 'single_answer' && drop.judge_name === T.name && j(drop.before) === j({ passed: T.n2, counted: T.n2 }) && j(drop.after) === j({ passed: 0, counted: T.n3 }),
        `warnings ${j(pc.warnings.map((w) => [w.code, w.criterion ?? null]))}, judge drop ${j(drop)}`);
      const refused = await wantProblem(publishDraft(op, publishBody(pc)), 409, 'publish-warnings', 'publish without acknowledging');
      check(refused.warnings.some((warning) => warning.code === 'judge-rate-drop'), `the 409 lists ${j(refused.warnings.map((w) => w.code))}`);
      await want(asAdmin('DELETE', `/v1/admin/ai/configs/${op}/draft`), 204, 'delete the draft');
      check((await configsOf(op)).draft === null, 'the draft is still there');
      ok(`R3 (bad-form, ${T.n3} outputs) judged; judge-rate-drop revision 2 single_answer ${j(drop.before)} → ${j(drop.after)}; all warnings: ${pc.warnings.map((w) => w.code).join(', ')}; publish without acknowledging → publish-warnings; draft deleted (R3 stays)`);
    });

    await step('M3.8b D15, B17: calibrated follows judge_label_min and judge_agreement_min — ten labels over R1 and R3, the judge agrees with all but one; 30 labels needed by default; 10 and 0.85 → calibrated; 10 and 0.95 → not', async () => {
      const r1 = await runItems(T.r1.id);
      const r3 = await runItems(T.r3.id);
      const labeled = r1.items.length + r3.items.length;
      check(labeled >= 10, `only ${labeled} labelable outputs; judge_label_min cannot go under 10`);
      check(r3.items.every((item) => item.scores.some((score) => score.revision === 2 && score.verdict === 'fail_major' && score.reason === 'fake judge')), `R3 scores ${j(r3.items.map((i) => i.scores.map((s) => s.verdict)))}`);
      for (const item of r1.items.slice(2)) await want(putLabel(item.item_id, 'pass'), 200, 'label R1 pass');
      for (const item of r3.items) await want(putLabel(item.item_id, 'fail_major'), 200, 'label R3 fail_major');
      const measure = async () => {
        const view = await agreementOf(T.J);
        return { view, row: view.items.find((entry) => entry.revision === 2 && entry.criterion === 'single_answer') };
      };
      const expected = { labeled, agree: labeled - 1, agree_exact: labeled - 1, rate: (labeled - 1) / labeled };
      const at = (row) => ({ labeled: row.labeled, agree: row.agree, agree_exact: row.agree_exact, rate: row.rate });
      let { view, row } = await measure();
      check(j(at(row)) === j(expected) && row.calibrated === false && view.label_min === 30, `defaults ${j(row)}`);
      try {
        await setAi({ judge_label_min: 10 });
        ({ view, row } = await measure());
        check(j(at(row)) === j(expected) && row.calibrated === true && view.label_min === 10, `label_min 10 ${j(row)}`);
        const stat = (await runItems(T.r1.id)).judge_stats.find((entry) => entry.revision === 2 && entry.criterion === 'single_answer');
        check(stat.calibrated === true, `judge_stats ${j(stat)}`);
        await setAi({ judge_agreement_min: 0.95 });
        ({ view, row } = await measure());
        check(row.calibrated === false && view.agreement_min === 0.95 && row.rate === expected.rate, `agreement_min 0.95 ${j(row)}`);
        check((await runItems(T.r1.id)).judge_stats.find((entry) => entry.revision === 2).calibrated === false, 'judge_stats still calibrated at 0.95');
      } finally {
        await setAi({ judge_label_min: 30, judge_agreement_min: 0.85 });
      }
      ({ view, row } = await measure());
      check(row.calibrated === false && view.label_min === 30 && view.agreement_min === 0.85, `restored ${j(row)}`);
      ok(`${labeled} labels (R1 ${r1.items.length}, R3 ${r3.items.length}), agree ${expected.agree} (rate ${expected.rate}): 30 / 0.85 → calibrated false; 10 / 0.85 → true (also in judge_stats); 10 / 0.95 → false; limits back to 30 / 0.85`);
    });

    await step('M3.9 B21: the daily call cap counts learner calls only — cap = learner calls today + 1 although admin calls today are far more: one learner call succeeds, the next is unavailable / daily-call-cap; the cap goes back', async () => {
      const before = await statusOf();
      const learner = callsToday(`purpose = 'learner'`);
      const admin = callsToday(`purpose IN ('test', 'eval', 'judge')`);
      check(before.today.calls === learner && admin > learner && callsToday('true') === learner + admin, `status.today.calls ${before.today.calls}, learner calls ${learner}, admin calls ${admin}, all ${callsToday('true')}`);
      await setAi({ daily_provider_calls_cap: learner + 1 });
      try {
        const first = learnerCall();
        const second = learnerCall();
        check(first.status === 'succeeded', `first learner call ${j(first)}`);
        check(second.status === 'unavailable' && second.reason === 'daily-call-cap', `second learner call ${j(second)}`);
      } finally {
        await setAi({ daily_provider_calls_cap: T.dailyCap });
      }
      const after = await statusOf();
      check(after.today.calls === learner + 1 && after.today.cap === T.dailyCap, `status after ${j(after.today)}`);
      ok(`learner calls ${learner}, admin calls ${admin} (status.today.calls = ${before.today.calls}); cap ${learner + 1}: one succeeded, the next unavailable / daily-call-cap; cap back to ${T.dailyCap}, calls ${after.today.calls}`);
    });

    await step('M3.10 E15, B19, B20: fake:not-recognized priced 1000/1000 → the clone judged with it stops at the cap (failed / admin-usd-cap, 1..3 of N judged), R1 stays finished and complete; a new run and a draft test → 409 admin-usd-cap', async () => {
      const priced = await want(asAdmin('POST', `${ai}/models`, { body: { provider: 'fake', model_id: 'fake:not-recognized', price_input: 1000, price_output: 1000 } }), 201, 'add fake:not-recognized');
      check(priced.price?.input === '1000.0000' && priced.price?.output === '1000.0000', `price ${j(priced.price)}`);
      S.models.set('fake:not-recognized', priced);
      const saved = await saveJudge(await getJudge(T.clone), { model_ref: priced.id });
      check(saved.latest.revision === 3 && saved.latest.model?.model_id === 'fake:not-recognized', `clone ${j({ revision: saved.latest.revision, model: saved.latest.model })}`);
      const cap = await capAboveSpent();
      await setAi({ admin_daily_usd_cap: cap });
      const callsBefore = judgeCalls();
      const started = await want(startPass(T.r1.id, T.clone), 202, 'pass of the priced clone');
      const pass = await passDone(started.id);
      check(started.total === T.n1 && pass.status === 'failed' && pass.error === 'admin-usd-cap' && pass.judged >= 1 && pass.judged <= 3 && pass.judged < pass.total, `pass ${j(pass)}`);
      check(judgeCalls() === callsBefore + pass.judged && pass.cost_usd === (pass.judged * 0.15).toFixed(8), `calls ${callsBefore} → ${judgeCalls()}, cost ${pass.cost_usd} for ${pass.judged} judged`);
      const r1 = await want(asAdmin('GET', `${ai}/eval/runs/${T.r1.id}`), 200, 'GET R1');
      check(r1.status === 'finished' && r1.complete === true && r1.error === null, `R1 ${j({ status: r1.status, complete: r1.complete, error: r1.error })}`);
      const runsBefore = count('SELECT count(*) FROM ai_eval_runs');
      await wantProblem(startRun({ operation: op, config: 'live', set_id: T.set.id }), 409, 'admin-usd-cap', 'a run at the cap');
      check(count('SELECT count(*) FROM ai_eval_runs') === runsBefore, 'a run refused at the cap was stored');
      await createDraft(op);
      await wantProblem(asAdmin('POST', `/v1/admin/ai/configs/${op}/draft/test`, { body: {} }), 409, 'admin-usd-cap', 'a draft test at the cap');
      ok(`cap ${cap} USD (today's admin spend rounded up to the cent, plus 0.10): the clone's pass on R1 ended failed / admin-usd-cap after ${pass.judged} of ${pass.total} (cost ${pass.cost_usd}); R1 still finished and complete; POST runs and draft/test → 409 admin-usd-cap; a new draft is kept for M3.12`);
    });

    await step('M3.11 B18, E15: with no cap and fake:ok priced 1000/1000 a live run costs 0.15 a call and finishes; with the cap at spent + 0.10 the next run stops (failed / admin-usd-cap, complete false, 1..3 of N done)', async () => {
      await setAi({ admin_daily_usd_cap: null });
      const okModel = S.models.get('fake:ok');
      await want(asAdmin('PATCH', `${ai}/models/${okModel.id}`, { body: { price_input: 1000, price_output: 1000 } }), 200, 'price fake:ok');
      try {
        const free = await runAndWait({ operation: op, config: 'live', set_id: T.set.id });
        check(free.status === 'finished' && free.complete === true && free.cost_usd === (free.total * 0.15).toFixed(8) && free.cost_unknown_count === 0, `uncapped run ${j({ status: free.status, total: free.total, cost_usd: free.cost_usd })}`);
        const cap = await capAboveSpent();
        await setAi({ admin_daily_usd_cap: cap });
        const stopped = await runAndWait({ operation: op, config: 'live', set_id: T.set.id });
        check(stopped.status === 'failed' && stopped.error === 'admin-usd-cap' && stopped.complete === false && stopped.done >= 1 && stopped.done <= 3 && stopped.done < stopped.total,
          `capped run ${j({ status: stopped.status, error: stopped.error, complete: stopped.complete, done: stopped.done, total: stopped.total })}`);
        ok(`no cap: run ${free.id} finished, cost ${free.cost_usd} (${free.total} calls × 0.15); cap ${cap}: run ${stopped.id} failed / admin-usd-cap with ${stopped.done} of ${stopped.total} done, not complete`);
      } finally {
        await want(asAdmin('PATCH', `${ai}/models/${okModel.id}`, { body: { price_input: 0, price_output: 0 } }), 200, 'price fake:ok back to 0');
      }
    });

    await step('M3.12 B22, E14: with the cap at 0 an unpriced model is still refused first — pass, draft test and run on fake:refuse (no input price) → 409 model-price-missing; a priced model at cap 0 → admin-usd-cap; cap back to null', async () => {
      await setAi({ admin_daily_usd_cap: 0 });
      try {
        const refuse = await addModel('fake:refuse');
        const unpriced = await want(asAdmin('PATCH', `${ai}/models/${refuse.id}`, { body: { price_input: null } }), 200, 'clear the input price of fake:refuse');
        check(unpriced.price === null, `price ${j(unpriced.price)}`);
        await saveJudge(await getJudge(T.clone), { model_ref: refuse.id });
        const callsBefore = judgeCalls();
        await wantProblem(startPass(T.r1.id, T.clone), 409, 'model-price-missing', 'a pass with an unpriced judge model');
        check(judgeCalls() === callsBefore, 'a refused pass made a judge call');
        const { draft } = await configsOf(op);
        check(draft, 'the draft of M3.10 is gone');
        const withRefuse = await saveDraft(op, draft, { model_ref: refuse.id });
        await wantProblem(asAdmin('POST', `/v1/admin/ai/configs/${op}/draft/test`, { body: {} }), 409, 'model-price-missing', 'a draft test on an unpriced model');
        const runsBefore = count('SELECT count(*) FROM ai_eval_runs');
        await wantProblem(startRun({ operation: op, config: 'draft', set_id: T.set.id }), 409, 'model-price-missing', 'a run of an unpriced draft');
        check(count('SELECT count(*) FROM ai_eval_runs') === runsBefore, 'a refused run was stored');
        const priced = await saveDraft(op, withRefuse, { model_ref: S.models.get('fake:ok').id });
        await wantProblem(asAdmin('POST', `/v1/admin/ai/configs/${op}/draft/test`, { body: {} }), 409, 'admin-usd-cap', 'a draft test on a priced model at cap 0');
        check(priced.model?.model_id === 'fake:ok', `draft model ${j(priced.model)}`);
      } finally {
        await setAi({ admin_daily_usd_cap: null });
      }
      await want(asAdmin('DELETE', `/v1/admin/ai/configs/${op}/draft`), 204, 'delete the draft');
      ok('cap 0: pass, draft test and run with fake:refuse (price_input null) → model-price-missing and nothing stored or called; the same draft on fake:ok (price 0) → admin-usd-cap; cap null again; draft deleted');
    });

    await step('M3.13 B34: a model named by any revision of a judge cannot be deleted (409 model-in-use) — fake:not-recognized only by an older clone revision, fake:refuse by the newest; an unused model goes (204)', async () => {
      const models = (await want(asAdmin('GET', `${ai}/models?provider=fake`), 200, 'list models')).items;
      const idOf = (modelId) => models.find((row) => row.model_id === modelId)?.id;
      const clone = await getJudge(T.clone);
      check(clone.latest.revision === 4 && clone.latest.model?.model_id === 'fake:refuse', `clone ${j({ revision: clone.latest.revision, model: clone.latest.model })}`);
      for (const modelId of ['fake:not-recognized', 'fake:refuse']) {
        check(idOf(modelId), `model ${modelId} is not listed`);
        await wantProblem(asAdmin('DELETE', `${ai}/models/${idOf(modelId)}`), 409, 'model-in-use', `delete ${modelId}`);
      }
      const spare = await want(asAdmin('POST', `${ai}/models`, { body: { provider: 'fake', model_id: 'fake:truncated' } }), 201, 'add fake:truncated');
      await want(asAdmin('DELETE', `${ai}/models/${spare.id}`), 204, 'delete an unused model (control)');
      ok('fake:not-recognized (clone revision 3) and fake:refuse (clone revision 4) → model-in-use; an unused fake:truncated deleted (204)');
    });

    await step('M3.14 D16, B3: deleting a labelled run hides it (204; 404 everywhere, off the list; labels, scores and agreement stay); deleting an unlabelled run removes its items, passes and scores', async () => {
      const agreementBefore = await agreementOf(T.J);
      const itemIds = ids(itemSql(T.r1.id));
      const itemList = itemIds.map((id) => `'${id}'`).join(',');
      const labelsBefore = count(`SELECT count(*) FROM ai_labels WHERE subject_id IN (${itemList})`);
      const scoresBefore = count(`SELECT count(*) FROM ai_judge_scores WHERE subject_id IN (${itemList})`);
      check(labelsBefore >= 5 && scoresBefore >= itemIds.length, `labels ${labelsBefore}, scores ${scoresBefore} on ${itemIds.length} items`);
      await want(asAdmin('DELETE', `${ai}/eval/runs/${T.r1.id}`), 204, 'delete the labelled run');
      for (const path of [`${ai}/eval/runs/${T.r1.id}`, `${ai}/eval/runs/${T.r1.id}/items`, `${ai}/eval/runs/compare?a=${T.r1.id}&b=${T.r3.id}`]) {
        await wantProblem(asAdmin('GET', path), 404, 'not-found', `GET ${path}`);
      }
      await wantProblem(startPass(T.r1.id, T.J), 404, 'not-found', 'a pass on the hidden run');
      await wantProblem(putLabel(itemIds[0], 'pass'), 404, 'not-found', 'a label on a hidden item');
      const listed = (await want(asAdmin('GET', `${ai}/eval/runs?operation=${op}&page_size=100`), 200, 'list runs')).items.map((row) => row.id);
      check(!listed.includes(T.r1.id) && listed.includes(T.r2.id) && listed.includes(T.r3.id), `listed runs ${j(listed)}`);
      check(psql(`SELECT (hidden_at IS NOT NULL)::text FROM ai_eval_runs WHERE id = '${T.r1.id}'`) === 'true'
        && count(`SELECT count(*) FROM ai_eval_run_items WHERE run_id = '${T.r1.id}' AND hidden`) === itemIds.length, 'the run or its items are not hidden');
      check(count(`SELECT count(*) FROM ai_labels WHERE subject_id IN (${itemList})`) === labelsBefore && count(`SELECT count(*) FROM ai_judge_scores WHERE subject_id IN (${itemList})`) === scoresBefore, 'labels or scores changed');
      check(j((await agreementOf(T.J)).items) === j(agreementBefore.items), 'the agreement changed after hiding the run');
      const r2Items = ids(itemSql(T.r2.id));
      const r2List = r2Items.map((id) => `'${id}'`).join(',');
      check(r2Items.length === T.n2 && count(`SELECT count(*) FROM ai_judge_scores WHERE subject_id IN (${r2List})`) === T.n2 && count(`SELECT count(*) FROM ai_judge_passes WHERE eval_run_id = '${T.r2.id}'`) >= 1
        && count(`SELECT count(*) FROM ai_labels WHERE subject_id IN (${r2List})`) === 0, 'R2 is not an unlabelled, judged run');
      await want(asAdmin('DELETE', `${ai}/eval/runs/${T.r2.id}`), 204, 'delete the unlabelled run');
      check(count(`SELECT count(*) FROM ai_eval_runs WHERE id = '${T.r2.id}'`) === 0 && count(`SELECT count(*) FROM ai_eval_run_items WHERE run_id = '${T.r2.id}'`) === 0
        && count(`SELECT count(*) FROM ai_judge_passes WHERE eval_run_id = '${T.r2.id}'`) === 0 && count(`SELECT count(*) FROM ai_judge_scores WHERE subject_id IN (${r2List})`) === 0, 'something of R2 is left');
      await wantProblem(asAdmin('GET', `${ai}/eval/runs/${T.r2.id}`), 404, 'not-found', 'GET the deleted run');
      ok(`R1 (${labelsBefore} labels, ${scoresBefore} scores): 204, 404 on the run, its items, a comparison, a new pass and a new label, off the list; labels, scores and the agreement unchanged; R2 (${T.n2} scores, no label): 204 and no run, item, pass or score left`);
    });

    await step('M3.15 GET status: today.admin_usd_cap null (the part leaves the cap off), admin_cost_usd = what test, eval and judge calls cost today, calls = learner calls, cap = the learner cap', async () => {
      const status = await statusOf();
      const adminSpent = Number(psql(`SELECT coalesce(sum(cost_usd), 0) FROM ai_calls WHERE created_at >= ${vnDayStart} AND purpose IN ('test', 'eval', 'judge')`));
      const learner = callsToday(`purpose = 'learner'`);
      check(status.today.admin_usd_cap === null && Number(status.today.admin_cost_usd) > 0 && Math.abs(Number(status.today.admin_cost_usd) - adminSpent) < 1e-6, `admin ${j({ cap: status.today.admin_usd_cap, cost: status.today.admin_cost_usd })}, ledger ${adminSpent}`);
      check(status.today.calls === learner && status.today.cap === T.dailyCap && Number(status.today.cost_usd) >= Number(status.today.admin_cost_usd), `today ${j(status.today)}, learner calls ${learner}`);
      ok(`admin_usd_cap null, admin_cost_usd ${status.today.admin_cost_usd} (ledger ${adminSpent}), calls ${status.today.calls} = learner calls, cap ${status.today.cap}`);
    });
  } finally {
    S.admin = outer.admin;
    S.adminId = outer.adminId;
  }
}

// =====================================================================================================================
// M4 — real questions (design K4, plan M4-T11): the real AI questions of learners are judged and turned into examples. The part acts as a fourth
// admin A4 (a real-judge pass spends no `ai.test` hit; the publishes of M4.2 go through a fifth admin, the publisher, so A4 keeps most of its
// `user.write` budget of 30 a minute), makes an editor E (staff) and a learner L with `POST /v1/admin/users`, lets both practise AI questions on the
// fake provider, and judges them with the seeded judge J saved on `fake:bad-form` (every verdict `fail_major`, reason 'fake: another word fits').
// E owns a private word P: the questions that touch it must never reach a judge or the example set. It leaves behind: J's latest revision on
// `fake:bad-form` (revision 4) and its operations as before ([generate_cloze]); `S.editor` (E, an editor again) and `S.learner` (L) with their tokens
// and ids (E has AI items it never reported); finished real passes and no queued or running one; the examples it added (dev; sources real_judge and
// report); `ai.real_judge_limit` 200, `ai.content_retention_days` 7, `ai.admin_daily_usd_cap` null and `fake:bad-form` priced as before.
async function partM4() {
  const op = 'generate_cloze';
  const ai = '/v1/admin/ai';
  const real = '/v1/admin/practice/real-judge';
  const fromSource = '/v1/admin/practice/eval-examples/from-source';
  const PRACTICE_OPS = ['generate_cloze', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'];
  const AI_UNITS = 40;
  const T = {};
  const outer = { admin: S.admin, adminId: S.adminId };

  /** JSON with object keys sorted: a jsonb column hands its keys back in another order. */
  const canon = (value) => (Array.isArray(value) ? `[${value.map(canon).join(',')}]`
    : value !== null && typeof value === 'object'
      ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canon(value[key])}`).join(',')}}` : JSON.stringify(value));
  const rows = (sql) => psql(sql).split(/\r?\n/).filter(Boolean).map((line) => line.split('|'));
  const skip = (privateWord, noContent, alreadyJudged) => canon({ private_word: privateWord, no_content: noContent, already_judged: alreadyJudged });
  const ESTIMATE_KEYS = ['admin_usd_cap', 'estimate_usd', 'judge_revision', 'limit', 'pairs', 'reason', 'remaining', 'retention_days', 'selected', 'skipped'];
  const ITEM_KEYS = ['can_add_to_examples', 'config_number', 'context', 'created_at', 'failed', 'input', 'labels', 'model', 'output', 'provider', 'question_id', 'scores'];
  const REASON = 'fake: another word fits';

  // Judges and settings (as partM3's helpers; they are local to that part).
  const listJudges = async () => (await want(asAdmin('GET', `${ai}/judges`), 200, 'GET judges')).items;
  const getJudge = async (id) => {
    const found = (await listJudges()).find((judge) => judge.id === id);
    check(found, `judge ${id} is not listed`);
    return found;
  };
  const judgeBody = (view, changes = {}) => ({
    expected_revision: view.latest.revision, name: view.name, operations: view.operations, active: view.active, criteria: view.latest.criteria,
    instructions: view.latest.instructions, examples: view.latest.examples, model_ref: view.latest.model?.id ?? null, effort: view.latest.effort,
    thinking: view.latest.thinking, max_output_tokens: view.latest.max_output_tokens, ...changes,
  });
  const putJudge = (view, changes) => asAdmin('PUT', `${ai}/judges/${view.id}`, { body: judgeBody(view, changes) });
  const saveJudge = (view, changes) => want(putJudge(view, changes), 200, `save judge ${view.name}`);
  const putSettings = async (patch) => {
    const current = await want(asAdmin('GET', '/v1/admin/settings'), 200, 'GET settings');
    return asAdmin('PUT', '/v1/admin/settings', { idem: true, body: { version: current.version, values: { ai: patch } } });
  };
  async function setAi(patch) {
    const saved = await want(putSettings(patch), 200, `PUT settings ${j(patch)}`);
    for (const [key, value] of Object.entries(patch)) check(saved.values.ai[key] === value, `setting ai.${key} is ${j(saved.values.ai[key])} after saving ${j(value)}`);
    return saved.values.ai;
  }
  const judgeCalls = () => count(`SELECT count(*) FROM ai_calls WHERE purpose = 'judge'`);
  const realPassRows = () => count(`SELECT count(*) FROM ai_judge_passes WHERE kind = 'real'`);
  const exampleRows = () => count('SELECT count(*) FROM ai_eval_examples');

  // The real-judge and from-source routes. `F` is a filter set; the estimate takes it as a query, the start as a body.
  const F = (extra = {}) => ({ judge_id: T.J, operation: op, config: null, test_accounts_only: false, ...extra });
  const queryOf = (f) => new URLSearchParams({
    judge_id: f.judge_id, operation: f.operation, ...(f.config ? { config_number: String(f.config.number), model: f.config.model } : {}), test_accounts_only: String(f.test_accounts_only),
  }).toString();
  const estimateRaw = (f, as = S.admin) => api('GET', `${real}/estimate?${queryOf(f)}`, { as });
  const estimate = (f, as) => want(estimateRaw(f, as), 200, `estimate ${j(f)}`);
  const startRaw = (f, as = S.admin, key) => api('POST', real, {
    as, idem: true, key, body: { judge_id: f.judge_id, operation: f.operation, config: f.config, test_accounts_only: f.test_accounts_only } });
  const itemsRaw = (id, as = S.admin) => api('GET', `${real}/passes/${id}/items`, { as });
  const passEnded = (id) => waitFor(() => want(itemsRaw(id), 200, `GET the items of pass ${id}`),
    (result) => result.pass.status === 'finished' || result.pass.status === 'failed', `real pass ${id} ending`, 60_000);
  const passList = async (as = S.admin) => (await want(api('GET', `${real}/passes?page_size=100`, { as }), 200, 'GET real passes')).items;
  const previewRaw = (ref, as = S.admin) => api('GET', `${fromSource}?${new URLSearchParams(ref)}`, { as });
  const preview = (ref) => want(previewRaw(ref), 200, `preview ${j(ref)}`);
  const addRaw = (body, { as = S.admin, key } = {}) => api('POST', fromSource, { as, idem: true, key, body });
  const exampleOf = async (id) => (await listExamples(op)).find((example) => example.id === id);

  // Accounts and practice.
  async function makeAccount(email, staffRole) {
    await want(asAdmin('POST', '/v1/admin/users', { body: { email, staff_role: staffRole, password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, `create ${email}`);
    const actor = { email, token: await loginToken(email) };
    actor.id = (await want(api('GET', '/v1/me', { as: actor }), 200, `${email} profile`)).id;
    return actor;
  }
  const startSession = async (as, body) => (await want(api('POST', '/v1/practice/sessions', { as, idem: true, body }), 201, `start ${j(body)}`)).session;
  const nextItem = (as, sessionId) => want(api('POST', `/v1/practice/sessions/${sessionId}/next`, { as }), 200, 'next');
  const prepare = (as, sessionId) => want(api('POST', `/v1/practice/sessions/${sessionId}/prepare`, { as }), 200, 'prepare');
  const answer = (as, itemId, body) => want(api('POST', `/v1/practice/items/${itemId}/answer`, { as, idem: true, body }), 200, `answer ${j(body)}`);
  const finish = (as, sessionId) => api('POST', `/v1/practice/sessions/${sessionId}/finish`, { as });
  function itemInfo(itemId) {
    const [found] = rows(`SELECT i.sense_id, q.id, q.source, q.type, coalesce(q.ai_request_id, ''), q.user_id FROM practice_session_items i
      JOIN practice_questions q ON q.id = i.question_id WHERE i.id = '${itemId}'`);
    check(found, `item ${itemId} not found`);
    const [senseId, questionId, source, type, aiRequestId, userId] = found;
    return { senseId, questionId, source, type, aiRequestId, userId };
  }
  /** `n` AI cloze questions of a session, each made by `prepare` before `next` shows it, each answered right; the session is finished. */
  async function askCloze(actor, session, n) {
    const asked = [];
    await prepare(actor, session.id);
    for (let k = 0; k < n; k += 1) {
      const shown = await nextItem(actor, session.id);
      check(shown.state === 'question' && shown.item.type === 'cloze', `question ${k + 1} of ${actor.email}: ${j(shown)}`);
      const info = itemInfo(shown.item.item_id);
      check(info.source === 'ai' && info.userId === actor.id, `question ${k + 1} is ${j(info)}`);
      await prepare(actor, session.id);
      const lemma = T.lemma.get(info.senseId);
      check(lemma, `sense ${info.senseId} is none of the part's words`);
      const result = await answer(actor, shown.item.item_id, { text: lemma });
      check(result.result === 'correct', `answer to ${lemma}: ${j(result)}`);
      asked.push({ itemId: shown.item.item_id, lemma, ...info });
    }
    await finish(actor, session.id);
    return asked;
  }
  /** What the AI was sent for a question while its request is kept (`practice_ai_requests.ai_input.data`). */
  const requestData = (requestId) => JSON.parse(psql(`SELECT ai_input->'data' FROM practice_ai_requests WHERE id = '${requestId}'`));
  const questionsOf = (userId, senseWhere = 'true') => rows(`SELECT id, sense_id FROM practice_questions WHERE user_id = '${userId}' AND source = 'ai'
    AND ai_meta->>'operation' = '${op}' AND ${senseWhere} ORDER BY created_at, id`);

  try {
    await step('M4.0 a fourth admin A4 (POST /v1/admin/users) acts for this part and settings start at their defaults (real_judge_limit 200, content_retention_days 7, no admin cap); the judge J is the seeded one at revision 2 on fake:ok', async () => {
      const email = `smokenb-admin4-${run}@example.com`;
      await want(asAdmin('POST', '/v1/admin/users', { body: { email, staff_role: 'admin', password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, `create ${email}`);
      S.admin = { email, token: await loginToken(email) };
      const me = await want(asAdmin('GET', '/v1/me'), 200, 'A4 profile');
      check(me.id !== outer.adminId, 'A4 is the first admin');
      S.adminId = me.id;
      const { values } = await want(asAdmin('GET', '/v1/admin/settings'), 200, 'GET settings');
      check(j([values.ai.real_judge_limit, values.ai.content_retention_days, values.ai.admin_daily_usd_cap]) === j([200, 7, null]), `ai settings ${j(values.ai)}`);
      const seeded = (await listJudges()).find((judge) => judge.name === 'Chỉ một đáp án');
      check(seeded && j(seeded.operations) === j([op]) && seeded.active === true && seeded.latest.revision === 2 && seeded.latest.model?.model_id === 'fake:ok',
        `seeded judge ${j(seeded && { name: seeded.name, operations: seeded.operations, active: seeded.active, revision: seeded.latest.revision, model: seeded.latest.model })}`);
      T.J = seeded.id;
      T.name = seeded.name;
      ok(`A4 ${email} (${me.id}); real_judge_limit 200, content_retention_days 7, admin_daily_usd_cap null; judge ${T.J} "${T.name}" revision 2 on fake:ok, operations [${op}]`);
    });

    await step('M4.1 an editor E and a learner L (POST /v1/admin/users, staff_role editor / null), native language vi, Pro with 40 AI units and 200 sessions a day; the publisher admin is made too', async () => {
      T.pub = await makeAccount(`smokenb-publisher-${run}@example.com`, 'admin');
      S.editor = await makeAccount(`smokenb-editor-${run}@example.com`, 'editor');
      S.learner = await makeAccount(`smokenb-learner-${run}@example.com`, null);
      for (const actor of [S.editor, S.learner]) await want(api('PATCH', '/v1/me', { as: actor, body: { native_language: 'vi' } }), 200, `native_language of ${actor.email}`);
      const ends = new Date(Date.now() + 30 * 24 * 3_600_000).toISOString();
      for (const actor of [S.editor, S.learner]) {
        await want(asAdmin('POST', '/v1/admin/entitlements/grants', { idem: true, body: { user_id: actor.id, kind: 'plan', plan: 'pro', ends_at: ends, reason: 'smoke:nhom-b M4' } }), 201, `grant Pro to ${actor.email}`);
        await want(asAdmin('POST', '/v1/admin/entitlements/grants', { idem: true, body: {
          user_id: actor.id, kind: 'limits', limits: { ai_practice_per_cycle: AI_UNITS, practice_sessions_per_day: 200 }, ends_at: ends, reason: 'smoke:nhom-b M4' } }), 201, `grant limits to ${actor.email}`);
        const state = await want(api('GET', '/v1/me/entitlements', { as: actor }), 200, 'entitlements');
        check(state.plan === 'pro' && state.pools.ai_practice.limit === AI_UNITS && state.pools.ai_practice.remaining === AI_UNITS && state.features['ai.practice'].allowed === true, `entitlements of ${actor.email} ${j(state)}`);
      }
      const roles = [];
      for (const [actor, role] of [[S.editor, 'editor'], [S.learner, null]]) {
        const detail = await want(asAdmin('GET', `/v1/admin/users/${actor.id}`), 200, `GET user ${actor.email}`);
        check(detail.staff_role === role && detail.id === actor.id, `${actor.email} staff_role ${detail.staff_role}`);
        roles.push(`${actor.email} (${actor.id}) ${role ?? 'learner'}`);
      }
      check(new Set([S.adminId, T.pub.id, S.editor.id, S.learner.id]).size === 4, 'two of the part\'s accounts are one');
      ok(`${roles.join('; ')}; publisher ${T.pub.email}; both Pro with ${AI_UNITS} AI units`);
    });

    await step('M4.2 fake:ok is live for the four practice operations (the publisher publishes the three that are not); fake:bad-form is priced 1000 / 1000 and saved as the model of J (revision 3); the judge calls so far are counted', async () => {
      const asPub = (method, path, options = {}) => api(method, path, { as: T.pub, ...options });
      const published = [];
      for (const name of PRACTICE_OPS) {
        const live = await publishModel(asPub, { op: name, modelId: 'fake:ok' });
        check(live.model?.model_id === 'fake:ok', `${name} live model ${j(live.model)}`);
        published.push(`${name}=${live.number}`);
      }
      const status = await want(asAdmin('GET', `${ai}/status`), 200, 'AI status');
      for (const name of PRACTICE_OPS) check(status.operations.find((row) => row.operation === name)?.ready === true, `${name} is not ready`);
      T.cloze = (await configsOf(op)).live;
      check(T.cloze.model?.model_id === 'fake:ok' && Number.isInteger(T.cloze.number), `live cloze ${j({ number: T.cloze.number, model: T.cloze.model })}`);
      const bad = (await want(asAdmin('GET', `${ai}/models?provider=fake`), 200, 'list models')).items.find((row) => row.model_id === 'fake:bad-form');
      check(bad, 'fake:bad-form is not listed');
      T.badBefore = bad.price;
      const priced = await want(asAdmin('PATCH', `${ai}/models/${bad.id}`, { body: { price_input: 1000, price_output: 1000 } }), 200, 'price fake:bad-form');
      check(priced.price?.input === '1000.0000' && priced.price?.output === '1000.0000', `price ${j(priced.price)}`);
      T.badId = bad.id;
      T.badRestored = false;
      const saved = await saveJudge(await getJudge(T.J), { model_ref: bad.id });
      check(saved.latest.revision === 3 && saved.latest.model?.model_id === 'fake:bad-form' && j(saved.operations) === j([op]), `judge ${j({ revision: saved.latest.revision, model: saved.latest.model })}`);
      T.rev3 = saved.latest.id;
      T.J0 = judgeCalls();
      ok(`live ${published.join(', ')} (all fake:ok, ready); fake:bad-form priced 1000/1000 (before: ${j(T.badBefore)}); judge ${T.J} revision 3 (${T.rev3}) on fake:bad-form; judge calls so far ${T.J0}`);
    });

    await step('M4.3 E (editor) and L (learner) practise real AI questions: E AI cloze on W1, W2, W3 and its private word P (prepare first) and one MCQ sentence on W1 with mates W2, W3, P; L AI cloze on W1, W2; psql counts 6 cloze and 1 MCQ question', async () => {
      const found = rows(`SELECT e.lemma, s.id FROM entries e JOIN senses s ON s.entry_id = e.id WHERE e.scope = 'catalog'
        AND e.lemma IN (${WORDS.map((w) => `'${w}'`).join(',')}) AND s.live_revision_id IS NOT NULL`);
      T.sense = new Map(found);
      T.lemma = new Map(found.map(([lemma, id]) => [id, lemma]));
      check(T.sense.size === WORDS.length, `${T.sense.size} of ${WORDS.length} words have a live sense`);
      T.P = `zp${letters(6)}`;
      const group = await want(api('POST', '/v1/groups', { as: S.editor, idem: true, body: { name: `M4 E ${run}` } }), 201, 'group of E');
      T.eGroup = group.id;
      for (const word of [W1, W2, W3]) {
        const res = await api('POST', `/v1/groups/${group.id}/items`, { as: S.editor, idem: true, body: { sense_id: T.sense.get(word) } });
        check(res.status === 200 || res.status === 201, `add ${word} to E's group: ${res.status} ${res.text}`);
      }
      const quick = await want(api('POST', '/v1/quick-add', { as: S.editor, idem: true, body: { group_id: group.id, new_word: { lemma: T.P, meaning: 'cánh đồng lúa' } } }), 201, 'quick-add P');
      T.pSense = quick.sense_id;
      T.sense.set(T.P, T.pSense);
      T.lemma.set(T.pSense, T.P);
      // The MCQ first: the group's words are all new, so the queue order is the order they were added in and W1 is asked.
      const mcqSession = await startSession(S.editor, { source: 'group', group_id: group.id, types: ['mcq_sentence'], count: 1 });
      check(mcqSession.ai_planned === 1, `mcq session ${j(mcqSession)}`);
      const shown = await nextItem(S.editor, mcqSession.id);
      check(shown.state === 'question' && shown.item.type === 'mcq_sentence' && shown.item.prompt.options.length === 4, `mcq question ${j(shown)}`);
      T.mcq = itemInfo(shown.item.item_id);
      const mcqLemma = T.lemma.get(T.mcq.senseId);
      check(T.mcq.source === 'ai' && T.mcq.type === 'mcq_sentence' && T.mcq.userId === S.editor.id && mcqLemma === W1, `mcq question ${j(T.mcq)} asks ${mcqLemma}, not ${W1}`);
      const choice = shown.item.prompt.options.findIndex((option) => option.toLowerCase().startsWith(mcqLemma.toLowerCase()));
      check(choice >= 0, `the options ${j(shown.item.prompt.options)} lack ${mcqLemma}`);
      check((await answer(S.editor, shown.item.item_id, { choice })).result === 'correct', 'the MCQ answer is not correct');
      await finish(S.editor, mcqSession.id);
      T.mcqOptions = shown.item.prompt.options;
      // E's cloze session over the same four words (P included), L's over W1 and W2.
      const clozeSession = await startSession(S.editor, { source: 'group', group_id: group.id, types: ['cloze'], count: 4 });
      check(clozeSession.ai_planned === 4 && clozeSession.cloze_source === 'ai', `cloze session ${j(clozeSession)}`);
      T.eAsked = await askCloze(S.editor, clozeSession, 4);
      check(j(sorted(T.eAsked.map((asked) => asked.lemma))) === j(sorted([W1, W2, W3, T.P])), `E was asked ${j(T.eAsked.map((asked) => asked.lemma))}`);
      const lGroup = await want(api('POST', '/v1/groups', { as: S.learner, idem: true, body: { name: `M4 L ${run}` } }), 201, 'group of L');
      for (const word of [W1, W2]) {
        const res = await api('POST', `/v1/groups/${lGroup.id}/items`, { as: S.learner, idem: true, body: { sense_id: T.sense.get(word) } });
        check(res.status === 200 || res.status === 201, `add ${word} to L's group: ${res.status} ${res.text}`);
      }
      const lSession = await startSession(S.learner, { source: 'group', group_id: lGroup.id, types: ['cloze'], count: 2 });
      check(lSession.ai_planned === 2, `L's session ${j(lSession)}`);
      T.lAsked = await askCloze(S.learner, lSession, 2);
      check(j(sorted(T.lAsked.map((asked) => asked.lemma))) === j(sorted([W1, W2])), `L was asked ${j(T.lAsked.map((asked) => asked.lemma))}`);
      const clozeCount = count(`SELECT count(*) FROM practice_questions WHERE source = 'ai' AND ai_meta->>'operation' = '${op}'`);
      const mcqCount = count(`SELECT count(*) FROM practice_questions WHERE source = 'ai' AND ai_meta->>'operation' = 'generate_sentence_mcq'`);
      check(clozeCount === 6 && mcqCount === 1 && questionsOf(S.editor.id).length === 4 && questionsOf(S.learner.id).length === 2, `questions: cloze ${clozeCount}, mcq ${mcqCount}`);
      const requests = count(`SELECT count(*) FROM practice_ai_requests WHERE user_id IN ('${S.editor.id}', '${S.learner.id}') AND state = 'ready'`);
      check(requests === 7, `${requests} ready AI requests, expected 7`);
      ok(`E (${S.editor.id}) practised ${T.eAsked.map((asked) => asked.lemma).join(', ')} (P is ${T.P}, sense ${T.pSense}) and the MCQ on ${mcqLemma} with options ${j(T.mcqOptions)}; L (${S.learner.id}) practised ${T.lAsked.map((asked) => asked.lemma).join(', ')}; 6 cloze + 1 MCQ questions, 7 ready requests`);
    });

    await step('M4.4 B38: content_retention_days = 0 → the estimate says retention-off with nothing selected, the start is 409 nothing-to-judge (retention-off) and calls no judge; 7 again', async () => {
      const calls = judgeCalls();
      const passes = realPassRows();
      await setAi({ content_retention_days: 0 });
      try {
        const est = await estimate(F());
        check(j(Object.keys(est).sort()) === j(ESTIMATE_KEYS) && est.reason === 'retention-off' && est.selected === 0 && est.remaining === 0 && est.retention_days === 0
          && est.judge_revision === 3 && est.estimate_usd === null && canon(est.skipped) === skip(0, 0, 0) && j(est.pairs) === '[]', `estimate ${j(est)}`);
        const refused = await wantProblem(startRaw(F()), 409, 'nothing-to-judge', 'start with no content kept');
        check(refused.reason === 'retention-off' && canon(refused.skipped) === skip(0, 0, 0), `409 ${j(refused)}`);
        check(judgeCalls() === calls && realPassRows() === passes, 'a refused start called a judge or inserted a pass');
      } finally {
        await setAi({ content_retention_days: 7 });
      }
      const back = await estimate(F());
      check(back.reason === null && back.selected === 5 && back.retention_days === 7, `after restoring 7: ${j(back)}`);
      ok('retention 0 → reason retention-off, selected 0, retention_days 0, no pairs; POST → 409 nothing-to-judge reason retention-off; no judge call, no pass; retention 7 → selected 5 again');
    });

    await step('M4.5 estimate: all accounts → 5 questions selected (E 3, L 2), P\'s skipped as private, no cost yet; one pair (live number, fake:ok, 6 questions); only test accounts → E\'s 3', async () => {
      const all = await estimate(F());
      check(j(Object.keys(all).sort()) === j(ESTIMATE_KEYS), `estimate keys ${j(Object.keys(all))}`);
      check(all.judge_revision === 3 && all.selected === 5 && all.remaining === 0 && all.limit === 200 && canon(all.skipped) === skip(1, 0, 0) && all.estimate_usd === null
        && all.admin_usd_cap === null && all.reason === null && all.retention_days === 7, `estimate ${j(all)}`);
      check(canon(all.pairs) === canon([{ config_number: T.cloze.number, model: 'fake:ok', questions: 6 }]), `pairs ${j(all.pairs)}`);
      const test = await estimate(F({ test_accounts_only: true }));
      check(test.selected === 3 && test.remaining === 0 && canon(test.skipped) === skip(1, 0, 0) && test.reason === null && test.estimate_usd === null
        && canon(test.pairs) === canon([{ config_number: T.cloze.number, model: 'fake:ok', questions: 4 }]), `test-account estimate ${j(test)}`);
      check(count(`SELECT count(*) FROM practice_questions WHERE sense_id = '${T.pSense}' AND source = 'ai'`) === 1, 'control: P has no AI question to skip');
      ok(`all: selected 5, skipped private_word 1, estimate_usd null, pairs [{${T.cloze.number}, fake:ok, 6}]; test accounts only: selected 3, pairs 4 questions (E's four, P's included in the pair count and skipped by the rule)`);
    });

    await step('M4.6 B40, D35, B47: E loses its staff role → the test-account estimate selects nothing (reason null: the other staff practised nothing), the start is 409 nothing-to-judge (empty) and calls no judge; E an editor again → 3 selected (the role as it is now)', async () => {
      const calls = judgeCalls();
      const passes = realPassRows();
      await want(asAdmin('PUT', `/v1/admin/users/${S.editor.id}/staff-role`, { body: { staff_role: null } }), 200, 'remove E\'s staff role');
      try {
        const est = await estimate(F({ test_accounts_only: true }));
        check(est.selected === 0 && est.reason === null && est.remaining === 0 && canon(est.skipped) === skip(0, 0, 0) && j(est.pairs) === '[]', `estimate without E ${j(est)}`);
        const refused = await wantProblem(startRaw(F({ test_accounts_only: true })), 409, 'nothing-to-judge', 'start for the test accounts without E');
        check(refused.reason === 'empty' && canon(refused.skipped) === skip(0, 0, 0), `409 ${j(refused)}`);
        check(judgeCalls() === calls && realPassRows() === passes, 'a refused start called a judge or inserted a pass');
        const everyone = await estimate(F());
        check(everyone.selected === 5, `all accounts still select ${everyone.selected}`);
      } finally {
        await want(asAdmin('PUT', `/v1/admin/users/${S.editor.id}/staff-role`, { body: { staff_role: 'editor' } }), 200, 'give E its staff role back');
        S.editor.token = await loginToken(S.editor.email);
      }
      const back = await estimate(F({ test_accounts_only: true }));
      check(back.selected === 3 && canon(back.skipped) === skip(1, 0, 0), `estimate with E back ${j(back)}`);
      ok('E without a role: test-account estimate selected 0 / reason null, POST → 409 nothing-to-judge reason empty, judge calls and passes unchanged, all accounts still 5; E an editor again: selected 3, private_word 1');
    });

    await step('M4.7 B16: a running real pass of the judge\'s revision → a start is 409 judge-pass-running and inserts nothing; the row is deleted again', async () => {
      const running = randomUUID();
      const passes = realPassRows();
      psql(`INSERT INTO ai_judge_passes (id, judge_revision_id, kind, operation, status, started_by, total, heartbeat_at)
        VALUES ('${running}', '${T.rev3}', 'real', '${op}', 'running', '${S.adminId}', 0, now())`);
      try {
        await wantProblem(startRaw(F({ test_accounts_only: true })), 409, 'judge-pass-running', 'a start while a pass of the revision runs');
        check(realPassRows() === passes + 1, 'the refused start inserted a pass');
      } finally {
        psql(`DELETE FROM ai_judge_passes WHERE id = '${running}'`);
      }
      check(realPassRows() === passes, 'the inserted row is still there');
      ok(`a running real pass of revision 3 → 409 judge-pass-running, real passes stay at ${passes + 1} while it exists; deleted again`);
    });

    await step('M4.8 the test-account pass: POST → 201 { pass_id, selected 3, skipped }; the real worker judges it; the items are E\'s three questions with their verdicts, reasons, context and no learner id; P reaches no judge row and no judge call', async () => {
      const started = await want(startRaw(F({ test_accounts_only: true })), 201, 'start the test-account pass');
      check(j(Object.keys(started).sort()) === j(['pass_id', 'selected', 'skipped']) && started.selected === 3 && canon(started.skipped) === skip(1, 0, 0), `start ${j(started)}`);
      T.p1 = started.pass_id;
      const { pass, items } = await passEnded(T.p1);
      T.p1Items = items;
      const cost = psql(`SELECT coalesce(sum(cost_usd), 0)::text FROM ai_calls WHERE purpose = 'judge' AND operation_id LIKE 'judge-${T.p1}-%'`);
      check(pass.id === T.p1 && pass.status === 'finished' && pass.error === null && pass.total === 3 && pass.judged === 3 && pass.revision === 3 && pass.revision_id === T.rev3
        && pass.judge.id === T.J && pass.judge.name === T.name && pass.judge_model?.model_id === 'fake:bad-form' && pass.judge_model.provider === 'fake'
        && j(pass.criteria.map((criterion) => criterion.code)) === j(['single_answer']) && pass.finished_at !== null, `pass ${j(pass)}`);
      check(pass.started_by === S.adminId && pass.started_by_user.id === S.adminId && pass.started_by_user.email === S.admin.email, `started_by ${j(pass.started_by_user)}`);
      check(Math.abs(Number(pass.cost_usd) - Number(cost)) < 1e-9 && Math.abs(Number(pass.cost_usd) - 0.45) < 1e-9, `cost ${pass.cost_usd}, ledger ${cost}`);
      const filters = pass.filters;
      check(filters.operation === op && filters.config === null && filters.test_accounts_only === true && filters.limit === 200 && canon(filters.skipped) === skip(1, 0, 0)
        && Math.abs(Date.parse(filters.since) - (Date.parse(pass.created_at) - 7 * 86_400_000)) < 120_000, `filters ${j(filters)}`);
      const expected = questionsOf(S.editor.id, `sense_id <> '${T.pSense}'`);
      check(expected.length === 3 && j(sorted(items.map((item) => item.question_id))) === j(sorted(expected.map(([id]) => id))), `items ${j(items.map((i) => i.question_id))} vs E's questions ${j(expected)}`);
      const first3 = [W1, W2, W3];
      for (const item of items) {
        const lemma = item.input.word;
        check(first3.includes(lemma) && j(Object.keys(item).sort()) === j(ITEM_KEYS), `item ${j(Object.keys(item))} of ${lemma}`);
        check(psql(`SELECT user_id FROM practice_questions WHERE id = '${item.question_id}'`) === S.editor.id, `question ${item.question_id} is not E's`);
        check(item.failed === true && item.can_add_to_examples === true && item.config_number === T.cloze.number && item.model === 'fake:ok' && item.provider === 'fake' && item.labels.length === 0, `item flags ${j(item)}`);
        check(item.scores.length === 1 && item.scores[0].criterion === 'single_answer' && item.scores[0].verdict === 'fail_major' && item.scores[0].problem === null && item.scores[0].reason === REASON, `scores ${j(item.scores)}`);
        check(j(sorted(item.context.session_words)) === j(sorted(first3.filter((word) => word !== lemma))), `session_words of ${lemma}: ${j(item.context)}`);
        check(item.output.sentence === 'Lan will ___ it tomorrow.' && j(item.output.accepted_answers) === j([lemma]), `output ${j(item.output)}`);
        const asked = T.eAsked.find((entry) => entry.questionId === item.question_id);
        check(canon(item.input) === canon(requestData(asked.aiRequestId)) && item.input.part_of_speech === 'verb' && item.input.meaning_vi === `nghĩa thử ${WORDS.indexOf(lemma) + 1}`, `input ${j(item.input)}`);
      }
      check(items.every((item, k) => k === 0 || items[k - 1].created_at >= item.created_at), `items are not newest first: ${j(items.map((i) => i.created_at))}`);
      const text = j({ pass, items });
      check(text.includes(items[0].question_id), 'control: the response does not name a question');
      for (const secret of [S.editor.id, S.learner.id, S.editor.email, S.learner.email]) check(!text.includes(secret), `the pass response names ${secret}`);
      // P never reaches a judge: no pass item, no judge call content; the controls prove the same queries see W1 and that P exists in Practice.
      const inJudgeRows = (word) => count(`SELECT count(*) FROM ai_judge_pass_items WHERE input::text LIKE '%${word}%' OR output::text LIKE '%${word}%' OR context::text LIKE '%${word}%'`);
      const inJudgeCalls = (word) => count(`SELECT count(*) FROM ai_call_contents c JOIN ai_calls a ON a.id = c.call_id WHERE a.purpose = 'judge' AND c.request::text LIKE '%${word}%'`);
      check(inJudgeRows(W1) >= 1 && inJudgeCalls(W1) >= 1, 'control: the queries do not find W1 in the judge rows or calls');
      check(count(`SELECT count(*) FROM practice_ai_requests WHERE ai_input::text LIKE '%${T.P}%'`) >= 1 && count(`SELECT count(*) FROM entries WHERE lemma = '${T.P}'`) === 1, 'control: P is not in Practice');
      check(inJudgeRows(T.P) === 0 && inJudgeCalls(T.P) === 0, `P (${T.P}) reached the judge: rows ${inJudgeRows(T.P)}, calls ${inJudgeCalls(T.P)}`);
      check(judgeCalls() === T.J0 + 3, `judge calls ${T.J0} → ${judgeCalls()}, expected +3`);
      const passItemId = psql(`SELECT id FROM ai_judge_pass_items WHERE pass_id = '${T.p1}' AND subject_id = '${items[0].question_id}'`);
      const calls = await callsOf(`judge-${T.p1}-${passItemId}`);
      check(calls.length === 1 && calls[0].purpose === 'judge' && calls[0].content?.request, `judge call ${j(calls)}`);
      const sent = calls[0].content.request;
      check(j(Object.keys(sent.data).sort()) === j(['context', 'criteria', 'input', 'output', 'target_operation']) && sent.data.target_operation === op
        && canon(sent.data.context) === canon(items[0].context) && canon(sent.data.input) === canon(items[0].input) && canon(sent.data.output) === canon(items[0].output), `request.data ${j(sent.data)}`);
      const wire = JSON.stringify(sent);
      for (const secret of ['fake:', T.p1, S.editor.id, S.editor.email, S.learner.id]) check(!wire.includes(secret), `the judge request names ${secret}`);
      const listed = await passList();
      check(listed.length >= 1 && listed[0].id === T.p1 && listed[0].started_by_user.id === S.adminId, `listing ${j(listed.map((p) => p.id))}`);
      const again = await estimate(F({ test_accounts_only: true }));
      check(again.selected === 0 && again.remaining === 0 && canon(again.skipped) === skip(1, 0, 3) && again.estimate_usd === null, `estimate after the pass ${j(again)}`);
      ok(`pass ${T.p1} finished: 3 of 3 judged by revision 3 (fake:bad-form), cost ${pass.cost_usd} = ledger ${cost}; items = E's three questions, newest first, each fail_major "${REASON}", config ${T.cloze.number} / fake:ok, session_words the other two of W1-W3; filters ${j({ ...filters, skipped: undefined })}; no learner id in the response; ${T.P} in no ai_judge_pass_items row and no judge call (W1 found there: control); the judge request holds exactly [context, criteria, input, output, target_operation]; judge calls ${T.J0} → ${T.J0 + 3}; test-account estimate now selected 0, already_judged 3`);
    });

    await step('M4.9 all accounts: the estimate prices the 2 questions left at the revision\'s average cost (psql) and shows already_judged 3; the pass over L\'s questions judges them with session_words the other of W1, W2; one pass per question (5 in all), none of P', async () => {
      const average = Number(psql(`SELECT (sum(cost_usd) / sum(judged))::text FROM ai_judge_passes WHERE judge_revision_id = '${T.rev3}' AND judged > 0 AND cost_usd IS NOT NULL`));
      check(Math.abs(average - 0.15) < 1e-9, `average cost per judged question ${average}`);
      const est = await estimate(F());
      check(est.selected === 2 && est.remaining === 0 && canon(est.skipped) === skip(1, 0, 3) && Math.abs(est.estimate_usd - 2 * average) < 1e-9 && est.admin_usd_cap === null, `estimate ${j(est)}`);
      const started = await want(startRaw(F()), 201, 'start the all-accounts pass');
      check(started.selected === 2 && canon(started.skipped) === skip(1, 0, 3), `start ${j(started)}`);
      T.p2 = started.pass_id;
      const { pass, items } = await passEnded(T.p2);
      check(pass.status === 'finished' && pass.total === 2 && pass.judged === 2 && Math.abs(Number(pass.cost_usd) - 0.3) < 1e-9 && pass.filters.test_accounts_only === false, `pass ${j(pass)}`);
      const expected = questionsOf(S.learner.id);
      check(items.length === 2 && j(sorted(items.map((item) => item.question_id))) === j(sorted(expected.map(([id]) => id))), `items ${j(items.map((i) => i.question_id))} vs L's questions ${j(expected)}`);
      for (const item of items) {
        const lemma = item.input.word;
        check([W1, W2].includes(lemma) && item.failed === true && item.can_add_to_examples === true && j(item.context.session_words) === j([lemma === W1 ? W2 : W1]), `L's item ${j(item)}`);
        check(psql(`SELECT user_id FROM practice_questions WHERE id = '${item.question_id}'`) === S.learner.id, `question ${item.question_id} is not L's`);
      }
      const text = j({ pass, items });
      for (const secret of [S.editor.id, S.learner.id, S.learner.email]) check(!text.includes(secret), `the pass response names ${secret}`);
      check(count('SELECT count(*) FROM ai_judge_pass_items') >= 5 && count(`SELECT count(*) FROM ai_judge_scores WHERE judge_revision_id = '${T.rev3}' AND subject_kind = 'real_question' AND verdict = 'fail_major'`) === 5, 'scores of revision 3 are not 5 fail_major');
      check(count(`SELECT count(*) FROM ai_judge_scores WHERE judge_revision_id = '${T.rev3}' AND subject_id = (SELECT id FROM practice_questions WHERE sense_id = '${T.pSense}' AND source = 'ai')`) === 0
        && count(`SELECT count(*) FROM ai_judge_scores WHERE judge_revision_id = '${T.rev3}' AND subject_id = '${T.mcq.questionId}'`) === 0, 'a private or MCQ question was scored');
      const done = await estimate(F());
      check(done.selected === 0 && canon(done.skipped) === skip(1, 0, 5), `estimate after both passes ${j(done)}`);
      ok(`estimate_usd ${est.estimate_usd} = 2 × ${average}; pass ${T.p2} finished 2 of 2 (cost ${pass.cost_usd}); L's questions with session_words ${j(items.map((item) => item.context.session_words))}; 5 fail_major scores of revision 3, none for P's question or the MCQ; estimate now selected 0, already_judged 5`);
    });

    await step('M4.9b D16: an owner\'s label on a real question (PUT /v1/admin/ai/labels, subject_kind real_question) shows on the pass items; a question that is no pass item (P\'s, the MCQ one) cannot be labelled (404); the label can be taken back', async () => {
      const q = T.p1Items[1].question_id;
      const pQuestion = psql(`SELECT id FROM practice_questions WHERE sense_id = '${T.pSense}' AND source = 'ai' AND ai_meta->>'operation' = '${op}'`);
      const putLabel = (subjectId, verdict) => asAdmin('PUT', `${ai}/labels`, { body: { subject_kind: 'real_question', subject_id: subjectId, criterion: 'single_answer', verdict } });
      const labelsOnItems = async () => (await want(itemsRaw(T.p1), 200, 'GET the items')).items.map((item) => [item.question_id, j(item.labels)]);
      check((await labelsOnItems()).every(([, labels]) => labels === '[]'), 'an item has a label before the test');
      const labelled = await want(putLabel(q, 'pass'), 200, 'label a real question');
      check(labelled.subject_kind === 'real_question' && labelled.subject_id === q && labelled.criterion === 'single_answer' && labelled.verdict === 'pass' && labelled.labeled_by_user?.id === S.adminId, `label ${j(labelled)}`);
      const shown = await labelsOnItems();
      check(shown.filter(([, labels]) => labels !== '[]').length === 1 && shown.find(([id]) => id === q)[1] === j([{ criterion: 'single_answer', verdict: 'pass' }]), `labels on the items ${j(shown)}`);
      for (const [name, id] of [['P\'s question', pQuestion], ['the MCQ question', T.mcq.questionId]]) await wantProblem(putLabel(id, 'pass'), 404, 'not-found', `label ${name}`);
      check(count(`SELECT count(*) FROM ai_labels WHERE subject_kind = 'real_question'`) === 1, 'a refused label was stored');
      const back = await want(putLabel(q, null), 200, 'take the label back');
      check(back.verdict === null && count(`SELECT count(*) FROM ai_labels WHERE subject_kind = 'real_question'`) === 0 && (await labelsOnItems()).every(([, labels]) => labels === '[]'), `taken back ${j(back)}`);
      ok(`question ${q}: label pass → 200 and listed on the pass items (judge's own verdict stays fail_major); P's question and the MCQ question → 404 not-found (no pass item), one label in ai_labels; taken back → verdict null, none left`);
    });

    await step('M4.10 B39, D27: from a failed real question → preview { source real_judge, rebuilt false, input = the pass snapshot, expected forms } and add → a dev example with source real_judge; the same key again adds nothing; the MCQ, P\'s cloze and a rule question → 409 source-not-eligible', async () => {
      const item = T.p1Items[0];
      const lemma = item.input.word;
      const view = await preview({ question_id: item.question_id });
      check(j(Object.keys(view).sort()) === j(['expected', 'input', 'operation', 'part_of_speech', 'rebuilt', 'source', 'source_ref', 'word']), `preview keys ${j(Object.keys(view))}`);
      check(view.operation === op && view.source === 'real_judge' && view.source_ref === item.question_id && view.word === lemma && view.part_of_speech === 'verb' && view.rebuilt === false
        && canon(view.input) === canon(item.input) && j(sorted(view.expected.forms)) === j(catalogForms(lemma)), `preview ${j(view)}`);
      const examples = exampleRows();
      const key = randomUUID();
      const created = await want(addRaw({ question_id: item.question_id, expected: view.expected, note: 'smoke M4: a failed real question' }, { key }), 201, 'add the real question');
      check(j(Object.keys(created).sort()) === j(['id', 'operation', 'rebuilt']) && created.operation === op && created.rebuilt === false && exampleRows() === examples + 1, `created ${j(created)}`);
      const example = await exampleOf(created.id);
      check(example && example.split === 'dev' && example.source === 'real_judge' && example.source_ref === item.question_id && canon(example.input) === canon(item.input)
        && j(sorted(example.expected.forms)) === j(catalogForms(lemma)) && example.note === 'smoke M4: a failed real question', `example ${j(example)}`);
      const replay = await want(addRaw({ question_id: item.question_id, expected: view.expected, note: 'smoke M4: a failed real question' }, { key }), 201, 'the same key again');
      check(replay.id === created.id && exampleRows() === examples + 1 && count(`SELECT count(*) FROM ai_eval_examples WHERE source = 'real_judge' AND source_ref = '${item.question_id}'`) === 1, `replay ${j(replay)}`);
      // Not eligible (B39): the MCQ question had P among its candidates, P's own cloze question was asked about P, a rule question is no AI question.
      const pQuestion = psql(`SELECT id FROM practice_questions WHERE sense_id = '${T.pSense}' AND source = 'ai' AND ai_meta->>'operation' = '${op}'`);
      const ruleSession = await startSession(S.editor, { source: 'group', group_id: T.eGroup, types: ['type_word'], count: 1 });
      const ruleShown = await nextItem(S.editor, ruleSession.id);
      const ruleInfo = itemInfo(ruleShown.item.item_id);
      await finish(S.editor, ruleSession.id);
      check(ruleInfo.source === 'rule', `the type_word question is ${j(ruleInfo)}`);
      const reasons = [];
      for (const [name, id, reason] of [['the MCQ question', T.mcq.questionId, 'private-word'], ['P\'s cloze question', pQuestion, 'private-word'], ['a rule question', ruleInfo.questionId, 'not-ai']]) {
        const refused = await wantProblem(previewRaw({ question_id: id }), 409, 'source-not-eligible', `preview of ${name}`);
        check(refused.reason === reason, `${name}: reason ${refused.reason}`);
        const refusedAdd = await wantProblem(addRaw({ question_id: id, expected: null, note: null }), 409, 'source-not-eligible', `add ${name}`);
        check(refusedAdd.reason === reason, `adding ${name}: reason ${refusedAdd.reason}`);
        reasons.push(`${name} → ${reason}`);
      }
      check(exampleRows() === examples + 1, 'a refused add stored an example');
      ok(`question ${item.question_id} (${lemma}): preview source real_judge, rebuilt false, input = snapshot, forms ${j(view.expected.forms)}; added as dev example ${created.id} (source real_judge, source_ref = the question); the same Idempotency-Key → the same id, one row; ${reasons.join('; ')}; examples ${examples} → ${examples + 1}`);
    });

    await step('M4.11 D27, B43: L reports its AI cloze (ai_more_than_one_answer) → preview 409 report-not-confirmed; E (editor) confirms it; E gets 403 on both from-source routes; the admin previews { source report, rebuilt false, input = the request\'s } and adds it', async () => {
      const reported = T.lAsked[0];
      T.report = await want(api('POST', `/v1/practice/items/${reported.itemId}/report`, { as: S.learner, body: { reason: 'ai_more_than_one_answer', note: 'smoke M4: another word fits' } }), 201, 'L reports');
      T.reported = reported;
      const refused = await wantProblem(previewRaw({ report_id: T.report.id }), 409, 'source-not-eligible', 'preview of an open report');
      check(refused.reason === 'report-not-confirmed', `reason ${refused.reason}`);
      await wantProblem(addRaw({ report_id: T.report.id, expected: null, note: null }), 409, 'source-not-eligible', 'add an open report');
      const confirmed = await want(api('POST', `/v1/admin/practice/reports/${T.report.id}/resolve`, { as: S.editor, idem: true, body: { status: 'confirmed' } }), 200, 'E confirms');
      check(confirmed.status === 'confirmed' && confirmed.resolved_by === S.editor.id, `resolve ${j(confirmed)}`);
      await wantProblem(previewRaw({ report_id: T.report.id }, S.editor), 403, 'forbidden', 'E previews');
      await wantProblem(addRaw({ report_id: T.report.id, expected: null, note: null }, { as: S.editor }), 403, 'forbidden', 'E adds');
      const examples = exampleRows();
      const view = await preview({ report_id: T.report.id });
      check(view.operation === op && view.source === 'report' && view.source_ref === T.report.id && view.word === reported.lemma && view.part_of_speech === 'verb' && view.rebuilt === false
        && canon(view.input) === canon(requestData(reported.aiRequestId)) && j(sorted(view.expected.forms)) === j(catalogForms(reported.lemma)), `preview ${j(view)}`);
      const created = await want(addRaw({ report_id: T.report.id, expected: view.expected, note: null }), 201, 'add the confirmed report');
      check(created.operation === op && created.rebuilt === false && exampleRows() === examples + 1, `created ${j(created)}`);
      const example = await exampleOf(created.id);
      check(example && example.split === 'dev' && example.source === 'report' && example.source_ref === T.report.id && canon(example.input) === canon(view.input) && example.note === null, `example ${j(example)}`);
      ok(`report ${T.report.id} (${reported.lemma}, L): open → 409 report-not-confirmed; confirmed by E; E → 403 forbidden on GET and POST from-source; admin preview source report, rebuilt false, input = the request's ai_input; added as dev example ${created.id} (source report, source_ref = the report)`);
    });

    await step('M4.12 B42, E17: the request of that report is gone (what the hourly cleanup does after 7 days) → preview rebuilt true with no input; the add rebuilds { word, part_of_speech, level, meaning_vi, context_label } from the catalog sense', async () => {
      const lemma = T.reported.lemma;
      const before = requestData(T.reported.aiRequestId);
      check(count(`SELECT count(*) FROM practice_ai_requests WHERE id = '${T.reported.aiRequestId}'`) === 1 && count(`SELECT count(*) FROM practice_questions WHERE id = '${T.reported.questionId}'`) === 1, 'the request or the question is missing before the delete');
      psql(`DELETE FROM practice_ai_requests WHERE id = '${T.reported.aiRequestId}'`);
      check(count(`SELECT count(*) FROM practice_ai_requests WHERE id = '${T.reported.aiRequestId}'`) === 0, 'the request is still there');
      const view = await preview({ report_id: T.report.id });
      check(view.rebuilt === true && view.input === null && view.source === 'report' && view.word === lemma && view.part_of_speech === 'verb' && j(sorted(view.expected.forms)) === j(catalogForms(lemma)), `preview ${j(view)}`);
      const examples = exampleRows();
      const created = await want(addRaw({ report_id: T.report.id, expected: view.expected, note: 'smoke M4: rebuilt' }), 201, 'add with the request gone');
      check(created.operation === op && created.rebuilt === true && exampleRows() === examples + 1, `created ${j(created)}`);
      const example = await exampleOf(created.id);
      const catalog = { word: lemma, part_of_speech: 'verb', level: before.level, meaning_vi: `nghĩa thử ${WORDS.indexOf(lemma) + 1}`, context_label: null };
      check(example && example.source === 'report' && example.source_ref === T.report.id && example.split === 'dev' && canon(example.input) === canon(catalog) && canon(catalog) === canon(before), `example ${j(example)} vs catalog ${j(catalog)}`);
      ok(`request ${T.reported.aiRequestId} deleted (the question row stays): preview rebuilt true, input null; added as dev example ${created.id} with input ${j(example.input)} = the sense now = what the AI was sent`);
    });

    await step('M4.13 B41: a running real pass with a heartbeat 16 minutes old → pnpm maintenance:run closes it failed / stalled; a running pass with a fresh heartbeat (another judge) is left running (control); both rows deleted', async () => {
      const stale = randomUUID();
      const fresh = randomUUID();
      const latest = psql(`SELECT id FROM ai_judge_revisions WHERE judge_id = '${T.J}' ORDER BY revision DESC LIMIT 1`);
      const other = psql(`SELECT id FROM ai_judge_revisions WHERE judge_id <> '${T.J}' ORDER BY saved_at DESC LIMIT 1`);
      check(latest && other && count(`SELECT count(*) FROM ai_judge_passes WHERE status IN ('queued', 'running')`) === 0, 'no revision for the control, or a pass is still active');
      psql(`INSERT INTO ai_judge_passes (id, judge_revision_id, kind, operation, status, started_by, total, heartbeat_at)
        VALUES ('${stale}', '${latest}', 'real', '${op}', 'running', '${S.adminId}', 0, now() - interval '16 minutes')`);
      psql(`INSERT INTO ai_judge_passes (id, judge_revision_id, kind, operation, status, started_by, total, heartbeat_at)
        VALUES ('${fresh}', '${other}', 'real', '${op}', 'running', '${S.adminId}', 0, now())`);
      try {
        execFileSync(process.execPath, [built('dist/cli/run-maintenance.js')], { stdio: 'pipe', env: CHILD_ENV });
        const listed = await passList();
        const closed = listed.find((pass) => pass.id === stale);
        const kept = listed.find((pass) => pass.id === fresh);
        check(closed && closed.status === 'failed' && closed.error === 'stalled' && closed.finished_at !== null, `the stale pass ${j(closed)}`);
        check(kept && kept.status === 'running' && kept.error === null, `the fresh pass ${j(kept)}`);
      } finally {
        psql(`DELETE FROM ai_judge_passes WHERE id IN ('${stale}', '${fresh}')`);
      }
      ok('maintenance:run: the pass with the 16-minute-old heartbeat → failed / stalled with finished_at; the pass with a fresh heartbeat stays running; both deleted');
    });

    await step('M4.14 permissions and validation (status, type, body): E and L get 403 on every route; unknown judge / pass → 404; an operation the judge does not score, an inactive judge, bad queries and page tokens → 400; a bad config pair is refused', async () => {
      const forbidden = [];
      const routes = [
        ['GET', `${real}/estimate?${queryOf(F())}`], ['POST', real, { judge_id: T.J, operation: op, config: null, test_accounts_only: false }],
        ['GET', `${real}/passes`], ['GET', `${real}/passes/${T.p1}/items`],
        ['GET', `${fromSource}?question_id=${T.p1Items[0].question_id}`], ['POST', fromSource, { question_id: T.p1Items[0].question_id, expected: null, note: null }],
      ];
      for (const [method, path, body] of routes) {
        await wantProblem(api(method, path, { as: S.editor, body, idem: method === 'POST' }), 403, 'forbidden', `E ${method} ${path}`);
        forbidden.push(`${method} ${path.split('?')[0].replace('/v1/admin/practice/', '')}`);
      }
      for (const [method, path, body] of [routes[0], routes[2], routes[5]]) await wantProblem(api(method, path, { as: S.learner, body, idem: method === 'POST' }), 403, 'forbidden', `L ${method} ${path}`);
      // Control: the permission is the only difference: the same reads as A4 answer 200.
      await want(estimateRaw(F()), 200, 'control estimate');
      await want(api('GET', `${real}/passes`, { as: S.admin }), 200, 'control passes');
      await want(itemsRaw(T.p1), 200, 'control items');
      await want(previewRaw({ question_id: T.p1Items[0].question_id }), 200, 'control preview');
      const unknown = randomUUID();
      await wantProblem(estimateRaw(F({ judge_id: unknown })), 404, 'not-found', 'estimate of an unknown judge');
      await wantProblem(startRaw(F({ judge_id: unknown })), 404, 'not-found', 'start with an unknown judge');
      await wantProblem(itemsRaw(unknown), 404, 'not-found', 'items of an unknown pass');
      const evalPass = psql(`SELECT id FROM ai_judge_passes WHERE kind = 'eval_run' ORDER BY created_at LIMIT 1`);
      check(evalPass, 'control: no eval-run pass to ask for');
      await wantProblem(itemsRaw(evalPass), 404, 'not-found', 'items of an eval-run pass');
      await wantProblem(itemsRaw('not-a-uuid'), 400, 'validation-failed', 'items of a pass id that is no uuid');
      await wantProblem(previewRaw({ question_id: unknown }), 404, 'not-found', 'preview of an unknown question');
      await wantProblem(previewRaw({ report_id: unknown }), 404, 'not-found', 'preview of an unknown report');
      await wantProblem(addRaw({ question_id: unknown, expected: null, note: null }), 404, 'not-found', 'add an unknown question');
      await wantProblem(previewRaw({ report_id: unknown, question_id: unknown }), 400, 'validation-failed', 'preview with both ids');
      await wantProblem(api('GET', fromSource, { as: S.admin }), 400, 'validation-failed', 'preview with no id');
      await wantProblem(previewRaw({ question_id: 'nope' }), 400, 'validation-failed', 'preview with an id that is no uuid');
      await wantProblem(addRaw({ question_id: unknown, report_id: unknown, expected: null, note: null }), 400, 'validation-failed', 'add with both ids');
      const notJudged = await wantProblem(estimateRaw(F({ operation: 'generate_meaning_question' })), 400, 'validation-failed', 'estimate of an operation the judge does not score');
      check(j(notJudged.violations) === j(['operation: not judged by this judge']), `violations ${j(notJudged.violations)}`);
      await wantProblem(startRaw(F({ operation: 'generate_meaning_question' })), 400, 'validation-failed', 'start of an operation the judge does not score');
      await wantProblem(api('GET', `${real}/estimate?judge_id=${T.J}&operation=lookup_word`, { as: S.admin }), 400, 'validation-failed', 'estimate of an operation Practice does not make');
      await wantProblem(api('GET', `${real}/estimate?judge_id=${T.J}&operation=${op}&config_number=${T.cloze.number}`, { as: S.admin }), 400, 'validation-failed', 'config_number without model');
      await wantProblem(api('GET', `${real}/estimate?judge_id=${T.J}&operation=${op}&model=fake%3Aok`, { as: S.admin }), 400, 'validation-failed', 'model without config_number');
      await wantProblem(api('GET', `${real}/estimate?judge_id=${T.J}&operation=${op}&test_accounts_only=maybe`, { as: S.admin }), 400, 'validation-failed', 'test_accounts_only that is no boolean');
      await wantProblem(api('POST', real, { as: S.admin, idem: true, body: { judge_id: T.J, operation: op, extra: 1 } }), 400, 'validation-failed', 'start with an unknown field');
      for (const size of [0, 101]) await wantProblem(api('GET', `${real}/passes?page_size=${size}`, { as: S.admin }), 400, 'validation-failed', `page_size ${size}`);
      await wantProblem(api('GET', `${real}/passes?page_token=nope`, { as: S.admin }), 400, 'validation-failed', 'a page token this listing did not make');
      // Pagination: two real passes exist (M4.8, M4.9); a page of one has the newest and a token to the other.
      const pageOne = await want(api('GET', `${real}/passes?page_size=1`, { as: S.admin }), 200, 'passes, page 1');
      check(pageOne.items.length === 1 && pageOne.items[0].id === T.p2 && typeof pageOne.next_page_token === 'string', `page 1 ${j(pageOne.items.map((p) => p.id))} ${pageOne.next_page_token}`);
      const pageTwo = await want(api('GET', `${real}/passes?page_size=1&page_token=${encodeURIComponent(pageOne.next_page_token)}`, { as: S.admin }), 200, 'passes, page 2');
      check(pageTwo.items.length === 1 && pageTwo.items[0].id === T.p1 && pageTwo.next_page_token === null, `page 2 ${j(pageTwo.items.map((p) => p.id))} ${pageTwo.next_page_token}`);
      // An inactive judge cannot judge; restoring it leaves it as it was.
      const view = await getJudge(T.J);
      await saveJudge(view, { active: false });
      try {
        const inactive = await wantProblem(estimateRaw(F()), 400, 'validation-failed', 'estimate with an inactive judge');
        check(j(inactive.violations) === j(['judge_id: judge is not active']), `violations ${j(inactive.violations)}`);
        await wantProblem(startRaw(F()), 400, 'validation-failed', 'start with an inactive judge');
      } finally {
        await saveJudge(await getJudge(T.J), { active: true });
      }
      const after = await getJudge(T.J);
      check(after.active === true && after.latest.revision === 3 && j(after.operations) === j([op]), `judge after ${j({ active: after.active, revision: after.latest.revision })}`);
      ok(`E → 403 forbidden on ${forbidden.join(', ')} (L on three of them); A4 gets 200 on the reads; unknown judge / pass / question / report → 404; the eval-run pass → 404; bad ids, both or no ids, an unknown field, page_size 0 and 101, a bad token → 400; an operation the judge does not score → 400 ${j(notJudged.violations)}; an inactive judge → 400 ${j(['judge_id: judge is not active'])} (active again, revision 3); pages of one: ${T.p2} then ${T.p1}`);
    });

    await step('M4.15 Review focus 1 in the real flow: J also scoring generate_sentence_mcq → the estimate for it selects nothing and counts P\'s MCQ question as private, the start is 409 nothing-to-judge (empty) with that count; the operations are restored', async () => {
      const view = await getJudge(T.J);
      const widened = await saveJudge(view, { operations: [op, 'generate_sentence_mcq'] });
      check(widened.latest.revision === 3 && j(widened.operations) === j([op, 'generate_sentence_mcq']), `widened ${j({ revision: widened.latest.revision, operations: widened.operations })}`);
      const passes = realPassRows();
      const calls = judgeCalls();
      try {
        const mcq = F({ operation: 'generate_sentence_mcq' });
        const est = await estimate(mcq);
        check(est.selected === 0 && est.remaining === 0 && est.reason === null && canon(est.skipped) === skip(1, 0, 0) && est.judge_revision === 3, `estimate ${j(est)}`);
        check(est.pairs.length === 1 && est.pairs[0].questions === 1 && est.pairs[0].model === 'fake:ok', `pairs ${j(est.pairs)}`);
        const refused = await wantProblem(startRaw(mcq), 409, 'nothing-to-judge', 'start over the MCQ questions');
        check(refused.reason === 'empty' && canon(refused.skipped) === skip(1, 0, 0), `409 ${j(refused)}`);
        check(realPassRows() === passes && judgeCalls() === calls, 'a refused start inserted a pass or called a judge');
      } finally {
        await saveJudge(await getJudge(T.J), { operations: [op] });
      }
      const restored = await getJudge(T.J);
      check(j(restored.operations) === j([op]) && restored.latest.revision === 3, `restored ${j({ operations: restored.operations, revision: restored.latest.revision })}`);
      ok('operations [generate_cloze, generate_sentence_mcq] added no revision; the MCQ estimate: selected 0, skipped private_word 1 (its candidates held P), one pair with 1 question; POST → 409 nothing-to-judge reason empty; no pass, no judge call; operations back to [generate_cloze]');
    });

    await step('M4.16 one pass per revision, the pair filter, the setting and newest first: a new revision 4 judges every question again (E 3, L 1: the reported one has no request left, so no content); the pair filter narrows; ai.real_judge_limit 2 → 2 selected, 2 left; the pass takes the 2 newest', async () => {
      const view = await getJudge(T.J);
      const saved = await saveJudge(view, { instructions: `${view.latest.instructions}\n\nSmoke M4: a new revision.` });
      check(saved.latest.revision === 4 && saved.latest.model?.model_id === 'fake:bad-form', `judge ${j({ revision: saved.latest.revision, model: saved.latest.model })}`);
      T.rev4 = saved.latest.id;
      const est = await estimate(F());
      check(est.judge_revision === 4 && est.selected === 4 && est.remaining === 0 && canon(est.skipped) === skip(1, 1, 0) && est.estimate_usd === null, `estimate at revision 4 ${j(est)}`);
      const pair = { number: T.cloze.number, model: 'fake:ok' };
      const same = await estimate(F({ config: pair }));
      check(same.selected === 4 && canon(same.skipped) === skip(1, 1, 0), `estimate with the live pair ${j(same)}`);
      const wrongNumber = F({ config: { number: T.cloze.number + 1000, model: 'fake:ok' } });
      const wrongModel = F({ config: { number: T.cloze.number, model: 'fake:other' } });
      for (const wrong of [wrongNumber, wrongModel]) {
        const none = await estimate(wrong);
        check(none.selected === 0 && none.reason === null && canon(none.skipped) === skip(0, 0, 0) && j(none.pairs) === j(est.pairs), `estimate with ${j(wrong.config)} ${j(none)}`);
        const refused = await wantProblem(startRaw(wrong), 409, 'nothing-to-judge', `start with ${j(wrong.config)}`);
        check(refused.reason === 'empty', `reason ${refused.reason}`);
      }
      // The bounds of the setting first, then limit 2.
      for (const bad of [0, 501, 2.5]) await wantProblem(putSettings({ real_judge_limit: bad }), 400, 'validation-failed', `real_judge_limit ${bad}`);
      check((await want(asAdmin('GET', '/v1/admin/settings'), 200, 'GET settings')).values.ai.real_judge_limit === 200, 'a refused limit was stored');
      await setAi({ real_judge_limit: 2 });
      let newest;
      try {
        const limited = await estimate(F());
        check(limited.limit === 2 && limited.selected === 2 && limited.remaining === 2 && canon(limited.skipped) === skip(1, 1, 0), `estimate with limit 2 ${j(limited)}`);
        const rowsBefore = realPassRows();
        const key = randomUUID();
        const started = await want(startRaw(F(), S.admin, key), 201, 'start with limit 2');
        check(started.selected === 2 && canon(started.skipped) === skip(1, 1, 0), `start ${j(started)}`);
        T.p3 = started.pass_id;
        const { pass, items } = await passEnded(T.p3);
        const replayed = await want(startRaw(F(), S.admin, key), 201, 'the same key again');
        check(replayed.pass_id === T.p3 && realPassRows() === rowsBefore + 1, `replay ${j(replayed)}, real passes ${rowsBefore} → ${realPassRows()}`);
        newest = rows(`SELECT id FROM practice_questions WHERE source = 'ai' AND ai_meta->>'operation' = '${op}' AND sense_id <> '${T.pSense}' AND id <> '${T.reported.questionId}'
          ORDER BY created_at DESC, id DESC LIMIT 2`).map(([id]) => id);
        check(pass.status === 'finished' && pass.total === 2 && pass.judged === 2 && pass.revision === 4 && pass.filters.limit === 2 && pass.filters.operation === op, `pass ${j(pass)}`);
        check(newest.length === 2 && j(items.map((item) => item.question_id)) === j(newest), `items ${j(items.map((i) => i.question_id))} vs the two newest ${j(newest)}`);
        const left = await estimate(F());
        check(left.limit === 2 && left.selected === 2 && left.remaining === 0 && canon(left.skipped) === skip(1, 1, 2) && Math.abs(left.estimate_usd - 0.3) < 1e-9, `estimate after the limited pass ${j(left)}`);
      } finally {
        await setAi({ real_judge_limit: 200 });
      }
      check((await estimate(F())).limit === 200, 'the limit is not back to 200');
      ok(`revision 4: selected 4, skipped private_word 1 and no_content 1 (the reported question, request gone), no price yet; the live pair → 4, another number or model → 0 and POST → 409 empty; limit 0, 501 and 2.5 → 400 and nothing stored; limit 2 → selected 2, remaining 2; pass ${T.p3} judged the two newest questions ${j(newest)} (psql order), the same Idempotency-Key again → the same pass, one row; then selected 2 at 0.3 USD, already_judged 2; limit back to 200`);
    });

    await step('M4.17 no_content in the real flow: the kept content of one call expires → that question is skipped as no_content (the request-gone one already is), the rest still selected; the expiry is put back', async () => {
      const eligible = rows(`SELECT id, ai_meta->>'call_operation_id' FROM practice_questions WHERE source = 'ai' AND ai_meta->>'operation' = '${op}'
        AND sense_id <> '${T.pSense}' AND id <> '${T.reported.questionId}' ORDER BY created_at DESC, id DESC`);
      check(eligible.length === 4, `${eligible.length} questions can still be judged, expected 4`);
      // The two newest were judged by M4.16's pass; the oldest is still waiting.
      const [, callOperationId] = eligible[3];
      const callId = psql(`SELECT id FROM ai_calls WHERE operation_id = '${callOperationId}' AND outcome = 'succeeded' ORDER BY created_at DESC LIMIT 1`);
      const expires = psql(`SELECT expires_at FROM ai_call_contents WHERE call_id = '${callId}'`);
      check(callId && expires, `no kept content for call ${callOperationId}`);
      const before = await estimate(F());
      check(before.selected === 2 && before.remaining === 0 && canon(before.skipped) === skip(1, 1, 2), `estimate before ${j(before)}`);
      psql(`UPDATE ai_call_contents SET expires_at = now() - interval '1 minute' WHERE call_id = '${callId}'`);
      try {
        const est = await estimate(F());
        check(est.selected === 1 && est.remaining === 0 && canon(est.skipped) === skip(1, 2, 2), `estimate with expired content ${j(est)}`);
      } finally {
        psql(`UPDATE ai_call_contents SET expires_at = '${expires}' WHERE call_id = '${callId}'`);
      }
      const after = await estimate(F());
      check(after.selected === 2 && canon(after.skipped) === skip(1, 1, 2), `estimate after putting the expiry back ${j(after)}`);
      ok(`call ${callOperationId} (the oldest question): content expired → selected 1, skipped no_content 2 (this one and the question whose request is gone), already_judged 2; expiry restored → selected 2, no_content 1`);
    });

    await step('M4.18 M3\'s refusals pass through the real-judge start: cap 0 → 409 admin-usd-cap (the estimate shows admin_usd_cap 0); a judge on a model without a price → 409 model-price-missing; nothing is inserted; the cap is back to null', async () => {
      const passes = realPassRows();
      await setAi({ admin_daily_usd_cap: 0 });
      try {
        const est = await estimate(F());
        check(est.admin_usd_cap === 0 && est.selected === 2, `estimate under cap 0 ${j(est)}`);
        await wantProblem(startRaw(F()), 409, 'admin-usd-cap', 'start at cap 0');
      } finally {
        await setAi({ admin_daily_usd_cap: null });
      }
      const unpriced = (await listJudges()).find((judge) => judge.id !== T.J && judge.latest.model?.model_id === 'fake:refuse');
      check(unpriced, 'control: no judge on fake:refuse (M3 leaves its clone there)');
      await wantProblem(startRaw(F({ judge_id: unpriced.id })), 409, 'model-price-missing', 'start with a judge whose model has no price');
      check(realPassRows() === passes, 'a refused start inserted a pass');
      ok(`cap 0: estimate admin_usd_cap 0 and POST → 409 admin-usd-cap; judge "${unpriced.name}" (fake:refuse, no input price) → 409 model-price-missing; real passes stay at ${passes}; cap null again`);
    });

    await step('M4.19 the part\'s end state: fake:bad-form priced as before, E an editor, no queued or running pass, the settings back to their defaults, J on fake:bad-form at revision 4 with its operations as before', async () => {
      const restore = T.badBefore === null ? { price_input: null, price_output: null } : { price_input: Number(T.badBefore.input), price_output: Number(T.badBefore.output) };
      const back = await want(asAdmin('PATCH', `${ai}/models/${T.badId}`, { body: restore }), 200, 'restore the price of fake:bad-form');
      T.badRestored = true;
      check(j(back.price) === j(T.badBefore), `price ${j(back.price)} vs before ${j(T.badBefore)}`);
      const detail = await want(asAdmin('GET', `/v1/admin/users/${S.editor.id}`), 200, 'GET E');
      check(detail.staff_role === 'editor', `E is ${detail.staff_role}`);
      check(count(`SELECT count(*) FROM ai_judge_passes WHERE status IN ('queued', 'running')`) === 0, 'a pass is still queued or running');
      const { values } = await want(asAdmin('GET', '/v1/admin/settings'), 200, 'GET settings');
      check(j([values.ai.real_judge_limit, values.ai.content_retention_days, values.ai.admin_daily_usd_cap]) === j([200, 7, null]), `ai settings ${j(values.ai)}`);
      const judge = await getJudge(T.J);
      check(judge.latest.revision === 4 && judge.latest.model?.model_id === 'fake:bad-form' && judge.active === true && j(judge.operations) === j([op]), `judge ${j({ revision: judge.latest.revision, model: judge.latest.model })}`);
      const finished = (await passList()).filter((pass) => pass.status === 'finished');
      check(finished.length === 3 && j(finished.map((pass) => pass.id)) === j([T.p3, T.p2, T.p1]), `finished real passes ${j(finished.map((pass) => pass.id))}`);
      const examples = count(`SELECT count(*) FROM ai_eval_examples WHERE source IN ('real_judge', 'report')`);
      check(examples === 3, `${examples} examples from sources`);
      ok(`fake:bad-form price ${j(back.price)} (as before); E editor; no queued or running pass; settings 200 / 7 / null; J ${T.J} revision 4 on fake:bad-form; 3 finished real passes (${T.p3}, ${T.p2}, ${T.p1}); 3 examples with a source (1 real_judge, 2 report); E ${S.editor.id} and L ${S.learner.id} with tokens in S.editor and S.learner`);
    });
  } finally {
    if (T.badId && T.badRestored === false) {
      try {
        const restore = T.badBefore === null ? { price_input: null, price_output: null } : { price_input: Number(T.badBefore.input), price_output: Number(T.badBefore.output) };
        await want(asAdmin('PATCH', `${ai}/models/${T.badId}`, { body: restore }), 200, 'restore the price of fake:bad-form');
      } catch (error) {
        console.log(`    (could not restore the price of fake:bad-form: ${error.message})`);
      }
    }
    S.admin = outer.admin;
    S.adminId = outer.adminId;
  }
}

// =====================================================================================================================
// M5 — dashboard (design K5, plan M5-T11, design §13 "đọc dashboard"): every block the three dashboard endpoints gained in M5 is read after the
// real flows of M1–M4 and compared with what psql says, never with something the step itself wrote into the read under test. The part acts as a sixth
// admin A6 (its two eval runs and the extra runs of M5.5 spend its own `ai.test` hits). It uses what `partM4()` left: the seeded judge J on
// `fake:bad-form` (every verdict `fail_major`), `S.editor` (E, an editor with AI questions it never reported), `S.learner` (L), the live configs on
// `fake:ok`, the newest frozen set of generate_cloze and the finished real passes. It changes some settings (the admin USD cap to null, the judge
// calibration limits, `entitlements.ai_daily_cap` twice) and puts them back; the older history rows it inserts for M5.8 are deleted again, the labels
// it makes in M5.5 too. It leaves behind: J with one more revision (its max_output_tokens changed), a few more finished eval runs on the live cloze
// config (each judged by that revision), one more confirmed AI report of E, the settings as it found them (the USD cap null), `S.editor` an editor.
async function partM5() {
  const op = 'generate_cloze';
  const ai = '/v1/admin/ai';
  const DASHBOARD = `${ai}/dashboard`;
  const QUALITY = '/v1/admin/practice/ai-quality';
  const DAYS = '/v1/admin/entitlements/ai-usage/days';
  const T = {};
  const outer = { admin: S.admin, adminId: S.adminId };

  const canon = (value) => (Array.isArray(value) ? `[${value.map(canon).join(',')}]`
    : value !== null && typeof value === 'object'
      ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canon(value[key])}`).join(',')}}` : JSON.stringify(value));
  const rows = (sql) => psql(sql).split(/\r?\n/).filter(Boolean).map((line) => line.split('|'));
  /** A timestamptz as the API prints it (ISO, milliseconds, UTC). */
  const iso = (column) => `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
  const vnDate = (offset = 0) => new Date(Date.now() + 7 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);
  const zero = () => ({ pass: 0, fail_major: 0, fail_minor: 0, unscored: 0 });
  const add = (counts, verdict, n) => { counts[verdict === 'null' || verdict === null ? 'unscored' : verdict] += n; return counts; };
  const byKey = (list) => [...list].sort((a, b) => (canon(a) < canon(b) ? -1 : canon(a) > canon(b) ? 1 : 0));

  const dashboard = (as = S.admin) => want(api('GET', DASHBOARD, { as }), 200, 'GET dashboard');
  const quality = (as = S.admin) => want(api('GET', QUALITY, { as }), 200, 'GET ai-quality');
  const daysOf = (from, to, as = S.admin) => want(api('GET', `${DAYS}?from=${from}&to=${to}`, { as }), 200, `GET ai-usage/days ${from}..${to}`);
  const getSettings = () => want(asAdmin('GET', '/v1/admin/settings'), 200, 'GET settings');
  const putValues = async (values) => {
    const current = await getSettings();
    return want(asAdmin('PUT', '/v1/admin/settings', { idem: true, body: { version: current.version, values } }), 200, `PUT settings ${j(values)}`);
  };

  // Judges (as the helpers of partM3 and partM4, which are local to those parts).
  const listJudges = async () => (await want(asAdmin('GET', `${ai}/judges`), 200, 'GET judges')).items;
  const getJudge = async (id) => {
    const found = (await listJudges()).find((judge) => judge.id === id);
    check(found, `judge ${id} is not listed`);
    return found;
  };
  const saveJudge = (view, changes) => want(asAdmin('PUT', `${ai}/judges/${view.id}`, { body: {
    expected_revision: view.latest.revision, name: view.name, operations: view.operations, active: view.active, criteria: view.latest.criteria,
    instructions: view.latest.instructions, examples: view.latest.examples, model_ref: view.latest.model?.id ?? null, effort: view.latest.effort,
    thinking: view.latest.thinking, max_output_tokens: view.latest.max_output_tokens, ...changes } }), 200, `save judge ${view.name}`);
  const passDone = (id) => waitFor(() => want(asAdmin('GET', `${ai}/judge-passes/${id}`), 200, 'GET judge pass'),
    (pass) => pass.status === 'finished' || pass.status === 'failed', `judge pass ${id} ending`, 60_000);
  /** A judge pass of the judge's newest revision over a finished run; resolves with the finished pass. */
  async function judgeRun(runId) {
    const started = await want(asAdmin('POST', `${ai}/eval/runs/${runId}/judge-passes`, { idem: true, body: { judge_id: T.J } }), 202, `judge run ${runId}`);
    const pass = await passDone(started.id);
    check(pass.status === 'finished' && pass.error === null && pass.judged === pass.total && pass.total > 0, `judge pass ${j({ status: pass.status, error: pass.error, total: pass.total, judged: pass.judged })}`);
    return pass;
  }
  const liveRun = async () => {
    const done = await runAndWait({ operation: op, set_id: T.S.id, config: 'live' });
    check(done.status === 'finished' && done.complete === true && done.set_id === T.S.id, `live run ${j({ status: done.status, complete: done.complete, set_id: done.set_id, error: done.error })}`);
    return done;
  };

  // What psql says: the scores of eval items grouped like the dashboard groups them, by judge revision, criterion and split.
  const runCounts = (runId) => rows(`SELECT s.judge_revision_id, s.criterion, i.split, coalesce(s.verdict, 'null'), count(*) FROM ai_judge_scores s
    JOIN ai_eval_run_items i ON i.id = s.subject_id WHERE s.subject_kind = 'eval_item' AND i.run_id = '${runId}' GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3, 4`)
    .map(([revision, criterion, split, verdict, n]) => ({ revision, criterion, split, verdict, n: Number(n) }));
  const judgeOfRun = (runId) => {
    const found = new Map();
    for (const row of runCounts(runId)) {
      const key = `${row.revision}|${row.criterion}`;
      const entry = found.get(key) ?? { judge_revision_id: row.revision, criterion: row.criterion, dev: zero(), held_out: zero() };
      add(entry[row.split], row.verdict, row.n);
      found.set(key, entry);
    }
    return [...found.values()];
  };
  /** The eval groups of the dashboard computed run by run: runs on an operation's newest frozen set, not hidden, of a config at its current version or from before M2. */
  function evalGroupsByPsql() {
    const sets = rows('SELECT DISTINCT ON (operation) id FROM ai_eval_sets ORDER BY operation, version DESC').map(([id]) => id);
    if (sets.length === 0) return { groups: [], hiddenScores: 0 };
    const runs = rows(`SELECT r.id, r.operation, r.model, coalesce(c.number, r.prompt_revision), (r.hidden_at IS NOT NULL),
      (c.id IS NOT NULL AND c.version = r.config_version), (r.config_id IS NULL AND r.prompt_revision IS NOT NULL)
      FROM ai_eval_runs r LEFT JOIN ai_configs c ON c.id = r.config_id WHERE r.set_id IN (${sets.map((id) => `'${id}'`).join(',')})`);
    const groups = new Map();
    let hiddenScores = 0;
    for (const [id, operation, model, number, hidden, current, preM2] of runs) {
      const scores = rows(`SELECT s.judge_revision_id, s.criterion, coalesce(s.verdict, 'null'), count(*), ${iso('min(s.created_at)')} FROM ai_judge_scores s
        JOIN ai_eval_run_items i ON i.id = s.subject_id WHERE s.subject_kind = 'eval_item' AND i.run_id = '${id}' AND NOT i.hidden GROUP BY 1, 2, 3`);
      if (hidden === 't') {
        hiddenScores += count(`SELECT count(*) FROM ai_judge_scores s JOIN ai_eval_run_items i ON i.id = s.subject_id WHERE s.subject_kind = 'eval_item' AND i.run_id = '${id}'`);
        continue;
      }
      if (current !== 't' && preM2 !== 't') continue;
      for (const [revision, criterion, verdict, n, first] of scores) {
        const key = [operation, Number(number), model, revision, criterion].join('|');
        const entry = groups.get(key) ?? { operation, source: 'eval', config_number: Number(number), model, judge_revision_id: revision, criterion, counts: zero(), first_scored_at: first };
        add(entry.counts, verdict, Number(n));
        if (first < entry.first_scored_at) entry.first_scored_at = first;
        groups.set(key, entry);
      }
    }
    return { groups: [...groups.values()], hiddenScores };
  }
  /** The D15 rule recomputed from ai_labels × ai_judge_scores and the two settings (`settings` is the answer of GET /v1/admin/settings). */
  function revisionsByPsql(settings) {
    const revisions = rows(`SELECT r.id, r.judge_id, j.name, r.revision, ${iso('r.saved_at')} FROM ai_judge_revisions r JOIN ai_judges j ON j.id = r.judge_id
      WHERE EXISTS (SELECT 1 FROM ai_judge_scores s WHERE s.judge_revision_id = r.id) ORDER BY j.name, r.revision`);
    const pairs = new Map(rows(`SELECT s.judge_revision_id, s.criterion, count(*), count(*) FILTER (WHERE (l.verdict = 'pass') = (s.verdict = 'pass')) FROM ai_judge_scores s
      JOIN ai_labels l ON l.subject_kind = s.subject_kind AND l.subject_id = s.subject_id AND l.criterion = s.criterion WHERE s.verdict IS NOT NULL GROUP BY 1, 2`)
      .map(([revision, criterion, labeled, agree]) => [`${revision}|${criterion}`, { labeled: Number(labeled), agree: Number(agree) }]));
    const codes = rows(`SELECT r.id, c.item->>'code' FROM ai_judge_revisions r, jsonb_array_elements(r.criteria) WITH ORDINALITY AS c(item, ord) ORDER BY r.id, c.ord`);
    return revisions.map(([id, judgeId, name, revision, savedAt]) => ({
      id, judge_id: judgeId, judge_name: name, revision: Number(revision), saved_at: savedAt,
      criteria: codes.filter(([revisionId]) => revisionId === id).map(([, code]) => {
        const { labeled, agree } = pairs.get(`${id}|${code}`) ?? { labeled: 0, agree: 0 };
        return { code, labeled, agree, calibrated: labeled > 0 && labeled >= settings.values.ai.judge_label_min && agree * 100 >= Math.round(settings.values.ai.judge_agreement_min * 100) * labeled };
      }),
    }));
  }
  /** The real-question scores of finished or unfinished real passes grouped as the report groups them, and the latest finished pass with its rows. */
  function realByPsql() {
    const scores = rows(`SELECT coalesce(q.ai_meta->>'operation', ''), coalesce(q.ai_meta->>'prompt_revision', ''), coalesce(q.ai_meta->>'model', ''), s.judge_revision_id, s.criterion,
      coalesce(s.verdict, 'null'), count(*), ${iso('min(s.created_at)')} FROM ai_judge_scores s JOIN ai_judge_passes p ON p.id = s.pass_id JOIN practice_questions q ON q.id = s.subject_id
      WHERE s.subject_kind = 'real_question' AND p.kind = 'real' GROUP BY 1, 2, 3, 4, 5, 6`);
    const groups = new Map();
    for (const [operation, number, model, revision, criterion, verdict, n, first] of scores) {
      const key = [operation, number, model, revision, criterion].join('|');
      const entry = groups.get(key) ?? { operation, source: 'real', config_number: number === '' ? null : Number(number), model: model === '' ? null : model, judge_revision_id: revision, criterion, counts: zero(), first_scored_at: first };
      add(entry.counts, verdict, Number(n));
      if (first < entry.first_scored_at) entry.first_scored_at = first;
      groups.set(key, entry);
    }
    const [latest] = rows(`SELECT p.id FROM ai_judge_passes p JOIN ai_judge_scores s ON s.pass_id = p.id JOIN practice_questions q ON q.id = s.subject_id
      WHERE p.kind = 'real' AND p.status = 'finished' AND s.subject_kind = 'real_question' AND q.ai_meta->>'operation' = '${op}'
      GROUP BY p.id ORDER BY max(s.created_at) DESC, p.id DESC LIMIT 1`);
    const latestRows = new Map();
    if (latest) {
      for (const [revision, criterion, verdict, n, newest] of rows(`SELECT s.judge_revision_id, s.criterion, coalesce(s.verdict, 'null'), count(*), ${iso('max(s.created_at)')} FROM ai_judge_scores s
        JOIN practice_questions q ON q.id = s.subject_id WHERE s.pass_id = '${latest[0]}' AND s.subject_kind = 'real_question' AND q.ai_meta->>'operation' = '${op}' GROUP BY 1, 2, 3`)) {
        const key = `${revision}|${criterion}`;
        const entry = latestRows.get(key) ?? { operation: op, pass_id: latest[0], judge_revision_id: revision, criterion, counts: zero(), scored_at: newest };
        add(entry.counts, verdict, Number(n));
        if (newest > entry.scored_at) entry.scored_at = newest;
        latestRows.set(key, entry);
      }
    }
    return { groups: [...groups.values()], latestPass: latest?.[0] ?? null, latest: [...latestRows.values()].sort((a, b) => (a.judge_revision_id + a.criterion < b.judge_revision_id + b.criterion ? -1 : 1)) };
  }

  try {
    await step('M5.0 a sixth admin A6 acts for this part; the settings C0 are read (admin USD cap, entitlements.ai_daily_cap, judge limits) and the admin cap is set to null; J is the seeded judge on fake:bad-form, the live cloze config is on fake:ok', async () => {
      const email = `smokenb-admin6-${run}@example.com`;
      await want(asAdmin('POST', '/v1/admin/users', { body: { email, staff_role: 'admin', password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, `create ${email}`);
      S.admin = { email, token: await loginToken(email) };
      const me = await want(asAdmin('GET', '/v1/me'), 200, 'A6 profile');
      check(me.id !== outer.adminId, 'A6 is the first admin');
      S.adminId = me.id;
      const { values } = await getSettings();
      T.C0 = { adminCap: values.ai.admin_daily_usd_cap, dailyCap: values.entitlements.ai_daily_cap, labelMin: values.ai.judge_label_min, agreementMin: values.ai.judge_agreement_min };
      check(Number.isInteger(T.C0.dailyCap) && T.C0.dailyCap > 4, `entitlements.ai_daily_cap is ${T.C0.dailyCap}: M5.7 needs a cap above 4`);
      if (T.C0.adminCap !== null) await putValues({ ai: { admin_daily_usd_cap: null } });
      check((await getSettings()).values.ai.admin_daily_usd_cap === null, 'the admin USD cap is not null');
      const seeded = (await listJudges()).find((judge) => judge.name === 'Chỉ một đáp án');
      check(seeded && j(seeded.operations) === j([op]) && seeded.active === true && seeded.latest.model?.model_id === 'fake:bad-form' && j(seeded.latest.criteria.map((c) => c.code)) === j(['single_answer']),
        `seeded judge ${j(seeded && { operations: seeded.operations, active: seeded.active, model: seeded.latest.model })}`);
      T.J = seeded.id;
      T.rev0 = seeded.latest.revision;
      T.liveConfig = psql(`SELECT config_id FROM ai_live_configs WHERE operation = '${op}'`);
      const cfg = await want(asAdmin('GET', `${ai}/configs/${op}`), 200, 'GET configs');
      check(cfg.live.model?.model_id === 'fake:ok' && Number.isInteger(cfg.live.number) && cfg.live.id === T.liveConfig, `live cloze config ${j({ id: cfg.live.id, number: cfg.live.number, model: cfg.live.model })} vs psql ${T.liveConfig}`);
      T.liveNumber = cfg.live.number;
      const sets = await listSets(op);
      T.S = sets.reduce((a, b) => (b.version > a.version ? b : a));
      check(T.S.id === psql(`SELECT id FROM ai_eval_sets WHERE operation = '${op}' ORDER BY version DESC LIMIT 1`), 'the newest set is not the one psql names');
      ok(`A6 ${email} (${me.id}); C0 = ${j(T.C0)}, admin USD cap now null; judge ${T.J} at revision ${T.rev0} on fake:bad-form; live cloze config ${T.liveNumber} (${T.liveConfig}) on fake:ok; newest frozen set v${T.S.version} (${T.S.id})`);
    });

    await step('M5.1 permissions: the editor gets 200 from the three endpoints and sees the new keys (latest_evals, judge_scores, judge_revisions, real_judge_scores, real_judge_latest, reports[].confirmed, days[].cap); the learner gets 403 from each; the admin controls', async () => {
      const paths = [['dashboard', DASHBOARD], ['ai-quality', QUALITY], ['ai-usage/days', `${DAYS}?from=${vnDate(-4)}&to=${vnDate(0)}`]];
      const seen = [];
      for (const [name, path] of paths) {
        const editor = await want(api('GET', path, { as: S.editor }), 200, `editor ${name}`);
        await wantProblem(api('GET', path, { as: S.learner }), 403, 'forbidden', `learner ${name}`);
        const admin = await want(api('GET', path, { as: S.admin }), 200, `admin ${name} (control)`);
        check(Object.keys(editor).join() === Object.keys(admin).join(), `${name}: the editor's keys differ from the admin's`);
        seen.push([name, editor]);
      }
      const [dash, report, usage] = seen.map(([, body]) => body);
      check(Array.isArray(dash.latest_evals) && dash.latest_evals.length === OPERATIONS.length && Array.isArray(dash.judge_scores) && Array.isArray(dash.judge_revisions)
        && j(dash.latest_evals.map((entry) => entry.operation)) === j(OPERATIONS), `dashboard keys ${j(Object.keys(dash))}`);
      check(Array.isArray(report.real_judge_scores) && Array.isArray(report.real_judge_latest) && report.reports.length >= 1 && report.reports.every((row) => Number.isInteger(row.confirmed)), `ai-quality ${j({ keys: Object.keys(report), reports: report.reports })}`);
      check(usage.days.length === 5 && usage.days.every((day) => Number.isInteger(day.cap) && typeof day.at_cap === 'boolean') && Number.isInteger(usage.days_at_cap), `ai-usage/days ${j(usage.days[0])}`);
      ok(`editor 200 on dashboard, ai-quality, ai-usage/days with latest_evals (${dash.latest_evals.length}), judge_scores, judge_revisions, real_judge_scores, real_judge_latest, reports[].confirmed, days[].cap / at_cap; learner 403 forbidden on all three; the admin's keys are the editor's`);
    });

    await step('M5.2 design §5.5: today.calls = the learner calls since Vietnam midnight (psql), today.admin_cost_usd = the cost of test, eval and judge calls since then (psql numeric(20,8)), admin_usd_cap null; the status report says the same', async () => {
      const since = `${vnDate(0)}T00:00:00+07:00`;
      const learnerCalls = () => count(`SELECT count(*) FROM ai_calls WHERE purpose = 'learner' AND created_at >= '${since}'`);
      const adminCost = () => psql(`SELECT coalesce(sum(cost_usd) FILTER (WHERE purpose IN ('test', 'eval', 'judge')), 0)::numeric(20,8)::text FROM ai_calls WHERE created_at >= '${since}'`);
      const calls = learnerCalls();
      const cost = adminCost();
      const dash = await dashboard();
      const status = await want(asAdmin('GET', `${ai}/status`), 200, 'AI status');
      check(learnerCalls() === calls && adminCost() === cost, 'a call was made while the part read the two numbers');
      check(dash.today.calls === calls && dash.today.admin_cost_usd === cost && dash.today.admin_usd_cap === null, `today ${j(dash.today)} vs psql calls ${calls}, admin cost ${cost}`);
      check(canon(status.today) === canon(dash.today), `status.today ${j(status.today)} differs from the dashboard's`);
      check(calls > 0 && Number(cost) > 0, `controls: ${calls} learner calls, admin cost ${cost}: the two numbers would prove nothing`);
      T.calls0 = calls;
      ok(`today.calls ${calls} = psql learner calls since ${since}; admin_cost_usd ${cost} = psql sum of test + eval + judge costs; admin_usd_cap null; GET status says the same`);
    });

    await step('M5.3 design §8.2: a live run of the newest set → latest_evals names it (set, live config, stats = GET run items, keys, no judge yet) and today.calls does not move (B21); a draft run of the same set leaves the live run the latest eval', async () => {
      const run1 = await liveRun();
      T.run1 = run1;
      const entry = (await dashboard()).latest_evals.find((e) => e.operation === op);
      check(entry.set && entry.set.id === T.S.id && entry.set.version === T.S.version && canon(Object.keys(entry.set)) === canon(['id', 'version']), `set ${j(entry.set)}`);
      check(canon(entry.live) === canon({ config_id: T.liveConfig, number: T.liveNumber, model: 'fake:ok' }), `live ${j(entry.live)}`);
      check(entry.run && entry.run.id === run1.id && j(Object.keys(entry.run)) === j(['id', 'created_at', 'model', 'stats', 'judge']), `run ${j(entry.run && Object.keys(entry.run))}`);
      const [[created, model, setId]] = rows(`SELECT ${iso('created_at')}, model, set_id FROM ai_eval_runs WHERE id = '${run1.id}'`);
      check(entry.run.created_at === created && entry.run.model === model && model === 'fake:ok' && setId === T.S.id, `created_at ${entry.run.created_at} vs ${created}, model ${entry.run.model}`);
      const { stats } = await runItems(run1.id);
      check(canon(entry.run.stats) === canon(stats), `stats ${j(entry.run.stats)} vs GET items ${j(stats)}`);
      const counts = rows(`SELECT split, count(*), count(*) FILTER (WHERE status = 'succeeded') FROM ai_eval_run_items WHERE run_id = '${run1.id}' GROUP BY 1 ORDER BY 1`);
      const [dev, heldOut] = ['dev', 'held_out'].map((name) => counts.find(([split]) => split === name)?.slice(1).map(Number) ?? [0, 0]);
      check(entry.run.stats.dev.total === dev[0] && entry.run.stats.dev.shape_pass === dev[1] && entry.run.stats.held_out.total === heldOut[0] && entry.run.stats.held_out.shape_pass === heldOut[1]
        && dev[0] >= 3 && heldOut[0] >= 1, `psql dev ${j(dev)}, held-out ${j(heldOut)} vs stats ${j({ dev: entry.run.stats.dev.total, held: entry.run.stats.held_out.total })}`);
      check(j(entry.run.judge) === '[]', `a run nobody judged has judge ${j(entry.run.judge)}`);
      T.devPerRun = dev[0];
      const after = await dashboard();
      check(after.today.calls === T.calls0 && count(`SELECT count(*) FROM ai_calls WHERE purpose = 'learner' AND created_at >= '${vnDate(0)}T00:00:00+07:00'`) === T.calls0, `today.calls moved from ${T.calls0} to ${after.today.calls} by an eval run`);
      // A draft of the live config, run on the same set, is not "the live config's" eval.
      const existing = (await configsOf(op)).draft;
      T.madeDraft = !existing;
      let draft = existing ?? await createDraft(op);
      if (!draft.model) draft = await setDraftModel(op, 'fake:ok');
      const draftRun = await runAndWait({ operation: op, set_id: T.S.id, config: 'draft' });
      check(draftRun.status === 'finished' && draftRun.complete === true && psql(`SELECT config_id FROM ai_eval_runs WHERE id = '${draftRun.id}'`) === draft.id && draft.id !== T.liveConfig, `draft run ${j({ status: draftRun.status, config: draft.id })}`);
      const still = (await dashboard()).latest_evals.find((e) => e.operation === op);
      check(still.run?.id === run1.id && still.live.config_id === T.liveConfig, `with a newer draft run the latest eval is ${still.run?.id}, expected the live run ${run1.id}`);
      if (T.madeDraft) await want(asAdmin('DELETE', `${ai}/configs/${op}/draft`), 204, 'delete the draft this step made');
      ok(`run ${run1.id} on set v${T.S.version}: latest_evals has it with live config ${T.liveNumber}, stats = GET items (${dev[0]} dev, ${heldOut[0]} held-out, only counts), keys id, created_at, model, stats, judge, judge []; today.calls stays ${T.calls0}; the draft run ${draftRun.id} (config ${draft.id}) does not replace it${T.madeDraft ? '; the draft deleted again' : ''}`);
    });

    await step('M5.4 design §8.3, D17: J judges the run → run.judge = psql counts by split and verdict; a new revision (max_output_tokens changed) judges it again → judge_scores has the live pair (number, fake:ok) for each revision, every group = psql, no hidden run counted; judge_revisions lists both with the D15 rule from psql', async () => {
      const view = await getJudge(T.J);
      check(view.latest.revision === T.rev0, `J is at revision ${view.latest.revision}, expected ${T.rev0}`);
      T.rev0Id = view.latest.id;
      const pass1 = await judgeRun(T.run1.id);
      const first = (await dashboard()).latest_evals.find((e) => e.operation === op);
      const expected1 = judgeOfRun(T.run1.id);
      check(first.run.id === T.run1.id && expected1.length === 1 && expected1[0].judge_revision_id === T.rev0Id && canon(first.run.judge) === canon(expected1), `run.judge ${j(first.run.judge)} vs psql ${j(expected1)}`);
      check(expected1[0].dev.fail_major === T.devPerRun && expected1[0].held_out.fail_major >= 1 && expected1[0].held_out.pass === 0, `the bad-form judge should fail every output: ${j(expected1)}`);
      const saved = await saveJudge(view, { max_output_tokens: (view.latest.max_output_tokens ?? 700) + 1 });
      check(saved.latest.revision === T.rev0 + 1 && saved.latest.id !== T.rev0Id, `new revision ${j({ revision: saved.latest.revision, id: saved.latest.id })}`);
      T.rev1Id = saved.latest.id;
      const pass2 = await judgeRun(T.run1.id);
      const dash = await dashboard();
      const psqlGroups = evalGroupsByPsql();
      const live = (list) => list.filter((g) => g.operation === op && g.config_number === T.liveNumber && g.model === 'fake:ok');
      for (const revisionId of [T.rev0Id, T.rev1Id]) {
        const api = live(dash.judge_scores).filter((g) => g.judge_revision_id === revisionId);
        const mine = live(psqlGroups.groups).filter((g) => g.judge_revision_id === revisionId);
        check(api.length === 1 && api[0].criterion === 'single_answer' && api[0].source === 'eval' && canon(api) === canon(mine), `group of revision ${revisionId}: ${j(api)} vs psql ${j(mine)}`);
        const total = expected1[0].dev.fail_major + expected1[0].held_out.fail_major;
        check(canon(api[0].counts) === canon({ ...zero(), fail_major: total }) && api[0].config_number === T.liveNumber, `counts ${j(api[0].counts)} vs ${total} outputs of the live run`);
      }
      check(canon(byKey(dash.judge_scores)) === canon(byKey(psqlGroups.groups)), `all groups ${j(dash.judge_scores.length)} vs psql ${j(psqlGroups.groups.length)}`);
      check(psqlGroups.hiddenScores > 0, 'control: no judge score sits on a hidden run, so "hidden runs are left out" proves nothing');
      check(dash.judge_scores.every((g, k) => k === 0 || dash.judge_scores[k - 1].first_scored_at <= g.first_scored_at), 'judge_scores are not ordered by first_scored_at');
      const settings = await getSettings();
      const expectedRevisions = revisionsByPsql(settings);
      check(canon(dash.judge_revisions) === canon(expectedRevisions), `judge_revisions ${j(dash.judge_revisions.map((r) => [r.judge_name, r.revision]))} vs psql ${j(expectedRevisions.map((r) => [r.judge_name, r.revision]))}`);
      const mine = dash.judge_revisions.filter((r) => r.judge_id === T.J);
      check(mine.some((r) => r.id === T.rev0Id) && mine.some((r) => r.id === T.rev1Id) && j(mine.map((r) => r.revision)) === j([...mine.map((r) => r.revision)].sort((a, b) => a - b)), `J's revisions ${j(mine.map((r) => r.revision))}`);
      ok(`pass ${pass1.id} → run.judge = psql (dev fail_major ${expected1[0].dev.fail_major}, held-out fail_major ${expected1[0].held_out.fail_major}, as counts); revision ${saved.latest.revision} judged the run again (pass ${pass2.id}); the live pair has one group per revision (${dash.judge_scores.length} groups in all) = psql, ${psqlGroups.hiddenScores} scores of hidden runs left out; judge_revisions lists ${dash.judge_revisions.length} revisions (J: ${mine.map((r) => r.revision).join(', ')}) = psql incl. the D15 rule`);
    });

    await step('M5.5 D15: ten owner labels over the dev items of several live runs → with judge_label_min 10 and judge_agreement_min 0.5 the newest revision is calibrated (6 of 10 agree), the older one by what psql counts; the newest run is the latest eval; labels and limits are put back', async () => {
      const wanted = 10;
      const extra = Math.max(0, Math.ceil(wanted / T.devPerRun) - 1);
      check(extra <= 6, `${T.devPerRun} dev items per run need ${extra} more runs`);
      const runs = [T.run1];
      for (let k = 0; k < extra; k += 1) {
        const made = await liveRun();
        await judgeRun(made.id);
        runs.push(made);
      }
      const items = runs.flatMap((r) => rows(`SELECT id FROM ai_eval_run_items WHERE run_id = '${r.id}' AND split = 'dev' ORDER BY position, id`).map(([id]) => id)).slice(0, wanted);
      check(items.length === wanted, `${items.length} dev items for ${wanted} labels`);
      T.labelled = items;
      await putValues({ ai: { judge_label_min: 10, judge_agreement_min: 0.5 } });
      try {
        for (const [k, id] of items.entries()) {
          await want(asAdmin('PUT', `${ai}/labels`, { body: { subject_kind: 'eval_item', subject_id: id, criterion: 'single_answer', verdict: k < 6 ? 'fail_major' : 'pass' } }), 200, `label ${id}`);
        }
        check(count(`SELECT count(*) FROM ai_labels WHERE subject_kind = 'eval_item' AND labeled_by = '${S.adminId}'`) === wanted, 'the ten labels are not in ai_labels');
        const settings = await getSettings();
        const expected = revisionsByPsql(settings);
        const dash = await dashboard();
        check(canon(dash.judge_revisions) === canon(expected), `judge_revisions ${j(dash.judge_revisions.filter((r) => r.judge_id === T.J).map((r) => [r.revision, r.criteria]))} vs psql ${j(expected.filter((r) => r.judge_id === T.J).map((r) => [r.revision, r.criteria]))}`);
        const newest = dash.judge_revisions.find((r) => r.id === T.rev1Id);
        check(canon(newest.criteria) === canon([{ code: 'single_answer', labeled: 10, agree: 6, calibrated: true }]), `newest revision ${j(newest.criteria)}`);
        // The older revision judged run 1 only: its pairs are the labelled items of run 1, and the first six labels (fail_major) agree with its fail_major.
        const older = dash.judge_revisions.find((r) => r.id === T.rev0Id);
        const onRun1 = new Set(rows(`SELECT id FROM ai_eval_run_items WHERE run_id = '${T.run1.id}'`).map(([id]) => id));
        const olderPairs = items.filter((id) => onRun1.has(id)).length;
        const olderAgree = items.slice(0, 6).filter((id) => onRun1.has(id)).length;
        check(older.criteria[0].labeled === olderPairs && older.criteria[0].agree === olderAgree
          && older.criteria[0].calibrated === (olderPairs >= 10 && older.criteria[0].agree * 100 >= 50 * olderPairs), `older revision ${j(older.criteria)} with ${olderPairs} labelled items on run 1, ${olderAgree} agreeing`);
        // The newest complete run is the latest eval, and its judge counts are the newest revision's alone.
        const latest = dash.latest_evals.find((e) => e.operation === op);
        const lastRun = runs[runs.length - 1];
        check(latest.run.id === lastRun.id && canon(latest.run.judge) === canon(judgeOfRun(lastRun.id)), `latest run ${latest.run.id} vs ${lastRun.id}`);
        check(dash.judge_scores.length === evalGroupsByPsql().groups.length && canon(byKey(dash.judge_scores)) === canon(byKey(evalGroupsByPsql().groups)), 'the groups changed against psql after the extra runs');
        T.calibrated = { newest: newest.criteria[0], older: older.criteria[0], runs: runs.length };
      } finally {
        psql(`DELETE FROM ai_labels WHERE labeled_by = '${S.adminId}'`);
        await putValues({ ai: { judge_label_min: T.C0.labelMin, judge_agreement_min: T.C0.agreementMin } });
      }
      const settings = await getSettings();
      const back = await dashboard();
      check(canon(back.judge_revisions) === canon(revisionsByPsql(settings)) && back.judge_revisions.filter((r) => r.id === T.rev1Id)[0].criteria[0].calibrated === false, 'the labels did not go away');
      ok(`${T.calibrated.runs} live runs (${T.devPerRun} dev items each, each judged by the newest revision), 10 labels (6 fail_major, 4 pass) → revision ${T.rev0 + 1}: labeled 10, agree 6, calibrated true; revision ${T.rev0}: labeled ${T.calibrated.older.labeled}, agree ${T.calibrated.older.agree}, calibrated ${T.calibrated.older.calibrated} (psql: the D15 rule); the last run is the latest eval; labels deleted and limits back to ${T.C0.labelMin} / ${T.C0.agreementMin}: calibrated false again`);
    });

    await step('M5.6 design §8.4: the finished real passes of partM4 → real_judge_latest names the finished pass with the newest score and its counts per criterion, real_judge_scores holds a group per (ai_meta number, model, revision, criterion) = psql join; nothing for an operation no pass judged', async () => {
      const finished = count(`SELECT count(DISTINCT p.id) FROM ai_judge_passes p JOIN ai_judge_scores s ON s.pass_id = p.id WHERE p.kind = 'real' AND p.status = 'finished' AND s.subject_kind = 'real_question' AND s.created_at >= '${vnDate(0)}T00:00:00+07:00'`);
      check(finished >= 1, "M4's part left no finished real pass with a score today");
      const mine = realByPsql();
      const report = await quality();
      check(mine.latestPass !== null && mine.latest.length >= 1, 'psql names no latest finished pass');
      check(canon(report.real_judge_latest) === canon(mine.latest), `real_judge_latest ${j(report.real_judge_latest)} vs psql ${j(mine.latest)}`);
      check(report.real_judge_latest.every((row) => row.operation === op && row.pass_id === mine.latestPass), 'a latest row is of another operation or pass');
      check(canon(byKey(report.real_judge_scores)) === canon(byKey(mine.groups)), `real_judge_scores ${j(report.real_judge_scores)} vs psql ${j(mine.groups)}`);
      check(report.real_judge_scores.length >= 2 && report.real_judge_scores.every((g) => g.source === 'real' && g.operation === op && g.config_number === T.liveNumber && g.model === 'fake:ok'), `groups ${j(report.real_judge_scores.map((g) => [g.operation, g.config_number, g.model, g.judge_revision_id, g.counts]))}`);
      const total = report.real_judge_scores.reduce((sum, g) => sum + g.counts.pass + g.counts.fail_major + g.counts.fail_minor + g.counts.unscored, 0);
      check(total === count(`SELECT count(*) FROM ai_judge_scores s JOIN practice_questions q ON q.id = s.subject_id WHERE s.subject_kind = 'real_question'`), `the groups hold ${total} scores`);
      check(report.real_judge_scores.every((g, k) => k === 0 || report.real_judge_scores[k - 1].first_scored_at <= g.first_scored_at), 'real_judge_scores are not ordered by first_scored_at');
      check(report.real_judge_latest.length > 0 && !report.real_judge_latest.some((row) => row.operation !== op), 'an operation without a real pass has a row');
      T.latestRealPass = mine.latestPass;
      ok(`${finished} finished real pass(es) with a score today; latest = pass ${mine.latestPass} (${report.real_judge_latest.map((row) => `${row.criterion}: ${j(row.counts)}`).join('; ')}) = psql; ${report.real_judge_scores.length} groups of (${T.liveNumber}, fake:ok, revision, criterion) with ${total} scores = psql join; no row for the other operations`);
    });

    await step('M5.7 F11: an AI cloze of E (asked, not reported, not about its private word) is reported (ai_more_than_one_answer) and confirmed → the ai row of reports: confirmed +1, total +1, open unchanged; every count = psql', async () => {
      const since = vnDate(-29);
      const sqlRow = () => rows(`SELECT count(*), count(*) FILTER (WHERE status = 'open'), count(*) FILTER (WHERE status = 'no_error'), count(*) FILTER (WHERE status = 'fixed'),
        count(*) FILTER (WHERE status = 'confirmed'), count(*) FILTER (WHERE refunded) FROM practice_reports WHERE question_source = 'ai' AND created_at >= '${since}T00:00:00+07:00'`)[0].map(Number);
      const aiRow = (report) => report.reports.find((row) => row.source === 'ai');
      const before = aiRow(await quality());
      const [total0, open0, noError0, fixed0, confirmed0, refunded0] = sqlRow();
      check(canon([before.total, before.open, before.no_error, before.fixed, before.confirmed, before.refunded]) === canon([total0, open0, noError0, fixed0, confirmed0, refunded0]), `before: ${j(before)} vs psql ${j([total0, open0, noError0, fixed0, confirmed0, refunded0])}`);
      const [candidate] = rows(`SELECT i.id FROM practice_session_items i JOIN practice_questions q ON q.id = i.question_id
        WHERE q.user_id = '${S.editor.id}' AND q.source = 'ai' AND q.ai_meta->>'operation' = '${op}' AND coalesce(q.answer_key->>'asked_private', 'false') = 'false'
        AND NOT EXISTS (SELECT 1 FROM practice_reports r WHERE r.item_id = i.id) ORDER BY i.asked_at LIMIT 1`);
      check(candidate, 'E has no AI cloze that it has not reported');
      const created = await want(api('POST', `/v1/practice/items/${candidate[0]}/report`, { as: S.editor, body: { reason: 'ai_more_than_one_answer', note: 'smoke M5: another word fits' } }), 201, 'E reports');
      const mid = aiRow(await quality());
      check(mid.total === total0 + 1 && mid.open === open0 + 1 && mid.confirmed === confirmed0, `after the report ${j(mid)}`);
      const resolved = await want(asAdmin('POST', `/v1/admin/practice/reports/${created.id}/resolve`, { idem: true, body: { status: 'confirmed' } }), 200, 'confirm');
      check(resolved.status === 'confirmed' && resolved.resolved_by === S.adminId, `resolve ${j(resolved)}`);
      const after = aiRow(await quality());
      const [total1, open1, noError1, fixed1, confirmed1, refunded1] = sqlRow();
      check(after.total === before.total + 1 && after.confirmed === before.confirmed + 1 && after.open === before.open && after.no_error === before.no_error && after.fixed === before.fixed, `ai row ${j(before)} → ${j(after)}`);
      check(canon([after.total, after.open, after.no_error, after.fixed, after.confirmed, after.refunded]) === canon([total1, open1, noError1, fixed1, confirmed1, refunded1]), `after: ${j(after)} vs psql ${j([total1, open1, noError1, fixed1, confirmed1, refunded1])}`);
      check(j(Object.keys(after)) === j(['source', 'total', 'open', 'no_error', 'fixed', 'confirmed', 'refunded']), `row keys ${j(Object.keys(after))}`);
      ok(`report ${created.id} on item ${candidate[0]}: ai row ${j(before)} → report (total +1, open +1) → confirmed (open back, confirmed +1) = ${j(after)} = psql`);
    });

    await step('M5.8 design §8.1, B44: two older changes of entitlements.ai_daily_cap (C0 → 3 at noon of today − 3, 3 → C0 at noon of today − 1) and uses on three days are inserted; a real PUT of the cap to 4 → today\'s cap is 4, back to C0; each day is measured against its own cap', async () => {
      const day = (offset) => vnDate(offset);
      const noon = (offset) => `${day(offset)}T12:00:00+07:00`;
      const [d4, d3, d2, d1, d0] = [-4, -3, -2, -1, 0].map(day);
      const seedChangeIds = [randomUUID(), randomUUID()];
      const seedUses = { [d3]: 3, [d2]: 2, [d1]: 3 };
      psql(`INSERT INTO app_setting_changes (id, key, old_value, new_value, changed_by, changed_at) VALUES
        ('${seedChangeIds[0]}', 'entitlements.ai_daily_cap', '${T.C0.dailyCap}'::jsonb, '3'::jsonb, '${S.adminId}', '${noon(-3)}'),
        ('${seedChangeIds[1]}', 'entitlements.ai_daily_cap', '3'::jsonb, '${T.C0.dailyCap}'::jsonb, '${S.adminId}', '${noon(-1)}')`);
      let n = 0;
      const values = Object.entries(seedUses).flatMap(([date, uses]) => Array.from({ length: uses }, () => {
        n += 1;
        return `('${S.learner.id}', 'ai_lookup', 'smoke-m5-${run}-${n}', 'use', 'confirmed', '${date}', '${date}T05:00:00Z')`;
      }));
      psql(`INSERT INTO usage_records (user_id, pool, operation_id, kind, status, system_date, confirmed_at) VALUES ${values.join(',')}`);
      try {
        const todayUsed = count(`SELECT count(*) FROM usage_records WHERE pool IN ('ai_practice', 'ai_lookup') AND kind = 'use' AND status = 'confirmed' AND system_date = '${d0}'`);
        check(todayUsed < T.C0.dailyCap, `today's AI uses ${todayUsed} reach the cap ${T.C0.dailyCap}`);
        await putValues({ entitlements: { ai_daily_cap: 4 } });
        const withFour = await daysOf(d4, d0);
        const todayRow = withFour.days.find((entry) => entry.date === d0);
        check(todayRow.cap === 4 && todayRow.at_cap === (todayUsed >= 4) && todayRow.total === todayUsed && withFour.today.cap === 4, `today with cap 4: ${j(todayRow)}, today ${j(withFour.today)}`);
        await putValues({ entitlements: { ai_daily_cap: T.C0.dailyCap } });
        const view = await daysOf(d4, d0);
        const total = (date) => count(`SELECT count(*) FROM usage_records WHERE pool IN ('ai_practice', 'ai_lookup') AND kind = 'use' AND status = 'confirmed' AND system_date = '${date}'`);
        check(j(view.days.map((entry) => entry.date)) === j([d4, d3, d2, d1, d0]), `days ${j(view.days.map((entry) => entry.date))}`);
        check(j(view.days.map((entry) => entry.total)) === j([0, 3, 2, 3, todayUsed]) && j(view.days.map((entry) => entry.total)) === j([d4, d3, d2, d1, d0].map(total)), `totals ${j(view.days.map((entry) => entry.total))}`);
        check(j(view.days.map((entry) => entry.cap)) === j([T.C0.dailyCap, 3, 3, T.C0.dailyCap, T.C0.dailyCap]), `caps ${j(view.days.map((entry) => entry.cap))}`);
        check(j(view.days.map((entry) => entry.at_cap)) === j([false, true, false, false, false]) && view.days_at_cap === 1 && view.today.cap === T.C0.dailyCap, `at_cap ${j(view.days.map((entry) => entry.at_cap))}, days_at_cap ${view.days_at_cap}`);
        const againstToday = view.days.filter((entry) => entry.total >= T.C0.dailyCap).length;
        check(againstToday === 0, `control: against C0 every day would count ${againstToday}`);
        const chain = rows(`SELECT old_value, new_value FROM app_setting_changes WHERE key = 'entitlements.ai_daily_cap' AND changed_at >= '${noon(-3)}' ORDER BY changed_at, id`);
        check(canon(chain.slice(0, 2)) === canon([[String(T.C0.dailyCap), '3'], ['3', String(T.C0.dailyCap)]]) && canon(chain.slice(-2)) === canon([[String(T.C0.dailyCap), '4'], ['4', String(T.C0.dailyCap)]]), `history ${j(chain)}`);
        ok(`caps by day ${view.days.map((entry) => entry.cap).join(', ')}; totals ${view.days.map((entry) => entry.total).join(', ')} (= psql); at_cap ${j(view.days.map((entry) => entry.at_cap))}, days_at_cap 1 (against ${T.C0.dailyCap} for every day: ${againstToday}); a real PUT to 4 made today's cap 4 (at_cap ${todayRow.at_cap}), back to ${T.C0.dailyCap}`);
      } finally {
        psql(`DELETE FROM app_setting_changes WHERE id IN (${seedChangeIds.map((id) => `'${id}'`).join(',')})`);
        psql(`DELETE FROM usage_records WHERE operation_id LIKE 'smoke-m5-${run}-%'`);
      }
    });

    await step('M5.9 R7: no example id, run item id, question id, pass item id, user id, email, example word or question text in the three responses, and the held-out examples of the newest set appear only as counts (controls: the set id, the live run, the judge name, the real pass)', async () => {
      const dash = await dashboard();
      const report = await quality();
      const usage = await daysOf(vnDate(-4), vnDate(0));
      const text = j([dash, report, usage]);
      const heldOut = rows(`SELECT example_id FROM ai_eval_set_items WHERE set_id = '${T.S.id}' AND split = 'held_out'`).map(([id]) => id);
      check(heldOut.length >= 1, 'control: the newest set has no held-out example');
      const ids = (sql) => rows(sql).map(([id]) => id);
      const secrets = [
        ...ids('SELECT id FROM ai_eval_examples'), ...ids('SELECT example_id FROM ai_eval_set_items'), ...ids('SELECT id FROM ai_eval_run_items'), ...ids('SELECT id FROM practice_questions'),
        ...ids('SELECT id FROM ai_judge_pass_items'), ...ids('SELECT id FROM practice_session_items'), ...ids('SELECT id FROM users'), ...ids('SELECT email FROM users WHERE email IS NOT NULL'),
        ...ids(`SELECT lemma FROM entries WHERE scope = 'private'`), ...WORDS, N, 'Lan will ___', 'nghĩa thử', ...heldOut,
      ];
      check(secrets.length > 50 && secrets.includes(heldOut[0]) && secrets.includes(S.learner.id), `control: only ${secrets.length} private values searched`);
      for (const secret of secrets) check(!text.includes(secret), `a response names ${secret}`);
      const held = dash.latest_evals.find((e) => e.operation === op).run.stats.held_out;
      check(held.total >= 1 && Number.isInteger(held.shape_pass), `held-out stats ${j(held)}`);
      const latestRun = dash.latest_evals.find((e) => e.operation === op).run.id;
      for (const present of [T.S.id, T.liveConfig, 'Chỉ một đáp án', T.latestRealPass, latestRun]) check(text.includes(present), `control: the responses do not hold ${present}`);
      ok(`${secrets.length} private values (${heldOut.length} held-out example ids of set v${T.S.version}, all example, item, question and user ids, emails, words, a question sentence) searched in ${text.length} characters of the three responses: none found; held-out only as counts (${held.total} outputs); the controls are there`);
    });

    await step('M5.10 the part\'s end state: the admin cap and the judge limits as C0, entitlements.ai_daily_cap as C0, no queued or running pass or run, E an editor, the seeded history and usage rows gone', async () => {
      await putValues({ ai: { admin_daily_usd_cap: T.C0.adminCap } });
      const { values } = await getSettings();
      check(canon([values.ai.admin_daily_usd_cap, values.ai.judge_label_min, values.ai.judge_agreement_min, values.entitlements.ai_daily_cap]) === canon([T.C0.adminCap, T.C0.labelMin, T.C0.agreementMin, T.C0.dailyCap]), `settings ${j(values.ai)} ${j(values.entitlements.ai_daily_cap)}`);
      check(count(`SELECT count(*) FROM ai_judge_passes WHERE status IN ('queued', 'running')`) === 0 && count(`SELECT count(*) FROM ai_eval_runs WHERE status IN ('queued', 'running')`) === 0, 'a pass or a run is still active');
      check(count(`SELECT count(*) FROM usage_records WHERE operation_id LIKE 'smoke-m5-${run}-%'`) === 0 && count(`SELECT count(*) FROM ai_labels WHERE labeled_by = '${S.adminId}'`) === 0, 'seeded rows are still there');
      const detail = await want(asAdmin('GET', `/v1/admin/users/${S.editor.id}`), 200, 'GET E');
      check(detail.staff_role === 'editor', `E is ${detail.staff_role}`);
      ok(`admin USD cap ${j(T.C0.adminCap)}, judge limits ${T.C0.labelMin} / ${T.C0.agreementMin}, ai_daily_cap ${T.C0.dailyCap}; no active pass or run; seeded rows deleted; E editor`);
    });
  } finally {
    S.admin = outer.admin;
    S.adminId = outer.adminId;
  }
}

async function main() {
  const started = Date.now();
  await setup();
  await partM1();
  await partM2();
  await partM3();
  await partM4();
  await partM5();

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
