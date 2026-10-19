import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../common/clock/clock.js';
import { ProblemDetailsException } from '../common/problem-details/problem-details.exception.js';
import type { Profile } from '../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type AppSettings } from '../settings/index.js';
import { EntitlementsService } from './entitlements.service.js';
import { refusalProblem } from './refusal.js';
import type { GrantSource, SubscriptionSource } from './rules/plan-rules.js';

const USER = '00000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-11-10T05:00:00Z'); // 12:00 in Vietnam

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: USER, email: 'lan@example.test', email_verified: true, native_language: 'vi', timezone: 'Asia/Ho_Chi_Minh',
    staff_role: null, permissions: [], must_change_password: false, ...overrides,
  };
}

function proSubscription(overrides: Partial<SubscriptionSource> = {}): SubscriptionSource {
  return {
    id: 'sub-1', provider: 'fake', externalSubscriptionId: 'ext-1', status: 'active', trialDenied: false, cancelAtPeriodEnd: false,
    trialEndsAt: null, currentPeriodEnd: new Date('2026-12-01T00:00:00Z'), graceEndsAt: null,
    quotaAnchorAt: new Date('2026-11-01T00:00:00Z'), interval: 'month', pendingInterval: null, ...overrides,
  };
}

function limitsGrant(limits: GrantSource['limits']): GrantSource {
  return {
    id: 'grant-1', kind: 'limits', limits, startsAt: new Date('2026-11-01T00:00:00Z'), endsAt: new Date('2026-12-31T00:00:00Z'),
    revokedAt: null, createdAt: new Date('2026-11-01T00:00:00Z'),
  };
}

type Setup = {
  entitlements?: Partial<AppSettings['entitlements']>;
  profile?: Profile | null;
  subscriptions?: SubscriptionSource[];
  grants?: GrantSource[];
  practiceUsed?: number;
  aiUsed?: number;
  capUsed?: { confirmed: number; reserved: number };
  trialUsed?: boolean;
};

function setup(input: Setup = {}) {
  const prisma = { name: 'shared-client' };
  const clock = new FakeClock(NOW);
  const settings = {
    get: vi.fn(async () => ({ ...SETTINGS_DEFAULTS, entitlements: { ...SETTINGS_DEFAULTS.entitlements, ...input.entitlements } })),
  };
  const identity = { getProfile: vi.fn(async () => (input.profile === undefined ? profile() : input.profile)) };
  const sources = {
    load: vi.fn(async () => ({ subscriptions: input.subscriptions ?? [], grants: input.grants ?? [] })),
    trialUsed: vi.fn(async () => input.trialUsed ?? false),
  };
  const usage = {
    practiceUsed: vi.fn(async () => input.practiceUsed ?? 0),
    aiUsed: vi.fn(async () => input.aiUsed ?? 0),
    capUsed: vi.fn(async () => input.capUsed ?? { confirmed: 0, reserved: 0 }),
  };
  const ledger = {
    reserve: vi.fn(async () => ({ state: 'confirmed' })), confirm: vi.fn(async () => ({ state: 'confirmed' })),
    release: vi.fn(async () => ({ state: 'released' })), refund: vi.fn(async () => ({ refunded: true })),
  };
  const service = new EntitlementsService(
    prisma as never, clock, settings as never, identity as never, sources as never, usage as never, ledger as never,
  );
  return { service, prisma, clock, settings, identity, sources, usage, ledger };
}

