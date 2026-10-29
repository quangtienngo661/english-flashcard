import type { ApiClient } from '../../api/client';
import type { UserRef } from '../../api/user-ref';

/** Same order as the API's `AI_OPERATIONS` and the copy deck; the API lists operations a→z, so screens sort with `sortByOperationOrder`. */
export const AI_OPERATION_ORDER = [
  'generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word',
] as const;
export type AiOperation = (typeof AI_OPERATION_ORDER)[number];
export type AiProvider = 'openai' | 'anthropic' | 'fake';
export type AiPurpose = 'learner' | 'test' | 'eval' | 'judge';
/** The six operations plus the gateway's own `judge`, which only the cost ledger and the calls page know. */
export type GatewayOperation = AiOperation | 'judge';

export type CostEstimate = {
  per_call_usd: string;
  per_call_vnd: number;
  per_day_1000_vnd: number;
  max_call_usd: string | null;
  max_call_vnd: number | null;
};

export type UnavailableReason = 'ai-disabled' | 'model-not-set' | 'provider-not-configured' | 'daily-call-cap' | 'admin-usd-cap' | 'provider-quota';

/** `GET /v1/admin/ai/status`. `thinking` here is `disabled | between_tools`, unlike the operations API's `off`. */
export type AiStatus = {
  operations: Array<{
    operation: AiOperation;
    ready: boolean;
    reason: UnavailableReason | null;
    model: { provider: AiProvider; model_id: string } | null;
    effort: string | null;
    thinking: 'disabled' | 'between_tools' | null;
    max_output_tokens: number | null;
    last_error: { at: string; outcome: string; http_status: number | null; purpose: AiPurpose } | null;
    model_warning: { shutdown_at: string | null; lifecycle: string | null } | null;
  }>;
  /** `calls` counts learner calls (what `cap` limits); `admin_cost_usd` is what test, eval and judge calls cost today, against `admin_usd_cap`. */
  today: {
    calls: number; cap: number | null; failed_calls: number; failed_cost_usd: string; cost_usd: string; cost_vnd: number;
    admin_cost_usd: string; admin_usd_cap: number | null;
  };
  ai_enabled: boolean;
  providers: Record<AiProvider, boolean>;
};

export type AiModel = {
  id: string;
  provider: AiProvider;
  model_id: string;
  shutdown_at: string | null;
  lifecycle: string | null;
  effort_choices: string[];
  thinking_off_available: boolean;
  structured_outputs: boolean | null;
  max_output_tokens: number | null;
  price: { input: string; cached_input: string | null; output: string } | null;
  note: string | null;
  info_checked_at: string;
  used_by: AiOperation[];
  estimate: CostEstimate | null;
  /** The admin's own flag (D40): pickers leave the model out, the model keeps working where it is already chosen. */
  hidden: boolean;
};

/** Prices are numbers 0-1000 (up to 4 decimals) or null/omitted; a `fake` model is forced to 0. */
export type AddModelBody = {
  provider: AiProvider;
  model_id: string;
  price_input?: number | null;
  price_cached_input?: number | null;
  price_output?: number | null;
  note?: string | null;
};
export type UpdateModelBody = {
  price_input?: number | null;
  price_cached_input?: number | null;
  price_output?: number | null;
  note?: string | null;
  hidden?: boolean;
};

export type AiOperationSetting = {
  operation: AiOperation;
  model: { id: string; provider: AiProvider; model_id: string } | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: number | null;
  version: number;
  input_fields: string[];
  estimate: CostEstimate | null;
};

export type PromptExample = { input: Record<string, unknown>; output: Record<string, unknown> };

export type PromptRevision = {
  revision: number;
  instructions: string;
  examples: PromptExample[];
  saved_by: string;
  saved_at: string;
  saved_by_user: UserRef;
};

