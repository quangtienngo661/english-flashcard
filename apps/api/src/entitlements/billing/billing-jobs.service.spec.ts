import { describe, expect, it, vi } from 'vitest';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { BILLING_MAX_ATTEMPTS, BILLING_PENDING_RETRY_MS, RAW_PAYLOAD_RETENTION_DAYS, REFUND_REFETCH_DAYS } from '../entitlements.constants.js';
import { BillingAdapter } from './billing-adapter.js';
import { BillingAdapterRegistry } from './billing-adapter.registry.js';
import { BillingJobs } from './billing-jobs.service.js';
import type { FetchedState } from './billing.types.js';

const NOW = new Date('2026-11-20T12:00:00.000Z');
const DAY = 86_400_000;
const at = (iso: string) => new Date(iso);

type Sub = Record<string, unknown> & { id: string; status: string; updatedAt: Date; provider: string };

function subRow(fields: Partial<Sub> = {}): Sub {
  return {
    id: 'sub-1', userId: 'u-1', provider: 'fake', environment: 'sandbox', externalSubscriptionId: 'ext-1', status: 'active',
    interval: 'month', trialEndsAt: null, trialDenied: false, paymentFingerprint: null,
    currentPeriodStart: at('2026-10-17T12:00:00.000Z'), currentPeriodEnd: at('2026-11-17T12:00:00.000Z'), graceEndsAt: null,
    cancelAtPeriodEnd: false, pendingInterval: null, quotaAnchorAt: at('2026-10-17T12:00:00.000Z'), currentTransactionId: 'tx-1',
    lastEventAt: at('2026-10-17T12:00:00.000Z'), updatedAt: at('2026-10-17T12:00:00.000Z'), ...fields,
  };
}

class Stub extends BillingAdapter {
  readonly provider = 'fake';
  async verify() { return { ok: false as const }; }
  ack() { return { status: 200 }; }
}

function setup(opts: { subs?: Sub[]; fetch?: (id: string) => Promise<FetchedState | null> } = {}) {
  const subs = opts.subs ?? [];
  const calls: string[] = [];
  const lockedByOther = new Set<string>();
  let inTx = false;
  const tx = {
    $queryRaw: async (_s: TemplateStringsArray, id: string) => {
      calls.push(`lock:${id}`);
      return lockedByOther.has(id) || !subs.some((s) => s.id === id) ? [] : [{ id }];
    },
    subscription: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = subs.find((s) => s.id === where.id);
        return row ? { ...row } : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        calls.push(`update:${where.id}`);
        Object.assign(subs.find((s) => s.id === where.id)!, data);
      },
    },
  };
  const prisma = {
    billingEvent: { findMany: vi.fn().mockResolvedValue([]) },
    subscription: { findMany: vi.fn(async ({ where }: { where: { status: unknown; updatedAt?: { gte: Date } } }) => subs
      .filter((s) => (where.status === 'revoked' ? s.status === 'revoked' && s.updatedAt >= where.updatedAt!.gte : s.status !== 'revoked'))
      .map((s) => ({ ...s }))) },
    $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => {
      inTx = true;
      try { return await fn(tx); } finally { inTx = false; }
    },
    $executeRaw: vi.fn().mockResolvedValue(3),
  };
  const registry = new BillingAdapterRegistry();
  const adapter = new Stub();
  if (opts.fetch) {
    const fetch = opts.fetch;
    adapter.fetchState = async (id) => { calls.push(`fetch(inTx=${inTx})`); return fetch(id); };
  }
  registry.register(adapter);
  const applier = { apply: vi.fn().mockResolvedValue('applied') };
  const settings = { get: vi.fn(async () => ({ entitlements: { graceDays: 7 } })) };
  const scheduler = { register: vi.fn() };
  const logs: LogEntry[] = [];
  const jobs = new BillingJobs(prisma as never, registry, settings as never, applier as never, scheduler as never,
    new AppLogger({ write: (e) => logs.push(e) }));
  return { jobs, prisma, applier, subs, calls, lockedByOther, scheduler, logs };
}

