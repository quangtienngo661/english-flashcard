import type { ApiClient } from '../../api/client';
import type { UserRef } from '../../api/user-ref';

/** Same order as the API's `AI_OPERATIONS` and the copy deck; the API lists operations a→z, so screens sort with `sortByOperationOrder`. */
export const AI_OPERATION_ORDER = [
  'generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word',
] as const;
export type AiOperation = (typeof AI_OPERATION_ORDER)[number];
export type AiProvider = 'openai' | 'anthropic' | 'fake';
export type AiPurpose = 'learner' | 'test' | 'eval';

export type CostEstimate = {
  per_call_usd: string;
  per_call_vnd: number;
  per_day_1000_vnd: number;
  max_call_usd: string | null;
  max_call_vnd: number | null;
};

export type UnavailableReason = 'ai-disabled' | 'model-not-set' | 'provider-not-configured' | 'daily-call-cap' | 'provider-quota';

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
  today: { calls: number; cap: number | null; failed_calls: number; failed_cost_usd: string; cost_usd: string; cost_vnd: number };
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
export type UpdateModelBody = { price_input?: number | null; price_cached_input?: number | null; price_output?: number | null; note?: string | null };

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
export type SaveOperationBody = {
  expected_version: number;
  model_ref: string | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: number | null;
};

export type PromptExample = { input: Record<string, unknown>; output: Record<string, unknown> };

export type PromptView = {
  operation: AiOperation;
  instructions: string;
  examples: PromptExample[];
  revision: number;
  input_fields: string[];
  updated_at: string;
  updated_by: string;
  updated_by_user: UserRef;
  guard: string;
};
export type PromptRevision = {
  revision: number;
  instructions: string;
  examples: PromptExample[];
  saved_by: string;
  saved_at: string;
  saved_by_user: UserRef;
};
export type SavePromptBody = { expected_revision: number; instructions: string; examples: PromptExample[] };
export type TestBody = { instructions: string; examples: PromptExample[]; example_ids?: string[] };

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
};
/** `GET …/eval/runs/{id}` adds the draft, the worker's heartbeat and the dev results (kept for v1; the admin reads `…/items`). */
export type EvalRunDetail = EvalRun & {
  draft: { instructions: string; examples: PromptExample[] } | null;
  heartbeat_at: string | null;
  items: EvalRunItem[];
};
/** `set_id`: a frozen version of the operation; left out, the run takes the working set. */
export type StartRunBody = { operation: AiOperation; prompt: 'current' | { instructions: string; examples: PromptExample[] }; set_id?: string };

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
  operation: AiOperation;
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
  prompt: (op: AiOperation) => ['ai', 'prompt', op] as const,
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
};

const base = '/v1/admin/ai';
const REVISIONS_PAGE_SIZE = 20;
const RUNS_PAGE_SIZE = 20;

export const getStatus = (api: ApiClient) => api.get<AiStatus>(`${base}/status`);

export const listModels = (api: ApiClient) => api.get<{ items: AiModel[] }>(`${base}/models`);
export const createModel = (api: ApiClient, body: AddModelBody) => api.post<AiModel>(`${base}/models`, body);
export const updateModel = (api: ApiClient, id: string, body: UpdateModelBody) => api.patch<AiModel>(`${base}/models/${id}`, body);
export const refreshModel = (api: ApiClient, id: string) => api.post<AiModel>(`${base}/models/${id}/refresh`);
export const deleteModel = (api: ApiClient, id: string) => api.delete<void>(`${base}/models/${id}`);

export const listOperations = (api: ApiClient) => api.get<{ items: AiOperationSetting[] }>(`${base}/operations`);
export const saveOperation = (api: ApiClient, op: AiOperation, body: SaveOperationBody) =>
  api.put<AiOperationSetting>(`${base}/operations/${op}`, body);

export const getPrompt = (api: ApiClient, op: AiOperation) => api.get<PromptView>(`${base}/prompts/${op}`);
export function listRevisions(api: ApiClient, op: AiOperation, pageToken?: string) {
  const query = new URLSearchParams({ page_size: String(REVISIONS_PAGE_SIZE) });
  if (pageToken) query.set('page_token', pageToken);
  return api.get<{ items: PromptRevision[]; next_page_token: string | null }>(`${base}/prompts/${op}/revisions?${query.toString()}`);
}
export const savePrompt = (api: ApiClient, op: AiOperation, body: SavePromptBody) => api.put<PromptView>(`${base}/prompts/${op}`, body);
/** Never re-sent automatically: every run costs a provider call and a quota slot. */
export const runTest = (api: ApiClient, op: AiOperation, body: TestBody) => api.post<TestResult>(`${base}/prompts/${op}/test`, body);
export const getTestQuota = (api: ApiClient) => api.get<TestQuota>(`${base}/test-quota`);

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
  api.post<{ run_id: string; status: 'queued' }>(`${base}/eval/runs`, body, { idempotencyKey });
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
export const listRunItems = (api: ApiClient, id: string) => api.get<{ items: EvalRunItem[]; stats: RunStats }>(`${base}/eval/runs/${id}/items`);
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

/** Effort levels offered for the setting's current model (besides "Mặc định"); none when it has no model or the model is unknown. */
export function effortChoicesFor(setting: Pick<AiOperationSetting, 'model'>, models: AiModel[]): string[] {
  if (!setting.model) return [];
  return models.find((model) => model.id === setting.model?.id)?.effort_choices ?? [];
}
