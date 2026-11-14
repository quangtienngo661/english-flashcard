import { APIConnectionError, APIConnectionTimeoutError, APIError, APIUserAbortError } from 'openai';
import type { AdapterError, AdapterOutcome } from '../ai-adapter.js';

/** Design §4.3: OpenAI's out-of-credit codes (plan choice 4). */
const QUOTA_CODES = new Set([
  'credit_balance_exhausted', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded',
  'organization_usage_limit_exceeded',
]);

/** `retry-after-ms`, else `retry-after` in seconds; numeric values only (an HTTP date → null). */
function retryAfterMs(headers: Headers | undefined): number | null {
  const ms = Number(headers?.get('retry-after-ms') ?? Number.NaN);
  if (Number.isFinite(ms) && ms >= 0) return ms;
  const seconds = Number(headers?.get('retry-after') ?? Number.NaN);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

function errorKind(err: APIError, status: number): AdapterError {
  if (status === 429) return QUOTA_CODES.has(err.code ?? '') || err.type === 'insufficient_quota' ? 'provider_quota' : 'rate_limited';
  if (status === 401 || status === 403) return 'auth';
  if (status >= 500) return 'server';
  if (status >= 400) return 'model_rejected';
  return 'connection';
}

/** Design §4.3 table 1. Never throws; anything that is not a recognised API error is a `connection` failure. */
export function mapOpenAiError(err: unknown): AdapterOutcome {
  const base = { httpStatus: null, providerErrorCode: null, retryAfterMs: null, providerRequestId: null };
  if (err instanceof APIUserAbortError || err instanceof APIConnectionTimeoutError) {
    return { kind: 'error', error: 'timeout', ...base };
  }
  if (!(err instanceof APIError) || err instanceof APIConnectionError || err.status === undefined) {
    return { kind: 'error', error: 'connection', ...base };
  }
  const error = errorKind(err, err.status);
  return {
    kind: 'error',
    error,
    httpStatus: err.status,
    providerErrorCode: err.code ?? err.type ?? null,
    retryAfterMs: error === 'rate_limited' ? retryAfterMs(err.headers) : null,
    providerRequestId: err.requestID ?? null,
  };
}
