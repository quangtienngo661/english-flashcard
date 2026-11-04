import { describe, expect, it, vi } from 'vitest';
import { grantLimits, SourcesRepository } from './sources.repository.js';

const NOW = new Date('2026-10-20T05:00:00.000Z');
const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const C = '00000000-0000-4000-8000-000000000003';

const subRow = (id: string, userId: string) => ({
  id, userId, provider: 'fake', externalSubscriptionId: `ext-${id}`, status: 'active', trialDenied: false, cancelAtPeriodEnd: false,
  trialEndsAt: null, currentPeriodStart: null, currentPeriodEnd: null, graceEndsAt: null, quotaAnchorAt: null, interval: 'month',
  pendingInterval: null,
});
const periodRow = (id: string, userId: string, startsAt = NOW, endsAt = NOW) => ({
  id, userId, orderId: `o-${id}`, paymentId: `pay-${id}`, startsAt, endsAt, revokedAt: null, revokedBy: null, revokeReason: null, createdAt: NOW,
});
const grantRow = (id: string, userId: string, limits: unknown = null) => ({
  id, userId, kind: limits === null ? 'plan' : 'limits', limits, startsAt: NOW, endsAt: NOW, revokedAt: null, createdAt: NOW,
});

describe('SourcesRepository.loadMany', () => {
  it('reads every user in three queries, with the filters of load, and groups the rows by user in the order they came', async () => {
    const db = {
      subscription: { findMany: vi.fn(async () => [subRow('s1', A), subRow('s2', B), subRow('s3', A)]) },
      entitlementGrant: { findMany: vi.fn(async () => [grantRow('g1', B), grantRow('g2', B, { ai_practice_per_cycle: 20, junk: 1 })]) },
      prepaidPeriod: { findMany: vi.fn(async () => [periodRow('p1', C), periodRow('p2', A)]) },
    };
    const loaded = await new SourcesRepository().loadMany(db as never, [A, B, C], NOW);
    expect(db.subscription.findMany).toHaveBeenCalledWith({
      where: { userId: { in: [A, B, C] }, status: { notIn: ['expired', 'revoked'] } }, orderBy: { createdAt: 'asc' },
    });
    expect(db.entitlementGrant.findMany).toHaveBeenCalledWith({
      where: { userId: { in: [A, B, C] }, revokedAt: null, endsAt: { gt: NOW } }, orderBy: { createdAt: 'asc' },
    });
    expect(db.prepaidPeriod.findMany).toHaveBeenCalledWith({
      where: { userId: { in: [A, B, C] }, revokedAt: null, endsAt: { gt: NOW } }, orderBy: { startsAt: 'asc' },
    });
    expect(loaded.get(A)?.subscriptions.map((s) => s.id)).toEqual(['s1', 's3']);
    expect(loaded.get(A)?.grants).toEqual([]);
    expect(loaded.get(A)?.prepaidPeriods).toEqual([{ id: 'p2', startsAt: NOW, endsAt: NOW, revokedAt: null }]);
    expect(loaded.get(C)?.prepaidPeriods.map((p) => p.id)).toEqual(['p1']);
    expect(loaded.get(B)?.subscriptions.map((s) => s.id)).toEqual(['s2']);
    expect(loaded.get(B)?.grants.map((g) => [g.id, g.limits])).toEqual([['g1', null], ['g2', { ai_practice_per_cycle: 20 }]]);
    expect(loaded.get(B)?.prepaidPeriods).toEqual([]);
  });

  it('no user: nothing is read', async () => {
    const db = { subscription: { findMany: vi.fn() }, entitlementGrant: { findMany: vi.fn() }, prepaidPeriod: { findMany: vi.fn() } };
    expect((await new SourcesRepository().loadMany(db as never, [], NOW)).size).toBe(0);
    expect(db.subscription.findMany).not.toHaveBeenCalled();
    expect(db.prepaidPeriod.findMany).not.toHaveBeenCalled();
  });
});

describe('SourcesRepository.proCandidates', () => {
  it('one query: users with a subscription stored as active or grace, or a plan grant in force; oldest id first, at most limit', async () => {
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const db = {
      $queryRaw: vi.fn(async (statement: { sql: string; values: unknown[] }) => {
        calls.push({ sql: statement.sql.replace(/\s+/g, ' '), values: statement.values });
        return [{ user_id: A }, { user_id: B }];
      }),
    };
    await expect(new SourcesRepository().proCandidates(db as never, NOW, 5001)).resolves.toEqual([A, B]);
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain("FROM subscriptions WHERE status IN ('active', 'grace')");
    expect(calls[0].sql).toContain("FROM entitlement_grants WHERE kind = 'plan' AND revoked_at IS NULL AND starts_at <= ? AND ends_at > ?");
    expect(calls[0].sql).toContain('FROM prepaid_periods WHERE revoked_at IS NULL AND starts_at <= ? AND ends_at > ?');
    expect(calls[0].sql).toContain('ORDER BY user_id LIMIT ?');
    expect(calls[0].values).toEqual([NOW, NOW, NOW, NOW, 5001]);
  });
});