describe('EntitlementsService.snapshot', () => {
  it('B5#1: a new user\'s snapshot is free, practice 3/day, AI 0, both features plan-required, ads.show false, trial_eligible true when verified', async () => {
    const { service } = setup();
    const snapshot = await service.snapshot(USER);
    expect(snapshot).toEqual({
      plan: 'free',
      sources: [],
      pools: {
        practice_sessions: { limit: 3, used: 0, remaining: 3, resets_at: '2026-11-10T17:00:00.000Z' },
        ai_practice: { limit: 0, used: 0, remaining: 0, resets_at: null },
        ai_lookup: { limit: 0, used: 0, remaining: 0, resets_at: null },
      },
      features: { 'ai.practice': { allowed: false, reason: 'plan-required' }, 'ai.lookup': { allowed: false, reason: 'plan-required' } },
      ai_available: { enabled: true, cap_reached: false },
      ads: { show: false, interstitial_per_day: 3, min_interval_minutes: 10 },
      trial_eligible: true,
    });
  });

  it('trial_eligible is false for an unverified email or a user who already had a trial', async () => {
    expect((await setup({ profile: profile({ email_verified: false }) }).service.snapshot(USER))?.trial_eligible).toBe(false);
    expect((await setup({ trialUsed: true }).service.snapshot(USER))?.trial_eligible).toBe(false);
  });

  it('a missing profile gives null', async () => {
    expect(await setup({ profile: null }).service.snapshot(USER)).toBeNull();
  });

  it('B5#25: ads.show is true only for free when ads_enabled', async () => {
    expect((await setup({ entitlements: { adsEnabled: true } }).service.snapshot(USER))?.ads.show).toBe(true);
    expect((await setup({ entitlements: { adsEnabled: true }, subscriptions: [proSubscription()] }).service.snapshot(USER))?.ads.show)
      .toBe(false);
    expect((await setup({ entitlements: { adsEnabled: false } }).service.snapshot(USER))?.ads.show).toBe(false);
    expect((await setup({ entitlements: { adsEnabled: true }, grants: [limitsGrant({ ai_practice_per_cycle: 500 })] })
      .service.snapshot(USER))?.ads.show).toBe(true);
  });

  it('B5E41/B5E91: a staff user without grants is free', async () => {
    const snapshot = await setup({ profile: profile({ staff_role: 'admin' }) }).service.snapshot(USER);
    expect(snapshot?.plan).toBe('free');
    expect(snapshot?.pools.practice_sessions.limit).toBe(3);
    expect(snapshot?.pools.ai_practice.limit).toBe(0);
  });

  it('B5E17: limit lowered to 100 with 150 used → remaining 0, never negative', async () => {
    const { service } = setup({ entitlements: { proAiPracticePerCycle: 100 }, subscriptions: [proSubscription()], aiUsed: 150 });
    expect((await service.snapshot(USER))?.pools.ai_practice).toEqual({
      limit: 100, used: 150, remaining: 0, resets_at: '2026-12-01T00:00:00.000Z',
    });
  });

  it('a Pro user\'s AI pools count the current cycle from the anchor and reset at the cycle end', async () => {
    const { service, usage, prisma } = setup({
      subscriptions: [proSubscription({ quotaAnchorAt: new Date('2026-10-15T08:00:00Z') })], aiUsed: 12,
    });
    const snapshot = await service.snapshot(USER);
    expect(snapshot?.plan).toBe('pro');
    expect(snapshot?.pools.ai_practice).toEqual({ limit: 300, used: 12, remaining: 288, resets_at: '2026-11-15T08:00:00.000Z' });
    expect(usage.aiUsed).toHaveBeenCalledWith(prisma, USER, 'ai_practice', {
      start: new Date('2026-10-15T08:00:00Z'), end: new Date('2026-11-15T08:00:00Z'),
    }, NOW);
    expect(snapshot?.features['ai.practice']).toEqual({ allowed: true, reason: null });
  });

  it('ai_available.cap_reached counts confirmed and unexpired reserved units of the Vietnam day against ai_daily_cap', async () => {
    const reached = setup({ entitlements: { aiDailyCap: 10 }, capUsed: { confirmed: 7, reserved: 3 } });
    expect((await reached.service.snapshot(USER))?.ai_available).toEqual({ enabled: true, cap_reached: true });
    expect(reached.usage.capUsed).toHaveBeenCalledWith(reached.prisma, '2026-11-10', NOW);
    const below = setup({ entitlements: { aiDailyCap: 10, aiEnabled: false }, capUsed: { confirmed: 7, reserved: 2 } });
    expect((await below.service.snapshot(USER))?.ai_available).toEqual({ enabled: false, cap_reached: false });
  });

  it('lists the counting sources: a subscription with renews_at, a limits grant with ends_at and its limits', async () => {
    const snapshot = await setup({
      subscriptions: [proSubscription({ pendingInterval: 'year' })], grants: [limitsGrant({ ai_lookup_per_cycle: 7 })],
    }).service.snapshot(USER);
    expect(snapshot?.sources).toEqual([
      {
        kind: 'subscription', id: 'sub-1', status: 'active', ends_at: null, renews_at: '2026-12-01T00:00:00.000Z',
        cancel_at_period_end: false, pending_interval: 'year', limits: null,
      },
      {
        kind: 'grant_limits', id: 'grant-1', status: null, ends_at: '2026-12-31T00:00:00.000Z', renews_at: null,
        cancel_at_period_end: null, pending_interval: null, limits: { ai_lookup_per_cycle: 7 },
      },
    ]);
    expect(snapshot?.pools.ai_lookup.limit).toBe(7);
  });

  it('a cancelled subscription shows ends_at and no renews_at; an expired one is not listed', async () => {
    const cancelled = proSubscription({ cancelAtPeriodEnd: true });
    const shown = await setup({ subscriptions: [cancelled] }).service.snapshot(USER);
    expect(shown?.sources[0]).toMatchObject({ ends_at: '2026-12-01T00:00:00.000Z', renews_at: null, cancel_at_period_end: true });
    const ended = await setup({ subscriptions: [proSubscription({ cancelAtPeriodEnd: true, currentPeriodEnd: NOW })] })
      .service.snapshot(USER);
    expect(ended?.sources).toEqual([]);
    expect(ended?.plan).toBe('free');
  });
});

