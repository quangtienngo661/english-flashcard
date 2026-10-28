import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../common/clock/clock.js';
import { EntitlementsService } from './entitlements.service.js';
import type { GrantSource, SubscriptionSource } from './rules/plan-rules.js';
import type { SourcesRepository } from './sources/sources.repository.js';
import type { UsageQueries } from './usage/usage.queries.js';

// 20/10/2026 12:00 in Vietnam.
const NOW = new Date('2026-10-20T05:00:00.000Z');
const SETTINGS = {
  entitlements: {
    freePracticeSessionsPerDay: 3, proPracticeSessionsPerDay: 200, proAiPracticePerCycle: 300, proAiLookupPerCycle: 100,
    trialAiPracticePerCycle: 30, trialAiLookupPerCycle: 10, graceDays: 3,
  },
};
const ANCHOR = new Date('2026-10-01T00:00:00.000Z');
const CYCLE = { start: ANCHOR, end: new Date('2026-11-01T00:00:00.000Z') };

const sub = (over: Partial<SubscriptionSource> = {}): SubscriptionSource => ({
  id: 'sub', provider: 'fake', externalSubscriptionId: 'ext', status: 'active', trialDenied: false, cancelAtPeriodEnd: false,
  trialEndsAt: null, currentPeriodEnd: new Date('2026-11-01T00:00:00.000Z'), graceEndsAt: null, quotaAnchorAt: ANCHOR, interval: 'month',
  pendingInterval: null, ...over,
});
const grant = (over: Partial<GrantSource> = {}): GrantSource => ({
  id: 'grant', kind: 'plan', limits: null, startsAt: new Date('2026-10-10T00:00:00.000Z'), endsAt: new Date('2026-12-10T00:00:00.000Z'),
  revokedAt: null, createdAt: new Date('2026-10-10T00:00:00.000Z'), ...over,
});
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const used = (ai_practice: number, ai_lookup = 0) => ({ ai_practice, ai_lookup });

type Sources = Record<string, { subscriptions?: SubscriptionSource[]; grants?: GrantSource[] }>;

function setup(sources: Sources, usage: Record<string, ReturnType<typeof used>> = {}) {
  const candidates = vi.fn(async (_db: unknown, _now: Date, limit: number) => Object.keys(sources).slice(0, limit));
  const loadMany = vi.fn(async (_db: unknown, ids: string[]) => new Map(ids.map((id) => [id, {
    subscriptions: sources[id]?.subscriptions ?? [], grants: sources[id]?.grants ?? [],
  }])));
  const aiUsedMany = vi.fn(async () => new Map(Object.entries(usage)));
  const service = new EntitlementsService(
    { tag: 'db' } as never, new FakeClock(NOW), { get: async () => SETTINGS } as never, {} as never,
    { proCandidates: candidates, loadMany } as unknown as SourcesRepository, { aiUsedMany } as unknown as UsageQueries, {} as never,
  );
  return { service, candidates, loadMany, aiUsedMany };
}

const counts = (view: { buckets: Array<{ learners: number }> }) => view.buckets.map((b) => b.learners);

