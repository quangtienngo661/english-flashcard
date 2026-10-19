import { describe, expect, it } from 'vitest';
import { effectiveStatus, resolve, type GrantSource, type PlanNumbers, type SubscriptionSource } from './plan-rules.js';

const at = (iso: string) => new Date(iso);
const DAY = 86_400_000;
const GRACE_DAYS = 7;

const NUMBERS: PlanNumbers = {
  free: { practice_sessions: 3, ai_practice: 0, ai_lookup: 0 },
  pro: { practice_sessions: 30, ai_practice: 300, ai_lookup: 100 },
  trial: { ai_practice: 300, ai_lookup: 100 },
};

function sub(overrides: Partial<SubscriptionSource> = {}): SubscriptionSource {
  return {
    id: 'sub-1',
    provider: 'fake',
    externalSubscriptionId: 'ext-1',
    status: 'active',
    trialDenied: false,
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
    currentPeriodEnd: at('2026-12-01T00:00:00Z'),
    graceEndsAt: null,
    quotaAnchorAt: at('2026-11-01T00:00:00Z'),
    interval: 'month',
    pendingInterval: null,
    ...overrides,
  };
}

function planGrant(overrides: Partial<GrantSource> = {}): GrantSource {
  return {
    id: 'grant-plan',
    kind: 'plan',
    limits: null,
    startsAt: at('2026-11-01T00:00:00Z'),
    endsAt: at('2026-12-01T00:00:00Z'),
    revokedAt: null,
    createdAt: at('2026-11-01T00:00:00Z'),
    ...overrides,
  };
}

function limitsGrant(limits: GrantSource['limits'], overrides: Partial<GrantSource> = {}): GrantSource {
  return planGrant({ id: 'grant-limits', kind: 'limits', limits, ...overrides });
}

const run = (subscriptions: SubscriptionSource[], grants: GrantSource[], now: string, numbers = NUMBERS) =>
  resolve({ subscriptions, grants, numbers, graceDays: GRACE_DAYS, now: at(now) });