describe('EntitlementsService.check', () => {
  it('practice.basic is allowed for every user (D4), without reading any source', async () => {
    const { service, sources } = setup({ grants: [limitsGrant({ practice_sessions_per_day: 0 })] });
    expect(await service.check(USER, 'practice.basic')).toEqual({ allowed: true });
    expect(sources.load).not.toHaveBeenCalled();
  });

  it('B5#20/B5E31: ai.practice limit 0 → plan-required; a Pro user without it is allowed', async () => {
    expect(await setup().service.check(USER, 'ai.practice')).toEqual({ allowed: false, reason: 'plan-required' });
    const zeroed = setup({ subscriptions: [proSubscription()], grants: [limitsGrant({ ai_practice_per_cycle: 0 })] });
    expect(await zeroed.service.check(USER, 'ai.practice')).toEqual({ allowed: false, reason: 'plan-required' });
    expect(await zeroed.service.check(USER, 'ai.lookup')).toEqual({ allowed: true });
  });
});

describe('EntitlementsService.checkQuota', () => {
  it.each([
    ['Asia/Ho_Chi_Minh', '2026-11-10', '2026-11-10T17:00:00.000Z'],
    ['Pacific/Kiritimati', '2026-11-10', '2026-11-10T10:00:00.000Z'],
    ['Etc/GMT+12', '2026-11-09', '2026-11-10T12:00:00.000Z'],
  ])('B5#2/B5E21: practiceUsed 3 → quota-exhausted, resets_at = next midnight in %s', async (timezone, today, resetsAt) => {
    const { service, usage, prisma } = setup({ profile: profile({ timezone }), practiceUsed: 3 });
    expect(await service.checkQuota(USER, 'practice_sessions')).toEqual({
      allowed: false, reason: 'quota-exhausted', resets_at: resetsAt,
    });
    expect(usage.practiceUsed).toHaveBeenCalledWith(prisma, USER, today);
  });

  it('B5E83: limit 0 → plan-required without resets_at', async () => {
    const { service } = setup({ grants: [limitsGrant({ practice_sessions_per_day: 0 })] });
    expect(await service.checkQuota(USER, 'practice_sessions')).toEqual({ allowed: false, reason: 'plan-required' });
  });

  it('B5#23: free_practice_sessions_per_day 5 lets the 4th and 5th session through', async () => {
    const settings = { freePracticeSessionsPerDay: 5 };
    expect(await setup({ entitlements: settings, practiceUsed: 3 }).service.checkQuota(USER, 'practice_sessions'))
      .toEqual({ allowed: true });
    expect(await setup({ entitlements: settings, practiceUsed: 4 }).service.checkQuota(USER, 'practice_sessions'))
      .toEqual({ allowed: true });
    expect((await setup({ entitlements: settings, practiceUsed: 5 }).service.checkQuota(USER, 'practice_sessions')).allowed)
      .toBe(false);
  });

  it('B5E24: "today" follows the profile\'s current zone', async () => {
    const late = new Date('2026-11-10T20:00:00Z'); // 03:00 on 11/11 in Vietnam, 15:00 on 11/10 in New York
    const vn = setup({ profile: profile({ timezone: 'Asia/Ho_Chi_Minh' }) });
    vn.clock.set(late);
    await vn.service.checkQuota(USER, 'practice_sessions');
    expect(vn.usage.practiceUsed).toHaveBeenCalledWith(vn.prisma, USER, '2026-11-11');
    const ny = setup({ profile: profile({ timezone: 'America/New_York' }) });
    ny.clock.set(late);
    await ny.service.checkQuota(USER, 'practice_sessions');
    expect(ny.usage.practiceUsed).toHaveBeenCalledWith(ny.prisma, USER, '2026-11-10');
  });

  it('with a transaction, reads settings, sources and usage through it (R4: after Practice closed the old session)', async () => {
    const { service, settings, sources, usage } = setup({ practiceUsed: 1 });
    const tx = { name: 'tx' };
    expect(await service.checkQuota(USER, 'practice_sessions', tx as never)).toEqual({ allowed: true });
    expect(settings.get).toHaveBeenCalledWith(tx);
    expect(sources.load).toHaveBeenCalledWith(tx, USER, NOW);
    expect(usage.practiceUsed).toHaveBeenCalledWith(tx, USER, '2026-11-10');
  });

  it('a user without a profile counts days in UTC', async () => {
    const { service, usage, prisma } = setup({ profile: null, practiceUsed: 3 });
    expect(await service.checkQuota(USER, 'practice_sessions')).toEqual({
      allowed: false, reason: 'quota-exhausted', resets_at: '2026-11-11T00:00:00.000Z',
    });
    expect(usage.practiceUsed).toHaveBeenCalledWith(prisma, USER, '2026-11-10');
  });
});