export type ConfigStatus = 'draft' | 'published' | 'retired';
/** One config of an operation (`GET …/configs/{op}`): prompt, model and its settings as one versioned unit (nhóm B design §6.1). */
export type ConfigView = {
  id: string;
  operation: AiOperation;
  number: number;
  /** +1 on each save of a draft; what `expected_version` is checked against. */
  version: number;
  status: ConfigStatus;
  instructions: string;
  examples: PromptExample[];
  model: { id: string; provider: AiProvider; model_id: string } | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: number | null;
  note: string | null;
  created_from: string | null;
  created_by_user: UserRef;
  created_at: string;
  published_by_user: UserRef | null;
  published_at: string | null;
  estimate: CostEstimate | null;
};
/** The live config, the draft being prepared and the config before the live one (the rollback target). */
export type ConfigsView = {
  operation: AiOperation;
  input_fields: string[];
  guard: string;
  /** +1 on each publish or rollback: what a rollback sends as `expected_live_version`. */
  live_version: number;
  live: ConfigView;
  draft: ConfigView | null;
  previous: ConfigView | null;
};
/** Items of a run that passed, out of those that were judged (`counted` is 0 when nothing was judged on that criterion). */
export type Tally = { passed: number; counted: number };
/** What a publish warns about (design §6.3): warnings never block; held-out examples are only ever counted. */
export type PublishWarning =
  | { code: 'rate-drop'; criterion: 'shape' | 'rule' | 'expected'; before: Tally; after: Tally }
  /** A judge criterion that the same judge revision scored in both runs. */
  | { code: 'judge-rate-drop'; judge_id: string; judge_name: string; judge_revision_id: string; revision: number; criterion: string; before: Tally; after: Tally }
  | { code: 'dev-regressed'; example_ids: string[] }
  | { code: 'held-out-failures-up'; before: number; after: number };
/** `GET …/configs/{op}/publish-check`: what a publish of the saved draft needs and would warn about. */
export type PublishCheck = {
  operation: AiOperation;
  draft: { id: string; number: number; version: number };
  /** The draft has no model: publishing turns the operation off, with no run (D38). */
  turn_off: boolean;
  /** The newest frozen version of the example set; `null` when none was frozen. */
  set: { id: string; version: number } | null;
  candidate_run_id: string | null;
  baseline: { required: boolean; run_id: string | null };
  blockers: Array<'eval-required' | 'baseline-required'>;
  warnings: PublishWarning[];
};
export type PublishBody = { expected_version: number; candidate_run_id: string | null; baseline_run_id: string | null; acknowledge_warnings: boolean };
type ConfigRef = { id: string; number: number; model_id: string | null };
/** One publish or rollback of an operation (`GET …/configs/{op}/history`). */
export type ConfigEvent = {
  id: string;
  kind: 'publish' | 'rollback';
  at: string;
  actor_user: UserRef;
  config: ConfigRef;
  from_config: ConfigRef | null;
  candidate_run_id: string | null;
  baseline_run_id: string | null;
  warnings: PublishWarning[];
};
export type SaveDraftBody = {
  expected_version: number;
  instructions: string;
  examples: PromptExample[];
  model_ref: string | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: number | null;
  note: string | null;
};

/** One provider call of a test sample (API `CallSummary`); `outcome` is a `CallOutcome` such as `succeeded`, `timeout`, `invalid-shape`. */
export type TestCall = { attempt: 1 | 2; outcome: string; latency_ms: number; cost_usd: string | null; http_status: number | null };
export type TestStatus = 'succeeded' | 'transient_failure' | 'permanent_failure' | 'unavailable';
/** `POST …/prompts/{op}/test`: one item per input (the chosen examples, else the first five of the set, else the prompt's own). */
export type TestResult = {
  items: Array<{
    input: Record<string, unknown>;
    status: TestStatus;
    reason: string | null;
    output: Record<string, unknown> | null;
    raw_output: string | null;
    latency_ms: number;
    cost_usd: string | null;
    calls: TestCall[];
  }>;
};
export type TestQuota = { limit: number; remaining: number; resets_at: string };

export type EvalSplit = 'dev' | 'held_out';
export type EvalSource = 'manual' | 'import' | 'report' | 'real_judge';

/** A dev example, or a held-out one the admin opened. `expected` is `null` on an example made before the expected answer existed. */
export type EvalExample = {
  id: string;
  operation: AiOperation;
  input: Record<string, unknown>;
  note: string | null;
  split: 'dev';
  expected: Record<string, unknown> | null;
  source: EvalSource;
  source_ref: string | null;
  revealed_at: string | null;
  created_by: string;
  created_by_user: UserRef;
  created_at: string;
  updated_at: string;
};
/** A held-out example before it is opened: its id and its part, nothing else (design §5.1, R7). */
export type HeldOutExample = { id: string; split: 'held_out' };
export type ExampleRow = EvalExample | HeldOutExample;
export const isDevExample = (row: ExampleRow): row is EvalExample => row.split === 'dev';

