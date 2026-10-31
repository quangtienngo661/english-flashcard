// Publishes an AI config the way an admin does: through the draft, an eval run on a frozen set, the publish check and the publish
// (nhóm B plan M2-T10; design §6). The smokes and `learner:setup` use it to give an operation a model, now that the two `PUT`s that
// chose one directly answer 404. It needs a built API (`pnpm build`: the seeded few-shot examples are read from dist) and an API plus
// worker that process eval runs.
//
// Every function takes `call(method, path, { body, idem }) → Promise<{ status, json, text }>`, which the calling script binds to one admin's
// token. `ensureFrozenSet`, `publishModel` and `rollbackConfig` are ported to the real-stack e2e in M2-T12 (same behaviour).
//
// `ai.test` allows 20 hits per hour per user and every eval run is one hit, so a script that publishes many times counts them (a publish
// of a model costs one run; the live config's earlier candidate run is the baseline, so a second one is needed only when none exists).
// `rollbackConfig` and `turnOff` need no run.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCRIPTED = 'scripted:';
const RUN_TIMEOUT_MS = 120_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The seeded prompts, built by `pnpm build` (the `.ts` source is `src/ai/prompts/initial-prompts.ts`). */
async function seededPrompts() {
  const file = new URL('../dist/ai/prompts/initial-prompts.js', import.meta.url);
  if (!existsSync(fileURLToPath(file))) throw new Error('Missing dist/ai/prompts/initial-prompts.js; run `pnpm build` first.');
  return (await import(file.href)).INITIAL_PROMPTS;
}

/** The body of the response, or an error naming the request, the status wanted and what came back. */
async function want(promise, status, context) {
  const res = await promise;
  if (res.status !== status) throw new Error(`${context}: expected ${status}, got ${res.status}\n${res.text}`);
  return res.json;
}

/**
 * What a few-shot example's output says the answer is (design §5.1): forms for the two cloze-like operations, the lemma and part of speech
 * for a lookup, the verdict for a private-word check; the other two operations have none.
 */
function expectedOf(op, output) {
  if (op === 'generate_cloze') return { forms: output.accepted_answers };
  if (op === 'generate_meaning_question') return { forms: [output.word_in_sentence] };
  if (op === 'lookup_word') return { lemma: output.lemma, part_of_speech: output.part_of_speech };
  if (op === 'check_private_word') return { verdict: output.verdict };
  return undefined;
}

/**
 * The newest frozen set of the operation, or a new one made from the operation's seeded few-shot examples (two; three for
 * `check_private_word`). On an empty working set the first example lands held-out and the second dev, which is all a freeze needs. It never
 * edits an existing example: older examples without an expected answer (as the migrated ones of a local database) make it throw.
 */
export async function ensureFrozenSet(call, op) {
  const sets = await want(call('GET', `/v1/admin/ai/eval/sets?operation=${op}`), 200, `${op}: list sets`);
  if (sets.items.length > 0) return { id: sets.items[0].id, version: sets.items[0].version };
  const prompts = await seededPrompts();
  for (const example of prompts[op].examples) {
    const expected = expectedOf(op, example.output);
    await want(call('POST', '/v1/admin/ai/eval/examples', {
      body: { operation: op, input: example.input, note: 'scripted', ...(expected === undefined ? {} : { expected }) } }), 201, `${op}: add an example`);
  }
  const frozen = await call('POST', '/v1/admin/ai/eval/sets', { body: { operation: op } });
  if (frozen.status === 422 && String(frozen.json?.type).endsWith('eval-set-incomplete')) {
    const missing = frozen.json.missing_expected ?? [];
    throw new Error(`${op}: examples without an expected answer: ${missing.join(', ')}. Add it on Bộ ví dụ or delete them, then run again.`);
  }
  if (frozen.status !== 201) throw new Error(`${op}: freeze the example set: expected 201, got ${frozen.status}\n${frozen.text}`);
  return { id: frozen.json.id, version: frozen.json.version };
}

/** The fake (or other) model `modelId` of `provider`: found in the list, or added. */
async function ensureModel(call, provider, modelId) {
  const list = await want(call('GET', `/v1/admin/ai/models?provider=${provider}`), 200, 'list models');
  const found = list.items.find((row) => row.model_id === modelId);
  if (found) return found;
  return want(call('POST', '/v1/admin/ai/models', { body: { provider, model_id: modelId } }), 201, `add ${modelId}`);
}

/** Starts a run of the live config or the draft on a frozen set and waits for it (≤ 120 s); a failed run throws. */
async function runConfig(call, op, config, setId) {
  const created = await want(call('POST', '/v1/admin/ai/eval/runs', { idem: true, body: { operation: op, config, set_id: setId } }), 202,
    `${op}: start a run of the ${config} config`);
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  for (;;) {
    const run = await want(call('GET', `/v1/admin/ai/eval/runs/${created.run_id}`), 200, `${op}: read run ${created.run_id}`);
    if (run.status === 'finished') return run;
    if (run.status === 'failed') throw new Error(`${op}: the run of the ${config} config failed (${run.error ?? 'no reason'}): ${created.run_id}`);
    if (Date.now() > deadline) throw new Error(`${op}: the run of the ${config} config did not finish within ${RUN_TIMEOUT_MS / 1000}s: ${JSON.stringify(run)}`);
    await sleep(500);
  }
}

