// Smoke test for Bước 6 (AI Integration) against a REAL running API + worker (design §16 B6#1–B6#30 without B6#19 and B6#26,
// §17 item 2; plan Task 20). Start them first: `docker compose up -d` (repo root), then `pnpm build && pnpm run:dev` (this
// package) with AI_FAKE_ENABLED=true, no OPENAI_API_KEY / ANTHROPIC_API_KEY and JOB_QUEUE_PREFIX=wordmet-b6-smoke, on a fresh
// database (`english_learning_smoke_b6`), then `pnpm smoke:buoc-6`. Needs DATABASE_URL (env, else .env), Mailpit, and
// `docker compose -p english-learning` for psql and for stopping Redis (B6#30). No real provider is called (D19).
//
// The API has no fake clock: "time passes" means back-dating columns with psql, then `pnpm maintenance:run` (design §17 item 2).
// Learner calls go through `pnpm ai:fake-call` (dist/cli/ai-fake-call.js); every fake scenario gets its own data, because the
// `*-then-ok` scenarios count calls per data (plan choice 16). Exit code 0 only when every step matched.
import { execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-Test-Pass-9!';
const QUEUE_PREFIX = 'wordmet-b6-smoke';
const run = randomUUID().slice(0, 8);

const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
if (!process.env.DATABASE_URL && fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env).');
// The CLIs read .env, and a variable in their environment wins; the smoke sets both below, so it only refuses a .env that
// would make its own children disagree with the API it expects (plan Task 20).
for (const [key, want] of [['AI_FAKE_ENABLED', 'true'], ['JOB_QUEUE_PREFIX', QUEUE_PREFIX]]) {
  const value = process.env[key] ?? fileEnv[key];
  if (value !== undefined && value !== want) throw new Error(`${key} is ${value}; the smoke needs ${want} (env or .env) and the API alike.`);
}
for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']) {
  if (process.env[key] || fileEnv[key]) throw new Error(`${key} is set: the smoke runs with the fake provider only (D19).`);
}
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);
const CHILD_ENV = { ...process.env, AI_FAKE_ENABLED: 'true', JOB_QUEUE_PREFIX: QUEUE_PREFIX, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' };

let stepNo = 0;
function step(name) { stepNo += 1; console.log(`\n[${stepNo}] ${new Date().toISOString().slice(11, 19)}Z ${name}`); }
function ok(detail) { console.log(`    ok — ${detail}`); }
function check(condition, message) { if (!condition) throw new Error(message); }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `fetch`, retried on a network error: the API closes an idle keep-alive socket after 5 s, and a request sent on it just then
 * fails with "fetch failed" before the server reads it (seen in Bước 5's smoke after CLI pauses); the cause is printed.
 */
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

/** One request; waits out a 429 (user.write is 30/min, ai.test 20/h) and retries with the same Idempotency-Key. */
async function api(method, path, { token, body, idem = false, key } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idem || key) headers['Idempotency-Key'] = key ?? randomUUID();
  for (let attempt = 0; ; attempt += 1) {
    const res = await send(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.status !== 429 || attempt >= 5) return read(res);
    const wait = Number(res.headers.get('retry-after') ?? '5');
    console.log(`    (429 on ${method} ${path}; waiting ${wait}s)`);
    await sleep(wait * 1000 + 250);
  }
}

async function read(res) {
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, json, text };
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

function psql(sql) {
  return execFileSync('docker', ['compose', '-p', 'english-learning', 'exec', '-T', 'postgres', 'psql', '-U', 'dev', '-d', DB_NAME,
    '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql], { encoding: 'utf8' }).trim();
}
const count = (sql) => Number(psql(sql));
const callsFor = (operationId) => count(`SELECT count(*) FROM ai_calls WHERE operation_id = '${operationId}'`);
const outcomesFor = (operationId) => psql(`SELECT string_agg(outcome, ',' ORDER BY attempt) FROM ai_calls WHERE operation_id = '${operationId}'`);

function compose(...args) {
  execFileSync('docker', ['compose', '-p', 'english-learning', ...args], { stdio: 'pipe' });
}

async function waitFor(readValue, done, what, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await readValue();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`${what} did not happen within ${timeoutMs}ms: ${JSON.stringify(value)}`);
    await sleep(250);
  }
}

async function waitForApi(timeoutMs = 20_000) {
  await waitFor(async () => {
    try { return (await fetch(`${BASE}/v1/health`)).ok; } catch { return false; }
  }, Boolean, `API at ${BASE}`, timeoutMs);
}

function built(file) {
  if (!existsSync(file)) throw new Error(`Missing ${file}; run \`pnpm build\` first.`);
  return file;
}

function maintenance() {
  execFileSync(process.execPath, [built('dist/cli/run-maintenance.js')], { stdio: 'pipe', env: CHILD_ENV });
}

/**
 * `pnpm ai:fake-call`; one parsed line per call. The AppLogger writes JSON lines to stdout too (one `ai_call` per provider
 * call), so only lines whose kind is `ai_fake_call` are kept (plan review #9).
 */
function aiFakeCall(op, { user, data, operationId, parallel, purpose } = {}) {
  const args = [built('dist/cli/ai-fake-call.js'), op, '--user', user ?? LEARNER];
  if (data !== undefined) args.push('--data', JSON.stringify(data));
  if (operationId) args.push('--operation-id', operationId);
  if (parallel) args.push('--parallel', String(parallel));
  if (purpose) args.push('--purpose', purpose);
  const out = execFileSync(process.execPath, args, { encoding: 'utf8', env: CHILD_ENV });
  return out.split(/\r?\n/).filter((line) => line.startsWith('{')).map((line) => JSON.parse(line))
    .filter((line) => line.kind === 'ai_fake_call');
}
/** One learner call; returns `{ result, elapsed_ms }`. */
function call(op, data, operationId = randomUUID(), user = LEARNER) {
  const lines = aiFakeCall(op, { user, data, operationId });
  check(lines.length === 1, `ai:fake-call printed ${lines.length} result lines`);
  return { ...lines[0], operationId };
}

async function mailsTo(email) {
  const list = await (await send(`${MAILPIT}/api/v1/messages?limit=500`)).json();
  return (list.messages ?? []).filter((m) => m.To?.some((to) => to.Address === email));
}

async function otpCodeFor(email) {
  await sleep(1_000);
  const deadline = Date.now() + 10_000;
  for (;;) {
    const message = (await mailsTo(email)).sort((a, b) => (a.Created < b.Created ? 1 : -1))[0];
    if (message) {
      const full = await (await send(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const match = (full.Text ?? '').match(/(\d{6})/);
      if (match) return match[1];
    }
    if (Date.now() > deadline) throw new Error(`No OTP mail found for ${email} after 10s`);
    await sleep(300);
  }
}

async function registerVerified(email) {
  const registered = await want(api('POST', '/v1/auth/register', {
    body: { email, password: PASSWORD, timezone: TIMEZONE, given_name: 'Smoke', birth_date: '2000-01-01', accept_terms: true, client: 'web' } }), 201, `register ${email}`);
  await want(api('POST', '/v1/auth/otp', { token: registered.access_token, body: { purpose: 'verify_email' } }), 202, 'request OTP');
  const code = await otpCodeFor(email);
  await want(api('POST', '/v1/auth/verify-email', { token: registered.access_token, body: { code } }), 200, `verify ${email}`);
  return registered.access_token;
}

const login = async (email) => (await want(api('POST', '/v1/auth/login', {
  body: { email, password: PASSWORD, client: 'web' } }), 200, `login ${email}`)).access_token;

// Letters only: a word the operation's input rules accept, distinct per scenario.
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(97 + randomInt(26))).join('');
const clozeData = (word = letters(8)) => ({ word, part_of_speech: 'verb', level: 'A2', meaning_vi: 'hoàn thành', context_label: null });

// The learner of every `ai:fake-call` (a plain uuid: `ai_calls.user_id` has no foreign key, design §11).
const LEARNER = randomUUID();

async function main() {
  const started = Date.now();

  step('Wait for the API');
  await waitForApi();
  ok(`reachable at ${BASE}; database ${DB_NAME}; children run with AI_FAKE_ENABLED=true, JOB_QUEUE_PREFIX=${QUEUE_PREFIX}, no key`);

  // ------------------------------------------------------------------------------------------------------------------
  step('Accounts: admin (CLI grant), one editor (created by the admin)');
  const adminEmail = `smoke6-admin-${run}@example.com`;
  await registerVerified(adminEmail);
  execFileSync(process.execPath, [built('dist/cli/admin-grant.js'), adminEmail], { stdio: 'pipe', env: CHILD_ENV });
  const admin = await login(adminEmail);
  const editorEmail = `smoke6-editor-${run}@example.com`;
  await want(api('POST', '/v1/admin/users', { token: admin, body: {
    email: editorEmail, staff_role: 'editor', password: PASSWORD, must_change_password: false, timezone: TIMEZONE } }), 201, 'create editor');
  const editor = await login(editorEmail);
  ok(`admin ${adminEmail}; editor ${editorEmail}; learner uuid ${LEARNER}`);

  const status = () => want(api('GET', '/v1/admin/ai/status', { token: admin }), 200, 'GET status');
  const opStatus = async (op) => (await status()).operations.find((row) => row.operation === op);
  async function settings(section, patch) {
    const current = await want(api('GET', '/v1/admin/settings', { token: admin }), 200, 'GET settings');
    await want(api('PUT', '/v1/admin/settings', { token: admin, idem: true, body: { version: current.version, values: { [section]: patch } } }),
      200, `PUT settings ${section} ${JSON.stringify(patch)}`);
  }
  const models = new Map();
  async function addModel(modelId) {
    if (models.has(modelId)) return models.get(modelId);
    const view = await want(api('POST', '/v1/admin/ai/models', { token: admin, body: { provider: 'fake', model_id: modelId } }), 201,
      `add ${modelId}`);
    models.set(modelId, view);
    return view;
  }
  async function operation(op) {
    const list = await want(api('GET', '/v1/admin/ai/operations', { token: admin }), 200, 'GET operations');
    return list.items.find((row) => row.operation === op);
  }
  async function choose(op, modelId, maxOutputTokens = null) {
    const model = modelId === null ? null : await addModel(modelId);
    const current = await operation(op);
    return want(api('PUT', `/v1/admin/ai/operations/${op}`, { token: admin, body: {
      expected_version: current.version, model_ref: model?.id ?? null, effort: null, thinking: null, max_output_tokens: maxOutputTokens,
    } }), 200, `choose ${modelId} for ${op}`);
  }
  const prompt = (op) => want(api('GET', `/v1/admin/ai/prompts/${op}`, { token: admin }), 200, `GET prompt ${op}`);

  // ------------------------------------------------------------------------------------------------------------------
  step('Fake provider on, no key: GET /v1/admin/ai/status');
  const first = await status();
  check(first.providers.fake === true && first.providers.openai === false && first.providers.anthropic === false,
    `providers ${JSON.stringify(first.providers)}: start the API with AI_FAKE_ENABLED=true and no key`);
  ok('providers: fake true, openai false, anthropic false');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#1: a fresh database, no model chosen');
  const ops = ['generate_cloze', 'lookup_word', 'translate_sentence'];
  // Bước 7 seeds generate_cloze revision 2 on a fresh database (plan choice 1): read the revision instead of assuming 1.
  const seededRevisions = {};
  for (const op of ops) {
    const row = first.operations.find((item) => item.operation === op);
    check(row && row.ready === false && row.reason === 'model-not-set', `${op} status ${JSON.stringify(row)}`);
    const seeded = await prompt(op);
    check(Number.isInteger(seeded.revision) && seeded.revision >= 1, `${op} prompt revision ${seeded.revision}`);
    seededRevisions[op] = seeded.revision;
    const choice = await operation(op);
    check(choice.version === 0 && choice.model === null, `${op} operation ${JSON.stringify(choice)}`);
  }
  const notSet = call('generate_cloze', clozeData()).result;
  check(notSet.status === 'unavailable' && notSet.reason === 'model-not-set', `call ${JSON.stringify(notSet)}`);
  const clozeRevision = seededRevisions.generate_cloze;
  ok(`three operations model-not-set; prompts seeded (${JSON.stringify(seededRevisions)}); operations at version 0; ai:fake-call → unavailable/model-not-set`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#2: add fake:ok (price 0), choose it for generate_cloze, call');
  const fakeOk = await addModel('fake:ok');
  check(fakeOk.price?.input !== undefined && Number(fakeOk.price.input) === 0 && Number(fakeOk.price.output) === 0,
    `fake:ok price ${JSON.stringify(fakeOk.price)}`);
  await choose('generate_cloze', 'fake:ok');
  const okData = clozeData();
  const okCall = call('generate_cloze', okData);
  check(okCall.result.status === 'succeeded', `result ${JSON.stringify(okCall.result)}`);
  check(okCall.result.result.sentence.split('___').length === 2, `sentence ${okCall.result.result.sentence}`);
  check(okCall.result.meta.prompt_revision === clozeRevision && okCall.result.meta.replayed === false, `meta ${JSON.stringify(okCall.result.meta)}`);
  check(callsFor(okCall.operationId) === 1, `ai_calls rows ${callsFor(okCall.operationId)}`);
  ok(`succeeded "${okCall.result.result.sentence}"; prompt_revision ${clozeRevision}; one ai_calls row; price 0`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#3: the same operation id and data again');
  const again = call('generate_cloze', okData, okCall.operationId);
  check(again.result.status === 'succeeded' && again.result.meta.replayed === true, `result ${JSON.stringify(again.result)}`);
  check(callsFor(okCall.operationId) === 1, `ai_calls rows ${callsFor(okCall.operationId)}`);
  ok('replayed: true; still one ai_calls row');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#5: fake:503-then-ok');
  await choose('generate_cloze', 'fake:503-then-ok');
  const r503 = call('generate_cloze', clozeData());
  check(r503.result.status === 'succeeded', `result ${JSON.stringify(r503.result)}`);
  check(outcomesFor(r503.operationId) === 'provider-error,succeeded', `outcomes ${outcomesFor(r503.operationId)}`);
  ok(`succeeded after one quick retry; two ai_calls rows (provider-error, succeeded); ${r503.elapsed_ms} ms`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#6: fake:429-then-ok');
  await choose('generate_cloze', 'fake:429-then-ok');
  const r429 = call('generate_cloze', clozeData());
  check(r429.result.status === 'succeeded', `result ${JSON.stringify(r429.result)}`);
  check(r429.elapsed_ms >= 1000, `elapsed ${r429.elapsed_ms} ms, expected ≥ 1000 (retry-after 1 s)`);
  check(outcomesFor(r429.operationId) === 'rate-limited,succeeded', `outcomes ${outcomesFor(r429.operationId)}`);
  ok(`succeeded after waiting retry-after; ${r429.elapsed_ms} ms; outcomes rate-limited, succeeded`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#7: fake:two-blanks');
  await choose('generate_cloze', 'fake:two-blanks');
  const two = call('generate_cloze', clozeData());
  check(two.result.status === 'transient_failure' && two.result.reason === 'invalid-shape', `result ${JSON.stringify(two.result)}`);
  check(outcomesFor(two.operationId) === 'invalid-shape', `outcomes ${outcomesFor(two.operationId)}`);
  ok('transient_failure/invalid-shape; one ai_calls row with outcome invalid-shape');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#8: fake:refuse, twice with one operation id');
  await choose('generate_cloze', 'fake:refuse');
  const refuseData = clozeData();
  const refused = call('generate_cloze', refuseData);
  check(refused.result.status === 'permanent_failure' && refused.result.reason === 'refused', `first ${JSON.stringify(refused.result)}`);
  const refusedAgain = call('generate_cloze', refuseData, refused.operationId);
  check(refusedAgain.result.status === 'permanent_failure' && refusedAgain.result.reason === 'refused', `second ${JSON.stringify(refusedAgain.result)}`);
  check(callsFor(refused.operationId) === 1, `ai_calls rows ${callsFor(refused.operationId)}`);
  ok('both permanent_failure/refused; one ai_calls row for the id (the second call replayed the stored failure)');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#9 and B6#21: fake:quota, then the status page');
  await choose('generate_cloze', 'fake:quota');
  const quota = call('generate_cloze', clozeData());
  check(quota.result.status === 'unavailable' && quota.result.reason === 'provider-quota', `result ${JSON.stringify(quota.result)}`);
  const quotaStatus = await opStatus('generate_cloze');
  check(quotaStatus.last_error?.outcome === 'provider-quota', `status ${JSON.stringify(quotaStatus)}`);
  ok('unavailable/provider-quota; status of generate_cloze: last_error provider-quota');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#4: fake:slow');
  await choose('generate_cloze', 'fake:slow');
  const slow = call('generate_cloze', clozeData());
  check(slow.result.status === 'transient_failure' && slow.result.reason === 'timeout', `result ${JSON.stringify(slow.result)}`);
  check(slow.elapsed_ms >= 9_000 && slow.elapsed_ms <= 12_000, `elapsed ${slow.elapsed_ms} ms, expected 9–12 s`);
  check(outcomesFor(slow.operationId) === 'timeout', `outcomes ${outcomesFor(slow.operationId)}`);
  ok(`transient_failure/timeout after ${slow.elapsed_ms} ms; one ai_calls row, no retry`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#10: the AI switch off (entitlements.ai_enabled)');
  await choose('generate_cloze', 'fake:ok');
  await settings('entitlements', { ai_enabled: false });
  const off = await opStatus('generate_cloze');
  check(off.ready === false && off.reason === 'ai-disabled', `status ${JSON.stringify(off)}`);
  const offCall = call('generate_cloze', clozeData());
  check(offCall.result.status === 'unavailable' && offCall.result.reason === 'ai-disabled', `call ${JSON.stringify(offCall.result)}`);
  check(callsFor(offCall.operationId) === 0, 'an ai-disabled call wrote an ai_calls row');
  const seededCloze = await prompt('generate_cloze');
  const offTest = await want(api('POST', '/v1/admin/ai/prompts/generate_cloze/test', { token: admin, body: {
    instructions: seededCloze.instructions, examples: seededCloze.examples } }), 200, 'prompt test with the switch off');
  check(offTest.items.length >= 1 && offTest.items.every((item) => item.status === 'succeeded'), `test ${JSON.stringify(offTest.items)}`);
  await settings('entitlements', { ai_enabled: true });
  check((await opStatus('generate_cloze')).ready === true, 'switch back on: generate_cloze not ready');
  ok(`status ai-disabled; learner call ai-disabled (no ai_calls row); prompt test still ran (${offTest.items.length} item(s)); switch on again`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#11: max_concurrent_calls 1, fake:slow --parallel 2');
  await settings('ai', { max_concurrent_calls: 1 });
  await choose('generate_cloze', 'fake:slow');
  const pair = aiFakeCall('generate_cloze', { data: clozeData(), parallel: 2 });
  const reasons = pair.map((line) => line.result.reason).sort();
  check(pair.length === 2 && reasons[0] === 'busy' && reasons[1] === 'timeout', `results ${JSON.stringify(pair.map((line) => line.result))}`);
  const busy = pair.find((line) => line.result.reason === 'busy');
  check(busy.elapsed_ms >= 9_000, `busy after ${busy.elapsed_ms} ms, expected ~10 s`);
  check(callsFor(busy.result.operation_id) === 0, 'a busy call wrote an ai_calls row');
  await settings('ai', { max_concurrent_calls: 50 });
  ok(`one timeout, one busy after ${busy.elapsed_ms} ms (no ai_calls row); max_concurrent_calls back to 50`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#12 and B6E96: add a model that does not exist; a model id with "/../"');
  await wantProblem(api('POST', '/v1/admin/ai/models', { token: admin, body: { provider: 'fake', model_id: 'fake:nope' } }), 422,
    'model-not-found', 'add fake:nope');
  const badId = await wantProblem(api('POST', '/v1/admin/ai/models', { token: admin, body: { provider: 'fake', model_id: 'fake/../x' } }),
    400, 'validation-failed', 'add fake/../x');
  check(JSON.stringify(badId.extensions?.violations ?? badId.violations ?? '').includes('model_id'), `violations ${JSON.stringify(badId)}`);
  check(count(`SELECT count(*) FROM ai_models WHERE model_id IN ('fake:nope', 'fake/../x')`) === 0, 'a refused model was saved');
  ok('fake:nope → 422 model-not-found; "fake/../x" → 400 validation-failed on model_id; nothing saved');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#13: delete the model in use');
  await choose('generate_cloze', 'fake:ok');
  await wantProblem(api('DELETE', `/v1/admin/ai/models/${fakeOk.id}`, { token: admin }), 409, 'model-in-use', 'delete fake:ok');
  ok('DELETE fake:ok (chosen for generate_cloze) → 409 model-in-use');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#14: save the seeded prompt twice with the seeded revision as expected_revision');
  const saved = await want(api('PUT', '/v1/admin/ai/prompts/generate_cloze', { token: admin, body: {
    expected_revision: clozeRevision, instructions: seededCloze.instructions, examples: seededCloze.examples } }), 200, 'save prompt');
  check(saved.revision === clozeRevision + 1, `revision ${saved.revision}`);
  await wantProblem(api('PUT', '/v1/admin/ai/prompts/generate_cloze', { token: admin, body: {
    expected_revision: clozeRevision, instructions: seededCloze.instructions, examples: seededCloze.examples } }), 409, 'prompt-revision-conflict',
  'save prompt again');
  const revisions = await want(api('GET', '/v1/admin/ai/prompts/generate_cloze/revisions', { token: admin }), 200, 'revisions');
  check(revisions.items.length === clozeRevision + 1 && revisions.items[0].revision === clozeRevision + 1, `revisions ${JSON.stringify(revisions.items.map((r) => r.revision))}`);
  ok(`first save → revision ${clozeRevision + 1} (the seeded examples pass the save rules); second → 409 prompt-revision-conflict; ${clozeRevision + 1} revisions`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#15: save a prompt with an example of the wrong shape');
  const twoBlanks = structuredClone(seededCloze.examples);
  twoBlanks[0].output = { ...twoBlanks[0].output, sentence: 'Lan will ___ it ___.' };
  const badSave = await wantProblem(api('PUT', '/v1/admin/ai/prompts/generate_cloze', { token: admin, body: {
    expected_revision: clozeRevision + 1, instructions: seededCloze.instructions, examples: twoBlanks } }), 400, 'validation-failed', 'save a bad example');
  const violations = JSON.stringify(badSave.extensions?.violations ?? badSave.violations ?? []);
  check(violations.includes('examples.0') || violations.includes('examples[0]'), `violations ${violations}`);
  check((await prompt('generate_cloze')).revision === clozeRevision + 1, 'a refused save changed the revision');
  ok(`400 validation-failed with a path to the example: ${violations}`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#16: test a draft prompt');
  const draft = `${seededCloze.instructions}\nKeep the sentence short.`;
  const testCallsBefore = count(`SELECT count(*) FROM ai_calls WHERE purpose = 'test'`);
  const tested = await want(api('POST', '/v1/admin/ai/prompts/generate_cloze/test', { token: admin, body: {
    instructions: draft, examples: seededCloze.examples } }), 200, 'prompt test');
  check(tested.items.length >= 1 && tested.items.every((item) => item.status === 'succeeded' && item.output), `items ${JSON.stringify(tested.items)}`);
  const afterTest = await prompt('generate_cloze');
  check(afterTest.revision === clozeRevision + 1 && afterTest.instructions === seededCloze.instructions, 'a test changed the stored prompt');
  const testCalls = count(`SELECT count(*) FROM ai_calls WHERE purpose = 'test'`) - testCallsBefore;
  check(testCalls === tested.items.length, `test calls ${testCalls}, items ${tested.items.length}`);
  ok(`${tested.items.length} item(s), each with its output; ai_prompts unchanged (revision ${clozeRevision + 1}); ${testCalls} ai_calls row(s) with purpose test`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#17 and B6E74: three eval examples, one run in the worker; the same Idempotency-Key again');
  for (const word of [letters(6), letters(7), letters(8)]) {
    await want(api('POST', '/v1/admin/ai/eval/examples', { token: admin, body: { operation: 'generate_cloze', input: clozeData(word) } }),
      201, 'add eval example');
  }
  const runKey = randomUUID();
  const created = await want(api('POST', '/v1/admin/ai/eval/runs', { token: admin, key: runKey, body: {
    operation: 'generate_cloze', prompt: 'current' } }), 202, 'start eval run');
  check(created.status === 'queued' && typeof created.run_id === 'string', `run ${JSON.stringify(created)}`);
  const replay = await want(api('POST', '/v1/admin/ai/eval/runs', { token: admin, key: runKey, body: {
    operation: 'generate_cloze', prompt: 'current' } }), 202, 'start eval run again');
  check(replay.run_id === created.run_id, `replayed run ${replay.run_id} ≠ ${created.run_id}`);
  const finished = await waitFor(() => want(api('GET', `/v1/admin/ai/eval/runs/${created.run_id}`, { token: admin }), 200, 'GET run'),
    (row) => row.status === 'finished' || row.status === 'failed', `run ${created.run_id} finishing`, 60_000);
  check(finished.status === 'finished' && finished.total === 3 && finished.done === 3 && finished.valid_count === 3,
    `run ${JSON.stringify(finished)}`);
  check(finished.avg_latency_ms !== null && finished.cost_usd !== null && Number(finished.cost_usd) === 0, `run ${JSON.stringify(finished)}`);
  ok(`run ${created.run_id} finished: total 3, valid 3, avg ${finished.avg_latency_ms} ms, cost ${finished.cost_usd}; same key → same run_id`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#18: a word of 150 characters');
  const badInput = call('generate_cloze', clozeData('a'.repeat(150)));
  check(badInput.result.status === 'permanent_failure' && badInput.result.reason === 'bad-input', `result ${JSON.stringify(badInput.result)}`);
  check(callsFor(badInput.operationId) === 0, 'a bad-input call wrote an ai_calls row');
  ok('permanent_failure/bad-input; no ai_calls row');

  step('B6#19 and B6#26 are unit tests (adapters with stub fetch, Tasks 8–9): skipped here');
  ok('skipped');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#22: calls of one operation id, then the content expires');
  const contentCall = call('generate_cloze', clozeData());
  const calls = await want(api('GET', `/v1/admin/ai/calls?operation_id=${contentCall.operationId}`, { token: admin }), 200, 'GET calls');
  check(calls.items.length === 1 && calls.items[0].content?.request && calls.items[0].content?.response, `calls ${JSON.stringify(calls)}`);
  psql(`UPDATE ai_call_contents SET expires_at = now() - interval '1 minute'
    WHERE call_id IN (SELECT id FROM ai_calls WHERE operation_id = '${contentCall.operationId}')`);
  maintenance();
  check(count(`SELECT count(*) FROM ai_call_contents WHERE call_id IN (SELECT id FROM ai_calls WHERE operation_id = '${contentCall.operationId}')`) === 0,
    'expired content still stored');
  const afterExpiry = await want(api('GET', `/v1/admin/ai/calls?operation_id=${contentCall.operationId}`, { token: admin }), 200, 'GET calls');
  check(afterExpiry.items.length === 1 && afterExpiry.items[0].content === null, `calls ${JSON.stringify(afterExpiry)}`);
  ok('content with request and response; after back-dating and maintenance:run the content is gone and the ledger row stays');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#23: a stored result expires');
  const keptData = clozeData();
  const kept = call('generate_cloze', keptData);
  psql(`UPDATE ai_operations SET expires_at = now() - interval '1 minute' WHERE operation_id = '${kept.operationId}'`);
  maintenance();
  check(count(`SELECT count(*) FROM ai_operations WHERE operation_id = '${kept.operationId}'`) === 0, 'expired ai_operations row kept');
  const fresh = call('generate_cloze', keptData, kept.operationId);
  check(fresh.result.status === 'succeeded' && fresh.result.meta.replayed === false, `result ${JSON.stringify(fresh.result)}`);
  check(callsFor(kept.operationId) === 2, `ai_calls rows ${callsFor(kept.operationId)}`);
  ok('row deleted by maintenance:run; the same id again → replayed false and a new ai_calls row');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#24: deleteUserData (ai:fake-call delete-user-data)');
  const gone = randomUUID();
  const own = call('generate_cloze', clozeData(), randomUUID(), gone);
  check(own.result.status === 'succeeded', `result ${JSON.stringify(own.result)}`);
  check(count(`SELECT count(*) FROM ai_call_contents c JOIN ai_calls a ON a.id = c.call_id WHERE a.user_id = '${gone}'`) === 1, 'no content to delete');
  const deleted = aiFakeCall('delete-user-data', { user: gone });
  check(deleted.length === 1 && deleted[0].deleted_for === gone, `delete ${JSON.stringify(deleted)}`);
  check(count(`SELECT count(*) FROM ai_operations WHERE user_id = '${gone}'`) === 0, 'ai_operations of the user kept');
  check(count(`SELECT count(*) FROM ai_calls WHERE user_id = '${gone}'`) === 0, 'ai_calls still carry the user id');
  check(count(`SELECT count(*) FROM ai_call_contents c JOIN ai_calls a ON a.id = c.call_id WHERE a.operation_id = '${own.operationId}'`) === 0,
    'content of the user kept');
  check(callsFor(own.operationId) === 1, 'the ledger row was deleted');
  ok('no ai_operations, no content of the user; the ai_calls row stays with user_id null');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#25: an editor on every route of §12.1');
  const anyId = randomUUID();
  const routes = [
    ['GET', '/v1/admin/ai/status'],
    ['GET', '/v1/admin/ai/models'],
    ['POST', '/v1/admin/ai/models', { provider: 'fake', model_id: 'fake:ok' }],
    ['PATCH', `/v1/admin/ai/models/${fakeOk.id}`, { note: 'x' }],
    ['DELETE', `/v1/admin/ai/models/${fakeOk.id}`],
    ['POST', `/v1/admin/ai/models/${fakeOk.id}/refresh`],
    ['GET', '/v1/admin/ai/operations'],
    ['PUT', '/v1/admin/ai/operations/generate_cloze', { expected_version: 0, model_ref: null, effort: null, thinking: null, max_output_tokens: null }],
    ['GET', '/v1/admin/ai/prompts/generate_cloze'],
    ['PUT', '/v1/admin/ai/prompts/generate_cloze', { expected_revision: 2, instructions: 'x', examples: [] }],
    ['POST', '/v1/admin/ai/prompts/generate_cloze/test', { instructions: 'x', examples: [] }],
    ['GET', '/v1/admin/ai/prompts/generate_cloze/revisions'],
    ['GET', '/v1/admin/ai/eval/examples?operation=generate_cloze'],
    ['POST', '/v1/admin/ai/eval/examples', { operation: 'generate_cloze', input: clozeData() }],
    ['PATCH', `/v1/admin/ai/eval/examples/${anyId}`, { note: 'x' }],
    ['DELETE', `/v1/admin/ai/eval/examples/${anyId}`],
    ['POST', '/v1/admin/ai/eval/runs', { operation: 'generate_cloze', prompt: 'current' }],
    ['GET', '/v1/admin/ai/eval/runs?operation=generate_cloze'],
    ['GET', `/v1/admin/ai/eval/runs/${created.run_id}`],
    ['GET', '/v1/admin/ai/costs'],
    ['GET', `/v1/admin/ai/calls?operation_id=${okCall.operationId}`],
  ];
  check(routes.length === 21, `${routes.length} routes listed`);
  for (const [method, path, body] of routes) {
    await wantProblem(api(method, path, { token: editor, body, idem: method === 'POST' && path.endsWith('/runs') }), 403, 'forbidden',
      `editor ${method} ${path}`);
  }
  check((await operation('generate_cloze')).model?.model_id === 'fake:ok', 'an editor request changed the operation');
  ok('403 forbidden on all 21 routes; nothing changed');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#27: fake:slow, two calls at once with one operation id');
  await choose('generate_cloze', 'fake:slow');
  const sameId = `smoke6-same-${run}`;
  const twin = aiFakeCall('generate_cloze', { data: clozeData(), operationId: sameId, parallel: 2 });
  const twinStatuses = twin.map((line) => line.result.reason ?? line.result.status).sort();
  check(twin.length === 2 && twinStatuses[0] === 'in_progress' && twinStatuses[1] === 'timeout', `results ${JSON.stringify(twin.map((l) => l.result))}`);
  check(callsFor(sameId) === 1, `ai_calls rows ${callsFor(sameId)}`);
  ok('one timeout, one in_progress; exactly one ai_calls row');

  // ------------------------------------------------------------------------------------------------------------------
  step('Race (Review Focus 1): fake:ok, ten calls at once with one operation id');
  await choose('generate_cloze', 'fake:ok');
  const raceId = `smoke6-race-${run}`;
  const race = aiFakeCall('generate_cloze', { data: clozeData(), operationId: raceId, parallel: 10 });
  const raceStatuses = race.map((line) => line.result.status);
  check(race.length === 10 && raceStatuses.every((s) => s === 'succeeded' || s === 'in_progress'), `statuses ${raceStatuses}`);
  check(callsFor(raceId) === 1, `ai_calls rows ${callsFor(raceId)}`);
  const tally = raceStatuses.reduce((acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }), {});
  ok(`10 results ${JSON.stringify(tally)}; exactly one ai_calls row`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#28: the daily provider-call cap');
  const todaySql = `SELECT count(*) FROM ai_calls WHERE (created_at AT TIME ZONE '${TIMEZONE}')::date = (now() AT TIME ZONE '${TIMEZONE}')::date`;
  const today = count(todaySql);
  await settings('ai', { daily_provider_calls_cap: today + 2 });
  const capped = [call('generate_cloze', clozeData()), call('generate_cloze', clozeData()), call('generate_cloze', clozeData())];
  check(capped[0].result.status === 'succeeded' && capped[1].result.status === 'succeeded', `first two ${JSON.stringify(capped.slice(0, 2).map((c) => c.result))}`);
  check(capped[2].result.status === 'unavailable' && capped[2].result.reason === 'daily-call-cap' && capped[2].result.retry_after_seconds > 0,
    `third ${JSON.stringify(capped[2].result)}`);
  const capTest = await want(api('POST', '/v1/admin/ai/prompts/generate_cloze/test', { token: admin, body: {
    instructions: seededCloze.instructions, examples: seededCloze.examples } }), 200, 'prompt test at the cap');
  check(capTest.items.every((item) => item.status === 'succeeded'), `test ${JSON.stringify(capTest.items)}`);
  await settings('ai', { daily_provider_calls_cap: 3000 });
  ok(`cap ${today + 2} (today ${today}); two calls succeeded, the third unavailable/daily-call-cap retry_after_seconds ${capped[2].result.retry_after_seconds}; a prompt test still ran; cap back to 3000`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#29: fake:truncated with max_output_tokens 50');
  await choose('generate_cloze', 'fake:truncated', 50);
  const cut = call('generate_cloze', clozeData());
  check(cut.result.status === 'transient_failure' && cut.result.reason === 'truncated', `result ${JSON.stringify(cut.result)}`);
  check(psql(`SELECT max_output_tokens FROM ai_calls WHERE operation_id = '${cut.operationId}' LIMIT 1`) === '50', 'max_output_tokens not 50');
  const cutStatus = await opStatus('generate_cloze');
  check(cutStatus.last_error?.outcome === 'truncated' && cutStatus.max_output_tokens === 50, `status ${JSON.stringify(cutStatus)}`);
  await choose('generate_cloze', 'fake:ok');
  ok('transient_failure/truncated with max_output_tokens 50; status last_error truncated');

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#30: start an eval run while Redis is down, then recover it');
  compose('stop', 'redis');
  let stalled;
  try {
    stalled = await want(api('POST', '/v1/admin/ai/eval/runs', { token: admin, idem: true, body: {
      operation: 'generate_cloze', prompt: 'current' } }), 202, 'start eval run with Redis down');
    check(stalled.status === 'queued', `run ${JSON.stringify(stalled)}`);
  } finally {
    compose('start', 'redis');
  }
  await sleep(3_000);
  const stillQueued = await want(api('GET', `/v1/admin/ai/eval/runs/${stalled.run_id}`, { token: admin }), 200, 'GET run');
  check(stillQueued.status === 'queued', `run with Redis down ${JSON.stringify(stillQueued)}`);
  psql(`UPDATE ai_eval_runs SET created_at = now() - interval '11 minutes' WHERE id = '${stalled.run_id}'`);
  maintenance();
  const recovered = await waitFor(() => want(api('GET', `/v1/admin/ai/eval/runs/${stalled.run_id}`, { token: admin }), 200, 'GET run'),
    (row) => row.status === 'finished' || row.status === 'failed', `run ${stalled.run_id} finishing`, 60_000);
  check(recovered.status === 'finished' && recovered.total === 3, `run ${JSON.stringify(recovered)}`);
  ok(`202 queued with Redis stopped; still queued after Redis is back; after back-dating 11 minutes and maintenance:run → finished (${recovered.total} items)`);

  // ------------------------------------------------------------------------------------------------------------------
  step('B6#20: costs by model match ai_calls');
  const costs = await want(api('GET', '/v1/admin/ai/costs?group_by=model', { token: admin }), 200, 'GET costs');
  const ledger = psql(`SELECT provider || '/' || model, count(*), coalesce(sum(input_tokens), 0), coalesce(sum(output_tokens), 0)
    FROM ai_calls WHERE (created_at AT TIME ZONE '${TIMEZONE}')::date = (now() AT TIME ZONE '${TIMEZONE}')::date
    GROUP BY 1 ORDER BY 1`).split('\n').filter(Boolean).map((line) => line.split('|'));
  check(ledger.length > 0 && costs.items.length === ledger.length, `groups api ${costs.items.length}, psql ${ledger.length}`);
  for (const [key, calls, input, output] of ledger) {
    const item = costs.items.find((row) => row.key === key);
    check(item && item.calls === Number(calls) && item.input_tokens === Number(input) && item.output_tokens === Number(output),
      `${key}: api ${JSON.stringify(item)}, psql ${calls}/${input}/${output}`);
    check(Number(item.cost_usd) === 0 && item.cost_vnd === 0, `${key} cost ${item.cost_usd}`);
  }
  ok(`${ledger.length} model groups; calls and tokens match ai_calls; fake cost 0 (${ledger.map(([key, calls]) => `${key} ${calls}`).join(', ')})`);

  console.log(`\nSmoke Bước 6 passed in ${Math.round((Date.now() - started) / 1000)}s (${stepNo} steps).`);
}

main().catch((error) => {
  console.error(`\nSmoke Bước 6 FAILED at step ${stepNo}:\n${error.stack ?? error}`);
  process.exitCode = 1;
});
