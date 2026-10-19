import { randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../../common/clock/clock.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import { testConfig } from '../../../../test/support/test-config.js';
import { BillingAdapterRegistry } from '../billing-adapter.registry.js';
import type { BillingRequest } from '../billing-adapter.js';
import { FakeBillingAdapter } from './fake-billing.adapter.js';
import { fakeSign } from './fake-wire.js';

const SECRET = randomBytes(32);
const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const NOW = new Date('2026-11-20T08:00:00.000Z');
const at = (iso: string) => new Date(iso);

type Row = {
  externalSubscriptionId: string;
  userId: string;
  status: string;
  interval: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  lastOccurredAt: Date;
};

function setup(options: { row?: Row | null; fakeEnabled?: boolean; fakeFetchState?: boolean } = {}) {
  const table = {
    findUnique: vi.fn().mockResolvedValue(options.row ?? null),
    createMany: vi.fn().mockResolvedValue({ count: 1 }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const prisma = { fakeBillingSubscription: table } as unknown as PrismaClient;
  const config = testConfig({
    billing: {
      production: false,
      fakeEnabled: options.fakeEnabled ?? true,
      fakeSecret: SECRET,
      fakeFetchState: options.fakeFetchState ?? true,
    },
  });
  const registry = new BillingAdapterRegistry();
  const adapter = new FakeBillingAdapter(config, prisma, new FakeClock(NOW), registry);
  return { adapter, table, registry };
}

function signedPost(...events: unknown[]): BillingRequest {
  const rawBody = Buffer.from(JSON.stringify({ events }));
  return { method: 'POST', headers: { 'x-fake-signature': fakeSign(SECRET, rawBody) }, query: {}, rawBody };
}

const base = { environment: 'sandbox', subscription_id: 'sub-1', app_user_id: USER };
const started = {
  ...base,
  id: 'evt-1',
  type: 'subscription_started',
  occurred_at: '2026-11-15T10:00:00.000Z',
  interval: 'month',
  current_period_start: '2026-11-15T10:00:00.000Z',
  current_period_end: '2026-11-22T10:00:00.000Z',
  trial_ends_at: '2026-11-22T10:00:00.000Z',
};
const ROW: Row = {
  externalSubscriptionId: 'sub-1',
  userId: USER,
  status: 'active',
  interval: 'month',
  currentPeriodStart: at('2026-11-15T10:00:00.000Z'),
  currentPeriodEnd: at('2026-12-15T10:00:00.000Z'),
  trialEndsAt: null,
  cancelAtPeriodEnd: false,
  lastOccurredAt: at('2026-11-18T10:00:00.000Z'),
};

describe('FakeBillingAdapter.verify (design §9.1)', () => {
  it('a wrong signature → ok false, nothing read or written', async () => {
    const { adapter, table } = setup();
    const req = signedPost(started);
    req.headers['x-fake-signature'] = fakeSign(randomBytes(32), req.rawBody);
    expect(await adapter.verify(req)).toEqual({ ok: false });
    expect(table.findUnique).not.toHaveBeenCalled();
  });

  it('a signed batch → its parsed events, and a new subscription is stored as the provider truth', async () => {
    const { adapter, table } = setup();
    const result = await adapter.verify(signedPost(started, { ...started, id: 'evt-x', type: 'mystery' }));
    expect(result).toMatchObject({ ok: true, skipped: 1, events: [{ externalEventId: 'evt-1', type: 'subscription_started' }] });
    expect(table.createMany).toHaveBeenCalledWith({
      data: [{
        externalSubscriptionId: 'sub-1',
        userId: USER,
        status: 'trialing',
        interval: 'month',
        currentPeriodStart: at('2026-11-15T10:00:00.000Z'),
        currentPeriodEnd: at('2026-11-22T10:00:00.000Z'),
        trialEndsAt: at('2026-11-22T10:00:00.000Z'),
        cancelAtPeriodEnd: false,
        lastOccurredAt: at('2026-11-15T10:00:00.000Z'),
      }],
      skipDuplicates: true,
    });
  });

  it('a signed body that is not a batch is acked with one skipped entry, not refused as a bad signature', async () => {
    const { adapter } = setup();
    const rawBody = Buffer.from('not json');
    const req: BillingRequest = { method: 'POST', headers: { 'x-fake-signature': fakeSign(SECRET, rawBody) }, query: {}, rawBody };
    expect(await adapter.verify(req)).toEqual({ ok: true, events: [], skipped: 1 });
  });

  it('B5#10 setup: an older event does not overwrite the fake state', async () => {
    const { adapter, table } = setup({ row: ROW });
    await adapter.verify(signedPost({ ...base, id: 'evt-2', type: 'expired', occurred_at: '2026-11-17T10:00:00.000Z' }));
    expect(table.updateMany).not.toHaveBeenCalled();
    expect(table.createMany).not.toHaveBeenCalled();
  });

  it('a newer event updates the fake state, guarded by last_occurred_at', async () => {
    const { adapter, table } = setup({ row: ROW });
    await adapter.verify(signedPost({ ...base, id: 'evt-3', type: 'cancel_scheduled', occurred_at: '2026-11-19T10:00:00.000Z' }));
    expect(table.updateMany).toHaveBeenCalledWith({
      where: { externalSubscriptionId: 'sub-1', lastOccurredAt: { lte: at('2026-11-19T10:00:00.000Z') } },
      data: {
        status: 'active',
        interval: 'month',
        currentPeriodStart: ROW.currentPeriodStart,
        currentPeriodEnd: ROW.currentPeriodEnd,
        trialEndsAt: null,
        cancelAtPeriodEnd: true,
        lastOccurredAt: at('2026-11-19T10:00:00.000Z'),
      },
    });
  });

  it('an event with missing fields, an unknown user, or no fake row to change writes nothing', async () => {
    const { adapter, table } = setup();
    await adapter.verify(
      signedPost(
        { ...base, id: 'evt-4', type: 'renewed', occurred_at: '2026-11-19T10:00:00.000Z' },
        { ...started, id: 'evt-5', app_user_id: 'not-a-uuid' },
        { ...base, id: 'evt-6', type: 'expired', occurred_at: '2026-11-19T10:00:00.000Z' },
      ),
    );
    expect(table.createMany).not.toHaveBeenCalled();
    expect(table.updateMany).not.toHaveBeenCalled();
  });

  it('ack → 200 with the count received', () => {
    expect(setup().adapter.ack({ received: 3 })).toEqual({ status: 200, body: { received: 3 } });
  });
});

describe('FakeBillingAdapter optional methods', () => {
  it('fetchState reads the fake table; no row → null', async () => {
    const { adapter, table } = setup({ row: ROW });
    expect(await adapter.fetchState!('sub-1')).toEqual({
      status: 'active',
      interval: 'month',
      currentPeriodStart: ROW.currentPeriodStart,
      currentPeriodEnd: ROW.currentPeriodEnd,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
    });
    expect(table.findUnique).toHaveBeenCalledWith({ where: { externalSubscriptionId: 'sub-1' } });
    expect(await setup().adapter.fetchState!('sub-9')).toBeNull();
  });

  it('R10: fetchState is absent when BILLING_FAKE_FETCH_STATE=false', () => {
    const { adapter } = setup({ fakeFetchState: false });
    expect(adapter.fetchState).toBeUndefined();
    expect(adapter.endTrialNow).toBeTypeOf('function');
  });

  it('endTrialNow and cancelAtPeriodEnd stamp their columns', async () => {
    const { adapter, table } = setup({ row: ROW });
    await adapter.endTrialNow('sub-1');
    expect(table.updateMany).toHaveBeenCalledWith({
      where: { externalSubscriptionId: 'sub-1' },
      data: { endTrialCalledAt: NOW, status: 'active' },
    });
    await adapter.cancelAtPeriodEnd('sub-1');
    expect(table.updateMany).toHaveBeenLastCalledWith({
      where: { externalSubscriptionId: 'sub-1' },
      data: { cancelCalledAt: NOW, cancelAtPeriodEnd: true },
    });
  });

  it('registers itself only when BILLING_FAKE_ENABLED=true', () => {
    const on = setup();
    on.adapter.onModuleInit();
    expect(on.registry.get('fake')).toBe(on.adapter);
    const off = setup({ fakeEnabled: false });
    off.adapter.onModuleInit();
    expect(off.registry.get('fake')).toBeUndefined();
  });
});
