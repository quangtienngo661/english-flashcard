// Smoke test for Bước 4 (Practice) against a REAL running API + worker (not createTestApp()); design §14 item 2, D28 as
// changed by D38. Start them first: `docker compose up -d` (repo root), then `pnpm build && pnpm run:dev` (this package),
// then `pnpm smoke:buoc-4`. DATABASE_URL (env, else .env) names the database the cleanup step back-dates rows in, through
// `docker compose -p english-learning exec -T postgres psql`. Safe to re-run: emails and lemmas are random per run. Beside other
// local API/worker processes on the same Redis, start run:dev with its own JOB_QUEUE_PREFIX so no other worker takes the import.
//
// The two cross-track cases that were cross-track.e2e-spec.ts are steps here: B4#28 / B4E48 (staff never see a private
// word used as an option) and B4E8 (a private word deleted while its question shows). Types and words are random, so the
// script keeps calling `next` until the question it needs appears, with a bounded number of tries. Exit code 0 only when
// every step matched.
import { execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Smoke-Test-Pass-9!';
const PRIVATE_MASK = '[từ riêng của người học]';
const TYPES = ['mcq_definition', 'true_false_definition', 'type_word'];
const run = randomUUID().slice(0, 8);

if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (env or .env); the cleanup step needs the database name.');
const DB_NAME = new URL(process.env.DATABASE_URL).pathname.slice(1);

let stepNo = 0;
function step(name) { stepNo += 1; console.log(`\n[${stepNo}] ${name}`); }
function ok(detail) { console.log(`    ok — ${detail}`); }
function check(condition, message) { if (!condition) throw new Error(message); }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One request; waits out a 429 (user.write is 30/min) and retries with the same Idempotency-Key. */
async function api(method, path, { token, body, idem = false, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idem) headers['Idempotency-Key'] = randomUUID();
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(`${BASE}${path}`, { method, headers, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
    if (res.status !== 429 || attempt >= 5) {
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
      return { status: res.status, json, text };
    }
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

function psql(sql) {
  return execFileSync('docker', ['compose', '-p', 'english-learning', 'exec', '-T', 'postgres', 'psql', '-U', 'dev', '-d', DB_NAME,
    '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql], { encoding: 'utf8' }).trim();
}

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());

async function waitForApi(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      if ((await fetch(`${BASE}/v1/health`)).ok) return;
    } catch { /* API not up yet */ }
    if (Date.now() > deadline) throw new Error(`API not reachable at ${BASE} after ${timeoutMs}ms`);
    await sleep(500);
  }
}

async function otpCodeFor(email) {
  const deadline = Date.now() + 10_000;
  // Register sends one OTP mail and the explicit request a second, milliseconds apart; only the newest code is valid.
  await sleep(1_000);
  for (;;) {
    const list = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
    const message = (list.messages ?? []).filter((m) => m.To?.[0]?.Address === email)
      .sort((a, b) => (a.Created < b.Created ? 1 : -1))[0];
    if (message) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const match = (full.Text ?? '').match(/(\d{6})/);
      if (match) return match[1];
    }
    if (Date.now() > deadline) throw new Error(`No OTP mail found for ${email} after 10s`);
    await sleep(300);
  }
}

async function registerAdmin() {
  const email = `smoke4-admin-${run}@example.com`;
  const registered = await want(api('POST', '/v1/auth/register', {
    body: { email, password: PASSWORD, timezone: TIMEZONE, client: 'web' } }), 201, 'register admin');
  await want(api('POST', '/v1/auth/otp', { token: registered.access_token, body: { purpose: 'verify_email' } }), 202, 'request OTP');
  const code = await otpCodeFor(email);
  await want(api('POST', '/v1/auth/verify-email', { token: registered.access_token, body: { code } }), 200, 'verify admin email');
  if (!existsSync('dist/cli/admin-grant.js')) throw new Error('Missing dist/cli/admin-grant.js; run `pnpm build` first.');
  execFileSync(process.execPath, ['dist/cli/admin-grant.js', email], { stdio: 'pipe' });
  const login = await want(api('POST', '/v1/auth/login', { body: { email, password: PASSWORD, client: 'web' } }), 200, 'admin login');
  ok(`admin ${email} registered, verified, granted, logged in`);
  return login.access_token;
}

async function registerLearner() {
  const email = `smoke4-learner-${run}@example.com`;
  const registered = await want(api('POST', '/v1/auth/register', {
    body: { email, password: PASSWORD, timezone: TIMEZONE, client: 'web' } }), 201, 'register learner');
  await want(api('PATCH', '/v1/me', { token: registered.access_token, body: { native_language: 'vi' } }), 200, 'set native_language');
  ok(`learner ${email} registered with native_language=vi, timezone ${TIMEZONE}`);
  return registered.access_token;
}

async function waitFor(read, done, what, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`${what} did not finish within ${timeoutMs}ms: ${JSON.stringify(value)}`);
    await sleep(300);
  }
}

