import type { ApiClient } from '../../../api/client';
import type { UserRef } from '../../../api/user-ref';
import type { AiOperation, JudgeCriterion, JudgePassStatus, JudgeVerdict } from '../ai-api';

/** The three operations whose real questions Practice can judge (nhóm B design §7.1); the other three have no question of a learner behind them. */
export const REAL_OPERATIONS = ['generate_cloze', 'generate_meaning_question', 'generate_sentence_mcq'] as const satisfies readonly AiOperation[];
export type RealOperation = (typeof REAL_OPERATIONS)[number];
export const isRealOperation = (operation: string): operation is RealOperation => (REAL_OPERATIONS as readonly string[]).includes(operation);

/** The pair a question was made with: the config number (`ai_meta.prompt_revision` since M2) and the model id. */
export type ConfigPair = { number: number; model: string };

/** What the admin picked (D26): a judge, one operation, optionally one config pair, optionally only the staff's own accounts. */
export type RealJudgeFilters = { judge_id: string; operation: RealOperation; config: ConfigPair | null; test_accounts_only: boolean };

export type RealSkipped = { private_word: number; no_content: number; already_judged: number };

/** `GET …/real-judge/estimate`: what a pass would take now. `estimate_usd` is `null` while the judge revision has no past call to average. */
export type RealJudgeEstimate = {
  judge_revision: number;
  selected: number;
  remaining: number;
  limit: number;
  skipped: RealSkipped;
  estimate_usd: number | null;
  admin_usd_cap: number | null;
  /** Why nothing can be judged: the kept content is off, or no account is an admin or editor. */
  reason: 'retention-off' | 'no-staff' | null;
  retention_days: number;
  /** Every (config number, model) pair of the window's questions for this operation and account filter; `config_number` is `null` on a question made before configs. */
  pairs: Array<{ config_number: number | null; model: string; questions: number }>;
};

/** One pass over real questions (`GET …/real-judge/passes`). `filters` is read by key: `{ operation, config, test_accounts_only, limit, since, skipped }`. */
export type RealPass = {
  id: string;
  judge: { id: string; name: string };
  revision: number;
  revision_id: string;
  criteria: JudgeCriterion[];
  judge_model: { provider: string; model_id: string } | null;
  status: JudgePassStatus;
  /** `admin-usd-cap`, `stalled` or another reason the pass stopped. */
  error: string | null;
  total: number;
  judged: number;
  cost_usd: string | null;
  filters: Record<string, unknown>;
  started_by: string;
  started_by_user: UserRef;
  created_at: string;
  finished_at: string | null;
};

/**
 * One question of a pass, as the snapshot the judge saw (no learner id, private words never in it). A question deleted since (account deletion, history
 * limit) is still listed: `created_at` is then `null` and `can_add_to_examples` false.
 */
export type RealPassItem = {
  question_id: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  context: { session_words: string[] } | null;
  /** In the order of the pass's criteria; a criterion not scored yet has no entry. */
  scores: Array<{ criterion: string; verdict: JudgeVerdict | null; problem: string | null; reason: string | null }>;
  labels: Array<{ criterion: string; verdict: JudgeVerdict }>;
  created_at: string | null;
  config_number: number | null;
  model: string | null;
  provider: string | null;
  failed: boolean;
  can_add_to_examples: boolean;
};

/** The report or the question an example is made from: exactly one of the two ids. */
export type SourceRef = { report_id: string } | { question_id: string };

/** What the add dialog shows before anything is added: `input` is `null` when it has to be rebuilt from the catalog; `expected` is the machine's guess. */
export type SourcePreview = {
  operation: RealOperation;
  source: 'report' | 'real_judge';
  source_ref: string;
  word: string;
  part_of_speech: string;
  input: Record<string, unknown> | null;
  rebuilt: boolean;
  expected: { forms: string[] } | null;
};
export type AddFromSourceBody = SourceRef & { expected: Record<string, unknown> | null; note: string | null };
/** Why a source cannot become an example (`source-not-eligible`, its `reason`). */
export type NotEligibleReason = 'report-not-confirmed' | 'not-ai' | 'private-word' | 'sense-gone' | 'no-input';