describe('BillingJobs.retryEvents (design §9.2 step 4, R19)', () => {
  it('picks failed rows under the attempt limit and pending rows older than 5 minutes, oldest first, at most 100', async () => {
    const { jobs, prisma, applier } = setup();
    prisma.billingEvent.findMany.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);
    expect(await jobs.retryEvents(NOW)).toBe(2);
    expect(prisma.billingEvent.findMany).toHaveBeenCalledWith({
      where: { OR: [
        { status: 'failed', attempts: { lt: BILLING_MAX_ATTEMPTS } },
        { status: 'pending', receivedAt: { lt: new Date(NOW.getTime() - BILLING_PENDING_RETRY_MS) } },
      ] },
      orderBy: { receivedAt: 'asc' },
      take: 100,
      select: { id: true },
    });
    expect(applier.apply.mock.calls).toEqual([['e1'], ['e2']]);
  });
});

describe('BillingJobs.timeTransitions (design §9.4 "Chuyển theo thời gian", D31)', () => {
  it('B5E50: a cancelled subscription past its period end → expired written', async () => {
    const { jobs, subs } = setup({ subs: [subRow({ cancelAtPeriodEnd: true })] });
    await jobs.timeTransitions(NOW);
    expect(subs[0]).toMatchObject({ status: 'expired', updatedAt: NOW });
  });

  it('B5E67/B5#29: active 3 days past the end with no event → stays; 9 days → on_hold', async () => {
    const three = setup({ subs: [subRow()] });
    await three.jobs.timeTransitions(NOW);
    expect(three.subs[0].status).toBe('active');
    expect(three.calls.filter((c) => c.startsWith('update'))).toEqual([]);

    const nine = setup({ subs: [subRow({ currentPeriodEnd: at('2026-11-11T12:00:00.000Z') })] });
    await nine.jobs.timeTransitions(NOW);
    expect(nine.subs[0].status).toBe('on_hold');
  });

  it('coordinator ruling: a grace row without grace_ends_at ends at period end + grace_days (effectiveStatus decides)', async () => {
    const ended = setup({ subs: [subRow({ status: 'grace', currentPeriodEnd: at('2026-11-12T12:00:00.000Z') })] });
    await ended.jobs.timeTransitions(NOW);
    expect(ended.subs[0].status).toBe('on_hold');
    const running = setup({ subs: [subRow({ status: 'grace' })] });
    await running.jobs.timeTransitions(NOW);
    expect(running.subs[0].status).toBe('grace');
  });

  it('the candidate query covers trialing, active and grace rows past any of their ends', async () => {
    const { jobs, prisma } = setup();
    await jobs.timeTransitions(NOW);
    expect(prisma.subscription.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: { in: ['trialing', 'active', 'grace'] },
        OR: [{ trialEndsAt: { lte: NOW } }, { currentPeriodEnd: { lte: NOW } }, { graceEndsAt: { lte: NOW } }],
      },
    }));
  });

  it('D31: fetchState is called before the row lock for an overdue row and its state is written', async () => {
    const fetched: FetchedState = { status: 'active', interval: 'month', currentPeriodStart: at('2026-11-17T12:00:00.000Z'),
      currentPeriodEnd: at('2026-12-17T12:00:00.000Z'), trialEndsAt: null, cancelAtPeriodEnd: false };
    const { jobs, subs, calls } = setup({ subs: [subRow()], fetch: async () => fetched });
    await jobs.timeTransitions(NOW);
    expect(calls[0]).toBe('fetch(inTx=false)');
    expect(calls.indexOf('fetch(inTx=false)')).toBeLessThan(calls.indexOf('lock:sub-1'));
    expect(subs[0]).toMatchObject({ status: 'active', currentPeriodEnd: at('2026-12-17T12:00:00.000Z'), currentTransactionId: null });
  });

  it('the fetched state is dropped when updated_at changed meanwhile; the row as read under the lock decides', async () => {
    const fetched: FetchedState = { status: 'active', interval: 'month', currentPeriodStart: null,
      currentPeriodEnd: at('2026-12-17T12:00:00.000Z'), trialEndsAt: null, cancelAtPeriodEnd: false };
    const holder: { subs?: Sub[] } = {};
    const ctx = setup({
      subs: [subRow({ currentPeriodEnd: at('2026-11-11T12:00:00.000Z') })],
      fetch: async () => {
        // An event changed the row between the candidate read and the lock: a cancel, newer period.
        Object.assign(holder.subs![0], { updatedAt: at('2026-11-20T11:00:00.000Z'), currentPeriodEnd: at('2026-12-11T12:00:00.000Z') });
        return fetched;
      },
    });
    holder.subs = ctx.subs;
    await ctx.jobs.timeTransitions(NOW);
    expect(ctx.subs[0]).toMatchObject({ status: 'active', currentPeriodEnd: at('2026-12-11T12:00:00.000Z') });
    expect(ctx.calls.filter((c) => c.startsWith('update'))).toEqual([]);
  });

  it('plan review #4: an additive renewed applied between the candidate read and the lock → the job writes nothing', async () => {
    const ctx = setup({ subs: [subRow({ currentPeriodEnd: at('2026-11-11T12:00:00.000Z') })] });
    const findMany = ctx.prisma.subscription.findMany;
    findMany.mockImplementationOnce(async () => {
      const candidate = { ...ctx.subs[0] };
      // Same last_event_at (older occurred_at), new period and updated_at.
      Object.assign(ctx.subs[0], { currentPeriodEnd: at('2026-12-11T12:00:00.000Z'), updatedAt: at('2026-11-20T11:30:00.000Z') });
      return [candidate];
    });
    await ctx.jobs.timeTransitions(NOW);
    expect(ctx.subs[0].status).toBe('active');
    expect(ctx.calls.filter((c) => c.startsWith('update'))).toEqual([]);
  });

  it('fetchState throwing for one subscription does not stop the others', async () => {
    const subs = [
      subRow({ id: 'a', externalSubscriptionId: 'ext-a', currentPeriodEnd: at('2026-11-11T12:00:00.000Z') }),
      subRow({ id: 'b', externalSubscriptionId: 'ext-b', currentPeriodEnd: at('2026-11-11T12:00:00.000Z') }),
    ];
    const { jobs, logs } = setup({ subs, fetch: async (id) => { if (id === 'ext-a') throw new Error('down'); return null; } });
    await jobs.timeTransitions(NOW);
    expect(subs.map((s) => s.status)).toEqual(['on_hold', 'on_hold']);
    expect(logs.filter((l) => l.event === 'billing_state_refetch_failed')).toHaveLength(2);
  });

  it('B5E60: a row locked by another run is skipped', async () => {
    const { jobs, subs, lockedByOther } = setup({ subs: [subRow({ cancelAtPeriodEnd: true })] });
    lockedByOther.add('sub-1');
    await jobs.timeTransitions(NOW);
    expect(subs[0].status).toBe('active');
  });
});