describe('effectiveStatus (design §9.4 "Chuyển theo thời gian")', () => {
  const end = at('2026-12-01T00:00:00Z');

  it('active before its period end stays active, not overdue', () => {
    expect(effectiveStatus(sub(), at('2026-11-30T23:59:59Z'), GRACE_DAYS)).toEqual({ status: 'active', overdue: false });
  });

  it('B5E67: active, not cancelled, 3 days past the period end with no event → still active, overdue', () => {
    expect(effectiveStatus(sub(), new Date(end.getTime() + 3 * DAY), GRACE_DAYS)).toEqual({ status: 'active', overdue: true });
  });

  it('B5E67: active, not cancelled, at the period end + grace_days → on_hold (D31)', () => {
    expect(effectiveStatus(sub(), new Date(end.getTime() + GRACE_DAYS * DAY - 1), GRACE_DAYS))
      .toEqual({ status: 'active', overdue: true });
    expect(effectiveStatus(sub(), new Date(end.getTime() + GRACE_DAYS * DAY), GRACE_DAYS)).toEqual({ status: 'on_hold', overdue: false });
    expect(effectiveStatus(sub(), new Date(end.getTime() + 9 * DAY), GRACE_DAYS)).toEqual({ status: 'on_hold', overdue: false });
  });

  it('B5E68: trialing, not cancelled, past trial_ends_at → still trialing, overdue; past + grace_days → on_hold', () => {
    const trial = sub({ status: 'trialing', trialEndsAt: end, currentPeriodEnd: null });
    expect(effectiveStatus(trial, new Date(end.getTime() + 3 * DAY), GRACE_DAYS)).toEqual({ status: 'trialing', overdue: true });
    expect(effectiveStatus(trial, new Date(end.getTime() + 9 * DAY), GRACE_DAYS)).toEqual({ status: 'on_hold', overdue: false });
  });

  it('a trialing subscription is measured against trial_ends_at, not current_period_end', () => {
    const trial = sub({ status: 'trialing', trialEndsAt: at('2026-11-08T00:00:00Z'), currentPeriodEnd: end });
    expect(effectiveStatus(trial, at('2026-11-10T00:00:00Z'), GRACE_DAYS)).toEqual({ status: 'trialing', overdue: true });
  });

  it('grace before grace_ends_at stays grace; at grace_ends_at → on_hold', () => {
    const grace = sub({ status: 'grace', graceEndsAt: at('2026-12-08T00:00:00Z') });
    expect(effectiveStatus(grace, at('2026-12-07T23:59:59Z'), GRACE_DAYS)).toEqual({ status: 'grace', overdue: false });
    expect(effectiveStatus(grace, at('2026-12-08T00:00:00Z'), GRACE_DAYS)).toEqual({ status: 'on_hold', overdue: false });
  });

  it('B5E50: cancel_at_period_end, at current_period_end → expired; before it → still active', () => {
    const cancelled = sub({ cancelAtPeriodEnd: true });
    expect(effectiveStatus(cancelled, at('2026-11-30T23:59:59Z'), GRACE_DAYS)).toEqual({ status: 'active', overdue: false });
    expect(effectiveStatus(cancelled, end, GRACE_DAYS)).toEqual({ status: 'expired', overdue: false });
  });

  it('a cancelled trial past trial_ends_at → expired (no grace_days wait)', () => {
    const trial = sub({ status: 'trialing', trialEndsAt: end, currentPeriodEnd: null, cancelAtPeriodEnd: true });
    expect(effectiveStatus(trial, new Date(end.getTime() + DAY), GRACE_DAYS)).toEqual({ status: 'expired', overdue: false });
  });

  it('a cancelled grace keeps grace until grace_ends_at, then → expired instead of on_hold', () => {
    const grace = sub({ status: 'grace', cancelAtPeriodEnd: true, graceEndsAt: at('2026-12-08T00:00:00Z') });
    expect(effectiveStatus(grace, at('2026-12-03T00:00:00Z'), GRACE_DAYS)).toEqual({ status: 'grace', overdue: false });
    expect(effectiveStatus(grace, at('2026-12-08T00:00:00Z'), GRACE_DAYS)).toEqual({ status: 'expired', overdue: false });
  });

  it('on_hold waits for an event, whatever the dates', () => {
    const held = sub({ status: 'on_hold', cancelAtPeriodEnd: true, graceEndsAt: at('2026-12-08T00:00:00Z') });
    expect(effectiveStatus(held, at('2027-06-01T00:00:00Z'), GRACE_DAYS)).toEqual({ status: 'on_hold', overdue: false });
  });

  it('expired and revoked never change by time', () => {
    expect(effectiveStatus(sub({ status: 'expired' }), at('2027-06-01T00:00:00Z'), GRACE_DAYS)).toEqual({ status: 'expired', overdue: false });
    expect(effectiveStatus(sub({ status: 'revoked' }), at('2027-06-01T00:00:00Z'), GRACE_DAYS)).toEqual({ status: 'revoked', overdue: false });
  });

  it('a subscription with no end date at all never changes by time', () => {
    expect(effectiveStatus(sub({ currentPeriodEnd: null }), at('2027-06-01T00:00:00Z'), GRACE_DAYS)).toEqual({ status: 'active', overdue: false });
    expect(effectiveStatus(sub({ status: 'grace', graceEndsAt: null, currentPeriodEnd: null }), at('2027-06-01T00:00:00Z'), GRACE_DAYS))
      .toEqual({ status: 'grace', overdue: false });
  });

  it('grace without grace_ends_at (e.g. copied from fetchState) ends at current_period_end + grace_days, never Pro forever', () => {
    const grace = sub({ status: 'grace', graceEndsAt: null });
    expect(effectiveStatus(grace, new Date(end.getTime() + GRACE_DAYS * DAY - 1), GRACE_DAYS)).toEqual({ status: 'grace', overdue: false });
    expect(effectiveStatus(grace, new Date(end.getTime() + GRACE_DAYS * DAY), GRACE_DAYS)).toEqual({ status: 'on_hold', overdue: false });
  });

  it('trialing without trial_ends_at is measured against current_period_end', () => {
    const trial = sub({ status: 'trialing', trialEndsAt: null });
    expect(effectiveStatus(trial, new Date(end.getTime() + 3 * DAY), GRACE_DAYS)).toEqual({ status: 'trialing', overdue: true });
  });
});

