import { randomUUID } from 'node:crypto';
import type { RealState } from '../global-setup';
import { API, apiCall, loginToken } from './api';

/**
 * What the M3 spec needs from the learner side: one AI question that Lan reported, and one form the AI used that the
 * tables did not know. Both come from the API's own routes (plan-api-domain §9, the same chain as `smoke-buoc-7.mjs`);
 * nothing is written to the database directly.
 */
export type AiReportSeed = {
  reportId: string;
  /** The code and Vietnamese name of a run-unique, refundable reason: filtering by it finds exactly this report. */
  reason: string;
  reasonLabel: string;
  /** The word the reported question was about. */
  lemma: string;
  /** A form the fake model used for `unknownLemma` that the tables lack (one row in `/unknown-forms`). */
  unknownLemma: string;
  unknownForm: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const key = () => randomUUID();

async function waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean, what: string, timeoutMs = 60_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`${what} did not finish within ${timeoutMs} ms: ${JSON.stringify(value)}`);
    await sleep(500);
  }
}

const letters = (n: number) => Array.from({ length: n }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');

/** Puts `modelId` on `generate_cloze`, adding the fake model first when the admin has not yet. */
export async function chooseClozeModel(adminToken: string, modelId: string): Promise<void> {
  const listed = await apiCall<{ items: Array<{ id: string; model_id: string }> }>('GET', '/v1/admin/ai/models', adminToken);
  const model = listed.items.find((m) => m.model_id === modelId)
    ?? (await apiCall<{ id: string }>('POST', '/v1/admin/ai/models', adminToken, { provider: 'fake', model_id: modelId }));
  const operations = await apiCall<{ items: Array<{ operation: string; version: number }> }>('GET', '/v1/admin/ai/operations', adminToken);
  const current = operations.items.find((o) => o.operation === 'generate_cloze');
  if (!current) throw new Error('operation generate_cloze is not listed');
  await apiCall('PUT', '/v1/admin/ai/operations/generate_cloze', adminToken, {
    expected_version: current.version, model_ref: model.id, effort: null, thinking: null, max_output_tokens: null,
  });
}

/** Uploads `csv` as a new batch of a new source and publishes that batch by job (an own batch, not flow 3's reverted one). */
async function importAndPublish(adminToken: string, csv: string, run: string): Promise<void> {
  const source = await apiCall<{ id: string }>('POST', '/v1/admin/content/sources', adminToken, {
    name: `E2E M3 ${run}`, version: '1.0', license: 'test license', display_priority: 90,
  });
  const form = new FormData();
  form.set('level_source_id', source.id);
  form.set('file', new Blob([csv], { type: 'text/csv' }), `m3-${run}.csv`);
  const upload = await fetch(`${API}/v1/admin/content/uploads`, {
    method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'X-CSRF-Protection': '1', 'Idempotency-Key': key() }, body: form,
  });
  if (upload.status !== 202) throw new Error(`upload: ${upload.status} ${await upload.text()}`);
  const { batch_id } = (await upload.json()) as { batch_id: string };
  const batch = await waitFor(
    () => apiCall<{ status: string; counters: { created: number; rejected: number } }>('GET', `/v1/admin/content/uploads/${batch_id}`, adminToken),
    (b) => b.status !== 'queued' && b.status !== 'running', 'import batch',
  );
  if (batch.counters.created !== 3 || batch.counters.rejected !== 0) throw new Error(`import counters ${JSON.stringify(batch.counters)}`);
  const job = await apiCall<{ job_id: string }>('POST', '/v1/admin/content/senses/publish-jobs', adminToken, { filter: { batch_id } }, { idempotencyKey: key() });
  const done = await waitFor(
    () => apiCall<{ status: string }>('GET', `/v1/admin/content/senses/publish-jobs/${job.job_id}`, adminToken),
    (j) => j.status !== 'queued' && j.status !== 'running', 'publish job',
  );
  if (done.status !== 'succeeded') throw new Error(`publish job ${JSON.stringify(done)}`);
}

/** The id of the published sense of `lemma`, as a learner finds it. */
async function senseOf(token: string, lemma: string): Promise<string> {
  const found = await waitFor(
    () => apiCall<{ items: Array<{ sense_id: string }> }>('GET', `/v1/senses/search?q=${lemma}`, token),
    (r) => r.items.length > 0, `search for ${lemma}`, 20_000,
  );
  return found.items[0]!.sense_id;
}