// Letters only: a token for the sentence-prompt matcher is a run of letters (design 7.4b).
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(97 + randomInt(26))).join('');

// ---------------------------------------------------------------------------------------------------------------------
// The words. W1–W7 in group A (with the private words P and P2); W7 and W8 in group B (so W7's distractors come from both
// groups, and W8 has no multiple choice: its groups hold only 2 words, B4#19).
const OBJECTS = ['box', 'door', 'car', 'book', 'window', 'chair', 'letter', 'garden'];
const MEANINGS = ['quả táo', 'con mèo', 'cái bàn', 'ngôi nhà', 'dòng sông', 'bầu trời', 'cơn mưa', 'ngọn núi'];
const words = MEANINGS.map((meaning, index) => {
  const lemma = `zq${letters(6)}`;
  return {
    key: `W${index + 1}`, lemma, meaning, past: `${lemma}ed`, definition: `A short smoke definition number ${index + 1}.`,
    // A different object per word: the masked sentence is how the script tells the words apart.
    example: `They ${lemma}ed the ${OBJECTS[index]} yesterday.`, senseId: null, private: false,
  };
});
const P = { key: 'P', lemma: `zp${letters(6)}`, meaning: 'chiếc thuyền', private: true, senseId: null };
const P2 = { key: 'P2', lemma: `zr${letters(6)}`, meaning: 'cánh đồng', private: true, senseId: null };
const all = [...words, P, P2];
const byLemma = new Map(all.map((word) => [word.lemma, word]));
const byMeaning = new Map(all.map((word) => [word.meaning, word]));
const bySentence = new Map(words.map((word) => [word.example.replace(word.past, '___'), word]));
const [, , , , , , W7, W8] = words;

/** The word a question asks about, from what the learner can see. */
function askedWord(item) {
  const { prompt } = item;
  if (prompt.kind === 'true_false') return byLemma.get(prompt.lemma);
  if (prompt.kind === 'type_sentence') return bySentence.get(prompt.sentence);
  return byMeaning.get(prompt.meaning);
}

/** The right answer body, worked out from the script's own data (the API never sends the key before an answer). */
function rightAnswer(item) {
  const { prompt } = item;
  const word = askedWord(item);
  check(word, `unknown word in prompt ${JSON.stringify(prompt)}`);
  if (prompt.kind === 'mcq') return { choice: prompt.options.indexOf(word.lemma) };
  if (prompt.kind === 'true_false') return { is_true: word.meaning === prompt.meaning };
  if (prompt.kind === 'type_sentence') return { text: word.past };
  return { text: word.lemma };
}

function wrongAnswer(item) {
  const right = rightAnswer(item);
  if ('choice' in right) return { choice: (right.choice + 1) % 4 };
  if ('is_true' in right) return { is_true: !right.is_true };
  return { text: 'zzzzwrong' };
}

