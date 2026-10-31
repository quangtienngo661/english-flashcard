import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { API, API_DIR } from './api';

/**
 * Gives an AI operation a model the way an admin does, through the config lifecycle (nhóm B M2): a draft, a run of it on a frozen version of the
 * example set, the publish check and the publish. A port of `ensureFrozenSet`, `publishModel` and `rollbackConfig` of
 * `apps/api/scripts/ai-config-publish.mjs` (same behaviour), over this suite's API token. The two `PUT`s that used to choose a model directly answer 404.
 *
 * `ai.test` allows 20 hits an hour per user and every run is one hit: a publish of a model costs one run, and a second one when the live config has
 * no complete run on the newest version. `rollbackConfig` needs no run.
 */
const SCRIPTED = 'scripted:';
const RUN_TIMEOUT_MS = 120_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Reply = { status: number; json: unknown; text: string };
type SetRow = { id: string; version: number };
type ConfigRow = {
  id: string; number: number; version: number; instructions: string; examples: unknown[]; model: { id: string } | null; max_output_tokens: number | null; note: string | null;
};
type ConfigsReply = { live: ConfigRow; live_version: number; draft: ConfigRow | null };
type CheckReply = {
  draft: { version: number }; candidate_run_id: string | null; baseline: { run_id: string | null }; blockers: string[]; warnings: unknown[];
};
type SeededExample = { input: unknown; output: Record<string, unknown> };

