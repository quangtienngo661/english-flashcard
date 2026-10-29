// Fixtures of the Bộ ví dụ screen for the mocked e2e specs: the golden set (nhóm B M1) as the API sends it.
import type { MockHandler } from './mock-api';

export const EVAL_AT = '2026-10-15T02:12:00.000Z';
export const EVAL_LAN = { id: 'u9', email: 'lan@wordmet.com', system: false };
export const EVAL_RUN_ID = 'aaaaaaaa-0000-4000-8000-000000000001';

export const clozeInput = (word: string) => ({ word, part_of_speech: 'verb', level: 'A1', meaning_vi: 'đi', context_label: null });

/** A dev example (`GET …/eval/examples`). */
export const devExample = (id: string, word: string, over: Record<string, unknown> = {}) => ({
  id, operation: 'generate_cloze', input: clozeInput(word), note: null, split: 'dev', expected: { forms: [word] }, source: 'manual', source_ref: null,
  revealed_at: null, created_by: 'u9', created_by_user: EVAL_LAN, created_at: EVAL_AT, updated_at: EVAL_AT, ...over,
});

/** A held-out example nobody opened: the API sends its id and its part, nothing else. */
export const heldOutExample = (id: string) => ({ id, split: 'held_out' });

/** One frozen version (`GET …/eval/sets`). */
export const evalSet = (over: Record<string, unknown> = {}) => ({
  id: 'S1', operation: 'generate_cloze', version: 1, held_out_ratio: 0.3, frozen_by: 'u9', frozen_by_user: EVAL_LAN, frozen_at: EVAL_AT,
  dev_count: 7, held_out_count: 3, revealed_count: 0, ...over,
});

const ZERO = {
  total: 0, pending: 0, skipped: 0, shape_pass: 0, shape_fail: 0, shape_transient: 0, rule_pass: 0, rule_fail: 0, rule_skipped: 0, rule_not_applicable: 0,
  expected_pass: 0, expected_fail: 0, expected_none: 0, failing: 0,
};
/** Both parts of a run's statistics; the counts left out are 0. */
export const runStats = (dev: Record<string, number> = {}, heldOut: Record<string, number> = {}) => ({ dev: { ...ZERO, ...dev }, held_out: { ...ZERO, ...heldOut } });

/** One example of a run as `GET …/eval/runs/:id/items` sends it (dev only). */
export const runItem = (over: Record<string, unknown> = {}) => ({
  example_id: 'e1', position: 0, split: 'dev', input: clozeInput('go'), expected: { forms: ['go'] }, status: 'succeeded', reason: null,
  output: { sentence: 'I ___ home.' }, raw_output: null, rule: { status: 'pass', problems: [], reason: null }, expected_result: 'pass', latency_ms: 700, cost_usd: null, ...over,
});

/** `GET /v1/admin/ai/eval/sets` with no version yet. */
export const noSets: MockHandler = () => ({ json: { items: [] } });

/** `GET …/eval/runs/:id/items` of a run with no result yet. */
export const noRunItems: MockHandler = () => ({ json: { items: [], stats: runStats() } });
