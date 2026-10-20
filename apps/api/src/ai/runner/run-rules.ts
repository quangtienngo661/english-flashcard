import { nextLocalMidnight } from '../../common/time/local-date.js';
import {
  ABANDON_GRACE_MS,
  AI_DAY_ZONE,
  ANTHROPIC_MAX_TOKENS_FALLBACK,
  IMMEDIATE_ERROR_MS,
  MIN_RETRY_BUDGET_MS,
  RETRY_JITTER_MAX_MS,
  RETRY_JITTER_MIN_MS,
} from '../ai.constants.js';
import type { AiProviderName, CallOutcome, PermanentReason, TransientReason, UnavailableReason } from '../ai.types.js';

// Pure rules of one run (design §4.3 third table, §8.1, §8.3). The adapter's outcome is a local structural type so this file needs
// no adapter code; the runner (Task 12) checks that `AdapterOutcome` fits it.

export type AdapterErrorKind = 'timeout' | 'connection' | 'rate_limited' | 'server' | 'auth' | 'model_rejected' | 'provider_quota';

export type RunOutcome =
  | { kind: 'ok' | 'refused' | 'truncated' | 'stopped' }
  | { kind: 'error'; error: AdapterErrorKind; retryAfterMs: number | null };

export type ExistingRow = {
  status: 'running' | 'succeeded' | 'permanent_failure';
  fingerprint: string;
  deadlineAt: Date;
  attemptId: string;
};

export type ExistingDecision =
  | { action: 'claim' }
  | { action: 'replay' }
  | { action: 'input-mismatch' }
  | { action: 'in-progress' }
  | { action: 'reclaim'; oldAttemptId: string };

/** Design §8.1 step 1: what to do with the `ai_operations` row found for `(user_id, operation_id)`. */
export function decideExisting(input: { row: ExistingRow | null; fingerprint: string; now: Date }): ExistingDecision {
  const { row, fingerprint, now } = input;
  if (!row) return { action: 'claim' };
  if (row.fingerprint !== fingerprint) return { action: 'input-mismatch' };
  if (row.status !== 'running') return { action: 'replay' };
  if (now.getTime() <= row.deadlineAt.getTime() + ABANDON_GRACE_MS) return { action: 'in-progress' };
  return { action: 'reclaim', oldAttemptId: row.attemptId };
}

const RETRYABLE: ReadonlySet<AdapterErrorKind> = new Set(['connection', 'rate_limited', 'server']);

/** Design §8.3: one quick retry of an immediate error, only when the wait plus a usable call still fits in the budget. */
export function decideRetry(input: {
  outcome: RunOutcome;
  attempt: 1 | 2;
  elapsedMs: number;
  remainingMs: number;
  jitterMs: number;
}): { retry: false } | { retry: true; waitMs: number } {
  const { outcome, attempt, elapsedMs, remainingMs, jitterMs } = input;
  if (attempt !== 1 || outcome.kind !== 'error' || !RETRYABLE.has(outcome.error)) return { retry: false };
  if (elapsedMs > IMMEDIATE_ERROR_MS) return { retry: false };
  const waitMs = outcome.retryAfterMs ?? jitterMs;
  if (remainingMs - waitMs < MIN_RETRY_BUDGET_MS) return { retry: false };
  return { retry: true, waitMs };
}

/** An integer wait in `[RETRY_JITTER_MIN_MS, RETRY_JITTER_MAX_MS]`. */
export function drawJitterMs(random: () => number = Math.random): number {
  return RETRY_JITTER_MIN_MS + Math.floor(random() * (RETRY_JITTER_MAX_MS - RETRY_JITTER_MIN_MS + 1));
}

export type FailedOutcome = Exclude<RunOutcome, { kind: 'ok' }> | { kind: 'invalid-shape' } | { kind: 'bad-input' };

export type Classification =
  | { status: 'transient_failure'; reason: TransientReason; store: false }
  | { status: 'permanent_failure'; reason: PermanentReason; store: boolean }
  | { status: 'unavailable'; reason: UnavailableReason; store: false };

const ERROR_CLASSES: Record<AdapterErrorKind, Classification> = {
  timeout: { status: 'transient_failure', reason: 'timeout', store: false },
  connection: { status: 'transient_failure', reason: 'connection', store: false },
  rate_limited: { status: 'transient_failure', reason: 'rate-limited', store: false },
  server: { status: 'transient_failure', reason: 'provider-error', store: false },
  model_rejected: { status: 'permanent_failure', reason: 'model-rejected', store: false },
  auth: { status: 'permanent_failure', reason: 'auth-failed', store: false },
  provider_quota: { status: 'unavailable', reason: 'provider-quota', store: false },
};

/** Design §4.3, third table: the gateway's result for a failed run, and whether it is kept 24 h as the final result. */
export function classify(outcome: FailedOutcome): Classification {
  switch (outcome.kind) {
    case 'error':
      return ERROR_CLASSES[outcome.error];
    case 'invalid-shape':
    case 'stopped':
      return { status: 'transient_failure', reason: 'invalid-shape', store: false };
    case 'truncated':
      return { status: 'transient_failure', reason: 'truncated', store: false };
    case 'refused':
      return { status: 'permanent_failure', reason: 'refused', store: true };
    default:
      return { status: 'permanent_failure', reason: 'bad-input', store: true };
  }
}

const ERROR_CALL_OUTCOMES: Record<AdapterErrorKind, CallOutcome> = {
  timeout: 'timeout',
  connection: 'connection',
  rate_limited: 'rate-limited',
  server: 'provider-error',
  auth: 'auth-failed',
  model_rejected: 'model-rejected',
  provider_quota: 'provider-quota',
};

/** `ai_calls.outcome` of one call (plan choice 2): an `ok` answer is `succeeded` only when its shape passed the gate. */
export function callOutcome(outcome: RunOutcome, shape: 'ok' | 'invalid'): CallOutcome {
  switch (outcome.kind) {
    case 'ok':
      return shape === 'ok' ? 'succeeded' : 'invalid-shape';
    case 'error':
      return ERROR_CALL_OUTCOMES[outcome.error];
    default:
      return outcome.kind;
  }
}

/** Whole seconds until the next 00:00 in Vietnam (design §8.5), rounded up. */
export function secondsToNextAiDay(now: Date): number {
  return Math.ceil((nextLocalMidnight(AI_DAY_ZONE, now).getTime() - now.getTime()) / 1000);
}

/** Token limit sent with a call: the setting, else Anthropic's required `max_tokens` from the model or the fallback (D25, D28). */
export function resolveMaxOutputTokens(
  provider: AiProviderName,
  setting: number | null,
  modelMax: number | null,
): number | null {
  if (setting !== null) return setting;
  if (provider === 'anthropic') return modelMax ?? ANTHROPIC_MAX_TOKENS_FALLBACK;
  return null;
}
