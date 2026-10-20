import { describe, expect, it } from 'vitest';
import {
  callOutcome,
  classify,
  decideExisting,
  decideRetry,
  drawJitterMs,
  resolveMaxOutputTokens,
  secondsToNextAiDay,
  type RunOutcome,
} from './run-rules.js';

const at = (iso: string) => new Date(iso);
const error = (kind: Extract<RunOutcome, { kind: 'error' }>['error'], retryAfterMs: number | null = null): RunOutcome => ({
  kind: 'error', error: kind, retryAfterMs,
});

describe('decideExisting', () => {
  const deadlineAt = at('2026-10-20T03:00:10.000Z');
  const row = (status: 'running' | 'succeeded' | 'permanent_failure', fingerprint = 'fp-a') => ({
    status, fingerprint, deadlineAt, attemptId: 'attempt-old',
  });

  it('no row → claim', () => {
    expect(decideExisting({ row: null, fingerprint: 'fp-a', now: deadlineAt })).toEqual({ action: 'claim' });
  });

  it('B6E13: succeeded, same fingerprint → replay', () => {
    expect(decideExisting({ row: row('succeeded'), fingerprint: 'fp-a', now: deadlineAt })).toEqual({ action: 'replay' });
  });

  it('a permanent_failure with the same fingerprint → replay', () => {
    expect(decideExisting({ row: row('permanent_failure'), fingerprint: 'fp-a', now: deadlineAt })).toEqual({ action: 'replay' });
  });

  it.each(['running', 'succeeded', 'permanent_failure'] as const)('B6E14: other fingerprint → input-mismatch (%s)', (status) => {
    const now = at('2026-10-20T04:00:00.000Z');
    expect(decideExisting({ row: row(status, 'fp-other'), fingerprint: 'fp-a', now })).toEqual({ action: 'input-mismatch' });
  });

  it('B6E15: running at deadline + 20 000 ms → in-progress', () => {
    const now = at('2026-10-20T03:00:30.000Z');
    expect(decideExisting({ row: row('running'), fingerprint: 'fp-a', now })).toEqual({ action: 'in-progress' });
  });

  it('B6E15: running before its deadline → in-progress', () => {
    const now = at('2026-10-20T03:00:01.000Z');
    expect(decideExisting({ row: row('running'), fingerprint: 'fp-a', now })).toEqual({ action: 'in-progress' });
  });

  it('B6E16/B6E79: deadline + 20 001 ms → reclaim with the old attempt', () => {
    const now = at('2026-10-20T03:00:30.001Z');
    expect(decideExisting({ row: row('running'), fingerprint: 'fp-a', now })).toEqual({
      action: 'reclaim', oldAttemptId: 'attempt-old',
    });
  });
});

describe('decideRetry', () => {
  it('B6E3: 503 after 300 ms, 9 700 left, jitter 500 → wait 500', () => {
    expect(decideRetry({ outcome: error('server'), attempt: 1, elapsedMs: 300, remainingMs: 9_700, jitterMs: 500 }))
      .toEqual({ retry: true, waitMs: 500 });
  });

  it('B6E4: attempt 2 → no', () => {
    expect(decideRetry({ outcome: error('server'), attempt: 2, elapsedMs: 300, remainingMs: 7_000, jitterMs: 500 }))
      .toEqual({ retry: false });
  });

  it('B6E5: an error after 2 500 ms → no', () => {
    expect(decideRetry({ outcome: error('server'), attempt: 1, elapsedMs: 2_500, remainingMs: 7_500, jitterMs: 500 }))
      .toEqual({ retry: false });
  });

  it('an error at exactly 2 000 ms → yes', () => {
    expect(decideRetry({ outcome: error('connection'), attempt: 1, elapsedMs: 2_000, remainingMs: 8_000, jitterMs: 500 }))
      .toEqual({ retry: true, waitMs: 500 });
  });

  it('B6E6: retry-after 1 000 with 9 800 left → wait 1 000', () => {
    expect(decideRetry({ outcome: error('rate_limited', 1_000), attempt: 1, elapsedMs: 200, remainingMs: 9_800, jitterMs: 500 }))
      .toEqual({ retry: true, waitMs: 1_000 });
  });

  it('B6E7: retry-after 9 000 → no', () => {
    expect(decideRetry({ outcome: error('rate_limited', 9_000), attempt: 1, elapsedMs: 200, remainingMs: 9_800, jitterMs: 500 }))
      .toEqual({ retry: false });
  });

  it('remaining − wait exactly 2 000 → yes', () => {
    expect(decideRetry({ outcome: error('rate_limited', 1_000), attempt: 1, elapsedMs: 200, remainingMs: 3_000, jitterMs: 500 }))
      .toEqual({ retry: true, waitMs: 1_000 });
  });

  it('remaining − wait 1 999 → no', () => {
    expect(decideRetry({ outcome: error('server'), attempt: 1, elapsedMs: 200, remainingMs: 2_499, jitterMs: 500 }))
      .toEqual({ retry: false });
  });

  it('B6E8: 1 500 left → no', () => {
    expect(decideRetry({ outcome: error('server'), attempt: 1, elapsedMs: 300, remainingMs: 1_500, jitterMs: 250 }))
      .toEqual({ retry: false });
  });

  it.each([
    ['timeout', error('timeout')],
    ['truncated', { kind: 'truncated' } as RunOutcome],
    ['stopped', { kind: 'stopped' } as RunOutcome],
    ['refused', { kind: 'refused' } as RunOutcome],
    ['auth', error('auth')],
    ['model_rejected', error('model_rejected')],
    ['provider_quota', error('provider_quota')],
    ['ok', { kind: 'ok' } as RunOutcome],
  ])('%s → no', (_name, outcome) => {
    expect(decideRetry({ outcome, attempt: 1, elapsedMs: 100, remainingMs: 9_900, jitterMs: 500 })).toEqual({ retry: false });
  });

  it('B6E3: drawJitterMs gives 250 for random 0 and 750 for random 0.9999', () => {
    expect(drawJitterMs(() => 0)).toBe(250);
    expect(drawJitterMs(() => 0.9999)).toBe(750);
  });

  it('drawJitterMs is an integer for any random value', () => {
    expect(Number.isInteger(drawJitterMs(() => 0.123456))).toBe(true);
  });
});

