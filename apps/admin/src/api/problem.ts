export type Problem = {
  type: string;
  slug: string;
  status: number;
  title: string;
  detail?: string;
  operation_id?: string;
  violations?: string[];
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
 * body-parser mappings in `problem-details.filter.ts`), checked 14/10/2026. Each has a vi and en message.
 */
export const KNOWN_ERROR_SLUGS = [
  'batch-filter-unavailable',
  'batch-not-revertable',
  'csrf-header-required',
  'email-already-verified',
  'email-taken',
  'export-too-large',
  'file-invalid',
  'file-too-large',
  'forbidden',
  'idempotency-key-abandoned',
  'invalid-credentials',
  'invalid-current-password',
  'invalid-otp',
  'invalid-token',
  'level-source-required',
  'mail-unavailable',
  'not-found',
  'nothing-to-publish',
  'password-change-required',
  'payload-too-large',
  'profile-incomplete',
  'rate-limited',
  'source-exists',
  'source-incomplete',
  'staff-role-rule',
  'topic-exists',
  'unsupported-media-type',
  'validation-failed',
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
  const retry = Number.parseInt(res.headers.get('retry-after') ?? '', 10);
  return new ApiError(problem, Number.isFinite(retry) && retry >= 0 ? retry : null);
}

export function errorMessageKey(problem: Problem): string {
  if (KNOWN.has(problem.slug)) return `errors.${problem.slug}`;
  if (problem.status === 409 && problem.slug === '') return 'errors.inProgress';
  return 'errors.generic';
}
