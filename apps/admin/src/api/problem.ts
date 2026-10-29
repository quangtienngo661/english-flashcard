export type Problem = {
  type: string;
  slug: string;
  status: number;
  title: string;
  detail?: string;
  operation_id?: string;
  violations?: string[];
  /** Top-level extension member of some problems (e.g. `grant-not-allowed`): the API spreads extensions into the body. */
  reason?: string;
  /** Top-level extension member of `entry-in-use`: why the word cannot be deleted (a list of codes). */
  reasons?: string[];
};

export class ApiError extends Error {
  constructor(
    public readonly problem: Problem,
    public readonly retryAfterSeconds: number | null,
  ) {
    super(problem.title);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Network error', { cause });
    this.name = 'NetworkError';
  }
}

/**
 * Every problem `type` slug thrown in `apps/api/src` (grep `type: '` over ProblemDetailsException, plus the
 * body-parser mappings in `problem-details.filter.ts`), checked 14/10/2026, extended 27/10/2026 for the admin UI round (design §4.5) and 28/10/2026 with `run-active` / `run-not-active` (stopping and deleting an eval run). Each has a vi and en message.
 */
export const KNOWN_ERROR_SLUGS = [
  'account-deleting',
  'batch-filter-unavailable',
  'batch-not-revertable',
  'confirm-email-mismatch',
  'csrf-header-required',
  'email-already-verified',
  'email-taken',
  'entry-in-use',
  'expected-invalid',
  'export-too-large',
  'file-invalid',
  'file-too-large',
  'forbidden',
  'grant-not-active',
  'grant-not-allowed',
  'idempotency-key-abandoned',
  'invalid-credentials',
  'invalid-current-password',
  'invalid-otp',
  'invalid-token',
  'job-not-active',
  'last-admin',
  'level-source-required',
  'lock-rule',
  'mail-unavailable',
  'model-exists',
  'model-in-use',
  'model-not-found',
  'model-not-set',
  'model-not-supported',
  'not-found',
  'nothing-to-publish',
  'operation-settings-conflict',
  'password-change-required',
  'password-login-required',
  'payload-too-large',
  'profile-incomplete',
  'prompt-revision-conflict',
  'provider-not-configured',
  'provider-unavailable',
  'publish-incomplete',
  'rate-limited',
  'renewal-not-cancelled',
  'replacement-exists',
  'replacement-waiting',
  'report-not-open',
  'report-reason-exists',
  'resolve-status-not-allowed',
  'revision-rejected',
  'run-active',
  'run-not-active',
  'self-delete',
  'sense-entry-mismatch',
  'sense-exists',
  'sense-retired',
  'source-exists',
  'source-in-use',
  'source-incomplete',
  'source-protected',
  'staff-role-rule',
  'stale-revision',
  'too-many-examples',
  'topic-archived',
  'topic-exists',
  'unknown-topic',
  'unsupported-media-type',
  'validation-failed',
  'version-conflict',
  'word-form-exists',
] as const;

const KNOWN = new Set<string>(KNOWN_ERROR_SLUGS);

export function problemSlug(type: string): string {
  if (type === 'about:blank') return '';
  return type.split('/').filter(Boolean).pop() ?? '';
}

export async function toApiError(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await res.json();
    if (parsed !== null && typeof parsed === 'object') body = parsed as Record<string, unknown>;
  } catch {
    // not JSON (a proxy error page): fall back to status only
  }
  const type = typeof body.type === 'string' ? body.type : 'about:blank';
  const problem: Problem = {
    type,
    slug: problemSlug(type),
    status: typeof body.status === 'number' ? body.status : res.status,
    title: typeof body.title === 'string' ? body.title : res.statusText || `HTTP ${res.status}`,
  };
  if (typeof body.detail === 'string') problem.detail = body.detail;
  if (typeof body.operation_id === 'string') problem.operation_id = body.operation_id;
  if (Array.isArray(body.violations)) problem.violations = body.violations.filter((v): v is string => typeof v === 'string');
  if (typeof body.reason === 'string') problem.reason = body.reason;
  if (Array.isArray(body.reasons)) problem.reasons = body.reasons.filter((r): r is string => typeof r === 'string');
  const retry = Number.parseInt(res.headers.get('retry-after') ?? '', 10);
  return new ApiError(problem, Number.isFinite(retry) && retry >= 0 ? retry : null);
}

export function errorMessageKey(problem: Problem): string {
  if (KNOWN.has(problem.slug)) return `errors.${problem.slug}`;
  if (problem.status === 409 && problem.slug === '') return 'errors.inProgress';
  return 'errors.generic';
}
