// Copied from apps/admin/src/api/problem.ts.
export type Problem = {
  type: string;
  slug: string;
  status: number;
  title: string;
  detail?: string;
  operation_id?: string;
  violations?: string[];
  /** The other members of the problem (`resets_at`, `reason`, `result`…), as the API sent them. */
  extensions?: Record<string, unknown>;
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
 * The problem `type` slugs a learner can meet (grep `type: '` over apps/api/src, checked 22/10/2026; admin-only slugs
 * left out). Each has a vi and en message under `App.errors` (Task 5); the rest fall back to `generic`.
 */
export const KNOWN_ERROR_SLUGS = [
  'account-locked',
  'age-below-minimum',
  'ai-in-progress',
  'ai-lookup-failed',
  'ai-quota-insufficient',
  'ai-unavailable',
  'csrf-header-required',
  'email-already-verified',
  'email-taken',
  'entitlement-required',
  'forbidden',
  'group-full',
  'group-limit-reached',
  'group-name-taken',
  'idempotency-key-abandoned',
  'invalid-credentials',
  'invalid-current-password',
  'invalid-otp',
  'invalid-token',
  'mail-unavailable',
  'not-found',
  'password-change-required',
  'payload-too-large',
  'practice-no-words',
  'profile-incomplete',
  'quota-exhausted',
  'rate-limited',
  'report-exists',
  'report-not-available',
  'sentence-limit-reached',
  'session-closed',
  'session-not-waiting',
  'share-consent-required',
  'unsupported-media-type',
  'validation-failed',
  'version-conflict',
] as const;

const KNOWN = new Set<string>(KNOWN_ERROR_SLUGS);
const STANDARD_MEMBERS = new Set(['type', 'status', 'title', 'detail', 'instance', 'operation_id', 'violations']);

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
  const extensions = Object.fromEntries(Object.entries(body).filter(([name]) => !STANDARD_MEMBERS.has(name)));
  if (Object.keys(extensions).length > 0) problem.extensions = extensions;
  const retry = Number.parseInt(res.headers.get('retry-after') ?? '', 10);
  return new ApiError(problem, Number.isFinite(retry) && retry >= 0 ? retry : null);
}

export function errorMessageKey(problem: Problem): string {
  if (KNOWN.has(problem.slug)) return `errors.${problem.slug}`;
  if (problem.status === 409 && problem.slug === '') return 'errors.inProgress';
  return 'errors.generic';
}