/** One call to the real API with the admin's token (`X-CSRF-Protection` and, for a run, an `Idempotency-Key`); the status is returned, not thrown. */
async function call(token: string, method: string, pathname: string, opts: { body?: unknown; idem?: boolean } = {}): Promise<Reply> {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-CSRF-Protection': '1',
      ...(opts.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(opts.idem ? { 'Idempotency-Key': randomUUID() } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text === '' ? null : JSON.parse(text);
  } catch {
    // not JSON: the text is kept
  }
  return { status: res.status, json, text };
}

/** The body of the reply, or an error naming the request, the status wanted and what came back. */
async function want<T>(reply: Promise<Reply>, status: number, context: string): Promise<T> {
  const res = await reply;
  if (res.status !== status) throw new Error(`${context}: expected ${status}, got ${res.status}\n${res.text}`);
  return res.json as T;
}

/** The seeded prompts, built by `pnpm build` in the API (the `.ts` source is `src/ai/prompts/initial-prompts.ts`). */
async function seededPrompts(): Promise<Record<string, { examples: SeededExample[] }>> {
  const file = path.join(API_DIR, 'dist/ai/prompts/initial-prompts.js');
  if (!existsSync(file)) throw new Error(`Missing ${file}; run \`pnpm build\` in the API first.`);
  return ((await import(pathToFileURL(file).href)) as { INITIAL_PROMPTS: Record<string, { examples: SeededExample[] }> }).INITIAL_PROMPTS;
}

/** What a few-shot example's output says the answer is (design §5.1): forms for the two cloze-like operations, the lemma for a lookup, the verdict for a private-word check. */
function expectedOf(op: string, output: Record<string, unknown>): unknown {
  if (op === 'generate_cloze') return { forms: output.accepted_answers };
  if (op === 'generate_meaning_question') return { forms: [output.word_in_sentence] };
  if (op === 'lookup_word') return { lemma: output.lemma, part_of_speech: output.part_of_speech };
  if (op === 'check_private_word') return { verdict: output.verdict };
  return undefined;
}

/**
 * The newest frozen set of the operation, or a new one made from the operation's seeded few-shot examples (on an empty working set the first lands
 * held-out and the second dev, which is all a freeze needs). It never edits an existing example.
 */
export async function ensureFrozenSet(token: string, op: string): Promise<SetRow> {
  const sets = await want<{ items: SetRow[] }>(call(token, 'GET', `/v1/admin/ai/eval/sets?operation=${op}`), 200, `${op}: list sets`);
  if (sets.items.length > 0) return { id: sets.items[0]!.id, version: sets.items[0]!.version };
  const prompts = await seededPrompts();
  for (const example of prompts[op]!.examples) {
    const expected = expectedOf(op, example.output);
    await want(call(token, 'POST', '/v1/admin/ai/eval/examples', {
      body: { operation: op, input: example.input, note: 'scripted', ...(expected === undefined ? {} : { expected }) } }), 201, `${op}: add an example`);
  }
  const frozen = await call(token, 'POST', '/v1/admin/ai/eval/sets', { body: { operation: op } });
  if (frozen.status !== 201) throw new Error(`${op}: freeze the example set: expected 201, got ${frozen.status}\n${frozen.text}`);
  const { id, version } = frozen.json as SetRow;
  return { id, version };
}

/** The fake model `modelId`: found in the list, or added. */
async function ensureModel(token: string, modelId: string): Promise<{ id: string }> {
  const list = await want<{ items: Array<{ id: string; model_id: string }> }>(call(token, 'GET', '/v1/admin/ai/models?provider=fake'), 200, 'list models');
  return list.items.find((row) => row.model_id === modelId) ?? want<{ id: string }>(call(token, 'POST', '/v1/admin/ai/models', { body: { provider: 'fake', model_id: modelId } }), 201, `add ${modelId}`);
}

/** Starts a run of the live config or the draft on a frozen set and waits for it (up to 120 s); a failed run throws. */
async function runConfig(token: string, op: string, config: 'live' | 'draft', setId: string): Promise<void> {
  const created = await want<{ run_id: string }>(call(token, 'POST', '/v1/admin/ai/eval/runs', { idem: true, body: { operation: op, config, set_id: setId } }), 202,
    `${op}: start a run of the ${config} config`);
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  for (;;) {
    const run = await want<{ status: string; error: string | null }>(call(token, 'GET', `/v1/admin/ai/eval/runs/${created.run_id}`), 200, `${op}: read run ${created.run_id}`);
    if (run.status === 'finished') return;
    if (run.status === 'failed') throw new Error(`${op}: the run of the ${config} config failed (${run.error ?? 'no reason'}): ${created.run_id}`);
    if (Date.now() > deadline) throw new Error(`${op}: the run of the ${config} config did not finish within ${RUN_TIMEOUT_MS / 1000}s: ${JSON.stringify(run)}`);
    await sleep(500);
  }
}

/** A draft this helper left behind (note `scripted: …`) is deleted; a draft somebody else prepared is theirs, so it stops the helper. */
async function clearScriptedDraft(token: string, op: string, configs: ConfigsReply): Promise<void> {
  if (!configs.draft) return;
  if (!String(configs.draft.note ?? '').startsWith(SCRIPTED)) {
    throw new Error(`${op}: there is a draft of its own (number ${configs.draft.number}, note ${JSON.stringify(configs.draft.note)}). Publish or delete it, then run again.`);
  }
  await want(call(token, 'DELETE', `/v1/admin/ai/configs/${op}/draft`), 204, `${op}: delete the leftover scripted draft`);
}

/**
 * Makes `modelId` (provider `fake`) the model of the operation by publishing a config; returns the new live config. When the live config already has
 * that model and token limit it changes nothing. Effort and thinking are cleared; warnings are acknowledged.
 */
export async function publishModel(token: string, { op, modelId, maxOutputTokens = null }: { op: string; modelId: string; maxOutputTokens?: number | null }): Promise<ConfigRow> {
  const model = await ensureModel(token, modelId);
  const current = await want<ConfigsReply>(call(token, 'GET', `/v1/admin/ai/configs/${op}`), 200, `${op}: read the configs`);
  if (current.live.model?.id === model.id && current.live.max_output_tokens === maxOutputTokens) return current.live;
  const set = await ensureFrozenSet(token, op);
  await clearScriptedDraft(token, op, current);
  const draft = await want<ConfigRow>(call(token, 'POST', `/v1/admin/ai/configs/${op}/draft`, { body: {} }), 201, `${op}: create a draft`);
  await want(call(token, 'PUT', `/v1/admin/ai/configs/${op}/draft`, { body: {
    expected_version: draft.version, instructions: draft.instructions, examples: draft.examples, model_ref: model.id, effort: null, thinking: null,
    max_output_tokens: maxOutputTokens, note: `${SCRIPTED} ${modelId}`,
  } }), 200, `${op}: save the draft`);
  await runConfig(token, op, 'draft', set.id);
  let check = await want<CheckReply>(call(token, 'GET', `/v1/admin/ai/configs/${op}/publish-check`), 200, `${op}: publish check`);
  if (check.blockers.includes('baseline-required')) {
    await runConfig(token, op, 'live', set.id);
    check = await want<CheckReply>(call(token, 'GET', `/v1/admin/ai/configs/${op}/publish-check`), 200, `${op}: publish check after the baseline run`);
  }
  if (check.blockers.length > 0) throw new Error(`${op}: the publish check still has blockers: ${JSON.stringify(check)}`);
  const published = await want<{ live: ConfigRow }>(call(token, 'POST', `/v1/admin/ai/configs/${op}/publish`, { body: {
    expected_version: check.draft.version, candidate_run_id: check.candidate_run_id, baseline_run_id: check.baseline.run_id,
    acknowledge_warnings: check.warnings.length > 0,
  } }), 200, `${op}: publish`);
  return published.live;
}

/** Puts the config before the live one back (no run needed); returns the live config after it. */
export async function rollbackConfig(token: string, op: string): Promise<ConfigRow> {
  const current = await want<ConfigsReply>(call(token, 'GET', `/v1/admin/ai/configs/${op}`), 200, `${op}: read the configs`);
  const rolled = await want<{ live: ConfigRow }>(call(token, 'POST', `/v1/admin/ai/configs/${op}/rollback`, { body: { expected_live_version: current.live_version } }), 200, `${op}: roll back`);
  return rolled.live;
}