/** `POST …/eval/examples/{id}/reveal`: the example is a dev one from now on; `deleted` = it only exists in a frozen version. */
export type RevealedExample = {
  id: string;
  operation: AiOperation;
  split: 'dev';
  input: Record<string, unknown>;
  expected: Record<string, unknown> | null;
  note: string | null;
  revealed_at: string;
  deleted: boolean;
};

/** `expected` is left out for an operation with no expected answer (the API refuses one). */
export type EvalExampleBody = { operation: AiOperation; input: Record<string, unknown>; note: string | null; expected?: Record<string, unknown> | null };
/** `POST …/eval/examples/bulk`: the valid rows are stored, the invalid ones come back by their position in `rows` (1-based). */
export type BulkExamplesBody = {
  operation: AiOperation;
  rows: Array<{ input: Record<string, unknown>; note: string | null; expected?: unknown; split?: string }>;
};
export type BulkExamplesResult = { total: number; valid: number; created: number; invalid: Array<{ row: number; violations: string[] }> };
export type EvalExamplePatch = { input?: Record<string, unknown>; note?: string | null; expected?: Record<string, unknown> | null };

/** One frozen version of an operation's example set (`GET …/eval/sets`). */
export type EvalSet = {
  id: string;
  operation: AiOperation;
  version: number;
  held_out_ratio: number;
  frozen_by: string;
  frozen_by_user: UserRef;
  frozen_at: string;
  dev_count: number;
  held_out_count: number;
  /** Held-out examples somebody opened after the version was frozen. */
  revealed_count: number;
};
/** `input` and `expected` are `null` for a held-out item nobody opened. */
export type EvalSetItem = {
  example_id: string;
  position: number;
  split: EvalSplit;
  revealed_at: string | null;
  in_working_set: boolean;
  input: Record<string, unknown> | null;
  expected: Record<string, unknown> | null;
};
export type EvalSetDetail = EvalSet & { items: EvalSetItem[] };

export type EvalRunStatus = 'queued' | 'running' | 'finished' | 'failed';
/** A run of the example set (`GET …/eval/runs`): the model choice and prompt revision are those stored when it was created. */
export type EvalRun = {
  id: string;
  operation: AiOperation;
  provider: AiProvider;
  model: string;
  effort: string | null;
  thinking: string | null;
  max_output_tokens: number | null;
  /** `null`: the run used a draft from the Prompt page ("Bản nháp"). */
  prompt_revision: number | null;
  /** The config the run tried (and the version of it): `null` on a run of an unsaved draft text or from before configs. `config_number` is `null` once the draft was deleted. */
  config_id: string | null;
  config_version: number | null;
  config_number: number | null;
  status: EvalRunStatus;
  total: number;
  done: number;
  valid_count: number;
  /** The frozen version this run took its examples from; `null` = the working set (a quick try that cannot be compared). */
  set_id: string | null;
  set_version: number | null;
  /** A run made before versions existed. */
  legacy: boolean;
  /** Finished, and every example has a result. */
  complete: boolean;
  avg_latency_ms: number | null;
  cost_usd: string | null;
  cost_unknown_count: number;
  error: string | null;
  started_by: string;
  started_by_user: UserRef;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};