describe('classify (design §4.3, third table)', () => {
  it.each([
    ['timeout', error('timeout'), 'transient_failure', 'timeout', false],
    ['connection', error('connection'), 'transient_failure', 'connection', false],
    ['rate_limited', error('rate_limited', 1_000), 'transient_failure', 'rate-limited', false],
    ['server', error('server'), 'transient_failure', 'provider-error', false],
    ['invalid shape', { kind: 'invalid-shape' }, 'transient_failure', 'invalid-shape', false],
    ['truncated', { kind: 'truncated' }, 'transient_failure', 'truncated', false],
    ['stopped', { kind: 'stopped' }, 'transient_failure', 'invalid-shape', false],
    ['refused', { kind: 'refused' }, 'permanent_failure', 'refused', true],
    ['bad-input', { kind: 'bad-input' }, 'permanent_failure', 'bad-input', true],
    ['model_rejected', error('model_rejected'), 'permanent_failure', 'model-rejected', false],
    ['auth', error('auth'), 'permanent_failure', 'auth-failed', false],
    ['provider_quota', error('provider_quota'), 'unavailable', 'provider-quota', false],
  ] as const)('%s → %s / %s, store %s', (_name, outcome, status, reason, store) => {
    expect(classify(outcome)).toEqual({ status, reason, store });
  });
});

describe('callOutcome (plan choice 2)', () => {
  it('ok + shape ok → succeeded', () => {
    expect(callOutcome({ kind: 'ok' }, 'ok')).toBe('succeeded');
  });

  it('ok + shape invalid → invalid-shape', () => {
    expect(callOutcome({ kind: 'ok' }, 'invalid')).toBe('invalid-shape');
  });

  it.each([
    [{ kind: 'stopped' } as RunOutcome, 'stopped'],
    [{ kind: 'refused' } as RunOutcome, 'refused'],
    [{ kind: 'truncated' } as RunOutcome, 'truncated'],
    [error('rate_limited', 1_000), 'rate-limited'],
    [error('timeout'), 'timeout'],
    [error('connection'), 'connection'],
    [error('server'), 'provider-error'],
    [error('auth'), 'auth-failed'],
    [error('model_rejected'), 'model-rejected'],
    [error('provider_quota'), 'provider-quota'],
  ])('%o → %s', (outcome, expected) => {
    expect(callOutcome(outcome, 'ok')).toBe(expected);
  });
});

describe('resolveMaxOutputTokens', () => {
  it('setting 1 200 → 1 200', () => {
    expect(resolveMaxOutputTokens('anthropic', 1_200, 64_000)).toBe(1_200);
    expect(resolveMaxOutputTokens('openai', 1_200, null)).toBe(1_200);
  });

  it('anthropic, null, model 64 000 → 64 000', () => {
    expect(resolveMaxOutputTokens('anthropic', null, 64_000)).toBe(64_000);
  });

  it('D28: anthropic, null, unknown → 16 000', () => {
    expect(resolveMaxOutputTokens('anthropic', null, null)).toBe(16_000);
  });

  it('openai, null → null', () => {
    expect(resolveMaxOutputTokens('openai', null, 128_000)).toBeNull();
  });

  it('fake, null → null', () => {
    expect(resolveMaxOutputTokens('fake', null, 4_096)).toBeNull();
  });
});

describe('secondsToNextAiDay (Vietnam day)', () => {
  it('16:59:59 Z → 1', () => {
    expect(secondsToNextAiDay(at('2026-10-20T16:59:59.000Z'))).toBe(1);
  });

  it('17:00:00 Z → 86 400', () => {
    expect(secondsToNextAiDay(at('2026-10-20T17:00:00.000Z'))).toBe(86_400);
  });

  it('B6E69: 23:30 Z → 63 000', () => {
    expect(secondsToNextAiDay(at('2026-10-20T23:30:00.000Z'))).toBe(63_000);
  });

  it('rounds a part second up: 16:59:59.500 Z → 1', () => {
    expect(secondsToNextAiDay(at('2026-10-20T16:59:59.500Z'))).toBe(1);
  });
});