export const sourceKeyPart = (ref: SourceRef): string => ('report_id' in ref ? `report:${ref.report_id}` : `question:${ref.question_id}`);

export const realKeys = {
  all: ['ai', 'real'] as const,
  estimate: (f: RealJudgeFilters) => ['ai', 'real', 'estimate', f.judge_id, f.operation, f.config?.number ?? null, f.config?.model ?? null, f.test_accounts_only] as const,
  passes: () => ['ai', 'real', 'passes'] as const,
  pass: (id: string) => ['ai', 'real', 'pass', id] as const,
  source: (ref: SourceRef) => ['ai', 'real', 'source', sourceKeyPart(ref)] as const,
};

/** A pass is over once it is `finished` or `failed`. */
export const isRealPassActive = (pass: Pick<RealPass, 'status'>): boolean => pass.status === 'queued' || pass.status === 'running';

/** The operation a pass was started for, from its `filters`; `null` for a value this build does not know. */
export function passOperation(pass: Pick<RealPass, 'filters'>): RealOperation | null {
  const operation = pass.filters.operation;
  return typeof operation === 'string' && isRealOperation(operation) ? operation : null;
}

const base = '/v1/admin/practice';
const PASSES_PAGE_SIZE = 20;

/** `config_number` and `model` go together (the API refuses one alone); the switch is sent only when it is on. */
export function getEstimate(api: ApiClient, f: RealJudgeFilters) {
  const query = new URLSearchParams({ judge_id: f.judge_id, operation: f.operation });
  if (f.config) {
    query.set('config_number', String(f.config.number));
    query.set('model', f.config.model);
  }
  if (f.test_accounts_only) query.set('test_accounts_only', 'true');
  return api.get<RealJudgeEstimate>(`${base}/real-judge/estimate?${query.toString()}`);
}

/**
 * Needs an `Idempotency-Key` (send through `useSubmitAction`). The API selects again, so what it judges can differ from the estimate shown. 409
 * `nothing-to-judge`, `judge-pass-running`, `admin-usd-cap`, `model-price-missing`, `model-not-set`, `provider-not-configured`.
 */
export const startRealJudge = (api: ApiClient, f: RealJudgeFilters, idempotencyKey: string) =>
  api.post<{ pass_id: string; selected: number; skipped: RealSkipped }>(
    `${base}/real-judge`,
    { judge_id: f.judge_id, operation: f.operation, config: f.config, test_accounts_only: f.test_accounts_only },
    { idempotencyKey },
  );

/** Newest first. */
export function listRealPasses(api: ApiClient, pageToken?: string) {
  const query = new URLSearchParams({ page_size: String(PASSES_PAGE_SIZE) });
  if (pageToken) query.set('page_token', pageToken);
  return api.get<{ items: RealPass[]; next_page_token: string | null }>(`${base}/real-judge/passes?${query.toString()}`);
}
/** A pass and its questions, newest question first; 404 for an unknown pass or one made for an eval run. */
export const getRealPass = (api: ApiClient, id: string) => api.get<{ pass: RealPass; items: RealPassItem[] }>(`${base}/real-judge/passes/${id}/items`);

/** 409 `source-not-eligible` (see `NotEligibleReason`), 404 `not-found`. An editor gets 403: only an admin asks. */
export const getSourcePreview = (api: ApiClient, ref: SourceRef) =>
  api.get<SourcePreview>(`${base}/eval-examples/from-source?${new URLSearchParams('report_id' in ref ? { report_id: ref.report_id } : { question_id: ref.question_id }).toString()}`);
/** 201; 422 `expected-invalid` (`violations`), 409 `source-not-eligible`. The new example is always a dev one. */
export const addFromSource = (api: ApiClient, body: AddFromSourceBody, idempotencyKey: string) =>
  api.post<{ id: string; operation: RealOperation; rebuilt: boolean }>(`${base}/eval-examples/from-source`, body, { idempotencyKey });
