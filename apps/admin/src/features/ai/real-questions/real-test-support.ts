// Test-only fixtures for the real-question screens (nhóm B M4) tests; not imported by the app.
import type { Route } from '../../../auth/test-support';
import { JUDGE_ID, LAN, judgeOnFake } from '../judges/judge-test-support';
import { AT } from '../prompt-test-support';
import type { RealJudgeEstimate, RealPass, RealPassItem, SourcePreview } from './real-questions-api';

export const PASS_ID = 'bbbbbbbb-0000-4000-8000-000000000001';
const BASE = '/v1/admin/practice';

/** The seeded judge on `fake:ok`, also scoring the meaning question (a judge for the cloze only has one operation). */
export const realJudge = (over = {}) => judgeOnFake({ operations: ['generate_cloze', 'generate_meaning_question'], ...over });

export const realEstimate = (over: Partial<RealJudgeEstimate> = {}): RealJudgeEstimate => ({
  judge_revision: 2, selected: 3, remaining: 0, limit: 200, skipped: { private_word: 1, no_content: 0, already_judged: 0 }, estimate_usd: null, admin_usd_cap: null,
  reason: null, retention_days: 7, pairs: [{ config_number: 4, model: 'fake:ok', questions: 6 }], ...over,
});

export const realPass = (over: Partial<RealPass> = {}): RealPass => ({
  id: PASS_ID, judge: { id: JUDGE_ID, name: 'Chỉ một đáp án' }, revision: 2, revision_id: 'JR2',
  criteria: [{ code: 'single_answer', question: 'Is the given word the only answer that fits?' }], judge_model: { provider: 'fake', model_id: 'fake:ok' },
  status: 'finished', error: null, total: 3, judged: 3, cost_usd: '0.00300000',
  filters: { operation: 'generate_cloze', config: null, test_accounts_only: false, limit: 200, since: AT, skipped: { private_word: 1, no_content: 0, already_judged: 0 } },
  started_by: LAN.id, started_by_user: LAN, created_at: AT, finished_at: AT, ...over,
});

export const realItem = (over: Partial<RealPassItem> = {}): RealPassItem => ({
  question_id: 'q1', input: { word: 'go', part_of_speech: 'verb', level: 'A1', meaning_vi: 'đi', context_label: null },
  output: { sentence: 'I ___ home.', accepted_answers: ['go'], translation_vi: 'Tôi về nhà.' }, context: { session_words: ['come', 'run'] },
  scores: [{ criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 'come fits too' }], labels: [],
  created_at: AT, config_number: 4, model: 'fake:ok', provider: 'fake', failed: true, can_add_to_examples: true, ...over,
});

export const sourcePreview = (over: Partial<SourcePreview> = {}): SourcePreview => ({
  operation: 'generate_cloze', source: 'real_judge', source_ref: 'q1', word: 'go', part_of_speech: 'verb',
  input: { word: 'go', part_of_speech: 'verb', level: 'A1', meaning_vi: 'đi', context_label: null }, rebuilt: false, expected: { forms: ['go', 'goes', 'going'] }, ...over,
});

export const RURL = {
  /** `query` is the query string the page sends, e.g. `judge_id=J1&operation=generate_cloze`. */
  estimate: (query = `judge_id=${JUDGE_ID}&operation=generate_cloze`) => `GET ${BASE}/real-judge/estimate?${query}`,
  start: `POST ${BASE}/real-judge`,
  passes: `GET ${BASE}/real-judge/passes?page_size=20`,
  pass: (id = PASS_ID) => `GET ${BASE}/real-judge/passes/${id}/items`,
  preview: (questionId = 'q1') => `GET ${BASE}/eval-examples/from-source?question_id=${questionId}`,
  addExample: `POST ${BASE}/eval-examples/from-source`,
  label: 'PUT /v1/admin/ai/labels',
  judges: 'GET /v1/admin/ai/judges',
};

/** Every read the page makes, answered (one judge, the default estimate, no pass yet); `over` replaces or adds routes. */
export function realRoutes(over: Record<string, Route> = {}): Record<string, Route> {
  return {
    [RURL.judges]: () => Response.json({ items: [realJudge()] }),
    [RURL.estimate()]: () => Response.json(realEstimate()),
    [RURL.passes]: () => Response.json({ items: [], next_page_token: null }),
    ...over,
  };
}