describe('grantLimits', () => {
  it('keeps the known keys with whole numbers ≥ 0, including 0', () => {
    expect(grantLimits({ ai_practice_per_cycle: 500, practice_sessions_per_day: 0 }))
      .toEqual({ ai_practice_per_cycle: 500, practice_sessions_per_day: 0 });
  });

  it('drops unknown keys and values that are not whole numbers ≥ 0 from a corrupt stored row', () => {
    expect(grantLimits({ foo: 9, ai_practice_per_cycle: null, ai_lookup_per_cycle: '5', practice_sessions_per_day: -1 })).toEqual({});
    expect(grantLimits({ ai_lookup_per_cycle: 2.5 })).toEqual({});
  });

  it('a value that is not an object gives null', () => {
    expect(grantLimits(null)).toBeNull();
    expect(grantLimits([1, 2])).toBeNull();
    expect(grantLimits(7)).toBeNull();
  });
});

describe('SourcesRepository.load — prepaid periods', () => {
  it('returns the periods not revoked and not ended at now, the future ones too, oldest start first', async () => {
    const db = {
      subscription: { findMany: vi.fn(async () => []) },
      entitlementGrant: { findMany: vi.fn(async () => []) },
      prepaidPeriod: { findMany: vi.fn(async () => [periodRow('p1', A, NOW, new Date(NOW.getTime() + 86_400_000))]) },
    };
    const loaded = await new SourcesRepository().load(db as never, A, NOW);
    expect(db.prepaidPeriod.findMany).toHaveBeenCalledWith({ where: { userId: A, revokedAt: null, endsAt: { gt: NOW } }, orderBy: { startsAt: 'asc' } });
    expect(loaded.prepaidPeriods).toEqual([{ id: 'p1', startsAt: NOW, endsAt: new Date(NOW.getTime() + 86_400_000), revokedAt: null }]);
  });
});

