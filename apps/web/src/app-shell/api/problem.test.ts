// @vitest-environment jsdom
// Copied from apps/admin/src/api/problem.test.ts.
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import vi from '../../../messages/vi.json';
import { ApiError, errorMessageKey, KNOWN_ERROR_SLUGS, problemSlug, toApiError, type Problem } from './problem';

const problem = (over: Partial<Problem>): Problem => ({ type: 'about:blank', slug: '', status: 500, title: 't', ...over });

function problemResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/problem+json', ...headers } });
}

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

  it('extension members (resets_at, reason, result) are kept; the standard members are not repeated there', async () => {
    const err = await toApiError(problemResponse(403, {
      type: 'http://x/problems/quota-exhausted', status: 403, title: 'q', operation_id: 'op-1', resets_at: '2026-10-24T17:00:00.000Z',
    }));
    expect(err.problem.extensions).toEqual({ resets_at: '2026-10-24T17:00:00.000Z' });
    const conflict = await toApiError(problemResponse(409, { type: 'http://x/problems/practice-no-words', status: 409, title: 'n', reason: 'group-empty' }));
    expect(conflict.problem.extensions).toEqual({ reason: 'group-empty' });
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

  it('messages: every KNOWN_ERROR_SLUGS key has a vi and an en text under App.errors', () => {
    const keys = [...KNOWN_ERROR_SLUGS, 'generic', 'inProgress'];
    for (const [name, messages] of [['vi', vi.App.errors], ['en', en.App.errors]] as const) {
      const table = messages as Record<string, string>;
      expect(keys.filter((k) => !table[k]), `${name}.json is missing`).toEqual([]);
    }
  });

  it('KNOWN_ERROR_SLUGS covers the slugs the learner screens handle (design §9)', () => {
    for (const slug of [
      'account-locked', 'age-below-minimum', 'email-taken', 'invalid-credentials', 'invalid-otp', 'profile-incomplete', 'rate-limited',
      'idempotency-key-abandoned', 'version-conflict', 'group-name-taken', 'group-limit-reached', 'quota-exhausted',
      'ai-quota-insufficient', 'ai-unavailable', 'ai-in-progress', 'ai-lookup-failed', 'session-closed', 'entitlement-required',
    ]) {
      expect(KNOWN_ERROR_SLUGS).toContain(slug);
    }
  });
});