/** A group of one word and a one-question `cloze` session over it; returns the session id. */
async function clozeSession(token: string, name: string, senseId: string): Promise<string> {
  const group = await apiCall<{ id: string }>('POST', '/v1/groups', token, { name }, { idempotencyKey: key() });
  await apiCall('POST', `/v1/groups/${group.id}/items`, token, { sense_id: senseId }, { idempotencyKey: key() });
  const started = await apiCall<{ session: { id: string } }>('POST', '/v1/practice/sessions', token, {
    source: 'group', group_id: group.id, types: ['cloze'], count: 1,
  }, { idempotencyKey: key() });
  return started.session.id;
}

/**
 * D§9 rows 1–10 with the fake model: three own words (CSV, published by job), Pro for Lan, a group and a `cloze` session,
 * `next`, an answer, and a report with a refundable reason. A second session on another word runs with `fake:bad-form`, so the
 * model's answer is rejected and its form is recorded as unknown (the real way: `practice_unknown_forms`, `smoke-buoc-7` AC6).
 * Needs an API started with `AI_FAKE_ENABLED=true`.
 */
export async function seedAiReport(state: RealState): Promise<AiReportSeed> {
  const run = randomUUID().slice(0, 8);
  const adminToken = await loginToken(state.admin.email, state.admin.password);
  const lanToken = await loginToken(state.lan.email, state.lan.password);

  await chooseClozeModel(adminToken, 'fake:ok');

  const lemmas = [0, 1, 2].map(() => `zq${letters(7)}`);
  const csv = [
    'headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,inflections',
    ...lemmas.map((l, i) => `${l},verb,A1,nghĩa thử ${i + 1},A short definition number ${i + 1}.,They ${l}ed the box yesterday.,technology,past:${l}ed; third_person:${l}s`),
  ].join('\r\n');
  await importAndPublish(adminToken, csv, run);

  const ends = new Date(Date.now() + 30 * 24 * 3_600_000).toISOString();
  await apiCall('POST', '/v1/admin/entitlements/grants', adminToken,
    { user_id: state.lan.id, kind: 'plan', plan: 'pro', ends_at: ends, reason: `e2e m3 ${run}` }, { idempotencyKey: key() });

  // A reason of its own, so the report is the only one with it: the editor's filter shows exactly one row.
  const reason = `e2e_${run}`;
  const reasonLabel = `Lỗi thử ${run}`;
  await apiCall('POST', '/v1/admin/practice/report-reasons', adminToken, {
    code: reason, label_vi: reasonLabel, label_en: `Test fault ${run}`, detail_hint_vi: null, detail_hint_en: null,
    applies_to: 'ai', note_required: false, refundable: true, position: 900,
  }, { idempotencyKey: key() });

  // Rows 7-10: the question that is reported.
  const [lemma, unknownLemma] = lemmas as [string, string, string];
  const sessionId = await clozeSession(lanToken, `E2E M3 ${run}`, await senseOf(lanToken, lemma));
  const shown = await apiCall<{ state: string; item: { item_id: string; type: string } }>('POST', `/v1/practice/sessions/${sessionId}/next`, lanToken);
  if (shown.state !== 'question' || shown.item.type !== 'cloze') throw new Error(`next: ${JSON.stringify(shown)}`);
  await apiCall('POST', `/v1/practice/items/${shown.item.item_id}/answer`, lanToken, { text: lemma }, { idempotencyKey: key() });
  const report = await apiCall<{ id: string }>('POST', `/v1/practice/items/${shown.item.item_id}/report`, lanToken, {
    reason, note: 'Còn một từ khác cũng điền được vào chỗ trống.',
  });

  // The unknown form: the model answers with `${lemma}ment`, which no table knows; the session ends "ai-failed" and the form is recorded.
  await chooseClozeModel(adminToken, 'fake:bad-form');
  try {
    const badSession = await clozeSession(lanToken, `E2E M3 form ${run}`, await senseOf(lanToken, unknownLemma));
    const failed = await apiCall<{ state: string }>('POST', `/v1/practice/sessions/${badSession}/next`, lanToken);
    if (failed.state === 'question') throw new Error('fake:bad-form produced a question; no unknown form was recorded');
  } finally {
    await chooseClozeModel(adminToken, 'fake:ok');
  }

  return { reportId: report.id, reason, reasonLabel, lemma, unknownLemma, unknownForm: `${unknownLemma}ment` };
}
