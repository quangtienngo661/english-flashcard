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

type Row = Record<string, unknown> & { externalSubscriptionId: string };

/** The fake provider's own table, in memory. */
function fakeTable() {
  const rows = new Map<string, Row>();
  return {
    rows,
    findUnique: vi.fn(async ({ where }: { where: { externalSubscriptionId: string } }) => {
      const row = rows.get(where.externalSubscriptionId);
      return row ? structuredClone(row) : null;
    }),
    createMany: vi.fn(async ({ data }: { data: Row[] }) => {
      for (const row of data) if (!rows.has(row.externalSubscriptionId)) rows.set(row.externalSubscriptionId, structuredClone(row));
      return { count: data.length };
    }),
    updateMany: vi.fn(async ({ where, data }: { where: { externalSubscriptionId: string }; data: Record<string, unknown> }) => {
      const row = rows.get(where.externalSubscriptionId);
      if (row) Object.assign(row, structuredClone(data));
      return { count: row ? 1 : 0 };
    }),
  };
}

function setup(options: { fakeEnabled?: boolean; fakeFetchState?: boolean } = {}) {
  const table = fakeTable();
  const prisma = { fakeBillingSubscription: table } as unknown as PrismaClient;
  const config = testConfig({
    billing: { production: false, fakeEnabled: options.fakeEnabled ?? true, fakeSecret: SECRET, fakeFetchState: options.fakeFetchState ?? true },
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
let seq = 0;
const ev = (type: string, occurredAt: string, fields: Record<string, unknown> = {}) =>
  ({ ...base, id: `evt-${++seq}`, type, occurred_at: occurredAt, ...fields });
const monthly = (tx: string, occurredAt = '2026-11-15T10:00:00.000Z') => ev('subscription_started', occurredAt, {
  interval: 'month', current_period_start: '2026-11-15T10:00:00.000Z', current_period_end: '2026-12-15T10:00:00.000Z', transaction_id: tx,
});
const trial = ev('subscription_started', '2026-11-15T10:00:00.000Z', {
  interval: 'month', current_period_start: '2026-11-15T10:00:00.000Z', current_period_end: '2026-11-22T10:00:00.000Z',
  trial_ends_at: '2026-11-22T10:00:00.000Z',
});

async function stateAfter(...events: unknown[]) {
  const ctx = setup();
  for (const event of events) await ctx.adapter.verify(signedPost(event));
  return { ...ctx, state: await ctx.adapter.fetchState!('sub-1'), row: ctx.table.rows.get('sub-1') };
}

describe('FakeBillingAdapter.verify (design §9.1)', () => {
  it('a wrong signature → ok false, nothing read or written', async () => {
    const { adapter, table } = setup();
    const req = signedPost(trial);
    req.headers['x-fake-signature'] = fakeSign(randomBytes(32), req.rawBody);
    expect(await adapter.verify(req)).toEqual({ ok: false });
    expect(table.findUnique).not.toHaveBeenCalled();
  });

  it('a signed batch → its parsed events, and a new subscription is stored as the provider truth', async () => {
    const { adapter, table } = setup();
    const result = await adapter.verify(signedPost(trial, { ...trial, id: 'evt-x', type: 'mystery' }));
    expect(result).toMatchObject({ ok: true, skipped: 1, events: [{ externalEventId: trial.id, type: 'subscription_started' }] });
    expect(table.rows.get('sub-1')).toMatchObject({
      externalSubscriptionId: 'sub-1', userId: USER, status: 'trialing', interval: 'month',
      currentPeriodStart: at('2026-11-15T10:00:00.000Z'), currentPeriodEnd: at('2026-11-22T10:00:00.000Z'),
      trialEndsAt: at('2026-11-22T10:00:00.000Z'), cancelAtPeriodEnd: false, currentTransactionId: null,
      lastOccurredAt: at('2026-11-15T10:00:00.000Z'),
    });
  });

  it('a signed body that is not a batch is acked with one skipped entry, not refused as a bad signature', async () => {
    const { adapter } = setup();
    const rawBody = Buffer.from('not json');
    const req: BillingRequest = { method: 'POST', headers: { 'x-fake-signature': fakeSign(SECRET, rawBody) }, query: {}, rawBody };
    expect(await adapter.verify(req)).toEqual({ ok: true, events: [], skipped: 1 });
  });

  it('B5#10 setup: an older event arriving late does not overwrite a newer one (the truth follows occurred_at)', async () => {
    const { state } = await stateAfter(monthly('tx-1'), ev('renewed', '2026-12-15T10:00:00.000Z', {
      transaction_id: 'tx-2', interval: 'month', current_period_start: '2026-12-15T10:00:00.000Z', current_period_end: '2027-01-15T10:00:00.000Z',
    }), ev('expired', '2026-12-01T00:00:00.000Z'));
    expect(state).toMatchObject({ status: 'active', currentPeriodEnd: at('2027-01-15T10:00:00.000Z') });
  });

  it('a newer event updates the fake state', async () => {
    const { state, row } = await stateAfter(monthly('tx-1'), ev('cancel_scheduled', '2026-11-19T10:00:00.000Z'));
    expect(state).toMatchObject({ status: 'active', cancelAtPeriodEnd: true });
    expect(row).toMatchObject({ lastOccurredAt: at('2026-11-19T10:00:00.000Z'), currentTransactionId: 'tx-1' });
  });

  it('the same event twice is folded once', async () => {
    const started = monthly('tx-1');
    const { row } = await stateAfter(started, started);
    expect(row!.history).toHaveLength(1);
  });

  it('an event with missing fields, an unknown user, or no fake row to change writes nothing', async () => {
    const { adapter, table } = setup();
    await adapter.verify(signedPost(
      ev('renewed', '2026-11-19T10:00:00.000Z'),
      { ...trial, id: 'evt-5', app_user_id: 'not-a-uuid' },
      ev('expired', '2026-11-19T10:00:00.000Z'),
    ));
    expect(table.rows.size).toBe(0);
  });

  it('ack → 200 with the count received', () => {
    expect(setup().adapter.ack({ received: 3 })).toEqual({ status: 200, body: { received: 3 } });
  });
});

describe('fake provider truth for refunds (D34, D37, D39)', () => {
  it('B5#33: a refund of the current transaction → revoked', async () => {
    const { state } = await stateAfter(monthly('tx-1'), ev('refunded', '2026-11-19T10:00:00.000Z', { transaction_id: 'tx-1' }));
    expect(state!.status).toBe('revoked');
  });

  it('D34: a refund of another transaction leaves the state as it is', async () => {
    const { state } = await stateAfter(monthly('tx-1'), ev('refunded', '2026-11-19T10:00:00.000Z', { transaction_id: 'tx-old' }));
    expect(state!.status).toBe('active');
  });

  it('B5#12: refund_reversed of the current transaction → active inside the period, expired after it', async () => {
    const refund = ev('refunded', '2026-11-19T10:00:00.000Z', { transaction_id: 'tx-1' });
    const inside = await stateAfter(monthly('tx-1'), refund, ev('refund_reversed', '2026-11-20T10:00:00.000Z', { transaction_id: 'tx-1' }));
    expect(inside.state!.status).toBe('active');
    const after = await stateAfter(monthly('tx-1'), refund, ev('refund_reversed', '2026-12-20T10:00:00.000Z', { transaction_id: 'tx-1' }));
    expect(after.state!.status).toBe('expired');
  });

  it('renewed and plan_changed make their transaction the current one', async () => {
    const { row } = await stateAfter(monthly('tx-1'), ev('plan_changed', '2026-11-19T10:00:00.000Z', {
      transaction_id: 'y-1', interval: 'year', current_period_start: '2026-11-19T10:00:00.000Z', current_period_end: '2027-11-19T10:00:00.000Z',
    }));
    expect(row).toMatchObject({ currentTransactionId: 'y-1', interval: 'year' });
  });

  it('B5E102: refunded m1 received before plan_changed y1 (which happened first) → the fake ends active yearly, like Apple', async () => {
    const planChanged = ev('plan_changed', '2026-11-19T10:00:00.000Z', {
      transaction_id: 'y-1', interval: 'year', current_period_start: '2026-11-19T10:00:00.000Z', current_period_end: '2027-11-19T10:00:00.000Z',
    });
    const refund = ev('refunded', '2026-11-19T10:05:00.000Z', { transaction_id: 'm-1' });
    const refundFirst = await stateAfter(monthly('m-1'), refund);
    expect(refundFirst.state!.status).toBe('revoked');
    await refundFirst.adapter.verify(signedPost(planChanged));
    expect(await refundFirst.adapter.fetchState!('sub-1')).toMatchObject({ status: 'active', interval: 'year' });
  });
});

describe('FakeBillingAdapter optional methods', () => {
  it('fetchState reads the fake table; no row → null', async () => {
    const { state } = await stateAfter(monthly('tx-1'));
    expect(state).toEqual({
      status: 'active', interval: 'month', currentPeriodStart: at('2026-11-15T10:00:00.000Z'),
      currentPeriodEnd: at('2026-12-15T10:00:00.000Z'), trialEndsAt: null, cancelAtPeriodEnd: false,
    });
    expect(await setup().adapter.fetchState!('sub-9')).toBeNull();
  });

  it('R10: fetchState is absent when BILLING_FAKE_FETCH_STATE=false', () => {
    const { adapter } = setup({ fakeFetchState: false });
    expect(adapter.fetchState).toBeUndefined();
    expect(adapter.endTrialNow).toBeTypeOf('function');
  });

  it('endTrialNow and cancelAtPeriodEnd stamp their columns', async () => {
    const { adapter, table } = setup();
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
