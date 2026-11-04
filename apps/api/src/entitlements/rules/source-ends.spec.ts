import { describe, expect, it } from 'vitest';
import type { SubscriptionStatus } from '../entitlements.types.js';
import type { GrantSource, PrepaidSource, SubscriptionSource } from './plan-rules.js';
import { aiSourceEnds, lastAiSourceEnd, nextEndedAt } from './source-ends.js';

const at = (iso: string) => new Date(iso);
const GRACE_DAYS = 7;

function sub(over: Partial<SubscriptionSource> = {}): SubscriptionSource {
  return {
    id: 'sub-1', provider: 'fake', externalSubscriptionId: 'ext-1', status: 'active', trialDenied: false, cancelAtPeriodEnd: false,
    trialEndsAt: null, currentPeriodStart: at('2026-10-20T03:00:00Z'), currentPeriodEnd: at('2026-11-20T03:00:00Z'), graceEndsAt: null,
    quotaAnchorAt: at('2026-10-20T03:00:00Z'), interval: 'month', pendingInterval: null, endedAt: null, ...over,
  };
}

function grant(over: Partial<GrantSource> = {}): GrantSource {
  return {
    id: 'grant-1', kind: 'plan', limits: null, startsAt: at('2026-11-01T00:00:00Z'), endsAt: at('2026-12-31T00:00:00Z'),
    revokedAt: null, createdAt: at('2026-11-01T00:00:00Z'), ...over,
  };
}

function period(over: Partial<PrepaidSource> = {}): PrepaidSource {
  return { id: 'period-1', startsAt: at('2026-11-01T00:00:00Z'), endsAt: at('2026-12-01T00:00:00Z'), revokedAt: null, ...over };
}

function ends(input: {
  subscriptions?: SubscriptionSource[]; grants?: GrantSource[];
  ended?: { subscriptions?: SubscriptionSource[]; grants?: GrantSource[]; prepaidPeriods?: PrepaidSource[] }; now: string;
}) {
  return aiSourceEnds({
    subscriptions: input.subscriptions ?? [], grants: input.grants ?? [],
    ended: {
      subscriptions: input.ended?.subscriptions ?? [], grants: input.ended?.grants ?? [], prepaidPeriods: input.ended?.prepaidPeriods ?? [],
    },
    graceDays: GRACE_DAYS, now: at(input.now),
  });
}

describe('aiSourceEnds — subscriptions stored as trialing / active / grace (design 6.3.2, by the time rules of effectiveStatus)', () => {
  it('an active subscription inside its period has not ended', () => {
    expect(ends({ subscriptions: [sub()], now: '2026-11-10T00:00:00Z' })).toEqual([]);
  });

  it('active, cancelled at period end, period over: it ended at the period end', () => {
    expect(ends({ subscriptions: [sub({ cancelAtPeriodEnd: true })], now: '2026-11-25T00:00:00Z' }))
      .toEqual([{ kind: 'subscription', id: 'sub-1', endedAt: at('2026-11-20T03:00:00Z') }]);
  });

  it('active, not cancelled, period over: still Pro while overdue; it ended at period end + grace days (when it becomes on_hold)', () => {
    expect(ends({ subscriptions: [sub()], now: '2026-11-22T00:00:00Z' })).toEqual([]);
    expect(ends({ subscriptions: [sub()], now: '2026-11-28T00:00:00Z' }))
      .toEqual([{ kind: 'subscription', id: 'sub-1', endedAt: at('2026-11-27T03:00:00Z') }]);
  });

  it('a trial that is not denied ends at trial_ends_at (or the period end when there is none)', () => {
    const trial = sub({ status: 'trialing', trialEndsAt: at('2026-11-17T00:00:00Z'), cancelAtPeriodEnd: true });
    expect(ends({ subscriptions: [trial], now: '2026-11-18T00:00:00Z' })).toEqual([{ kind: 'subscription', id: 'sub-1', endedAt: at('2026-11-17T00:00:00Z') }]);
    const noEnd = sub({ status: 'trialing', trialEndsAt: null, cancelAtPeriodEnd: true });
    expect(ends({ subscriptions: [noEnd], now: '2026-11-21T00:00:00Z' })).toEqual([{ kind: 'subscription', id: 'sub-1', endedAt: at('2026-11-20T03:00:00Z') }]);
  });

  it('LA3E15: a denied trial is not a source, whatever happened to it', () => {
    const denied = sub({ status: 'trialing', trialDenied: true, trialEndsAt: at('2026-11-17T00:00:00Z'), cancelAtPeriodEnd: true });
    expect(ends({ subscriptions: [denied], now: '2026-11-25T00:00:00Z' })).toEqual([]);
  });

  it('grace: it ended at grace_ends_at, or period end + grace days when the row has none', () => {
    const withEnd = sub({ status: 'grace', graceEndsAt: at('2026-11-23T00:00:00Z') });
    expect(ends({ subscriptions: [withEnd], now: '2026-11-24T00:00:00Z' })).toEqual([{ kind: 'subscription', id: 'sub-1', endedAt: at('2026-11-23T00:00:00Z') }]);
    expect(ends({ subscriptions: [withEnd], now: '2026-11-22T00:00:00Z' })).toEqual([]);
    const without = sub({ status: 'grace', graceEndsAt: null });
    expect(ends({ subscriptions: [without], now: '2026-11-28T00:00:00Z' })).toEqual([{ kind: 'subscription', id: 'sub-1', endedAt: at('2026-11-27T03:00:00Z') }]);
  });
});