describe('resolve (design §5.4, §5.5)', () => {
  it('B5#1: no sources → free, practice 3, AI 0/0, no anchor', () => {
    const resolved = run([], [], '2026-11-10T00:00:00Z');
    expect(resolved.plan).toBe('free');
    expect(resolved.anchor).toBeNull();
    expect(resolved.limits).toEqual({ practice_sessions: 3, ai_practice: 0, ai_lookup: 0 });
    expect(resolved.limitFrom).toEqual({ practice_sessions: { kind: 'plan' }, ai_practice: { kind: 'plan' }, ai_lookup: { kind: 'plan' } });
    expect(resolved.proSources).toEqual([]);
  });

  it('trial → practice 30 (Pro), AI 300/100 from the trial numbers', () => {
    const trial = sub({ status: 'trialing', trialEndsAt: at('2026-11-08T00:00:00Z'), currentPeriodEnd: null });
    const resolved = run([trial], [], '2026-11-03T00:00:00Z');
    expect(resolved.plan).toBe('trial');
    expect(resolved.limits).toEqual({ practice_sessions: 30, ai_practice: 300, ai_lookup: 100 });
    expect(resolved.anchor).toEqual(at('2026-11-01T00:00:00Z'));
    expect(resolved.proSources).toEqual([]);

    const ownTrial = run([trial], [], '2026-11-03T00:00:00Z', { ...NUMBERS, trial: { ai_practice: 200, ai_lookup: 50 } });
    expect(ownTrial.limits).toEqual({ practice_sessions: 30, ai_practice: 200, ai_lookup: 50 });
  });

  it('trial_denied subscription → free (D30), and it gives no anchor', () => {
    const denied = sub({ status: 'trialing', trialDenied: true, trialEndsAt: at('2026-11-08T00:00:00Z'), currentPeriodEnd: null });
    const resolved = run([denied], [], '2026-11-03T00:00:00Z');
    expect(resolved.plan).toBe('free');
    expect(resolved.anchor).toBeNull();
    expect(resolved.limits).toEqual({ practice_sessions: 3, ai_practice: 0, ai_lookup: 0 });
  });

  it('an active subscription is Pro with its quota anchor and listed as a Pro source', () => {
    const resolved = run([sub()], [], '2026-11-10T00:00:00Z');
    expect(resolved.plan).toBe('pro');
    expect(resolved.limits).toEqual({ practice_sessions: 30, ai_practice: 300, ai_lookup: 100 });
    expect(resolved.anchor).toEqual(at('2026-11-01T00:00:00Z'));
    expect(resolved.proSources).toEqual([{ kind: 'subscription', id: 'sub-1', anchor: at('2026-11-01T00:00:00Z') }]);
  });

  it('grace and an overdue active (D31) count as Pro; on_hold by time does not', () => {
    expect(run([sub({ status: 'grace', graceEndsAt: at('2026-12-08T00:00:00Z') })], [], '2026-12-03T00:00:00Z').plan).toBe('pro');
    expect(run([sub()], [], '2026-12-04T00:00:00Z').plan).toBe('pro');
    expect(run([sub()], [], '2026-12-10T00:00:00Z').plan).toBe('free');
  });

  it('a stored on_hold, expired or revoked subscription is not a source', () => {
    for (const status of ['on_hold', 'expired', 'revoked'] as const) {
      const resolved = run([sub({ status })], [], '2026-11-10T00:00:00Z');
      expect(resolved.plan).toBe('free');
      expect(resolved.anchor).toBeNull();
    }
  });

  it('B5E29: Pro + limits grant ai_practice 500 → 500, back to 300 after ends_at', () => {
    const grant = limitsGrant({ ai_practice_per_cycle: 500 }, {
      startsAt: at('2026-11-05T00:00:00Z'), endsAt: at('2026-12-31T00:00:00Z'), createdAt: at('2026-11-05T00:00:00Z'),
    });
    const during = run([sub({ currentPeriodEnd: at('2027-02-01T00:00:00Z') })], [grant], '2026-11-10T00:00:00Z');
    expect(during.limits.ai_practice).toBe(500);
    expect(during.limitFrom.ai_practice).toEqual({ kind: 'grant', grantId: 'grant-limits' });
    expect(during.limits.ai_lookup).toBe(100);
    expect(during.anchor).toEqual(at('2026-11-01T00:00:00Z'));

    const after = run([sub({ currentPeriodEnd: at('2027-02-01T00:00:00Z') })], [grant], '2026-12-31T00:00:00Z');
    expect(after.limits.ai_practice).toBe(300);
    expect(after.limitFrom.ai_practice).toEqual({ kind: 'plan' });
  });

  it('B5E30: two limits grants on one pool → the later createdAt wins; revoking it restores the earlier', () => {
    const earlier = limitsGrant({ ai_practice_per_cycle: 400 }, { id: 'earlier', createdAt: at('2026-11-02T00:00:00Z') });
    const later = limitsGrant({ ai_practice_per_cycle: 50 }, { id: 'later', createdAt: at('2026-11-03T00:00:00Z') });
    const both = run([sub()], [later, earlier], '2026-11-10T00:00:00Z');
    expect(both.limits.ai_practice).toBe(50);
    expect(both.limitFrom.ai_practice).toEqual({ kind: 'grant', grantId: 'later' });
    expect(run([sub()], [earlier, later], '2026-11-10T00:00:00Z').limits.ai_practice).toBe(50);

    const revoked = run([sub()], [earlier, { ...later, revokedAt: at('2026-11-09T00:00:00Z') }], '2026-11-10T00:00:00Z');
    expect(revoked.limits.ai_practice).toBe(400);
    expect(revoked.limitFrom.ai_practice).toEqual({ kind: 'grant', grantId: 'earlier' });
  });

  it('a limits grant overrides only the pools whose keys it carries', () => {
    const grant = limitsGrant({ practice_sessions_per_day: 10, ai_lookup_per_cycle: 7 });
    const resolved = run([], [grant], '2026-11-10T00:00:00Z');
    expect(resolved.limits).toEqual({ practice_sessions: 10, ai_practice: 0, ai_lookup: 7 });
    expect(resolved.limitFrom).toEqual({
      practice_sessions: { kind: 'grant', grantId: 'grant-limits' },
      ai_practice: { kind: 'plan' },
      ai_lookup: { kind: 'grant', grantId: 'grant-limits' },
    });
  });

  it('B5E31: Pro + ai_practice 0 → 0', () => {
    const resolved = run([sub()], [limitsGrant({ ai_practice_per_cycle: 0 })], '2026-11-10T00:00:00Z');
    expect(resolved.plan).toBe('pro');
    expect(resolved.limits.ai_practice).toBe(0);
    expect(resolved.limits.ai_lookup).toBe(100);
  });

  it('B5E32: Free + ai_practice 500 → plan free, limit 500, anchor = grant startsAt', () => {
    const grant = limitsGrant({ ai_practice_per_cycle: 500 }, { startsAt: at('2026-11-04T09:00:00Z') });
    const resolved = run([], [grant], '2026-11-10T00:00:00Z');
    expect(resolved.plan).toBe('free');
    expect(resolved.limits.ai_practice).toBe(500);
    expect(resolved.anchor).toEqual(at('2026-11-04T09:00:00Z'));
    expect(resolved.proSources).toEqual([]);
  });

  it('a limits grant with only practice or AI 0 gives no anchor', () => {
    expect(run([], [limitsGrant({ practice_sessions_per_day: 10 })], '2026-11-10T00:00:00Z').anchor).toBeNull();
    expect(run([], [limitsGrant({ ai_practice_per_cycle: 0 })], '2026-11-10T00:00:00Z').anchor).toBeNull();
  });

  it('a limits grant with ai_* > 0 gives no anchor when there is a Pro or trial source', () => {
    const grant = limitsGrant({ ai_practice_per_cycle: 500 }, { startsAt: at('2026-11-20T00:00:00Z') });
    expect(run([sub()], [grant], '2026-11-25T00:00:00Z').anchor).toEqual(at('2026-11-01T00:00:00Z'));
    const trial = sub({ status: 'trialing', trialEndsAt: at('2026-12-01T00:00:00Z'), currentPeriodEnd: null });
    expect(run([trial], [grant], '2026-11-25T00:00:00Z').anchor).toEqual(at('2026-11-01T00:00:00Z'));
  });

  it('B5E84: a grant with startsAt in the future does not count', () => {
    const future = planGrant({ startsAt: at('2026-11-20T00:00:00Z') });
    const limits = limitsGrant({ ai_practice_per_cycle: 500 }, { startsAt: at('2026-11-20T00:00:00Z') });
    const resolved = run([], [future, limits], '2026-11-10T00:00:00Z');
    expect(resolved.plan).toBe('free');
    expect(resolved.limits.ai_practice).toBe(0);
    expect(resolved.anchor).toBeNull();
  });

  it('B5E83: practice_sessions_per_day 0 → limit 0', () => {
    const resolved = run([sub()], [limitsGrant({ practice_sessions_per_day: 0 })], '2026-11-10T00:00:00Z');
    expect(resolved.limits.practice_sessions).toBe(0);
  });

  it('a plan grant is Pro with anchor startsAt and listed as a Pro source', () => {
    const resolved = run([], [planGrant()], '2026-11-10T00:00:00Z');
    expect(resolved.plan).toBe('pro');
    expect(resolved.limits).toEqual({ practice_sessions: 30, ai_practice: 300, ai_lookup: 100 });
    expect(resolved.anchor).toEqual(at('2026-11-01T00:00:00Z'));
    expect(resolved.proSources).toEqual([{ kind: 'grant', id: 'grant-plan', anchor: at('2026-11-01T00:00:00Z') }]);
  });

  it('B5E99 (D38): plan grant to 30/11 and plan grant 1/12–31/12 → Pro on 15/11, 15/12; anchor 1/11 before 1/12, 1/12 from 1/12', () => {
    const first = planGrant({ id: 'first' });
    const next = planGrant({
      id: 'next', startsAt: at('2026-12-01T00:00:00Z'), endsAt: at('2027-01-01T00:00:00Z'), createdAt: at('2026-11-10T00:00:00Z'),
    });
    const nov = run([], [first, next], '2026-11-15T00:00:00Z');
    expect(nov.plan).toBe('pro');
    expect(nov.anchor).toEqual(at('2026-11-01T00:00:00Z'));
    expect(run([], [first, next], '2026-11-30T23:59:59Z').anchor).toEqual(at('2026-11-01T00:00:00Z'));
    expect(run([], [first, next], '2026-12-01T00:00:00Z').anchor).toEqual(at('2026-12-01T00:00:00Z'));
    const dec = run([], [first, next], '2026-12-15T00:00:00Z');
    expect(dec.plan).toBe('pro');
    expect(dec.anchor).toEqual(at('2026-12-01T00:00:00Z'));
  });

  it('B5E95 (D38): a plan grant whose endsAt moved from 30/11 to 31/12 keeps anchor startsAt', () => {
    const moved = planGrant({ endsAt: at('2026-12-31T00:00:00Z') });
    const resolved = run([], [moved], '2026-12-20T00:00:00Z');
    expect(resolved.plan).toBe('pro');
    expect(resolved.anchor).toEqual(at('2026-11-01T00:00:00Z'));
  });

  describe('§5.5 example table (R8)', () => {
    // Lan pays Pro from 1/11 (auto-renewal turned off by the grant, paid period ends 30/11); on 15/11 staff grant Pro to 15/12.
    const paid = sub({ id: 'paid', cancelAtPeriodEnd: true, currentPeriodEnd: at('2026-11-30T00:00:00Z') });
    const grantTo15Dec = planGrant({
      id: 'to-15-12', startsAt: at('2026-11-15T00:00:00Z'), endsAt: at('2026-12-15T00:00:00Z'), createdAt: at('2026-11-15T00:00:00Z'),
    });

    it('B5E28: Lan pays Pro from 1/11; on 15/11 staff grant "Pro to 15/12" → anchor 15/11', () => {
      const resolved = run([paid], [grantTo15Dec], '2026-11-16T00:00:00Z');
      expect(resolved.plan).toBe('pro');
      expect(resolved.anchor).toEqual(at('2026-11-15T00:00:00Z'));
      expect(resolved.proSources).toEqual([
        { kind: 'subscription', id: 'paid', anchor: at('2026-11-01T00:00:00Z') },
        { kind: 'grant', id: 'to-15-12', anchor: at('2026-11-15T00:00:00Z') },
      ]);
    });

    it('the paid subscription ends 30/11 (auto-renewal off) → anchor still 15/11', () => {
      const resolved = run([paid], [grantTo15Dec], '2026-12-01T00:00:00Z');
      expect(resolved.plan).toBe('pro');
      expect(resolved.anchor).toEqual(at('2026-11-15T00:00:00Z'));
      expect(resolved.proSources).toEqual([{ kind: 'grant', id: 'to-15-12', anchor: at('2026-11-15T00:00:00Z') }]);
    });

    it('on 15/12 the grant ends and no Pro source is left → free, no anchor, AI 0', () => {
      const resolved = run([paid], [grantTo15Dec], '2026-12-15T00:00:00Z');
      expect(resolved.plan).toBe('free');
      expect(resolved.anchor).toBeNull();
      expect(resolved.limits.ai_practice).toBe(0);
    });

    it('Lan granted from 1/11; on 20/11 she buys Pro → anchor 20/11', () => {
      const bought = sub({ id: 'bought', quotaAnchorAt: at('2026-11-20T00:00:00Z'), currentPeriodEnd: at('2026-12-20T00:00:00Z') });
      const grant = planGrant({ endsAt: at('2026-12-31T00:00:00Z') });
      expect(run([], [grant], '2026-11-19T00:00:00Z').anchor).toEqual(at('2026-11-01T00:00:00Z'));
      expect(run([bought], [grant], '2026-11-21T00:00:00Z').anchor).toEqual(at('2026-11-20T00:00:00Z'));
    });

    it('B5E58: an Apple and a web subscription at once → Pro while one is left; anchor of the latest start (D32)', () => {
      const apple = sub({ id: 'apple', provider: 'apple', quotaAnchorAt: at('2026-11-01T00:00:00Z'), currentPeriodEnd: at('2026-12-01T00:00:00Z') });
      const web = sub({
        id: 'web', provider: 'web', cancelAtPeriodEnd: true,
        quotaAnchorAt: at('2026-11-10T00:00:00Z'), currentPeriodEnd: at('2026-11-25T00:00:00Z'),
      });
      const both = run([apple, web], [], '2026-11-12T00:00:00Z');
      expect(both.plan).toBe('pro');
      expect(both.anchor).toEqual(at('2026-11-10T00:00:00Z'));
      const appleOnly = run([apple, web], [], '2026-11-26T00:00:00Z');
      expect(appleOnly.plan).toBe('pro');
      expect(appleOnly.anchor).toEqual(at('2026-11-01T00:00:00Z'));
    });

    it('B5E81: paid Pro (anchor 1/11, auto-renewal off to 30/11) granted 15/11–20/11 → anchor 15/11, then 1/11 from 20/11; Pro to 30/11', () => {
      const grant = planGrant({ startsAt: at('2026-11-15T00:00:00Z'), endsAt: at('2026-11-20T00:00:00Z') });
      expect(run([paid], [grant], '2026-11-16T00:00:00Z').anchor).toEqual(at('2026-11-15T00:00:00Z'));
      const after = run([paid], [grant], '2026-11-20T00:00:00Z');
      expect(after.plan).toBe('pro');
      expect(after.anchor).toEqual(at('2026-11-01T00:00:00Z'));
      expect(run([paid], [grant], '2026-11-29T23:59:59Z').plan).toBe('pro');
      expect(run([paid], [grant], '2026-11-30T00:00:00Z').plan).toBe('free');
    });
  });
});