describe('BillingJobs.refetchRevoked (D39)', () => {
  const ACTIVE_STATE: FetchedState = { status: 'active', interval: 'year', currentPeriodStart: at('2026-11-10T00:00:00.000Z'),
    currentPeriodEnd: at('2027-11-10T00:00:00.000Z'), trialEndsAt: null, cancelAtPeriodEnd: false };
  const revoked = (fields: Partial<Sub> = {}) => subRow({ status: 'revoked', updatedAt: at('2026-11-19T12:00:00.000Z'), ...fields });

  it('B5E104: a row revoked within 3 days is asked again before its lock; the provider says active → active', async () => {
    const { jobs, subs, calls } = setup({ subs: [revoked()], fetch: async () => ACTIVE_STATE });
    await jobs.refetchRevoked(NOW);
    expect(calls.indexOf('fetch(inTx=false)')).toBeLessThan(calls.indexOf('lock:sub-1'));
    expect(subs[0]).toMatchObject({ status: 'active', interval: 'year', currentTransactionId: null, updatedAt: NOW });
  });

  it('B5E104: revoked more than 3 days ago → not asked', async () => {
    const asked: string[] = [];
    const { jobs, subs } = setup({
      subs: [revoked({ updatedAt: new Date(NOW.getTime() - REFUND_REFETCH_DAYS * DAY - 1) })],
      fetch: async (id) => { asked.push(id); return ACTIVE_STATE; },
    });
    await jobs.refetchRevoked(NOW);
    expect(REFUND_REFETCH_DAYS).toBe(3);
    expect(asked).toEqual([]);
    expect(subs[0].status).toBe('revoked');
  });

  it('B5E104: the provider also says revoked → kept, updated_at not moved (the 3-day window does not slide)', async () => {
    const { jobs, subs, calls } = setup({ subs: [revoked()], fetch: async () => ({ ...ACTIVE_STATE, status: 'revoked' }) });
    await jobs.refetchRevoked(NOW);
    expect(subs[0]).toMatchObject({ status: 'revoked', updatedAt: at('2026-11-19T12:00:00.000Z') });
    expect(calls.filter((c) => c.startsWith('update'))).toEqual([]);
  });

  it('a fetch failure is logged and the row stays revoked; the next hour asks again', async () => {
    let fail = true;
    const { jobs, subs, logs } = setup({ subs: [revoked()], fetch: async () => { if (fail) throw new Error('down'); return ACTIVE_STATE; } });
    await jobs.refetchRevoked(NOW);
    expect(subs[0].status).toBe('revoked');
    expect(logs.map((l) => l.event)).toContain('billing_state_refetch_failed');
    fail = false;
    await jobs.refetchRevoked(new Date(NOW.getTime() + 3_600_000));
    expect(subs[0].status).toBe('active');
  });

  it('the fetched state is dropped when the row changed meanwhile, and a row locked by another run is skipped', async () => {
    const holder: { subs?: Sub[] } = {};
    const changed = setup({ subs: [revoked()], fetch: async () => {
      holder.subs![0].updatedAt = at('2026-11-20T11:00:00.000Z');
      return ACTIVE_STATE;
    } });
    holder.subs = changed.subs;
    await changed.jobs.refetchRevoked(NOW);
    expect(changed.subs[0].status).toBe('revoked');

    const locked = setup({ subs: [revoked()], fetch: async () => ACTIVE_STATE });
    locked.lockedByOther.add('sub-1');
    await locked.jobs.refetchRevoked(NOW);
    expect(locked.subs[0].status).toBe('revoked');
  });

  it('an adapter without fetchState → nothing asked, stays revoked', async () => {
    const { jobs, subs, calls } = setup({ subs: [revoked()] });
    await jobs.refetchRevoked(NOW);
    expect(subs[0].status).toBe('revoked');
    expect(calls).toEqual([]);
  });
});

describe('BillingJobs.cleanupRawPayloads (R23)', () => {
  it('B5E92: clears raw_payload of events received more than 90 days ago', async () => {
    const { jobs, prisma } = setup();
    expect(await jobs.cleanupRawPayloads(NOW)).toBe(3);
    const [strings, cutoff] = prisma.$executeRaw.mock.calls[0];
    expect(strings.join('?')).toContain('SET raw_payload = NULL');
    expect(strings.join('?')).toContain('raw_payload IS NOT NULL');
    expect(cutoff).toEqual(new Date(NOW.getTime() - RAW_PAYLOAD_RETENTION_DAYS * DAY));
    expect(RAW_PAYLOAD_RETENTION_DAYS).toBe(90);
  });
});

describe('BillingJobs registration', () => {
  it('registers four maintenance jobs', () => {
    const { jobs, scheduler } = setup();
    jobs.onModuleInit();
    expect(scheduler.register.mock.calls.map(([name]) => name)).toEqual(
      ['billing-events-retry', 'subscriptions-time', 'billing-refund-refetch', 'billing-raw-payload-cleanup'],
    );
  });
});
