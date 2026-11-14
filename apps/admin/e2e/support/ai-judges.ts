// Fixtures of the judge screens for the mocked e2e specs: judges, their agreement, passes and the scores of a run (nhóm B M3).
import { CFG_SYSTEM, FAKE_REF, configReads } from './ai-configs';
import { EVAL_AT, EVAL_LAN, EVAL_RUN_ID, runItem, runStats } from './ai-eval';
import type { MockHandler } from './mock-api';

export const JUDGE_QUESTION = 'Is the given word, in the forms of accepted_answers, the only answer that fits the blank?';

/** One revision of the seeded judge "Chỉ một đáp án": revision 1, no model. */
export const judgeRevision = (over: Record<string, unknown> = {}) => ({
  id: 'JR1', revision: 1, criteria: [{ code: 'single_answer', question: JUDGE_QUESTION }], instructions: 'You review one practice question.', examples: [],
  model: null, effort: null, thinking: null, max_output_tokens: null, saved_by_user: CFG_SYSTEM, saved_at: EVAL_AT, ...over,
});

export const judgeRow = (over: Record<string, unknown> = {}) => ({
  id: 'J1', name: 'Chỉ một đáp án', operations: ['generate_cloze'], active: true, created_at: EVAL_AT, latest: judgeRevision(), ...over,
});

/** The same judge after it was saved with `fake:ok`. */
export const judgeOnFake = (over: Record<string, unknown> = {}) => judgeRow({
  latest: judgeRevision({ id: 'JR2', revision: 2, model: FAKE_REF, saved_by_user: EVAL_LAN }), ...over,
});

export const judgeAgreement = (over: Record<string, unknown> = {}) => ({
  label_min: 30, agreement_min: 0.85,
  items: [{ judge_revision_id: 'JR1', revision: 1, criterion: 'single_answer', labeled: 29, agree: 29, agree_exact: 28, rate: 1, exact_rate: 28 / 29, calibrated: false }],
  ...over,
});

export const tally = (over: Record<string, number> = {}) => ({ pass: 0, fail_major: 0, fail_minor: 0, unjudged: 0, ...over });

export const score = (over: Record<string, unknown> = {}) => ({
  judge_id: 'J1', judge_name: 'Chỉ một đáp án', judge_revision_id: 'JR2', revision: 2, criterion: 'single_answer', verdict: 'pass', problem: null, reason: 'Only one fits.', ...over,
});

export const label = (over: Record<string, unknown> = {}) => ({
  subject_kind: 'eval_item', subject_id: 'i1', criterion: 'single_answer', verdict: 'pass', labeled_by_user: EVAL_LAN, labeled_at: EVAL_AT, ...over,
});

export const judgePass = (over: Record<string, unknown> = {}) => ({
  id: 'P1', kind: 'eval_run', operation: 'generate_cloze', eval_run_id: EVAL_RUN_ID, judge: { id: 'J1', name: 'Chỉ một đáp án' },
  judge_revision: { id: 'JR2', revision: 2, model: { provider: 'fake', model_id: 'fake:ok' } }, status: 'finished', error: null, total: 2, judged: 2, unjudged: 0,
  cost_usd: '0.00200000', started_by_user: EVAL_LAN, created_at: EVAL_AT, started_at: EVAL_AT, finished_at: EVAL_AT, ...over,
});

/** Two dev outputs of the run: `i1` the judge failed, `i2` it passed and the owner labelled "nhẹ". */
export const scoredItems = () => [
  runItem({ item_id: 'i1', example_id: 'e1', scores: [score({ verdict: 'fail_major', reason: 'beat fits too' })], labels: [] }),
  runItem({
    item_id: 'i2', example_id: 'e2', position: 1, scores: [score()], labels: [label({ subject_id: 'i2', verdict: 'fail_minor' })],
    input: { word: 'come', part_of_speech: 'verb', level: 'A1', meaning_vi: 'đến', context_label: null },
  }),
];

/** `GET …/runs/:id/items` with the judge side filled in. */
export const scoredRunItems = (over: Record<string, unknown> = {}): MockHandler => () => ({
  json: {
    items: scoredItems(), stats: runStats({ total: 2, shape_pass: 2, rule_pass: 2, expected_pass: 2 }, { total: 1, shape_pass: 1 }),
    passes: [judgePass()], judge_stats: [{
      judge_id: 'J1', judge_name: 'Chỉ một đáp án', judge_revision_id: 'JR2', revision: 2, criterion: 'single_answer',
      dev: tally({ pass: 1, fail_major: 1 }), held_out: tally({ pass: 1 }), calibrated: false,
    }],
    ...over,
  },
});

/** The reads of the Judge page (the models are those of the Cấu hình page, with `fake:ok`); `over` replaces or adds handlers. */
export function judgeReads(over: Record<string, MockHandler> = {}): Record<string, MockHandler> {
  return {
    ...configReads(),
    'GET /v1/admin/ai/judges': () => ({ json: { items: [judgeRow()] } }),
    'GET /v1/admin/ai/judges/J1/revisions': () => ({ json: { items: [judgeRevision()] } }),
    'GET /v1/admin/ai/judges/J1/agreement': () => ({ json: judgeAgreement() }),
    ...over,
  };
}