async function main() {
  const started = Date.now();
  const tally = { sessions: 0, answers: 0 };

  step('Wait for the API');
  await waitForApi();
  ok(`reachable at ${BASE}; database ${DB_NAME}`);

  step('Register admin and learner');
  const admin = await registerAdmin();
  const learner = await registerLearner();

  // Since Bước 5 a Free learner opens 3 sessions a day and this script opens far more (Bước 5 design §17 item 4, B5#34).
  step('Grant the learner 200 sessions a day for one day');
  const learnerId = (await want(api('GET', '/v1/me', { token: learner }), 200, 'learner profile')).id;
  const grant = await want(api('POST', '/v1/admin/entitlements/grants', {
    token: admin, idem: true, body: {
      user_id: learnerId, kind: 'limits', limits: { practice_sessions_per_day: 200 },
      ends_at: new Date(Date.now() + 24 * 3_600_000).toISOString(), reason: 'smoke:buoc-4' } }), 201, 'grant sessions');
  ok(`grant ${grant.id}: practice_sessions_per_day 200 until ${grant.ends_at}`);

  step('Import 8 verbs (gloss, short definition, example with the past form, inflections) and publish them');
  const source = await want(api('POST', '/v1/admin/content/sources', {
    token: admin, body: { name: `Smoke4-${run}`, version: '1.0', license: 'test license', display_priority: 90 } }), 201, 'source');
  const csv = ['headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,inflections',
    ...words.map((w) => `${w.lemma},verb,A1,${w.meaning},${w.definition},${w.example},food,past:${w.past}; third_person:${w.lemma}s`),
  ].join('\r\n');
  const form = new FormData();
  form.set('level_source_id', source.id);
  form.set('file', new Blob([csv], { type: 'text/csv' }), 'smoke4.csv');
  const accepted = await want(api('POST', '/v1/admin/content/uploads', { token: admin, idem: true, form }), 202, 'upload');
  const batch = await waitFor(() => want(api('GET', `/v1/admin/content/uploads/${accepted.batch_id}`, { token: admin }), 200, 'batch'),
    (b) => b.status !== 'queued' && b.status !== 'running', 'import batch');
  check(batch.counters.created === 8 && batch.counters.rejected === 0, `import counters ${JSON.stringify(batch.counters)}`);
  const job = await want(api('POST', '/v1/admin/content/senses/publish-jobs', {
    token: admin, idem: true, body: { filter: { batch_id: accepted.batch_id } } }), 202, 'publish job');
  const published = await waitFor(() => want(api('GET', `/v1/admin/content/senses/publish-jobs/${job.job_id}`, { token: admin }), 200, 'job'),
    (j) => j.status !== 'queued' && j.status !== 'running', 'publish job');
  check(published.status === 'succeeded', `publish job ${JSON.stringify(published)}`);
  for (const word of words) {
    const found = await want(api('GET', `/v1/senses/search?q=${word.lemma}`, { token: learner }), 200, 'search');
    const hit = found.items.find((item) => item.lemma === word.lemma);
    check(hit && hit.meaning.text === word.meaning && hit.examples[0] === word.example, `learner cannot see ${word.lemma}`);
    word.senseId = hit.sense_id;
  }
  ok(`batch ${accepted.batch_id}: 8 created, published by job ${job.job_id}; the learner sees all 8 with meaning and example`);

  step('Build group A (W1–W7 + private words P, P2) and group B (W7, W8)');
  const groupA = await want(api('POST', '/v1/groups', { token: learner, idem: true, body: { name: `A ${run}` } }), 201, 'group A');
  const groupB = await want(api('POST', '/v1/groups', { token: learner, idem: true, body: { name: `B ${run}` } }), 201, 'group B');
  for (const word of words.slice(0, 7)) {
    await want(api('POST', `/v1/groups/${groupA.id}/items`, { token: learner, idem: true, body: { sense_id: word.senseId } }), 201, 'add A');
  }
  for (const word of [W7, W8]) {
    await want(api('POST', `/v1/groups/${groupB.id}/items`, { token: learner, idem: true, body: { sense_id: word.senseId } }), 201, 'add B');
  }
  for (const word of [P, P2]) {
    const added = await want(api('POST', '/v1/quick-add', {
      token: learner, idem: true, body: { group_id: groupA.id, new_word: { lemma: word.lemma, meaning: word.meaning } } }), 201, 'quick-add');
    check(added.created_word === true, `quick-add did not create ${word.key}`);
    word.senseId = added.sense_id;
  }
  ok(`group A ${groupA.id} has 9 words (2 private), group B ${groupB.id} has 2`);

  const start = async (body) => {
    const res = await want(api('POST', '/v1/practice/sessions', { token: learner, idem: true, body }), 201, `start ${JSON.stringify(body)}`);
    tally.sessions += 1;
    return res.session;
  };
  const next = (sessionId) => want(api('POST', `/v1/practice/sessions/${sessionId}/next`, { token: learner }), 200, 'next');
  const answer = async (itemId, body) => {
    tally.answers += 1;
    return want(api('POST', `/v1/practice/items/${itemId}/answer`, { token: learner, idem: true, body }), 200, 'answer');
  };

  step('Each source × each type (count 1, answered right): group A, all, today');
  const groupTypeItems = {};
  for (const [label, base] of [['group', { source: 'group', group_id: groupA.id }], ['all', { source: 'all' }], ['today', { source: 'today' }]]) {
    for (const type of TYPES) {
      const session = await start({ ...base, types: [type], count: 1, ...(type === 'type_word' ? { prompt_style: 'sentence' } : {}) });
      const shown = await next(session.id);
      check(shown.state === 'question' && shown.item.type === type, `${label}/${type}: ${JSON.stringify(shown)}`);
      check(!('answer_key' in shown.item) && !('hints' in shown.item), `${label}/${type}: next leaks the key or hints (B4#4)`);
      const word = askedWord(shown.item);
      let result;
      if (shown.item.prompt.kind === 'type_sentence') {
        // B4#23: the blank is the past form; the base form is not accepted, then the right form is (B4#8b: tries 2).
        const base = await answer(shown.item.item_id, { text: word.lemma });
        check(base.result === 'try_again' && !('correct' in base), `base form for a past blank: ${JSON.stringify(base)}`);
        result = await answer(shown.item.item_id, rightAnswer(shown.item));
        check(result.result === 'correct' && result.tries === 2, `sentence typing retry: ${JSON.stringify(result)}`);
      } else {
        result = await answer(shown.item.item_id, rightAnswer(shown.item));
        check(result.result === 'correct', `${label}/${type}: ${JSON.stringify(result)}`);
      }
      groupTypeItems[`${label}/${type}`] = { item: shown.item, word, result };
      const after = await next(session.id);
      check(after.state === 'finished', `${label}/${type}: after 1 of 1 → ${after.state}`);
      ok(`${label} × ${type}: ${word.key} (${shown.item.prompt.kind}) → correct${result.tries === 2 ? ' after "try_again" on the base form' : ''}; session finished`);
    }
  }

  step('"Đã biết" on a right answer without hint (B4#9) and "Cần ôn tập" on another');
  const known = groupTypeItems['group/mcq_definition'];
  check(known.result.show_known === true && known.result.highlight_needs_review === false, `show_known ${JSON.stringify(known.result)}`);
  const knownRes = await want(api('POST', `/v1/practice/items/${known.item.item_id}/review`, {
    token: learner, body: { action: 'known' } }), 200, 'known');
  check(knownRes.level === 1 && knownRes.priority === false, `known → ${JSON.stringify(knownRes)}`);
  const again = await want(api('POST', `/v1/practice/items/${known.item.item_id}/review`, {
    token: learner, body: { action: 'known' } }), 200, 'known again');
  check(again.level === 1, 'the same action twice changes nothing (B4E10)');
  await wantProblem(api('POST', `/v1/practice/items/${known.item.item_id}/review`, { token: learner, body: { action: 'needs_review' } }),
    409, 'review-already-set', 'other action after known');
  const marked = groupTypeItems['group/true_false_definition'];
  const reviewRes = await want(api('POST', `/v1/practice/items/${marked.item.item_id}/review`, {
    token: learner, body: { action: 'needs_review' } }), 200, 'needs_review');
  check(reviewRes.level === 1 && reviewRes.priority === true && reviewRes.due_date === today(), `needs_review → ${JSON.stringify(reviewRes)}`);
  ok(`${known.word.key}: "Đã biết" → level 1, no priority; again → same; "Cần ôn tập" after it → 409 review-already-set; `
    + `${marked.word.key}: "Cần ôn tập" → level 1, priority, due ${reviewRes.due_date}`);

  step('Group B, typing only, 4 questions for 2 words: wrong + skip, hints, "Ôn lại" (B4#2), report, summary, review-all');
  const sessionB = await start({ source: 'group', group_id: groupB.id, types: ['type_word'], count: 4, prompt_style: 'meaning' });
  let openReportId = null;
  const roundsSeen = [];
  for (let answered = 0, guard = 0; answered < 4; guard += 1) {
    check(guard < 10, 'group B session did not reach 4 answers');
    const shown = await next(sessionB.id);
    if (shown.state === 'waiting_continue') {
      check(answered === 2, `waiting_continue after ${answered} answers`);
      const cont = await want(api('POST', `/v1/practice/sessions/${sessionB.id}/continue`, { token: learner, body: { continue: true } }),
        200, 'continue');
      check(cont.session.status === 'active', 'continue=true → active');
      ok('after round 1 (2 words) the session waits; "Ôn lại" → active');
      continue;
    }
    check(shown.state === 'question', `group B: ${JSON.stringify(shown)}`);
    const word = askedWord(shown.item);
    roundsSeen.push(`${word.key}@r${shown.item.round}`);
    if (word === W7) {
      const first = await answer(shown.item.item_id, wrongAnswer(shown.item));
      check(first.result === 'try_again' && first.tries === 1 && !('correct' in first), `W7 wrong: ${JSON.stringify(first)}`);
      const current = await want(api('GET', '/v1/practice/sessions/current', { token: learner }), 200, 'current');
      check(current.item.item_id === shown.item.item_id && current.item.state === 'try_again' && current.item.tries === 1,
        `current while try_again (B4#25): ${JSON.stringify(current.item)}`);
      const skipped = await want(api('POST', `/v1/practice/items/${shown.item.item_id}/skip`, { token: learner }), 200, 'skip');
      check(skipped.result === 'wrong' && skipped.skipped === true && skipped.correct.text === W7.lemma
        && skipped.highlight_needs_review === true && skipped.show_known === false, `skip: ${JSON.stringify(skipped)}`);
      ok(`W7 (round ${shown.item.round}): wrong → try_again (no answer shown), current shows try_again, skip → wrong, skipped`);
    } else {
      check(word === W8, `group B asked ${word?.key}`);
      const hint1 = await want(api('POST', `/v1/practice/items/${shown.item.item_id}/hint`, { token: learner, body: { level: 1 } }), 200, 'hint 1');
      check(hint1.hint.kind === 'definition' && hint1.hint.text === W8.definition, `hint 1: ${JSON.stringify(hint1)}`);
      const hint2 = await want(api('POST', `/v1/practice/items/${shown.item.item_id}/hint`, { token: learner, body: { level: 2 } }), 200, 'hint 2');
      check(hint2.hint.first_letter === W8.lemma[0] && hint2.hint.length === W8.lemma.length, `hint 2: ${JSON.stringify(hint2)}`);
      const res = await answer(shown.item.item_id, rightAnswer(shown.item));
      check(res.result === 'correct' && res.hint_level === 2 && res.show_known === false, `W8 with hints: ${JSON.stringify(res)}`);
      ok(`W8 (round ${shown.item.round}): hint 1 = short definition, hint 2 = "${hint2.hint.first_letter}" × ${hint2.hint.length} → correct, no "Đã biết"`);
      // On W8, not W7: an open report takes the attempt out of "từ hay sai" (design §8), and W7 must become weak below.
      if (!openReportId) {
        const report = await want(api('POST', `/v1/practice/items/${shown.item.item_id}/report`, {
          token: learner, body: { reason: 'hint_wrong', note: 'smoke: stays open for the cleanup step' } }), 201, 'report');
        openReportId = report.id;
        await wantProblem(api('POST', `/v1/practice/items/${shown.item.item_id}/report`, { token: learner, body: { reason: 'other' } }),
          409, 'report-exists', 'second report');
        ok(`report ${report.id} on W8's item (stays open); a second report → 409 report-exists`);
      }
    }
    answered += 1;
  }
  const endB = await next(sessionB.id);
  check(endB.state === 'finished', `group B after 4 answers → ${endB.state}`);
  for (let i = 1; i < roundsSeen.length; i += 1) {
    check(roundsSeen[i].split('@')[0] !== roundsSeen[i - 1].split('@')[0], `two questions in a row on one word: ${roundsSeen.join(', ')}`);
  }
  ok(`order ${roundsSeen.join(', ')}; no word twice in a row; finished after 4`);

  const summary = await want(api('GET', `/v1/practice/sessions/${sessionB.id}/summary`, { token: learner }), 200, 'summary');
  check(summary.asked === 4 && summary.correct === 2 && summary.wrong === 2, `summary counts ${JSON.stringify(summary)}`);
  check(summary.words.length === 2 && summary.words.every((w) => w.action === null), `summary list ${JSON.stringify(summary.words)}`);
  const w7Row = summary.words.find((w) => w.sense_id === W7.senseId);
  await want(api('POST', `/v1/practice/items/${w7Row.item_id}/review`, { token: learner, body: { action: 'needs_review' } }), 200, 'W7 review');
  const reviewAll = await want(api('POST', `/v1/practice/sessions/${sessionB.id}/review-all`, { token: learner, idem: true }), 200, 'review-all');
  check(reviewAll.added === 1, `review-all added ${reviewAll.added}, expected 1 (W8; W7 already pressed)`);
  const summaryAfter = await want(api('GET', `/v1/practice/sessions/${sessionB.id}/summary`, { token: learner }), 200, 'summary after');
  check(summaryAfter.words.every((w) => w.action === 'needs_review'), `summary after ${JSON.stringify(summaryAfter.words)}`);
  ok('summary: 4 asked, 2 right, 2 wrong; list = W7 (wrong) + W8 (right with hints); W7 pressed, review-all adds 1 (W8)');

  step('"Từ hay sai" (B4#12): W7 with 2 wrong; W8 (right only with hints) is not');
  const weak = await want(api('GET', '/v1/practice/weak-words', { token: learner }), 200, 'weak words');
  const w7Weak = weak.items.find((w) => w.sense_id === W7.senseId);
  check(w7Weak && w7Weak.wrong >= 2 && w7Weak.lemma === W7.lemma, `weak words ${JSON.stringify(weak.items)}`);
  check(!weak.items.some((w) => w.sense_id === W8.senseId), 'W8 must not be weak');
  ok(`W7: wrong ${w7Weak.wrong} of ${w7Weak.counted} counted, level ${w7Weak.level}`);

  step('Each type from "Từ hay sai" and "Đang ưu tiên" (count 1, answered right)');
  for (const sourceName of ['weak', 'priority']) {
    for (const type of TYPES) {
      const session = await start({ source: sourceName, types: [type], count: 1 });
      const shown = await next(session.id);
      check(shown.state === 'question' && shown.item.type === type, `${sourceName}/${type}: ${JSON.stringify(shown)}`);
      const word = askedWord(shown.item);
      if (sourceName === 'weak') check(word === W7 || weak.items.some((w) => w.sense_id === word.senseId), `${word.key} is not weak`);
      const res = await answer(shown.item.item_id, rightAnswer(shown.item));
      check(res.result === 'correct', `${sourceName}/${type}: ${JSON.stringify(res)}`);
      check((await next(session.id)).state === 'finished', `${sourceName}/${type} did not finish`);
      ok(`${sourceName} × ${type}: ${word.key} → correct; finished`);
    }
  }
  // W8's groups hold 2 words, so it has no multiple choice (B4#19); W7 is also in group A, so it has.
  const mcqB = await start({ source: 'group', group_id: groupB.id, types: ['mcq_definition'] });
  check(mcqB.words === 1, `group B multiple choice keeps ${mcqB.words} words, expected 1 (W7)`);
  const mcqShown = await next(mcqB.id);
  check(mcqShown.state === 'question' && askedWord(mcqShown.item) === W7, `group B multiple choice asks ${JSON.stringify(mcqShown)}`);
  await want(api('POST', `/v1/practice/sessions/${mcqB.id}/finish`, { token: learner }), 200, 'finish');
  const tfOnlyW8 = await start({ source: 'group', group_id: groupB.id, types: ['true_false_definition'] });
  check(tfOnlyW8.words === 2, `group B true/false keeps ${tfOnlyW8.words} words, expected 2`);
  await want(api('POST', `/v1/practice/sessions/${tfOnlyW8.id}/finish`, { token: learner }), 200, 'finish');
  ok('group B, multiple choice only → 1 word (W7; W8 has no multiple choice, B4#19); true/false only → both words');

  step('B4#28 / B4E48 and B4#29: a private word as a chosen option is masked for staff; a private question is not reportable');
  let maskedReportId = null;
  let privateAsked = false;
  for (let attempt = 0; attempt < 6 && !(maskedReportId && privateAsked); attempt += 1) {
    const session = await start({ source: 'group', group_id: groupA.id, types: ['mcq_definition'], count: 20 });
    for (let guard = 0; guard < 25 && !(maskedReportId && privateAsked); guard += 1) {
      const shown = await next(session.id);
      if (shown.state === 'waiting_continue') {
        await want(api('POST', `/v1/practice/sessions/${session.id}/continue`, { token: learner, body: { continue: true } }), 200, 'continue');
        continue;
      }
      if (shown.state !== 'question') break;
      const word = askedWord(shown.item);
      if (word.private) {
        check(shown.item.reportable === false, `private question reportable ${shown.item.reportable}`);
        await wantProblem(api('POST', `/v1/practice/items/${shown.item.item_id}/report`, { token: learner, body: { reason: 'other' } }),
          409, 'report-not-available', 'report a private question');
        privateAsked = true;
        await answer(shown.item.item_id, rightAnswer(shown.item));
      } else if (!maskedReportId && shown.item.prompt.options.includes(P.lemma)) {
        check(shown.item.reportable === true, 'a catalog question is reportable');
        const res = await answer(shown.item.item_id, { choice: shown.item.prompt.options.indexOf(P.lemma) });
        check(res.result === 'wrong', `choosing the private option: ${JSON.stringify(res)}`);
        const report = await want(api('POST', `/v1/practice/items/${shown.item.item_id}/report`, {
          token: learner, body: { reason: 'meaning_wrong', note: 'smoke: private option chosen' } }), 201, 'report masked');
        maskedReportId = report.id;
      } else {
        await answer(shown.item.item_id, rightAnswer(shown.item));
      }
    }
    await api('POST', `/v1/practice/sessions/${session.id}/finish`, { token: learner });
  }
  check(maskedReportId, 'never saw a multiple choice with the private option P');
  check(privateAsked, 'never saw a question on a private word');
  const staffList = await want(api('GET', '/v1/admin/practice/reports?status=open&page_size=100', { token: admin }), 200, 'staff list');
  const staffRow = staffList.items.find((row) => row.id === maskedReportId);
  check(staffRow, 'the masked report is not in the staff list');
  const whole = JSON.stringify(staffList);
  check(!whole.includes(P.lemma) && !whole.includes(P.meaning) && !whole.includes(P2.lemma), 'a private word reaches staff (D36)');
  check(JSON.stringify(staffRow).includes(PRIVATE_MASK), `staff row has no mask: ${JSON.stringify(staffRow)}`);
  check(!('user_id' in staffRow) && !whole.includes('smoke4-learner'), 'staff see the reporter');
  const resolved = await want(api('POST', `/v1/admin/practice/reports/${maskedReportId}/resolve`, {
    token: admin, idem: true, body: { status: 'no_error' } }), 200, 'resolve');
  check(resolved.status === 'no_error' && resolved.resolved_by && resolved.resolved_at, `resolve ${JSON.stringify(resolved)}`);
  await wantProblem(api('POST', `/v1/admin/practice/reports/${maskedReportId}/resolve`, {
    token: admin, idem: true, body: { status: 'fixed' } }), 409, 'report-not-open', 'second resolve');
  await want(api('GET', '/v1/admin/practice/reports', { token: learner }), 403, 'learner on the staff list (B4#17)');
  ok(`report ${maskedReportId}: staff response (${staffList.items.length} rows) never contains P's word or meaning, shows "${PRIVATE_MASK}"; `
    + 'resolved no_error; second resolve → 409 report-not-open; a learner → 403');
  ok('a question on a private word: reportable=false, report → 409 report-not-available');

  step('History by date (B4#15) and by word');
  const day = today();
  const history = await want(api('GET', `/v1/practice/history?date=${day}&page_size=100`, { token: learner }), 200, 'history');
  check(history.items.length > 0 && history.items.every((row) => row.local_date === day), `history ${day}`);
  check(history.items.some((row) => row.skipped && row.sense_id === W7.senseId), 'the skipped W7 answer is not in history');
  const other = await want(api('GET', '/v1/practice/history?date=2000-01-01', { token: learner }), 200, 'history other day');
  check(other.items.length === 0, 'history of 2000-01-01 is not empty');
  const ofW7 = await want(api('GET', `/v1/practice/history?sense_id=${W7.senseId}&page_size=100`, { token: learner }), 200, 'history W7');
  check(ofW7.items.length > 0 && ofW7.items.every((row) => row.sense_id === W7.senseId), 'history by sense_id');
  ok(`${history.items.length} rows on ${day} (newest first), 0 on 2000-01-01, ${ofW7.items.length} for W7`);

  step('B4E8: delete a private word while its question shows → current says "word-not-found" with the next question');
  // Learner sense reads list catalog words only, so the private entry id comes from the database.
  const p2EntryId = psql(`SELECT entry_id FROM senses WHERE id = '${P2.senseId}'`);
  check(/^[0-9a-f-]{36}$/.test(p2EntryId), `P2 entry id ${p2EntryId}`);
  let idleSessionId = null;
  let deleted = false;
  for (let attempt = 0; attempt < 6 && !deleted; attempt += 1) {
    const session = await start({ source: 'group', group_id: groupA.id, types: ['type_word'], count: 20, prompt_style: 'meaning' });
    idleSessionId = session.id;
    for (let guard = 0; guard < 25 && !deleted; guard += 1) {
      const shown = await next(session.id);
      if (shown.state === 'waiting_continue') {
        await want(api('POST', `/v1/practice/sessions/${session.id}/continue`, { token: learner, body: { continue: true } }), 200, 'continue');
        continue;
      }
      if (shown.state !== 'question') break;
      // The last word of round 1 is followed by "Ôn lại thêm không?", not by a question, so only a later P2 question will do.
      const lastOfRound1 = shown.item.round === 1 && shown.item.position >= shown.session.words;
      if (askedWord(shown.item) !== P2 || lastOfRound1) {
        await answer(shown.item.item_id, rightAnswer(shown.item));
        continue;
      }
      await want(api('DELETE', `/v1/my-words/${p2EntryId}`, { token: learner, idem: true }), 204, 'delete P2');
      const current = await want(api('GET', '/v1/practice/sessions/current', { token: learner }), 200, 'current after delete');
      check(current.notice === 'word-not-found', `notice ${JSON.stringify(current)}`);
      check(current.item && current.item.item_id !== shown.item.item_id && askedWord(current.item) !== P2,
        `next item in the same reply: ${JSON.stringify(current)}`);
      deleted = true;
      ok(`P2's question ${shown.item.item_id} showing; DELETE /v1/my-words → 204; current → notice word-not-found + `
        + `${askedWord(current.item).key}'s question ${current.item.item_id}`);
    }
    if (!deleted) await api('POST', `/v1/practice/sessions/${session.id}/finish`, { token: learner });
  }
  check(deleted, "never saw P2's question");
  check(psql(`SELECT count(*) FROM practice_session_items WHERE sense_id = '${P2.senseId}'`) === '0', "P2's items survive (B4#22)");
  check(psql(`SELECT count(*) FROM practice_questions WHERE sense_id = '${P2.senseId}'`) === '0', "P2's questions survive (B4#22)");
  ok("P2's items and questions are gone (read back with psql)");

  step('Cleanup: back-date group B session 7 months and leave the last session idle 25 h; run maintenance:run; read back');
  const itemsBefore = psql(`SELECT count(*) FROM practice_session_items WHERE session_id = '${sessionB.id}'`);
  check(itemsBefore === '4', `group B items before cleanup: ${itemsBefore}`);
  psql(`UPDATE practice_session_items SET asked_at = now() - interval '7 months' WHERE session_id = '${sessionB.id}'`);
  psql(`UPDATE practice_sessions SET ended_at = now() - interval '7 months' WHERE id = '${sessionB.id}'`);
  psql(`UPDATE practice_sessions SET last_activity_at = now() - interval '25 hours' WHERE id = '${idleSessionId}'`);
  if (!existsSync('dist/cli/run-maintenance.js')) throw new Error('Missing dist/cli/run-maintenance.js; run `pnpm build` first.');
  execFileSync(process.execPath, ['dist/cli/run-maintenance.js'], { stdio: 'pipe' });
  const itemsAfter = psql(`SELECT count(*) FROM practice_session_items WHERE session_id = '${sessionB.id}'`);
  const sessionAfter = psql(`SELECT count(*) FROM practice_sessions WHERE id = '${sessionB.id}'`);
  const reportAfter = psql(`SELECT status || '|' || coalesce(item_id::text, 'null') FROM practice_reports WHERE id = '${openReportId}'`);
  const idleAfter = psql(`SELECT status FROM practice_sessions WHERE id = '${idleSessionId}'`);
  check(itemsAfter === '0' && sessionAfter === '0', `old rows remain: items ${itemsAfter}, session ${sessionAfter}`);
  check(reportAfter === 'open|null', `open report after cleanup: ${reportAfter}`);
  check(idleAfter === 'abandoned', `idle session after cleanup: ${idleAfter}`);
  ok(`group B items 4 → ${itemsAfter}, session gone; report ${openReportId} = ${reportAfter}; idle session → ${idleAfter}`);

  console.log(`\nALL CHECKS PASSED in ${Date.now() - started}ms (run id ${run}; ${tally.sessions} sessions, ${tally.answers} answers)`);
}

main().catch((error) => {
  console.error('\nSMOKE TEST FAILED:', error.message);
  process.exitCode = 1;
});