export type RuleStatus = 'pass' | 'fail' | 'skipped' | 'not_applicable';
/** What Practice's rules said about an output (`not-in-catalog`: the word is not in the catalog; `no-rules`: no rules are registered). */
export type RuleResult = { status: RuleStatus; problems: string[]; reason: 'not-in-catalog' | 'no-rules' | null };
export type ExpectedResult = 'pass' | 'fail';
export type EvalRunItemStatus = TestStatus | 'skipped' | 'pending' | 'in_progress';
/** One example of a run (`GET …/eval/runs/{id}/items`, dev only): the snapshot taken when the run was made, and its results. */
export type EvalRunItem = {
  /** What a score and a label hang on (the run item's own id, not the example's). */
  item_id: string;
  example_id: string;
  position: number;
  split: EvalSplit;
  /** `null` on an item migrated from an old run whose example was deleted. */
  input: Record<string, unknown> | null;
  expected: Record<string, unknown> | null;
  status: EvalRunItemStatus;
  reason: string | null;
  output: Record<string, unknown> | null;
  raw_output: string | null;
  rule: RuleResult | null;
  expected_result: ExpectedResult | null;
  latency_ms: number | null;
  cost_usd: string | null;
  /** What every judge revision said about this output, and the owner's labels (nhóm B M3). */
  scores: ScoreView[];
  labels: LabelView[];
};
/** Counts of one part (dev or held-out) of a run; the held-out part is only ever shown as these numbers. */
export type SplitStats = {
  total: number;
  pending: number;
  skipped: number;
  shape_pass: number;
  shape_fail: number;
  shape_transient: number;
  rule_pass: number;
  rule_fail: number;
  rule_skipped: number;
  rule_not_applicable: number;
  expected_pass: number;
  expected_fail: number;
  expected_none: number;
  failing: number;
};
export type RunStats = { dev: SplitStats; held_out: SplitStats };
export type RegressionCriterion = 'shape' | 'rule' | 'expected';
/** `GET …/eval/runs/compare?a=&b=` (two runs of the same version): `a` is "trước", `b` is "nay". */
export type RunComparison = {
  a: EvalRun;
  b: EvalRun;
  stats: { a: RunStats; b: RunStats };
  regressions: { dev: Array<{ example_id: string; input: Record<string, unknown> | null; failed: RegressionCriterion[] }>; held_out: number };
  /** Judge rows only for revisions that scored both runs; the others are in `judge_unmatched` (design §5.3). */
  judge: JudgeComparisonRow[];
  judge_unmatched: JudgeUnmatched[];
};
export type JudgeVerdict = 'pass' | 'fail_major' | 'fail_minor';
/** One question a judge answers about an output; `code` is what its answer and the owner's labels are keyed by. */
export type JudgeCriterion = { code: string; question: string };
/** One saved version of a judge (`GET …/judges/{id}/revisions`, newest first). */
export type JudgeRevision = {
  id: string;
  revision: number;
  criteria: JudgeCriterion[];
  instructions: string;
  examples: PromptExample[];
  model: { id: string; provider: AiProvider; model_id: string } | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: number | null;
  saved_by_user: UserRef;
  saved_at: string;
};
/** A judge with its newest revision, the one in use (`GET …/judges`). */
export type Judge = { id: string; name: string; operations: AiOperation[]; active: boolean; created_at: string; latest: JudgeRevision };
/** `POST …/judges`: every key is required. */
export type JudgeBody = {
  name: string;
  operations: AiOperation[];
  active: boolean;
  criteria: JudgeCriterion[];
  instructions: string;
  examples: PromptExample[];
  model_ref: string | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: number | null;
};
/** `PUT …/judges/{id}`: `expected_revision` is the revision the page was showing (409 `judge-revision-conflict` otherwise). */
export type SaveJudgeBody = JudgeBody & { expected_revision: number };
export type JudgePassStatus = 'queued' | 'running' | 'finished' | 'failed';
/** One pass of one judge revision over a run's outputs (`GET …/judge-passes/{id}`, and `passes` of `…/runs/{id}/items`). */
export type JudgePass = {
  id: string;
  kind: 'eval_run' | 'real';
  operation: AiOperation;
  eval_run_id: string | null;
  judge: { id: string; name: string };
  judge_revision: { id: string; revision: number; model: { provider: string; model_id: string } | null };
  status: JudgePassStatus;
  /** `admin-usd-cap`, `stalled`, `run-failed` or another reason the pass stopped. */
  error: string | null;
  /** `null` while the pass waits for its run to finish: it takes its snapshot then. */
  total: number | null;
  judged: number;
  /** Outputs whose score has no verdict ("không chấm được"). */
  unjudged: number;
  cost_usd: string | null;
  started_by_user: UserRef;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};
