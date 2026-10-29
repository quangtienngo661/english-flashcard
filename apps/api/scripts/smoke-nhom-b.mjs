// Smoke test for nhóm B (AI quality round: golden set, config lifecycle, judge, real questions, dashboard, D7/D30) against a REAL running API +
// worker (design §13; plan `docs/superpowers/plans/2026-10-29-nhom-b.md`, contract §7). Start them first: `docker compose up -d` (repo root), create the
// database `english_learning_smoke_nb`, then in this package: `pnpm db:setup && pnpm build && pnpm run:dev` with DATABASE_URL on that database,
// AI_FAKE_ENABLED=true, no OPENAI_API_KEY / ANTHROPIC_API_KEY and JOB_QUEUE_PREFIX=wordmet-nb-smoke, on a fresh database; then `pnpm smoke:nhom-b`
// (SMOKE_BASE_URL when the API does not listen on :3000). Needs DATABASE_URL (env, else .env), Mailpit, and `docker compose -p english-learning` for
// psql. No real provider is called.
//
// Shape: `setup()` makes the first admin, the fake models, one catalog verb import and the model choice; each milestone adds one `partM<n>()`
// (contract §7). The `ai.test` limit is 20 uses per hour per user and every eval run and prompt test uses one, so `setup()`, `partM1()` and
// `partM2()` run as the first admin and every later part as a new admin made with `POST /v1/admin/users` (staff_role admin: no registration spent).
// A failing step is reported and the run goes on with the next one; the exit code is 0 only when every step matched.
import { execFile, execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

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
const S = { admin: null, adminId: null, models: new Map() };
const asAdmin = (method, path, options = {}) => api(method, path, { as: S.admin, ...options });

async function addModel(modelId) {
  if (S.models.has(modelId)) return S.models.get(modelId);
  const view = await want(asAdmin('POST', '/v1/admin/ai/models', { body: { provider: 'fake', model_id: modelId } }), 201, `add ${modelId}`);
  S.models.set(modelId, view);
  return view;
}
/** Temporary (M2-T13 moves this onto config drafts): the model of an operation through the operations endpoint. */
async function choose(op, modelId) {
  const model = modelId === null ? null : await addModel(modelId);
  const list = await want(asAdmin('GET', '/v1/admin/ai/operations'), 200, 'GET operations');
  const current = list.items.find((row) => row.operation === op);
  check(current, `operation ${op} is not listed`);
  await want(asAdmin('PUT', `/v1/admin/ai/operations/${op}`, { body: {
    expected_version: current.version, model_ref: model?.id ?? null, effort: null, thinking: null, max_output_tokens: null,
  } }), 200, `choose ${modelId} for ${op}`);
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

  await step('AI setup: fake provider on, fake:ok and fake:bad-form added, fake:ok chosen for generate_cloze and check_private_word', async () => {
    const status = await want(asAdmin('GET', '/v1/admin/ai/status'), 200, 'AI status');
    check(status.providers.fake === true && status.providers.openai === false && status.providers.anthropic === false,
      `providers ${j(status.providers)}: start the API with AI_FAKE_ENABLED=true and no key`);
    for (const model of ['fake:ok', 'fake:bad-form']) await addModel(model);
    await choose('generate_cloze', 'fake:ok');
    await choose('check_private_word', 'fake:ok');
    ok('providers: fake only; models fake:ok and fake:bad-form; generate_cloze and check_private_word on fake:ok');
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

  await step('M1.4 B3, B8, B9: runs with fake:ok on version 1 and on the working set; rule and expected results; held-out only as numbers', async () => {
    okRun = await runAndWait({ operation: 'generate_cloze', prompt: 'current', set_id: version1.id });
    workingRun = await runAndWait({ operation: 'generate_cloze', prompt: 'current' });
    check(okRun.status === 'finished' && okRun.complete === true && okRun.set_id === version1.id && okRun.set_version === 1 && okRun.total === 5, `run ${j(okRun)}`);
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
    await choose('generate_cloze', 'fake:bad-form');
    try {
      badRun = await runAndWait({ operation: 'generate_cloze', prompt: 'current', set_id: version1.id });
    } finally {
      await choose('generate_cloze', 'fake:ok');
    }
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

  await step('M1.7 B7, Review focus 3: a prompt test takes dev examples only; a held-out id is refused', async () => {
    const prompt = await want(asAdmin('GET', '/v1/admin/ai/prompts/generate_cloze'), 200, 'prompt');
    const body = { instructions: prompt.instructions, examples: prompt.examples };
    const tested = await want(asAdmin('POST', '/v1/admin/ai/prompts/generate_cloze/test', { body }), 200, 'prompt test');
    check(tested.items.length === 3 && j(tested.items.map((item) => item.input.word).sort()) === j([W2, N, W3].sort()), `test inputs ${j(tested.items.map((i) => i.input.word))}`);
    const refused = await wantProblem(asAdmin('POST', '/v1/admin/ai/prompts/generate_cloze/test', { body: { ...body, example_ids: [ids[W1]] } }), 400, 'validation-failed', 'test a held-out id');
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

  await step('M1.10 B9: a check_private_word example (bulk, dev) runs on the working set: rule not applicable, expected pass', async () => {
    const added = await want(asAdmin('POST', '/v1/admin/ai/eval/examples/bulk', { body: {
      operation: 'check_private_word',
      rows: [{ input: { word: 'rizz', part_of_speech: 'noun', meaning_vi: 'sức hút' }, expected: { verdict: 'ok' }, split: 'dev' }],
    } }), 200, 'bulk private word');
    check(added.created === 1 && added.invalid.length === 0, `bulk ${j(added)}`);
    const finished = await runAndWait({ operation: 'check_private_word', prompt: 'current' });
    check(finished.status === 'finished' && finished.set_id === null, `run ${j(finished)}`);
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
}

async function main() {
  const started = Date.now();
  await setup();
  await partM1();

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
