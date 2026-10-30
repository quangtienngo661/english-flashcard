// Fixtures of the "Câu AI thật" screen for the mocked e2e specs: the estimate, the passes and their questions (nhóm B M4).
import { EVAL_AT, EVAL_LAN, clozeInput } from './ai-eval';
import { judgeOnFake, judgeReads } from './ai-judges';
import type { MockHandler } from './mock-api';

export const REAL_PASS_ID = 'bbbbbbbb-0000-4000-8000-000000000001';
export const REAL_QUESTION = 'Is the given word the only answer that fits?';

/** The seeded judge on `fake:ok`, scoring the cloze and the meaning question. */
export const realJudge = (over: Record<string, unknown> = {}) => judgeOnFake({ operations: ['generate_cloze', 'generate_meaning_question'], ...over });

export const realEstimate = (over: Record<string, unknown> = {}) => ({
  judge_revision: 2, selected: 3, remaining: 0, limit: 200, skipped: { private_word: 1, no_content: 0, already_judged: 0 }, estimate_usd: null, admin_usd_cap: null,
  reason: null, retention_days: 7, pairs: [{ config_number: 4, model: 'fake:ok', questions: 6 }], ...over,
});

export const realPass = (over: Record<string, unknown> = {}) => ({
  id: REAL_PASS_ID, judge: { id: 'J1', name: 'Chỉ một đáp án' }, revision: 2, revision_id: 'JR2', criteria: [{ code: 'single_answer', question: REAL_QUESTION }],
  judge_model: { provider: 'fake', model_id: 'fake:ok' }, status: 'finished', error: null, total: 2, judged: 2, cost_usd: '0.00200000',
  filters: { operation: 'generate_cloze', config: null, test_accounts_only: false, limit: 200, since: EVAL_AT, skipped: { private_word: 1, no_content: 0, already_judged: 0 } },
  started_by: 'u9', started_by_user: EVAL_LAN, created_at: EVAL_AT, finished_at: EVAL_AT, ...over,
});

/** A question the judge failed (it can be added to the examples) and one it passed. */
export const realItems = () => [
  {
    question_id: 'q1', input: clozeInput('go'), output: { sentence: 'I ___ home.', accepted_answers: ['go'], translation_vi: 'Tôi về nhà.' }, context: { session_words: ['come'] },
    scores: [{ criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 'come fits too' }], labels: [], created_at: EVAL_AT, config_number: 4, model: 'fake:ok',
    provider: 'fake', failed: true, can_add_to_examples: true,
  },
  {
    question_id: 'q2', input: clozeInput('run'), output: { sentence: 'They ___ daily.', accepted_answers: ['run', 'runs'], translation_vi: 'Họ chạy mỗi ngày.' }, context: { session_words: ['go'] },
    scores: [{ criterion: 'single_answer', verdict: 'pass', problem: null, reason: 'Only run fits.' }], labels: [], created_at: EVAL_AT, config_number: 4, model: 'fake:ok',
    provider: 'fake', failed: false, can_add_to_examples: false,
  },
];

export const realPreview = (over: Record<string, unknown> = {}) => ({
  operation: 'generate_cloze', source: 'real_judge', source_ref: 'q1', word: 'go', part_of_speech: 'verb', input: clozeInput('go'), rebuilt: false,
  expected: { forms: ['go', 'goes', 'going'] }, ...over,
});

/** The reads of the page (the judge list and models are the Judge page's, with the judge scoring the cloze and the meaning question); `over` replaces or adds handlers. */
export function realReads(over: Record<string, MockHandler> = {}): Record<string, MockHandler> {
  return {
    ...judgeReads({ 'GET /v1/admin/ai/judges': () => ({ json: { items: [realJudge()] } }) }),
    'GET /v1/admin/practice/real-judge/estimate': () => ({ json: realEstimate() }),
    'GET /v1/admin/practice/real-judge/passes': () => ({ json: { items: [], next_page_token: null } }),
    [`GET /v1/admin/practice/real-judge/passes/${REAL_PASS_ID}/items`]: () => ({ json: { pass: realPass(), items: realItems() } }),
    'GET /v1/admin/practice/eval-examples/from-source': () => ({ json: realPreview() }),
    ...over,
  };
}
