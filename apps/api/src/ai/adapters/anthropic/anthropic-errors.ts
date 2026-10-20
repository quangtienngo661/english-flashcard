import { APIConnectionError, APIConnectionTimeoutError, APIError, APIUserAbortError } from '@anthropic-ai/sdk';
import type { AdapterError, AdapterOutcome } from '../ai-adapter.js';

/** Owner-set spend limits (verified on platform.claude.com, plan choice 4). */
const SPEND_LIMIT_PREFIX = 'You have reached your specified';

/** The parsed error response `{ type: 'error', error: { type, message, details? }, request_id }`; anything else (HTML) → nulls. */
type ErrorBody = { error?: { type?: unknown; message?: unknown; details?: { error_code?: unknown } | null } };

function field(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function retryAfterMs(headers: Headers | undefined): number | null {
  const seconds = Number(headers?.get('retry-after') ?? Number.NaN);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

function errorKind(status: number, message: string | null, errorCode: string | null): AdapterError {
  if (status === 400 && message?.startsWith(SPEND_LIMIT_PREFIX)) return 'provider_quota';
  if (status === 402) return 'provider_quota';
  if (status === 429) return errorCode === 'enforced_spend_limit_reached' ? 'provider_quota' : 'rate_limited';
  if (status === 401 || status === 403) return 'auth';
  if (status >= 500) return 'server';
  if (status >= 400) return 'model_rejected';
  return 'connection';
}

/** Design §4.3 table 2 with plan choice 4. Never throws; anything that is not a recognised API error is a `connection` failure. */
export function mapAnthropicError(err: unknown): AdapterOutcome {
  const base = { httpStatus: null, providerErrorCode: null, retryAfterMs: null, providerRequestId: null };
  if (err instanceof APIUserAbortError || err instanceof APIConnectionTimeoutError) {
    return { kind: 'error', error: 'timeout', ...base };
  }
  if (!(err instanceof APIError) || err instanceof APIConnectionError || err.status === undefined) {
    return { kind: 'error', error: 'connection', ...base };
  }
  const body = (typeof err.error === 'object' && err.error !== null ? err.error : {}) as ErrorBody;
  const type = field(body.error?.type);
  const errorCode = field(body.error?.details?.error_code);
  const error = errorKind(err.status, field(body.error?.message), errorCode);
  return {
    kind: 'error',
    error,
    httpStatus: err.status,
    providerErrorCode: errorCode ?? type,
    retryAfterMs: error === 'rate_limited' ? retryAfterMs(err.headers) : null,
    providerRequestId: err.requestID ?? null,
  };
}