describe('aiSourceEnds — subscriptions stored as on_hold / expired / revoked read the ended_at column', () => {
  it.each(['on_hold', 'expired', 'revoked'] as SubscriptionStatus[])('%s with ended_at → that moment', (status) => {
    const row = sub({ status, endedAt: at('2026-11-12T09:00:00Z') });
    expect(ends({ ended: { subscriptions: [row] }, now: '2026-11-25T00:00:00Z' })).toEqual([{ kind: 'subscription', id: 'sub-1', endedAt: at('2026-11-12T09:00:00Z') }]);
  });

  it('a row with no ended_at (older than the column) is not counted', () => {
    expect(ends({ ended: { subscriptions: [sub({ status: 'expired', endedAt: null })] }, now: '2026-11-25T00:00:00Z' })).toEqual([]);
  });

  it('LA3E15: a denied trial that ended on its own is not counted, a denied-trial row that went on to be paid is', () => {
    const trialEnd = at('2026-11-17T00:00:00Z');
    const neverPaid = sub({ status: 'expired', trialDenied: true, trialEndsAt: trialEnd, endedAt: trialEnd });
    const paidAfter = sub({ id: 'sub-2', status: 'expired', trialDenied: true, trialEndsAt: trialEnd, endedAt: at('2026-12-02T00:00:00Z') });
    expect(ends({ ended: { subscriptions: [neverPaid, paidAfter] }, now: '2026-12-05T00:00:00Z' })).toEqual([{ kind: 'subscription', id: 'sub-2', endedAt: at('2026-12-02T00:00:00Z') }]);
  });
});

describe('aiSourceEnds — grants', () => {
  it('LA3#7: a plan grant revoked at 12/11 09:00 ended then', () => {
    const revoked = grant({ revokedAt: at('2026-11-12T09:00:00Z') });
    expect(ends({ ended: { grants: [revoked] }, now: '2026-11-25T00:00:00Z' })).toEqual([{ kind: 'grant_plan', id: 'grant-1', endedAt: at('2026-11-12T09:00:00Z') }]);
  });

  it('a plan grant that ran out ended at ends_at; one that is still running has not ended', () => {
    const over = grant({ endsAt: at('2026-11-20T03:00:00Z') });
    expect(ends({ ended: { grants: [over] }, now: '2026-11-25T00:00:00Z' })).toEqual([{ kind: 'grant_plan', id: 'grant-1', endedAt: at('2026-11-20T03:00:00Z') }]);
    expect(ends({ grants: [grant()], now: '2026-11-25T00:00:00Z' })).toEqual([]);
  });

  it('LA3E16: a plan grant revoked before it started was never a source', () => {
    const never = grant({ startsAt: at('2026-11-20T00:00:00Z'), revokedAt: at('2026-11-10T00:00:00Z') });
    expect(ends({ ended: { grants: [never] }, now: '2026-11-25T00:00:00Z' })).toEqual([]);
  });

  it('LA3#9: a limits grant with AI above 0 that expired on 20/11 is a source ending then; one without AI, or with AI at 0, is not', () => {
    const withAi = grant({ id: 'g-ai', kind: 'limits', limits: { ai_practice_per_cycle: 50 }, endsAt: at('2026-11-20T03:00:00Z') });
    const lookupOnly = grant({ id: 'g-lookup', kind: 'limits', limits: { ai_lookup_per_cycle: 5 }, endsAt: at('2026-11-21T03:00:00Z') });
    const sessionsOnly = grant({ id: 'g-sessions', kind: 'limits', limits: { practice_sessions_per_day: 9 }, endsAt: at('2026-11-20T03:00:00Z') });
    const zero = grant({ id: 'g-zero', kind: 'limits', limits: { ai_practice_per_cycle: 0 }, endsAt: at('2026-11-20T03:00:00Z') });
    expect(ends({ ended: { grants: [withAi, lookupOnly, sessionsOnly, zero] }, now: '2026-11-25T00:00:00Z' })).toEqual([
      { kind: 'grant_limits', id: 'g-ai', endedAt: at('2026-11-20T03:00:00Z') },
      { kind: 'grant_limits', id: 'g-lookup', endedAt: at('2026-11-21T03:00:00Z') },
    ]);
  });
});