/** Outputs by what the judge said; `unjudged` = "không chấm được". */
export type JudgeTally = { pass: number; fail_major: number; fail_minor: number; unjudged: number };
type JudgeRevisionKey = { judge_id: string; judge_name: string; judge_revision_id: string; revision: number };
/** One judge revision on one criterion over a run: dev and held-out apart (held-out is only ever these numbers). */
export type JudgeStatsRow = JudgeRevisionKey & { criterion: string; dev: JudgeTally; held_out: JudgeTally; calibrated: boolean };
export type JudgeComparisonRow = JudgeRevisionKey & { criterion: string; a: { dev: JudgeTally; held_out: JudgeTally }; b: { dev: JudgeTally; held_out: JudgeTally } };
/** A judge revision that scored only one of the two runs (`scored` says which). */
export type JudgeUnmatched = JudgeRevisionKey & { scored: 'a' | 'b' };
/** What one judge revision said about one criterion of one output: `verdict` is `null` ("không chấm được") with `problem` saying why. */
export type ScoreView = {
  judge_id: string;
  judge_name: string;
  judge_revision_id: string;
  revision: number;
  criterion: string;
  verdict: JudgeVerdict | null;
  problem: string | null;
  reason: string | null;
};
export type LabelSubject = 'eval_item' | 'real_question';
/** The owner's verdict on one criterion of one output; it is shared by every judge revision. `verdict: null` is a label taken back. */
export type LabelView = {
  subject_kind: LabelSubject;
  subject_id: string;
  criterion: string;
  verdict: JudgeVerdict | null;
  labeled_by_user: UserRef | null;
  labeled_at: string | null;
};
export type PutLabelBody = { subject_kind: LabelSubject; subject_id: string; criterion: string; verdict: JudgeVerdict | null };
/** `GET …/judges/{id}/agreement`: every revision x criterion with how far it agrees with the labels, and the two limits of "đã hiệu chỉnh". */
export type JudgeAgreementView = {
  label_min: number;
  agreement_min: number;
  items: Array<{
    judge_revision_id: string;
    revision: number;
    criterion: string;
    labeled: number;
    agree: number;
    agree_exact: number;
    /** `null` while nothing is labelled. */
    rate: number | null;
    exact_rate: number | null;
    calibrated: boolean;
  }>;
};

/** `GET …/eval/runs/{id}` adds the draft, the worker's heartbeat and the dev results (kept for v1; the admin reads `…/items`). */
export type EvalRunDetail = EvalRun & {
  draft: { instructions: string; examples: PromptExample[] } | null;
  heartbeat_at: string | null;
  items: Array<Omit<EvalRunItem, 'item_id' | 'scores' | 'labels'>>;
};
/**
 * Exactly one of `prompt` and `config`. `config` runs the live config or the saved draft; `prompt: 'current'` is the old way to say "the live config".
 * `set_id`: a frozen version of the operation; left out, the run takes the working set.
 */
export type StartRunBody = {
  operation: AiOperation;
  prompt?: 'current' | { instructions: string; examples: PromptExample[] };
  config?: 'live' | 'draft';
  set_id?: string;
  /** "Chấm bằng judge": a pass of this judge's newest revision starts when the run finishes. */
  judge_id?: string;
};

/** A run is over once it is `finished` or `failed`; the job rule of `usePollingStatus` does not know `finished`. */
export const isRunDone = (status: string): boolean => status === 'finished' || status === 'failed';

/** An admin stopped it: the API stores that as `failed` with `error: 'cancelled'` (no status of its own). */
export const isRunCancelled = (run: Pick<EvalRun, 'status' | 'error'>): boolean => run.status === 'failed' && run.error === 'cancelled';

export const COST_GROUPS = ['day', 'operation', 'model', 'purpose', 'outcome'] as const;
export type CostGroup = (typeof COST_GROUPS)[number];
/** One group of `GET …/costs` (or its `total`); `cost_usd` is a string with 8 decimals, `cost_vnd` the current rate times it. */
export type CostTotals = {
  calls: number; input_tokens: number; cached_input_tokens: number; output_tokens: number; reasoning_tokens: number;
  cost_usd: string; cost_vnd: number; unknown_cost_calls: number;
};
/** `key` is a `YYYY-MM-DD` Vietnam day, an operation, `provider/model`, a purpose or an outcome, by `group_by`. */
export type CostsReply = { items: Array<CostTotals & { key: string }>; total: CostTotals };

/** One provider call (`GET …/calls`); `content` is `null` once it expired or when content is not kept (the two look the same). */
export type AiCall = {
  id: string;
  attempt: number;
  purpose: AiPurpose;
  operation: GatewayOperation;
  provider: AiProvider;
  model: string;
  effort: string | null;
  thinking: string | null;
  max_output_tokens: number | null;
  prompt_revision: number | null;
  outcome: string;
  http_status: number | null;
  provider_error_code: string | null;
  latency_ms: number;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cost_usd: string | null;
  cost_known: boolean;
  created_at: string;
  /** A call made for a held-out example: its content is never shown (`content` is `null`). */
  held_out: boolean;
  content: { request: unknown; response: unknown; expires_at: string } | null;
};