describe('SourcesRepository.load and the sources that already ended (launch prep A, design 6.3.4; launch prep B, design 3.13)', () => {
  const since = new Date('2026-10-31T17:00:00.000Z');
  const NOW_LATER = new Date('2026-11-25T00:00:00.000Z');
  const rows = {
    live: { ...subRow('s-live', A), status: 'active' },
    expiredIn: { ...subRow('s-exp', A), status: 'expired', endedAt: new Date('2026-11-12T09:00:00.000Z') },
    grantLive: { ...grantRow('g-live', A), startsAt: new Date('2026-11-01T00:00:00.000Z'), endsAt: new Date('2026-12-31T00:00:00.000Z') },
    grantRevoked: { ...grantRow('g-rev', A), revokedAt: new Date('2026-11-12T09:00:00.000Z'), endsAt: new Date('2026-12-31T00:00:00.000Z') },
    grantRanOut: { ...grantRow('g-out', A), revokedAt: null, endsAt: new Date('2026-11-20T03:00:00.000Z') },
    periodLive: periodRow('p-live', A, new Date('2026-11-20T00:00:00.000Z'), new Date('2026-12-20T00:00:00.000Z')),
    periodFuture: periodRow('p-future', A, new Date('2026-12-20T00:00:00.000Z'), new Date('2027-01-20T00:00:00.000Z')),
    periodRanOut: periodRow('p-out', A, new Date('2026-10-20T00:00:00.000Z'), new Date('2026-11-20T03:00:00.000Z')),
    periodRevoked: { ...periodRow('p-rev', A, new Date('2026-11-01T00:00:00.000Z'), new Date('2026-12-31T00:00:00.000Z')), revokedAt: new Date('2026-11-12T09:00:00.000Z') },
  };
  const noPeriods = { findMany: vi.fn(async () => []) };

  it('without endedSince the queries and the result are exactly what they were, and `ended` is empty', async () => {
    const db = {
      subscription: { findMany: vi.fn(async () => [rows.live]) },
      entitlementGrant: { findMany: vi.fn(async () => [rows.grantLive]) },
      prepaidPeriod: { findMany: vi.fn(async () => [rows.periodLive]) },
    };
    const loaded = await new SourcesRepository().load(db as never, A, NOW_LATER);
    expect(db.subscription.findMany).toHaveBeenCalledWith({ where: { userId: A, status: { notIn: ['expired', 'revoked'] } }, orderBy: { createdAt: 'asc' } });
    expect(db.entitlementGrant.findMany).toHaveBeenCalledWith({ where: { userId: A, revokedAt: null, endsAt: { gt: NOW_LATER } }, orderBy: { createdAt: 'asc' } });
    expect(loaded.ended).toEqual({ subscriptions: [], grants: [], prepaidPeriods: [] });
    expect(loaded.subscriptions.map((s) => s.id)).toEqual(['s-live']);
    expect(loaded.grants.map((g) => g.id)).toEqual(['g-live']);
    expect(loaded.prepaidPeriods.map((p) => p.id)).toEqual(['p-live']);
  });

  it('with endedSince the same queries are widened to sources that ended since then', async () => {
    const db = {
      subscription: { findMany: vi.fn(async () => [rows.live, rows.expiredIn]) },
      entitlementGrant: { findMany: vi.fn(async () => [rows.grantLive, rows.grantRevoked, rows.grantRanOut]) },
      prepaidPeriod: noPeriods,
    };
    await new SourcesRepository().load(db as never, A, NOW_LATER, since);
    expect(db.subscription.findMany).toHaveBeenCalledWith({
      where: { userId: A, OR: [{ status: { notIn: ['expired', 'revoked'] } }, { status: { in: ['expired', 'revoked'] }, endedAt: { gte: since } }] },
      orderBy: { createdAt: 'asc' },
    });
    expect(db.entitlementGrant.findMany).toHaveBeenCalledWith({
      where: { userId: A, OR: [
        { revokedAt: null, endsAt: { gt: NOW_LATER } },
        { revokedAt: { gte: since } },
        { revokedAt: null, endsAt: { gte: since, lte: NOW_LATER } },
      ] },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('LA3E19: the ended ones come back in `ended` only; `subscriptions` and `grants` stay what they were (the snapshot lists grants from them)', async () => {
    const db = {
      subscription: { findMany: vi.fn(async () => [rows.live, rows.expiredIn]) },
      entitlementGrant: { findMany: vi.fn(async () => [rows.grantLive, rows.grantRevoked, rows.grantRanOut]) },
      prepaidPeriod: noPeriods,
    };
    const loaded = await new SourcesRepository().load(db as never, A, NOW_LATER, since);
    expect(loaded.subscriptions.map((s) => s.id)).toEqual(['s-live']);
    expect(loaded.grants.map((g) => g.id)).toEqual(['g-live']);
    expect(loaded.ended.subscriptions.map((s) => [s.id, s.endedAt])).toEqual([['s-exp', new Date('2026-11-12T09:00:00.000Z')]]);
    expect(loaded.ended.grants.map((g) => g.id)).toEqual(['g-rev', 'g-out']);
  });

  it('LB1A8: with endedSince the prepaid query is widened the way the grants are; the periods that ended come back in `ended` only', async () => {
    const db = {
      subscription: { findMany: vi.fn(async () => []) },
      entitlementGrant: { findMany: vi.fn(async () => []) },
      prepaidPeriod: { findMany: vi.fn(async () => [rows.periodLive, rows.periodFuture, rows.periodRanOut, rows.periodRevoked]) },
    };
    const loaded = await new SourcesRepository().load(db as never, A, NOW_LATER, since);
    expect(db.prepaidPeriod.findMany).toHaveBeenCalledWith({
      where: { userId: A, OR: [
        { revokedAt: null, endsAt: { gt: NOW_LATER } },
        { revokedAt: { gte: since } },
        { revokedAt: null, endsAt: { gte: since, lte: NOW_LATER } },
      ] },
      orderBy: { startsAt: 'asc' },
    });
    // The running and the future period are the live ones, exactly as without endedSince (the snapshot lists them as upcoming).
    expect(loaded.prepaidPeriods.map((p) => p.id)).toEqual(['p-live', 'p-future']);
    expect(loaded.ended.prepaidPeriods.map((p) => [p.id, p.endsAt, p.revokedAt])).toEqual([
      ['p-out', new Date('2026-11-20T03:00:00.000Z'), null],
      ['p-rev', new Date('2026-12-31T00:00:00.000Z'), new Date('2026-11-12T09:00:00.000Z')],
    ]);
  });
});