describe('aiSourceEnds — prepaid periods (launch prep B design 3.13, LB1A8)', () => {
  it('LB1A8: the last period ran out at 06/12 00:00 → one end of kind prepaid_period at that moment, so the uses of 01 to 06/12 are not Free uses', () => {
    const last = period({ startsAt: at('2026-11-06T00:00:00Z'), endsAt: at('2026-12-06T00:00:00Z') });
    expect(ends({ ended: { prepaidPeriods: [last] }, now: '2026-12-10T00:00:00Z' }))
      .toEqual([{ kind: 'prepaid_period', id: 'period-1', endedAt: at('2026-12-06T00:00:00Z') }]);
  });

  it('a period revoked in the middle (a refund) ended at revoked_at, not at ends_at', () => {
    const refunded = period({ revokedAt: at('2026-11-12T09:00:00Z') });
    expect(ends({ ended: { prepaidPeriods: [refunded] }, now: '2026-11-25T00:00:00Z' }))
      .toEqual([{ kind: 'prepaid_period', id: 'period-1', endedAt: at('2026-11-12T09:00:00Z') }]);
  });

  it('a period revoked before it started never gave Pro: no end', () => {
    const never = period({ startsAt: at('2026-11-20T00:00:00Z'), revokedAt: at('2026-11-10T00:00:00Z') });
    expect(ends({ ended: { prepaidPeriods: [never] }, now: '2026-11-25T00:00:00Z' })).toEqual([]);
  });

  it('a period revoked at the very moment it would have started never gave Pro either', () => {
    const never = period({ startsAt: at('2026-11-20T00:00:00Z'), revokedAt: at('2026-11-20T00:00:00Z') });
    expect(ends({ ended: { prepaidPeriods: [never] }, now: '2026-11-25T00:00:00Z' })).toEqual([]);
  });

  it('a period revoked after it had run out ended at ends_at (the earlier of the two)', () => {
    const late = period({ endsAt: at('2026-11-20T03:00:00Z'), revokedAt: at('2026-11-22T00:00:00Z') });
    expect(ends({ ended: { prepaidPeriods: [late] }, now: '2026-11-25T00:00:00Z' }))
      .toEqual([{ kind: 'prepaid_period', id: 'period-1', endedAt: at('2026-11-20T03:00:00Z') }]);
  });

  it('with no ended period there is no end: a running period and one that starts later stay in `prepaidPeriods` of the loader, not in `ended`', () => {
    expect(ends({ now: '2026-11-25T00:00:00Z' })).toEqual([]);
  });

  it('two periods that ran out give two ends, after the ends of the grants and subscriptions', () => {
    const first = period({ id: 'p1', startsAt: at('2026-10-01T00:00:00Z'), endsAt: at('2026-11-01T00:00:00Z') });
    const second = period({ id: 'p2', startsAt: at('2026-11-01T00:00:00Z'), endsAt: at('2026-11-20T03:00:00Z') });
    const over = grant({ id: 'g1', endsAt: at('2026-11-10T00:00:00Z') });
    expect(ends({ ended: { prepaidPeriods: [first, second], grants: [over] }, now: '2026-11-25T00:00:00Z' })).toEqual([
      { kind: 'grant_plan', id: 'g1', endedAt: at('2026-11-10T00:00:00Z') },
      { kind: 'prepaid_period', id: 'p1', endedAt: at('2026-11-01T00:00:00Z') },
      { kind: 'prepaid_period', id: 'p2', endedAt: at('2026-11-20T03:00:00Z') },
    ]);
  });
});

describe('lastAiSourceEnd', () => {
  const since = at('2026-10-31T17:00:00Z');
  const now = at('2026-11-25T00:00:00Z');
  const end = (iso: string, id = iso) => ({ kind: 'subscription' as const, id, endedAt: at(iso) });

  it('LA3E17: with two sources ending in the month, the later one', () => {
    expect(lastAiSourceEnd([end('2026-11-10T00:00:00Z'), end('2026-11-20T03:00:00Z')], since, now)).toEqual(at('2026-11-20T03:00:00Z'));
  });

  it('LA3E18: an end before the month began does not count; none at all gives null', () => {
    expect(lastAiSourceEnd([end('2026-10-25T00:00:00Z')], since, now)).toBeNull();
    expect(lastAiSourceEnd([], since, now)).toBeNull();
  });

  it('the bounds are inclusive and an end in the future does not count', () => {
    expect(lastAiSourceEnd([end('2026-10-31T17:00:00Z')], since, now)).toEqual(since);
    expect(lastAiSourceEnd([end('2026-11-25T00:00:00Z')], since, now)).toEqual(now);
    expect(lastAiSourceEnd([end('2026-11-25T00:00:01Z')], since, now)).toBeNull();
  });
});

