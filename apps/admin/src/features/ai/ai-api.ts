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

export type TestResult = {
  items: Array<{
    input: unknown;
    status: string;
    reason: string | null;
    output: Record<string, unknown> | null;
    raw_output: string | null;
    latency_ms: number;
    cost_usd: string | null;
    calls: unknown[];
  }>;
};
export type TestQuota = { limit: number; remaining: number; resets_at: string };

export type EvalExample = {
  id: string;
  operation: AiOperation;
  input: Record<string, unknown>;
  note: string | null;
  created_by: string;
  created_by_user: UserRef;
  created_at: string;
  updated_at: string;
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
};

const base = '/v1/admin/ai';
const REVISIONS_PAGE_SIZE = 20;

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

export const listExamples = (api: ApiClient, operation: AiOperation) =>
  api.get<{ items: EvalExample[] }>(`${base}/eval/examples?operation=${operation}`);

/** The API lists operations a→z; the screens show them in the copy deck's order. */
export function sortByOperationOrder<T extends { operation: AiOperation }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => AI_OPERATION_ORDER.indexOf(a.operation) - AI_OPERATION_ORDER.indexOf(b.operation));
}

/** Effort levels offered for the setting's current model (besides "Mặc định"); none when it has no model or the model is unknown. */
export function effortChoicesFor(setting: Pick<AiOperationSetting, 'model'>, models: AiModel[]): string[] {
  if (!setting.model) return [];
  return models.find((model) => model.id === setting.model?.id)?.effort_choices ?? [];
}