export const aiKeys = {
  all: ['ai'] as const,
  status: () => ['ai', 'status'] as const,
  models: () => ['ai', 'models'] as const,
  operations: () => ['ai', 'operations'] as const,
  configs: (op: AiOperation) => ['ai', 'configs', op] as const,
  publishCheck: (op: AiOperation) => ['ai', 'publish-check', op] as const,
  configHistory: (op: AiOperation) => ['ai', 'config-history', op] as const,
  revisions: (op: AiOperation) => ['ai', 'revisions', op] as const,
  testQuota: () => ['ai', 'test-quota'] as const,
  examples: (op: AiOperation) => ['ai', 'eval-examples', op] as const,
  runs: (op: AiOperation) => ['ai', 'eval-runs', op] as const,
  /** Under `runs(op)`, so one invalidation of the operation's runs reads these again too. */
  runsOfSet: (op: AiOperation, setId: string) => ['ai', 'eval-runs', op, 'set', setId] as const,
  run: (id: string) => ['ai', 'eval-run', id] as const,
  runItems: (id: string) => ['ai', 'eval-run-items', id] as const,
  compare: (a: string, b: string) => ['ai', 'eval-compare', a, b] as const,
  sets: (op: AiOperation) => ['ai', 'eval-sets', op] as const,
  set: (id: string) => ['ai', 'eval-set', id] as const,
  /** Every opened version, for one invalidation after an example is revealed. */
  anySet: () => ['ai', 'eval-set'] as const,
  forms: (word: string, partOfSpeech: string) => ['ai', 'eval-forms', word, partOfSpeech] as const,
  costs: (from: string, to: string, groupBy: CostGroup) => ['ai', 'costs', from, to, groupBy] as const,
  calls: (operationId: string) => ['ai', 'calls', operationId] as const,
  judges: () => ['ai', 'judges'] as const,
  judgeRevisions: (id: string) => ['ai', 'judge-revisions', id] as const,
  judgeAgreement: (id: string) => ['ai', 'judge-agreement', id] as const,
  judgePass: (id: string) => ['ai', 'judge-pass', id] as const,
  /** Every judge's agreement, for one invalidation after a label changes. */
  anyJudgeAgreement: () => ['ai', 'judge-agreement'] as const,
};

const base = '/v1/admin/ai';
const REVISIONS_PAGE_SIZE = 20;
const HISTORY_PAGE_SIZE = 20;
const RUNS_PAGE_SIZE = 20;

export const getStatus = (api: ApiClient) => api.get<AiStatus>(`${base}/status`);

export const listModels = (api: ApiClient) => api.get<{ items: AiModel[] }>(`${base}/models`);
export const createModel = (api: ApiClient, body: AddModelBody) => api.post<AiModel>(`${base}/models`, body);
export const updateModel = (api: ApiClient, id: string, body: UpdateModelBody) => api.patch<AiModel>(`${base}/models/${id}`, body);
export const refreshModel = (api: ApiClient, id: string) => api.post<AiModel>(`${base}/models/${id}/refresh`);
export const deleteModel = (api: ApiClient, id: string) => api.delete<void>(`${base}/models/${id}`);

export const listOperations = (api: ApiClient) => api.get<{ items: AiOperationSetting[] }>(`${base}/operations`);

/** The prompt revisions saved before configs existed (read only: the save endpoints are gone). */
export function listRevisions(api: ApiClient, op: AiOperation, pageToken?: string) {
  const query = new URLSearchParams({ page_size: String(REVISIONS_PAGE_SIZE) });
  if (pageToken) query.set('page_token', pageToken);
  return api.get<{ items: PromptRevision[]; next_page_token: string | null }>(`${base}/prompts/${op}/revisions?${query.toString()}`);
}
export const getTestQuota = (api: ApiClient) => api.get<TestQuota>(`${base}/test-quota`);