describe('nextEndedAt — the value of ended_at for every write of a subscription status (design 6.3.3)', () => {
  const base = (over: Partial<Parameters<typeof nextEndedAt>[0]> = {}) => ({
    status: 'active' as SubscriptionStatus, endedAt: null, trialEndsAt: null, currentPeriodEnd: at('2026-11-20T03:00:00Z'), graceEndsAt: null,
    cancelAtPeriodEnd: false, ...over,
  });

  it('LA3E9: cancelled at period end 20/11 10:00 (Vietnam), the job writes expired at 10:07 → the period end', () => {
    expect(nextEndedAt(base({ cancelAtPeriodEnd: true }), 'expired', at('2026-11-20T03:07:00Z'), GRACE_DAYS)).toEqual(at('2026-11-20T03:00:00Z'));
  });

  it('LA3E10: a refund event dated 15/11 with the period running to 30/11 → the event time', () => {
    expect(nextEndedAt(base({ currentPeriodEnd: at('2026-11-30T00:00:00Z'), cancelAtPeriodEnd: true }), 'revoked', at('2026-11-15T09:00:00Z'), GRACE_DAYS))
      .toEqual(at('2026-11-15T09:00:00Z'));
  });

  it('LA3E11: an expired event arriving on 02/12 for a cancelled period that ended 30/11 → 30/11', () => {
    expect(nextEndedAt(base({ currentPeriodEnd: at('2026-11-30T00:00:00Z'), cancelAtPeriodEnd: true }), 'expired', at('2026-12-02T00:00:00Z'), GRACE_DAYS))
      .toEqual(at('2026-11-30T00:00:00Z'));
  });

  it('LA3E12: not cancelled and overdue, no event: it stopped being Pro at period end + grace days, when the job makes it on_hold', () => {
    expect(nextEndedAt(base(), 'on_hold', at('2026-11-28T00:00:00Z'), GRACE_DAYS)).toEqual(at('2026-11-27T03:00:00Z'));
  });

  it('a trial ends at trial_ends_at', () => {
    expect(nextEndedAt(base({ status: 'trialing', trialEndsAt: at('2026-11-17T00:00:00Z'), cancelAtPeriodEnd: true }), 'expired', at('2026-11-18T00:00:00Z'), GRACE_DAYS))
      .toEqual(at('2026-11-17T00:00:00Z'));
  });

  it('grace ends at grace_ends_at (or the period end + grace days when it has none)', () => {
    expect(nextEndedAt(base({ status: 'grace', graceEndsAt: at('2026-11-23T00:00:00Z') }), 'on_hold', at('2026-11-24T00:00:00Z'), GRACE_DAYS)).toEqual(at('2026-11-23T00:00:00Z'));
    expect(nextEndedAt(base({ status: 'grace', graceEndsAt: null }), 'on_hold', at('2026-12-01T00:00:00Z'), GRACE_DAYS)).toEqual(at('2026-11-27T03:00:00Z'));
  });

  it('LA3E13: on_hold then expired keeps the moment it stopped being Pro', () => {
    expect(nextEndedAt(base({ status: 'on_hold', endedAt: at('2026-11-27T03:00:00Z') }), 'expired', at('2026-12-20T00:00:00Z'), GRACE_DAYS)).toEqual(at('2026-11-27T03:00:00Z'));
  });

  it('LA3E14: any status that is Pro or trial again clears it (kept reactivation, grace after active included)', () => {
    for (const after of ['trialing', 'active', 'grace'] as SubscriptionStatus[]) {
      expect(nextEndedAt(base({ status: 'expired', endedAt: at('2026-11-12T09:00:00Z') }), after, at('2026-12-01T00:00:00Z'), GRACE_DAYS)).toBeNull();
      expect(nextEndedAt(base(), after, at('2026-12-01T00:00:00Z'), GRACE_DAYS)).toBeNull();
    }
  });

  it('the moment by the time rules lies in the future (revoked mid-period) → the event time; no period end at all → the event time', () => {
    expect(nextEndedAt(base({ currentPeriodEnd: null }), 'revoked', at('2026-11-15T09:00:00Z'), GRACE_DAYS)).toEqual(at('2026-11-15T09:00:00Z'));
  });
});
