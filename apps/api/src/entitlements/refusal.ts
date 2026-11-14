import { ProblemDetailsException } from '../common/problem-details/problem-details.exception.js';

/** Why Entitlements refused (design §12.5); callers turn it into HTTP only through `refusalProblem`. */
export type Refusal =
  | { reason: 'plan-required' }
  | { reason: 'quota-exhausted'; resets_at: string | null }
  | { reason: 'ai-unavailable'; retry_after_seconds: number | null };

export function refusalProblem(refusal: Refusal): ProblemDetailsException {
  switch (refusal.reason) {
    case 'plan-required':
      return new ProblemDetailsException({ status: 403, title: 'Entitlement required', type: 'entitlement-required' });
    case 'quota-exhausted':
      return new ProblemDetailsException({
        status: 403, title: 'Quota exhausted', type: 'quota-exhausted', extensions: { resets_at: refusal.resets_at },
      });
    case 'ai-unavailable':
      return new ProblemDetailsException({
        status: 503, title: 'AI unavailable', type: 'ai-unavailable', retryAfterSeconds: refusal.retry_after_seconds ?? undefined,
      });
  }
}