export const getConfigs = (api: ApiClient, op: AiOperation) => api.get<ConfigsView>(`${base}/configs/${op}`);
/** Copies the live config, or `from_config_id` (a published or retired one); 409 `draft-exists` when the operation already has a draft. */
export const createDraft = (api: ApiClient, op: AiOperation, body: { from_config_id?: string }) => api.post<ConfigView>(`${base}/configs/${op}/draft`, body);
/** 409 `draft-version-conflict`, 422 `few-shot-invalid`, 400 `validation-failed`. */
export const saveDraft = (api: ApiClient, op: AiOperation, body: SaveDraftBody) => api.put<ConfigView>(`${base}/configs/${op}/draft`, body);
/** 409 `draft-busy` while a run of the draft is queued or running. */
export const deleteDraft = (api: ApiClient, op: AiOperation) => api.delete<void>(`${base}/configs/${op}/draft`);
export const getPublishCheck = (api: ApiClient, op: AiOperation) => api.get<PublishCheck>(`${base}/configs/${op}/publish-check`);
/** Makes the draft live; answers the configs as they are now. 409 `publish-stale`, `publish-warnings`, `eval-required`, `baseline-required`, `draft-version-conflict`. */
export const publishDraft = (api: ApiClient, op: AiOperation, body: PublishBody) => api.post<ConfigsView>(`${base}/configs/${op}/publish`, body);
/** Puts the config before the live one back; `expected_live_version` keeps a stale page from undoing a newer publish (409 `publish-stale`, `no-previous`). */
export const rollbackToPrevious = (api: ApiClient, op: AiOperation, body: { expected_live_version: number }) =>
  api.post<ConfigsView>(`${base}/configs/${op}/rollback`, body);
export function listConfigHistory(api: ApiClient, op: AiOperation, pageToken?: string) {
  const query = new URLSearchParams({ page_size: String(HISTORY_PAGE_SIZE) });
  if (pageToken) query.set('page_token', pageToken);
  return api.get<{ items: ConfigEvent[]; next_page_token: string | null }>(`${base}/configs/${op}/history?${query.toString()}`);
}
/** Runs the saved draft at once on up to five dev inputs; never re-sent automatically (an AI call and one `ai.test` slot). */
export const testDraft = (api: ApiClient, op: AiOperation, body: { example_ids?: string[] }) => api.post<TestResult>(`${base}/configs/${op}/draft/test`, body);

/** Dev examples in full; a held-out one that was not opened is only `{ id, split: 'held_out' }`. */
export const listExamples = (api: ApiClient, operation: AiOperation) =>
  api.get<{ items: ExampleRow[] }>(`${base}/eval/examples?operation=${operation}`);
/** The catalog forms of a word to fill the expected answer in; `{ forms: null }` when the catalog does not know the word. */
export const getForms = (api: ApiClient, word: string, partOfSpeech: string) =>
  api.get<{ forms: string[] | null }>(`${base}/eval/examples/forms?${new URLSearchParams({ word, part_of_speech: partOfSpeech }).toString()}`);
/** A held-out example becomes a dev one and frozen versions record that it was seen (409 `example-not-held-out` when it is not held-out). */
export const revealExample = (api: ApiClient, id: string) => api.post<RevealedExample>(`${base}/eval/examples/${id}/reveal`);
/** A dev example comes back in full; one that landed in the hidden held-out part only as `{ id, split: 'held_out' }`. */
export const createExample = (api: ApiClient, body: EvalExampleBody) => api.post<ExampleRow>(`${base}/eval/examples`, body);
export const createExamples = (api: ApiClient, body: BulkExamplesBody) => api.post<BulkExamplesResult>(`${base}/eval/examples/bulk`, body);
export const updateExample = (api: ApiClient, id: string, body: EvalExamplePatch) => api.patch<EvalExample>(`${base}/eval/examples/${id}`, body);
export const deleteExample = (api: ApiClient, id: string) => api.delete<void>(`${base}/eval/examples/${id}`);
/** Needs an `Idempotency-Key` (send through `useSubmitAction`); a replay returns the same run. Uses one `ai.test` slot. */
export const startRun = (api: ApiClient, body: StartRunBody, idempotencyKey: string) =>
  api.post<{ run_id: string; status: 'queued'; judge_pass_id: string | null }>(`${base}/eval/runs`, body, { idempotencyKey });
export function listRuns(api: ApiClient, operation: AiOperation, pageToken?: string, setId?: string) {
  const query = new URLSearchParams({ operation, page_size: String(RUNS_PAGE_SIZE) });
  if (pageToken) query.set('page_token', pageToken);
  if (setId) query.set('set_id', setId);
  return api.get<{ items: EvalRun[]; next_page_token: string | null }>(`${base}/eval/runs?${query.toString()}`);
}
/** A run id that does not look like this cannot exist (the API answers 400): the panel says "not found" without asking. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const getRun = (api: ApiClient, id: string) => api.get<EvalRunDetail>(`${base}/eval/runs/${id}`);
/** The dev results of a run and the statistics of both parts; held-out examples are only counted. */
export const listRunItems = (api: ApiClient, id: string) =>
  api.get<{ items: EvalRunItem[]; stats: RunStats; passes: JudgePass[]; judge_stats: JudgeStatsRow[] }>(`${base}/eval/runs/${id}/items`);