/** A draft this helper left behind (note `scripted: …`) is deleted; a draft somebody else prepared is theirs, so it stops the script. */
async function clearScriptedDraft(call, op, configs) {
  if (!configs.draft) return;
  if (!String(configs.draft.note ?? '').startsWith(SCRIPTED)) {
    throw new Error(`${op}: there is a draft of its own (number ${configs.draft.number}, note ${JSON.stringify(configs.draft.note)}). Publish or delete it, then run again.`);
  }
  await want(call('DELETE', `/v1/admin/ai/configs/${op}/draft`), 204, `${op}: delete the leftover scripted draft`);
}

/** A new draft copied from the live config and saved with the given choice (`modelId` null = no model); returns the saved draft. */
async function saveScriptedDraft(call, op, { modelRef, maxOutputTokens, note }) {
  const draft = await want(call('POST', `/v1/admin/ai/configs/${op}/draft`, { body: {} }), 201, `${op}: create a draft`);
  return want(call('PUT', `/v1/admin/ai/configs/${op}/draft`, { body: {
    expected_version: draft.version, instructions: draft.instructions, examples: draft.examples, model_ref: modelRef, effort: null, thinking: null,
    max_output_tokens: maxOutputTokens, note,
  } }), 200, `${op}: save the draft`);
}

/** Publishes the draft with the evidence `check` names; warnings are acknowledged. Returns the new live config. */
async function publishDraft(call, op, check) {
  const body = {
    expected_version: check.draft.version, candidate_run_id: check.candidate_run_id, baseline_run_id: check.baseline.run_id,
    acknowledge_warnings: check.warnings.length > 0,
  };
  return (await want(call('POST', `/v1/admin/ai/configs/${op}/publish`, { body }), 200, `${op}: publish`)).live;
}

/**
 * Makes `modelId` (provider `fake`) the model of the operation by publishing a config; returns the new live config (a `ConfigView`). When the
 * live config already has that model and token limit it changes nothing and returns that config. Effort and thinking are cleared.
 */
export async function publishModel(call, { op, modelId, maxOutputTokens = null }) {
  const model = await ensureModel(call, 'fake', modelId);
  const current = await want(call('GET', `/v1/admin/ai/configs/${op}`), 200, `${op}: read the configs`);
  if (current.live.model?.id === model.id && current.live.max_output_tokens === maxOutputTokens) return current.live;
  const set = await ensureFrozenSet(call, op);
  await clearScriptedDraft(call, op, current);
  await saveScriptedDraft(call, op, { modelRef: model.id, maxOutputTokens, note: `${SCRIPTED} ${modelId}` });
  await runConfig(call, op, 'draft', set.id);
  let check = await want(call('GET', `/v1/admin/ai/configs/${op}/publish-check`), 200, `${op}: publish check`);
  if (check.blockers.includes('baseline-required')) {
    await runConfig(call, op, 'live', set.id);
    check = await want(call('GET', `/v1/admin/ai/configs/${op}/publish-check`), 200, `${op}: publish check after the baseline run`);
  }
  if (check.blockers.length > 0) throw new Error(`${op}: the publish check still has blockers: ${JSON.stringify(check)}`);
  return publishDraft(call, op, check);
}

/** Puts the config before the live one back (no run needed); returns the live config after it. */
export async function rollbackConfig(call, op) {
  const current = await want(call('GET', `/v1/admin/ai/configs/${op}`), 200, `${op}: read the configs`);
  return (await want(call('POST', `/v1/admin/ai/configs/${op}/rollback`, { body: { expected_live_version: current.live_version } }), 200,
    `${op}: roll back`)).live;
}

/** Turns the operation off: publishes a draft without a model, which needs no run (D38). A rollback turns it on again. */
export async function turnOff(call, op) {
  const current = await want(call('GET', `/v1/admin/ai/configs/${op}`), 200, `${op}: read the configs`);
  await clearScriptedDraft(call, op, current);
  await saveScriptedDraft(call, op, { modelRef: null, maxOutputTokens: null, note: `${SCRIPTED} off` });
  const check = await want(call('GET', `/v1/admin/ai/configs/${op}/publish-check`), 200, `${op}: publish check`);
  if (check.turn_off !== true || check.blockers.length > 0) throw new Error(`${op}: the publish check does not say turn off: ${JSON.stringify(check)}`);
  return (await want(call('POST', `/v1/admin/ai/configs/${op}/publish`, { body: {
    expected_version: check.draft.version, candidate_run_id: null, baseline_run_id: null, acknowledge_warnings: false } }), 200, `${op}: turn off`)).live;
}
