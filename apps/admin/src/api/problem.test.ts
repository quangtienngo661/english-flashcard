import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { ApiError, errorMessageKey, KNOWN_ERROR_SLUGS, problemSlug, toApiError, type Problem } from './problem';

const problem = (over: Partial<Problem>): Problem => ({ type: 'about:blank', slug: '', status: 500, title: 't', ...over });

function problemResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/problem+json', ...headers } });
}

const lookup = (messages: Record<string, unknown>, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);

describe('problem mapping', () => {
  it('problemSlug: the last path segment; about:blank → empty', () => {
    expect(problemSlug('http://localhost:3000/problems/staff-role-rule')).toBe('staff-role-rule');
    expect(problemSlug('about:blank')).toBe('');
  });

  it('B25#19: unknown type → errors.generic and the operation_id is kept', async () => {
    const err = await toApiError(
      problemResponse(422, { type: 'https://api.test/problems/brand-new', status: 422, title: 'x', operation_id: 'op-123' }),
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(errorMessageKey(err.problem)).toBe('errors.generic');
    expect(err.problem.operation_id).toBe('op-123');
  });

  it('409 about:blank with Retry-After: 4 → errors.inProgress, retryAfterSeconds 4', async () => {
    const err = await toApiError(problemResponse(409, { type: 'about:blank', status: 409, title: 'Conflict' }, { 'retry-after': '4' }));
    expect(errorMessageKey(err.problem)).toBe('errors.inProgress');
    expect(err.retryAfterSeconds).toBe(4);
  });

  it('a known slug maps to errors.<slug> and violations are kept', async () => {
    const err = await toApiError(
      problemResponse(400, { type: 'http://x/problems/validation-failed', status: 400, title: 'v', violations: ['too short'] }),
    );
    expect(errorMessageKey(err.problem)).toBe('errors.validation-failed');
    expect(err.problem.violations).toEqual(['too short']);
    expect(err.retryAfterSeconds).toBeNull();
  });

  it('a top-level reason string is kept; a non-string reason is dropped', async () => {
    const kept = await toApiError(
      problemResponse(409, { type: 'http://x/problems/grant-not-allowed', status: 409, title: 'g', reason: 'self-grant' }),
    );
    expect(kept.problem.reason).toBe('self-grant');
    const dropped = await toApiError(problemResponse(409, { type: 'http://x/problems/grant-not-allowed', status: 409, title: 'g', reason: 7 }));
    expect(dropped.problem.reason).toBeUndefined();
  });

  it('entry-in-use: the top-level reasons list is kept (strings only); a non-list is dropped; the slug has its own message', async () => {
    const kept = await toApiError(problemResponse(409, {
      type: 'http://x/problems/entry-in-use', status: 409, title: 'e', reasons: ['published-sense', 7, 'learner-data'],
    }));
    expect(kept.problem.slug).toBe('entry-in-use');
    expect(kept.problem.reasons).toEqual(['published-sense', 'learner-data']);
    expect(errorMessageKey(kept.problem)).toBe('errors.entry-in-use');
    const dropped = await toApiError(problemResponse(409, { type: 'http://x/problems/entry-in-use', status: 409, title: 'e', reasons: 'published-sense' }));
    expect(dropped.problem.reasons).toBeUndefined();
    expect(KNOWN_ERROR_SLUGS).toContain('entry-in-use');
  });

  it('eval-set-incomplete: missing_expected (strings only) and no_held_out (a boolean) are kept; other shapes are dropped', async () => {
    const kept = await toApiError(problemResponse(422, {
      type: 'http://x/problems/eval-set-incomplete', status: 422, title: 'e', missing_expected: ['e1', 4, 'e2'], no_held_out: true,
    }));
    expect(kept.problem.slug).toBe('eval-set-incomplete');
    expect(kept.problem.missing_expected).toEqual(['e1', 'e2']);
    expect(kept.problem.no_held_out).toBe(true);
    expect(errorMessageKey(kept.problem)).toBe('errors.eval-set-incomplete');
    const dropped = await toApiError(problemResponse(422, {
      type: 'http://x/problems/eval-set-incomplete', status: 422, title: 'e', missing_expected: 'e1', no_held_out: 'yes',
    }));
    expect(dropped.problem.missing_expected).toBeUndefined();
    expect(dropped.problem.no_held_out).toBeUndefined();
  });

  it('the golden-set slugs each have a message of their own', () => {
    for (const slug of ['eval-set-conflict', 'eval-set-incomplete', 'eval-set-mismatch', 'example-held-out', 'example-not-held-out', 'expected-invalid']) {
      expect(errorMessageKey(problem({ slug, status: 409 }))).toBe(`errors.${slug}`);
    }
  });

  it('the config lifecycle slugs each have a message of their own', () => {
    for (const slug of [
      'run-is-evidence', 'draft-exists', 'draft-busy', 'draft-version-conflict', 'eval-required', 'baseline-required', 'publish-stale',
      'publish-warnings', 'no-previous', 'few-shot-invalid',
    ]) {
      expect(KNOWN_ERROR_SLUGS).toContain(slug);
      expect(errorMessageKey(problem({ slug, status: 409 }))).toBe(`errors.${slug}`);
    }
  });

  it('the judge and cap slugs each have a message of their own', () => {
    for (const slug of ['judge-provider', 'judge-revision-conflict', 'judge-pass-running', 'admin-usd-cap', 'model-price-missing']) {
      expect(KNOWN_ERROR_SLUGS).toContain(slug);
      expect(errorMessageKey(problem({ slug, status: 409 }))).toBe(`errors.${slug}`);
    }
  });

  it('the real-question slugs (nhóm B M4) each have a message of their own, and the reason of source-not-eligible is kept', async () => {
    for (const slug of ['nothing-to-judge', 'source-not-eligible']) {
      expect(KNOWN_ERROR_SLUGS).toContain(slug);
      expect(errorMessageKey(problem({ slug, status: 409 }))).toBe(`errors.${slug}`);
    }
    const refused = await toApiError(problemResponse(409, { type: 'http://x/problems/source-not-eligible', status: 409, title: 's', reason: 'private-word' }));
    expect(refused.problem.reason).toBe('private-word');
  });

  it('few-shot-invalid: the examples that broke the rules are kept with their position and problems; other shapes are dropped', async () => {
    const kept = await toApiError(problemResponse(422, {
      type: 'http://x/problems/few-shot-invalid', status: 422, title: 'f',
      examples: [{ index: 1, problems: ['not-a-form', 7] }, { index: 'x', problems: [] }, { problems: ['p'] }, 'bad'],
    }));
    expect(kept.problem.slug).toBe('few-shot-invalid');
    expect(kept.problem.examples).toEqual([{ index: 1, problems: ['not-a-form'] }]);
    const dropped = await toApiError(problemResponse(422, { type: 'http://x/problems/few-shot-invalid', status: 422, title: 'f', examples: 'nope' }));
    expect(dropped.problem.examples).toBeUndefined();
  });

  it('a non-problem body still becomes an ApiError with the status and the generic message', async () => {
    const err = await toApiError(new Response('<html>bad gateway</html>', { status: 502 }));
    expect(err.problem.status).toBe(502);
    expect(errorMessageKey(err.problem)).toBe('errors.generic');
  });

  it('errorMessageKey: 409 with a known slug is not "in progress"', () => {
    expect(errorMessageKey(problem({ status: 409, slug: 'idempotency-key-abandoned', type: 'x/idempotency-key-abandoned' }))).toBe(
      'errors.idempotency-key-abandoned',
    );
  });

  it('messages: every KNOWN_ERROR_SLUGS key exists in vi.json and en.json', () => {
    const keys = [...KNOWN_ERROR_SLUGS.map((s) => `errors.${s}`), 'errors.generic', 'errors.inProgress', 'errors.noAccess'];
    for (const [name, messages] of [['vi', vi], ['en', en]] as const) {
      const missing = keys.filter((k) => typeof lookup(messages, k) !== 'string' || lookup(messages, k) === '');
      expect(missing, `${name}.json is missing`).toEqual([]);
    }
  });

  it('KNOWN_ERROR_SLUGS covers the 23 slugs of spec §8', () => {
    for (const slug of [
      'invalid-credentials', 'email-taken', 'invalid-otp', 'email-already-verified', 'staff-role-rule', 'not-found',
      'validation-failed', 'rate-limited', 'file-invalid', 'file-too-large', 'payload-too-large', 'level-source-required',
      'source-incomplete', 'source-exists', 'nothing-to-publish', 'batch-not-revertable', 'batch-filter-unavailable',
      'export-too-large', 'idempotency-key-abandoned', 'csrf-header-required', 'mail-unavailable', 'invalid-token', 'forbidden',
    ]) {
      expect(KNOWN_ERROR_SLUGS).toContain(slug);
    }
  });

  it('KNOWN_ERROR_SLUGS covers every slug of design §4.5', () => {
    for (const slug of [
      'version-conflict', 'lock-rule', 'report-not-open', 'resolve-status-not-allowed', 'report-reason-exists', 'grant-not-allowed',
      'grant-not-active', 'model-exists', 'model-in-use', 'model-not-found', 'model-not-supported', 'provider-not-configured',
      'provider-unavailable', 'model-not-set', 'operation-settings-conflict', 'prompt-revision-conflict', 'word-form-exists',
      'stale-revision', 'publish-incomplete', 'sense-exists', 'replacement-exists', 'replacement-waiting', 'sense-retired',
      'sense-entry-mismatch', 'revision-rejected', 'unknown-topic', 'topic-archived', 'too-many-examples', 'topic-exists',
    ]) {
      expect(KNOWN_ERROR_SLUGS).toContain(slug);
    }
  });

  it('fixed strings from the plan', () => {
    expect(lookup(vi, 'errors.noAccess')).toBe('Bạn không có quyền truy cập trang web này');
    expect(lookup(en, 'errors.noAccess')).toBe('You do not have access to this site');
  });
});
