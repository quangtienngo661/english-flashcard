// Test-only fixtures for the judge screens (nhóm B M3) tests; not imported by the app.
import type { Route } from '../../../auth/test-support';
import type { Judge, JudgeAgreementView, JudgePass, JudgeRevision, JudgeStatsRow, JudgeTally, LabelView, ScoreView } from '../ai-api';
import { FAKE_OK, modelRow } from '../configs/config-test-support';
import { AT, SYSTEM } from '../prompt-test-support';

export const LAN = { id: 'u9', email: 'lan@wordmet.com', system: false };
export const JUDGE_ID = 'J1';
export const QUESTION = 'Is the given word, in the forms of accepted_answers, the only answer that fits the blank?';

/** The seeded judge "Chỉ một đáp án" as the migration leaves it: revision 1, one criterion, no model. */
export const judgeRevision = (over: Partial<JudgeRevision> = {}): JudgeRevision => ({
  id: 'JR1', revision: 1, criteria: [{ code: 'single_answer', question: QUESTION }], instructions: 'You review one practice question.', examples: [],
  model: null, effort: null, thinking: null, max_output_tokens: null, saved_by_user: SYSTEM, saved_at: AT, ...over,
});

export const judgeView = (over: Partial<Judge> = {}): Judge => ({
  id: JUDGE_ID, name: 'Chỉ một đáp án', operations: ['generate_cloze'], active: true, created_at: AT, latest: judgeRevision(), ...over,
});

/** A judge after it was saved with `fake:ok`: revision 2. */
export const judgeOnFake = (over: Partial<Judge> = {}): Judge => judgeView({
  latest: judgeRevision({ id: 'JR2', revision: 2, model: { id: 'M1', provider: 'fake', model_id: 'fake:ok' }, saved_by_user: LAN }), ...over,
});

export const agreementView = (over: Partial<JudgeAgreementView> = {}): JudgeAgreementView => ({
  label_min: 30, agreement_min: 0.85,
  items: [{ judge_revision_id: 'JR1', revision: 1, criterion: 'single_answer', labeled: 0, agree: 0, agree_exact: 0, rate: null, exact_rate: null, calibrated: false }],
  ...over,
});

export const tally = (over: Partial<JudgeTally> = {}): JudgeTally => ({ pass: 0, fail_major: 0, fail_minor: 0, unjudged: 0, ...over });

export const statsRow = (over: Partial<JudgeStatsRow> = {}): JudgeStatsRow => ({
  judge_id: JUDGE_ID, judge_name: 'Chỉ một đáp án', judge_revision_id: 'JR2', revision: 2, criterion: 'single_answer', dev: tally(), held_out: tally(), calibrated: false, ...over,
});

export const score = (over: Partial<ScoreView> = {}): ScoreView => ({
  judge_id: JUDGE_ID, judge_name: 'Chỉ một đáp án', judge_revision_id: 'JR2', revision: 2, criterion: 'single_answer', verdict: 'pass', problem: null, reason: 'Only one fits.', ...over,
});

export const label = (over: Partial<LabelView> = {}): LabelView => ({
  subject_kind: 'eval_item', subject_id: 'i1', criterion: 'single_answer', verdict: 'pass', labeled_by_user: LAN, labeled_at: AT, ...over,
});

export const pass = (over: Partial<JudgePass> = {}): JudgePass => ({
  id: 'P1', kind: 'eval_run', operation: 'generate_cloze', eval_run_id: 'aaaaaaaa-0000-4000-8000-000000000001', judge: { id: JUDGE_ID, name: 'Chỉ một đáp án' },
  judge_revision: { id: 'JR2', revision: 2, model: { provider: 'fake', model_id: 'fake:ok' } }, status: 'finished', error: null, total: 2, judged: 2, unjudged: 0,
  cost_usd: '0.00200000', started_by_user: LAN, created_at: AT, started_at: AT, finished_at: AT, ...over,
});

export const JURL = {
  list: 'GET /v1/admin/ai/judges',
  create: 'POST /v1/admin/ai/judges',
  save: (id = JUDGE_ID) => `PUT /v1/admin/ai/judges/${id}`,
  clone: (id = JUDGE_ID) => `POST /v1/admin/ai/judges/${id}/clone`,
  revisions: (id = JUDGE_ID) => `GET /v1/admin/ai/judges/${id}/revisions`,
  agreement: (id = JUDGE_ID) => `GET /v1/admin/ai/judges/${id}/agreement`,
  models: 'GET /v1/admin/ai/models',
  label: 'PUT /v1/admin/ai/labels',
  judgePass: (runId: string) => `POST /v1/admin/ai/eval/runs/${runId}/judge-passes`,
  passById: (id: string) => `GET /v1/admin/ai/judge-passes/${id}`,
};

/** Every read the Judge page makes, answered (the seeded judge, `fake:ok` and an OpenAI model in the list of models); `over` replaces or adds routes. */
export function judgeRoutes(over: Record<string, Route> = {}): Record<string, Route> {
  return {
    [JURL.list]: () => Response.json({ items: [judgeView()] }),
    [JURL.models]: () => Response.json({ items: [FAKE_OK, modelRow('M2', 'openai', 'gpt-x')] }),
    [JURL.revisions()]: () => Response.json({ items: [judgeRevision()] }),
    [JURL.agreement()]: () => Response.json(agreementView()),
    ...over,
  };
}
