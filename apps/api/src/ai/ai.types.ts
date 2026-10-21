// Types shared by the AI gateway and its callers (design §5.5, §8; plan choice 2).

export const AI_OPERATIONS = [
  'generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word',
] as const;
export type AiOperation = (typeof AI_OPERATIONS)[number];

export const AI_PROVIDERS = ['openai', 'anthropic', 'fake'] as const;
export type AiProviderName = (typeof AI_PROVIDERS)[number];

export type AiPurpose = 'learner' | 'test' | 'eval';

export type TransientReason = 'timeout' | 'connection' | 'rate-limited' | 'provider-error' | 'invalid-shape' | 'truncated' | 'busy';
export type PermanentReason = 'refused' | 'bad-input' | 'model-rejected' | 'auth-failed' | 'input-mismatch';
export type UnavailableReason = 'ai-disabled' | 'model-not-set' | 'provider-not-configured' | 'provider-quota' | 'daily-call-cap';

/** `ai_calls.outcome`: `succeeded` or the call's own reason (plan choice 2). */
export type CallOutcome =
  | 'succeeded' | 'timeout' | 'connection' | 'rate-limited' | 'provider-error' | 'invalid-shape' | 'truncated' | 'stopped'
  | 'refused' | 'model-rejected' | 'auth-failed' | 'provider-quota';

export type AiMeta = {
  operation: AiOperation;
  provider: AiProviderName;
  model: string;
  effort: string | null;
  prompt_revision: number | null;
  schema_version: 1;
  replayed: boolean;
};

export type AiResult =
  | { status: 'succeeded'; operation_id: string; result: Record<string, unknown>; meta: AiMeta }
  | { status: 'in_progress'; operation_id: string }
  | { status: 'transient_failure'; operation_id: string; reason: TransientReason }
  | { status: 'permanent_failure'; operation_id: string; reason: PermanentReason }
  | { status: 'unavailable'; operation_id: string; reason: UnavailableReason; retry_after_seconds?: number };

export type AiReadiness = { ready: true } | { ready: false; reason: UnavailableReason; retry_after_seconds?: number };