describe('EntitlementsService.aiUsagePro', () => {
  it('no Pro learner: every bucket is 0, nothing else is read', async () => {
    const { service, loadMany, aiUsedMany } = setup({});
    const view = await service.aiUsagePro();
    expect(view).toEqual({
      pro_learners: 0, no_limit: 0, truncated: false,
      buckets: [
        { key: '0', learners: 0 }, { key: '1-49', learners: 0 }, { key: '50-79', learners: 0 }, { key: '80-99', learners: 0 },
        { key: '100', learners: 0 },
      ],
    });
    expect(loadMany).not.toHaveBeenCalled();
    expect(aiUsedMany).not.toHaveBeenCalled();
  });

  it('each Pro learner is measured in their own current cycle, in one usage read for everybody', async () => {
    const lan = uuid(1); const minh = uuid(2);
    const { service, aiUsedMany } = setup({
      [lan]: { subscriptions: [sub()] },
      // Anchor on the 15th: now (20/10) is in the cycle 15/10–15/11.
      [minh]: { subscriptions: [sub({ id: 'sub2', quotaAnchorAt: new Date('2026-09-15T08:00:00.000Z') })] },
    });
    await service.aiUsagePro();
    expect(aiUsedMany).toHaveBeenCalledTimes(1);
    expect(aiUsedMany).toHaveBeenCalledWith({ tag: 'db' }, [
      { userId: lan, ...CYCLE },
      { userId: minh, start: new Date('2026-10-15T08:00:00.000Z'), end: new Date('2026-11-15T08:00:00.000Z') },
    ], NOW);
  });

  it('spreads learners over the buckets by the larger share of their two pools (plan numbers 300 and 100)', async () => {
    const ids = [1, 2, 3, 4, 5, 6].map(uuid);
    const { service } = setup(
      Object.fromEntries(ids.map((id) => [id, { subscriptions: [sub()] }])),
      {
        // 0 used; 30/300 = 10 %; lookups 49/100 = 49 %; lookups 80/100 = 80 %; practice 300/300 = 100 %; practice 40 % but lookups 100 %.
        [ids[1]]: used(30), [ids[2]]: used(0, 49), [ids[3]]: used(10, 80), [ids[4]]: used(300, 2), [ids[5]]: used(120, 100),
      },
    );
    const view = await service.aiUsagePro();
    expect(view.pro_learners).toBe(6);
    expect(counts(view)).toEqual([1, 2, 0, 1, 2]);
  });

  it('a learner at exactly 100 % of one pool is in the 100 bucket; one unit less is in 80–99', async () => {
    const [a, b] = [uuid(1), uuid(2)];
    const { service } = setup({ [a]: { subscriptions: [sub()] }, [b]: { subscriptions: [sub()] } }, { [a]: used(0, 100), [b]: used(0, 99) });
    expect(counts(await service.aiUsagePro())).toEqual([0, 0, 0, 1, 1]);
  });

  it('a custom limits grant replaces the plan’s numbers for its keys, as the resolver does', async () => {
    const [custom, plain] = [uuid(1), uuid(2)];
    const { service } = setup({
      // Plan 300 practice units, but this learner was given 20: 20 used is a full limit.
      [custom]: { subscriptions: [sub()], grants: [grant({ id: 'g1', kind: 'limits', limits: { ai_practice_per_cycle: 20 } })] },
      [plain]: { subscriptions: [sub()] },
    }, { [custom]: used(20), [plain]: used(20) });
    expect(counts(await service.aiUsagePro())).toEqual([0, 1, 0, 0, 1]);
  });

  it('a Pro plan grant without a subscription counts; its cycle starts at the grant start', async () => {
    const lan = uuid(1);
    const { service, aiUsedMany } = setup({ [lan]: { grants: [grant()] } }, { [lan]: used(150) });
    const view = await service.aiUsagePro();
    expect(view.pro_learners).toBe(1);
    expect(counts(view)).toEqual([0, 0, 1, 0, 0]);
    expect(aiUsedMany).toHaveBeenCalledWith({ tag: 'db' }, [
      { userId: lan, start: new Date('2026-10-10T00:00:00.000Z'), end: new Date('2026-11-10T00:00:00.000Z') },
    ], NOW);
  });

  it('only the Pro plan counts: a candidate whose subscription is on hold or a trial is left out', async () => {
    const [pro, overdue, trial, free] = [uuid(1), uuid(2), uuid(3), uuid(4)];
    const { service, aiUsedMany } = setup({
      [pro]: { subscriptions: [sub()] },
      // Past its end plus 3 grace days with no event: on hold, so Free.
      [overdue]: { subscriptions: [sub({ id: 's2', currentPeriodEnd: new Date('2026-10-10T00:00:00.000Z') })] },
      [trial]: { subscriptions: [sub({ id: 's3', status: 'trialing', trialEndsAt: new Date('2026-10-25T00:00:00.000Z') })] },
      [free]: {},
    });
    const view = await service.aiUsagePro();
    expect(view.pro_learners).toBe(1);
    expect(aiUsedMany).toHaveBeenCalledWith({ tag: 'db' }, [{ userId: pro, ...CYCLE }], NOW);
  });

  it('a Pro learner with no quota anchor has no cycle: used 0, and no usage is asked for them', async () => {
    const lan = uuid(1);
    const { service, aiUsedMany } = setup({ [lan]: { subscriptions: [sub({ quotaAnchorAt: null })] } });
    const view = await service.aiUsagePro();
    expect(counts(view)).toEqual([1, 0, 0, 0, 0]);
    expect(aiUsedMany).not.toHaveBeenCalled();
  });

  it('a Pro learner whose limits are both 0 is a Pro learner in no_limit and in no bucket', async () => {
    const lan = uuid(1);
    const { service } = setup({
      [lan]: { subscriptions: [sub()], grants: [grant({ id: 'g1', kind: 'limits', limits: { ai_practice_per_cycle: 0, ai_lookup_per_cycle: 0 } })] },
    });
    const view = await service.aiUsagePro();
    expect(view).toMatchObject({ pro_learners: 1, no_limit: 1 });
    expect(counts(view)).toEqual([0, 0, 0, 0, 0]);
  });

  it('truncation: it reads one candidate more than the cap, resolves only the first 5000 and says truncated', async () => {
    const ids = Array.from({ length: 5001 }, (_, i) => uuid(i + 1));
    const { service, candidates, loadMany } = setup(Object.fromEntries(ids.map((id) => [id, { subscriptions: [sub()] }])));
    const view = await service.aiUsagePro();
    expect(candidates).toHaveBeenCalledWith({ tag: 'db' }, NOW, 5001);
    expect(loadMany.mock.calls[0][1]).toHaveLength(5000);
    expect(view).toMatchObject({ truncated: true, pro_learners: 5000 });
  });

  it('exactly 5000 candidates is not truncated', async () => {
    const ids = Array.from({ length: 5000 }, (_, i) => uuid(i + 1));
    const { service } = setup(Object.fromEntries(ids.map((id) => [id, { subscriptions: [sub()] }])));
    expect(await service.aiUsagePro()).toMatchObject({ truncated: false, pro_learners: 5000 });
  });
});