/** Two runs of the same version; 409 `eval-set-mismatch` otherwise. */
export const getRunComparison = (api: ApiClient, a: string, b: string) =>
  api.get<RunComparison>(`${base}/eval/runs/compare?${new URLSearchParams({ a, b }).toString()}`);
/** A queued or running run becomes `failed` with `error: 'cancelled'` ("Đã dừng"); 409 `run-not-active` when it already ended. */
export const cancelRun = (api: ApiClient, id: string) => api.post<EvalRunDetail>(`${base}/eval/runs/${id}/cancel`);
/** Only a finished or failed run (409 `run-active` otherwise); its costs stay in the cost report. */
export const deleteRun = (api: ApiClient, id: string) => api.delete<void>(`${base}/eval/runs/${id}`);

/** "Chốt phiên bản": snapshots the working set as the next version. 422 `eval-set-incomplete`, 409 `eval-set-conflict`. */
export const freezeSet = (api: ApiClient, operation: AiOperation) => api.post<EvalSet>(`${base}/eval/sets`, { operation });
/** Newest first. */
export const listSets = (api: ApiClient, operation: AiOperation) => api.get<{ items: EvalSet[] }>(`${base}/eval/sets?operation=${operation}`);
export const getSet = (api: ApiClient, id: string) => api.get<EvalSetDetail>(`${base}/eval/sets/${id}`);

export const listJudges = (api: ApiClient) => api.get<{ items: Judge[] }>(`${base}/judges`);
/** 422 `judge-provider` (an Anthropic model only; `fake` while the fake provider is on), 400 `validation-failed`. */
export const createJudge = (api: ApiClient, body: JudgeBody) => api.post<Judge>(`${base}/judges`, body);
/** Adds a revision when a revision field changed. 409 `judge-revision-conflict`, 422 `judge-provider`. */
export const saveJudge = (api: ApiClient, id: string, body: SaveJudgeBody) => api.put<Judge>(`${base}/judges/${id}`, body);
/** A new judge with the same criteria and newest revision, to try another model on them. */
export const cloneJudge = (api: ApiClient, id: string, body: { name: string }) => api.post<Judge>(`${base}/judges/${id}/clone`, body);
/** Newest first. */
export const listJudgeRevisions = (api: ApiClient, id: string) => api.get<{ items: JudgeRevision[] }>(`${base}/judges/${id}/revisions`);
export const getJudgeAgreement = (api: ApiClient, id: string) => api.get<JudgeAgreementView>(`${base}/judges/${id}/agreement`);
/**
 * "Chấm bằng judge" on a finished or failed run. Needs an `Idempotency-Key`; answers 202 with the pass. 409 `judge-pass-running`, `admin-usd-cap`,
 * `model-price-missing`, `model-not-set`, `run-active`.
 */
export const startJudgePass = (api: ApiClient, runId: string, body: { judge_id: string }, idempotencyKey: string) =>
  api.post<JudgePass>(`${base}/eval/runs/${runId}/judge-passes`, body, { idempotencyKey });
export const getJudgePass = (api: ApiClient, id: string) => api.get<JudgePass>(`${base}/judge-passes/${id}`);
/** Puts or takes back (`verdict: null`) a label; answers the label as it stands. 409 `example-held-out`. */
export const putLabel = (api: ApiClient, body: PutLabelBody) => api.put<LabelView>(`${base}/labels`, body);

/** `from` and `to` are `YYYY-MM-DD` Vietnam days, both inclusive; the API refuses `from > to` and more than 366 days with a 400. */
export const getCosts = (api: ApiClient, from: string, to: string, groupBy: CostGroup) =>
  api.get<CostsReply>(`${base}/costs?${new URLSearchParams({ from, to, group_by: groupBy }).toString()}`);
/** Oldest first; an unknown id is a 200 with no items. */
export const listCalls = (api: ApiClient, operationId: string) =>
  api.get<{ items: AiCall[] }>(`${base}/calls?${new URLSearchParams({ operation_id: operationId }).toString()}`);

/** The API lists operations a→z; the screens show them in the copy deck's order. */
export function sortByOperationOrder<T extends { operation: AiOperation }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => AI_OPERATION_ORDER.indexOf(a.operation) - AI_OPERATION_ORDER.indexOf(b.operation));
}