describe('EntitlementsService.recordPracticeSession', () => {
  it('inserts one confirmed practice_sessions use for the session, ignoring a second one (R14)', async () => {
    const { service } = setup();
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const tx = {
      $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push({ sql: strings.join('?'), values });
        return 1;
      }),
    };
    await service.recordPracticeSession(tx as never, USER, 'session-1', '2026-11-10');
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toMatch(/INSERT INTO usage_records/);
    expect(calls[0].sql).toMatch(/'practice_sessions'/);
    expect(calls[0].sql).toMatch(/'use', 'confirmed'/);
    expect(calls[0].sql).toMatch(/ON CONFLICT DO NOTHING/);
    expect(calls[0].values).toEqual([USER, 'session-1', '2026-11-10', NOW]);
  });
});

describe('EntitlementsService ledger calls', () => {
  it('reserve, confirm, release and refund go to the ledger unchanged', async () => {
    const { service, ledger } = setup();
    expect(await service.reserve(USER, 'ai_lookup', 'op-1')).toEqual({ state: 'confirmed' });
    expect(ledger.reserve).toHaveBeenCalledWith(USER, 'ai_lookup', 'op-1');
    expect(await service.confirm(USER, 'ai_lookup', 'op-1')).toEqual({ state: 'confirmed' });
    expect(ledger.confirm).toHaveBeenCalledWith(USER, 'ai_lookup', 'op-1');
    expect(await service.release(USER, 'ai_lookup', 'op-1')).toEqual({ state: 'released' });
    expect(ledger.release).toHaveBeenCalledWith(USER, 'ai_lookup', 'op-1');
    expect(await service.refund(USER, 'ai_lookup', 'op-1', 'report-1')).toEqual({ refunded: true });
    expect(ledger.refund).toHaveBeenCalledWith(USER, 'ai_lookup', 'op-1', 'report-1');
  });
});

describe('refusalProblem', () => {
  it('maps each refusal to its status, slug, extension and Retry-After', () => {
    const plan = refusalProblem({ reason: 'plan-required' });
    expect(plan).toBeInstanceOf(ProblemDetailsException);
    expect([plan.getStatus(), plan.problemType, plan.extensions, plan.retryAfterSeconds])
      .toEqual([403, 'entitlement-required', undefined, undefined]);

    const quota = refusalProblem({ reason: 'quota-exhausted', resets_at: '2026-11-10T17:00:00.000Z' });
    expect([quota.getStatus(), quota.problemType, quota.extensions, quota.retryAfterSeconds])
      .toEqual([403, 'quota-exhausted', { resets_at: '2026-11-10T17:00:00.000Z' }, undefined]);

    const cap = refusalProblem({ reason: 'ai-unavailable', retry_after_seconds: 3600 });
    expect([cap.getStatus(), cap.problemType, cap.retryAfterSeconds]).toEqual([503, 'ai-unavailable', 3600]);

    const off = refusalProblem({ reason: 'ai-unavailable', retry_after_seconds: null });
    expect([off.getStatus(), off.problemType, off.retryAfterSeconds]).toEqual([503, 'ai-unavailable', undefined]);
  });
});
