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
const grantRow = (id: string, userId: string, limits: unknown = null) => ({
  id, userId, kind: limits === null ? 'plan' : 'limits', limits, startsAt: NOW, endsAt: NOW, revokedAt: null, createdAt: NOW,
});

describe('SourcesRepository.loadMany', () => {
  it('reads every user in two queries, with the filters of load, and groups the rows by user in the order they came', async () => {
    const db = {
      subscription: { findMany: vi.fn(async () => [subRow('s1', A), subRow('s2', B), subRow('s3', A)]) },
      entitlementGrant: { findMany: vi.fn(async () => [grantRow('g1', B), grantRow('g2', B, { ai_practice_per_cycle: 20, junk: 1 })]) },
    };
    const loaded = await new SourcesRepository().loadMany(db as never, [A, B, C], NOW);
    expect(db.subscription.findMany).toHaveBeenCalledWith({
      where: { userId: { in: [A, B, C] }, status: { notIn: ['expired', 'revoked'] } }, orderBy: { createdAt: 'asc' },
    });
    expect(db.entitlementGrant.findMany).toHaveBeenCalledWith({
      where: { userId: { in: [A, B, C] }, revokedAt: null, endsAt: { gt: NOW } }, orderBy: { createdAt: 'asc' },
    });
    expect(loaded.get(A)?.subscriptions.map((s) => s.id)).toEqual(['s1', 's3']);
    expect(loaded.get(A)?.grants).toEqual([]);
    expect(loaded.get(B)?.subscriptions.map((s) => s.id)).toEqual(['s2']);
    expect(loaded.get(B)?.grants.map((g) => [g.id, g.limits])).toEqual([['g1', null], ['g2', { ai_practice_per_cycle: 20 }]]);
    expect(loaded.get(C)).toEqual({ subscriptions: [], grants: [] });
  });

  it('no user: nothing is read', async () => {
    const db = { subscription: { findMany: vi.fn() }, entitlementGrant: { findMany: vi.fn() } };
    expect((await new SourcesRepository().loadMany(db as never, [], NOW)).size).toBe(0);
    expect(db.subscription.findMany).not.toHaveBeenCalled();
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
    expect(calls[0].sql).toContain('ORDER BY user_id LIMIT ?');
    expect(calls[0].values).toEqual([NOW, NOW, 5001]);
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
