import { randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../../common/clock/clock.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import { testConfig } from '../../../../test/support/test-config.js';
import { BillingAdapterRegistry } from '../billing-adapter.registry.js';
import type { ParsedEvent } from '../billing-adapter.js';
import { FakePayosAdapter } from './fake-payos.adapter.js';

const SECRET = randomBytes(32);
const NOW = new Date('2026-11-05T03:02:00.000Z');
const CODE = 1_000_000_123;
const order = {
  orderCode: CODE, amount: 199000, description: 'WM0XSNJKV', expiresAt: new Date('2026-11-05T03:17:00.000Z'),
  returnUrl: 'http://localhost:3001/vi/app/plans/order?order=o1', cancelUrl: 'http://localhost:3001/vi/app/plans/order?order=o1',
};

type Row = Record<string, unknown> & { orderCode: bigint | number };

/** The fake payOS's own table, in memory. */
function linksTable() {
  const rows = new Map<number, Row>();
  return {
    rows,
    create: vi.fn(async ({ data }: { data: Row }) => {
      rows.set(Number(data.orderCode), structuredClone({ ...data, orderCode: Number(data.orderCode) }));
      return data;
    }),
    findUnique: vi.fn(async ({ where }: { where: { orderCode: bigint | number } }) => {
      const row = rows.get(Number(where.orderCode));
      return row ? structuredClone(row) : null;
    }),
    update: vi.fn(async ({ where, data }: { where: { orderCode: bigint | number }; data: Record<string, unknown> }) => {
      const row = rows.get(Number(where.orderCode));
      if (!row) throw new Error('no such link');
      Object.assign(row, structuredClone(data));
      return structuredClone(row);
    }),
  };
}

function setup(options: { mode?: 'fake' | 'real' | 'off' } = {}) {
  const table = linksTable();
  const prisma = { fakePayosLink: table } as unknown as PrismaClient;
  const config = testConfig({
    billing: { production: false, fakeEnabled: false, fakeSecret: SECRET, fakeFetchState: true },
    payos: { mode: options.mode ?? 'fake', clientId: null, apiKey: null, checksumKey: null },
    problemTypeBase: 'http://localhost:3000/problems/',
  });
  const registry = new BillingAdapterRegistry();
  const stored: ParsedEvent[][] = [];
  const inbox = { store: vi.fn(async (_provider: string, events: ParsedEvent[]) => { stored.push(events); return events.map((_, i) => `id-${stored.length}-${i}`); }) };
  const applier = { applyMany: vi.fn(async () => {}) };
  const adapter = new FakePayosAdapter(config, prisma, new FakeClock(NOW), registry, inbox as never, applier as never);
  return { adapter, table, registry, inbox, applier, stored };
}

describe('FakePayosAdapter links (design §3.3)', () => {
  it('createCheckout stores the link and points at the fake page on the API origin', async () => {
    const { adapter, table } = setup();
    const result = await adapter.createCheckout(order);
    expect(result.checkoutUrl).toBe(`http://localhost:3000/v1/dev/payos/checkout?order=${CODE}`);
    expect(result.paymentLinkId).toMatch(/^fake-link-/);
    expect(table.rows.get(CODE)).toMatchObject({
      paymentLinkId: result.paymentLinkId, amount: 199000, status: 'PENDING', returnUrl: order.returnUrl, cancelUrl: order.cancelUrl, transactions: [],
    });
  });

  it('getCheckout reads the table, so a second instance (the worker) sees the same truth', async () => {
    const { adapter, table, registry } = setup();
    await adapter.createCheckout(order);
    const worker = new FakePayosAdapter(testConfig({ payos: { mode: 'fake', clientId: null, apiKey: null, checksumKey: null }, billing: { production: false, fakeEnabled: false, fakeSecret: SECRET, fakeFetchState: true } }),
      { fakePayosLink: table } as unknown as PrismaClient, new FakeClock(NOW), registry);
    expect(await worker.getCheckout(CODE)).toEqual({ status: 'PENDING', amount: 199000, amountPaid: 0, transactions: [] });
    expect(await worker.getCheckout(CODE + 1)).toBeNull();
  });

  it('cancelCheckout sets CANCELLED; a missing link is an error, like payOS', async () => {
    const { adapter } = setup();
    await adapter.createCheckout(order);
    await adapter.cancelCheckout(CODE);
    expect((await adapter.getCheckout(CODE))?.status).toBe('CANCELLED');
    await expect(adapter.cancelCheckout(CODE + 1)).rejects.toThrow();
  });

  it('is registered as "payos" only in fake mode', () => {
    for (const [mode, registered] of [['fake', true], ['real', false], ['off', false]] as const) {
      const { adapter, registry } = setup({ mode });
      adapter.onModuleInit();
      expect(registry.get('payos') === adapter, mode).toBe(registered);
    }
  });
});

describe('FakePayosAdapter.pay (the page buttons "Đã trả" and "Trả thiếu")', () => {
  it('"Đã trả" records the whole amount, makes the link PAID, and delivers a signed webhook that the inbox stores and the applier gets', async () => {
    const { adapter, inbox, applier, stored } = setup();
    await adapter.createCheckout(order);
    const link = await adapter.pay(CODE, 'full', { webhook: true });
    expect(link).toMatchObject({ status: 'PAID' });
    const state = await adapter.getCheckout(CODE);
    expect(state).toMatchObject({ status: 'PAID', amount: 199000, amountPaid: 199000 });
    expect(state?.transactions).toHaveLength(1);
    expect(state?.transactions[0]).toMatchObject({ amount: 199000, transactionDateTime: '2026-11-05 10:02:00' });
    // The webhook went through verify (so the signature was right) and carries the same reference as the transaction.
    expect(inbox.store).toHaveBeenCalledTimes(1);
    expect(stored[0]).toHaveLength(1);
    expect(stored[0][0]).toMatchObject({
      type: 'payment_succeeded', environment: 'sandbox', externalEventId: `${CODE}:${state?.transactions[0].reference}`,
      event: { orderCode: CODE, amount: 199000, paymentLinkId: expect.stringMatching(/^fake-link-/), success: true, code: '00', source: 'webhook' },
    });
    expect(applier.applyMany).toHaveBeenCalledWith(['id-1-0']);
  });

  it('"Trả thiếu" pays half, leaves the link UNDERPAID, and still sends a webhook for that amount', async () => {
    const { adapter, stored } = setup();
    await adapter.createCheckout(order);
    await adapter.pay(CODE, 'short', { webhook: true });
    const state = await adapter.getCheckout(CODE);
    expect(state).toMatchObject({ status: 'UNDERPAID', amountPaid: 99500 });
    expect(stored[0][0].event).toMatchObject({ amount: 99500 });
  });

  it('paying the rest after "Trả thiếu" brings the sum to the amount and the link to PAID', async () => {
    const { adapter } = setup();
    await adapter.createCheckout(order);
    await adapter.pay(CODE, 'short', { webhook: true });
    await adapter.pay(CODE, 'full', { webhook: true });
    expect(await adapter.getCheckout(CODE)).toMatchObject({ status: 'PAID', amountPaid: 199000 });
  });

  it('each payment gets its own reference, also two in the same second', async () => {
    const { adapter } = setup();
    await adapter.createCheckout(order);
    await adapter.pay(CODE, 'short', { webhook: false });
    await adapter.pay(CODE, 'short', { webhook: false });
    const references = (await adapter.getCheckout(CODE))?.transactions.map((t) => t.reference) ?? [];
    expect(new Set(references).size).toBe(2);
  });

  it('webhook: false writes the transaction and nothing else (the "late webhook" scenario of the smoke)', async () => {
    const { adapter, inbox, applier } = setup();
    await adapter.createCheckout(order);
    await adapter.pay(CODE, 'full', { webhook: false });
    expect(await adapter.getCheckout(CODE)).toMatchObject({ status: 'PAID', amountPaid: 199000 });
    expect(inbox.store).not.toHaveBeenCalled();
    expect(applier.applyMany).not.toHaveBeenCalled();
  });

  it('a link that does not exist gives null and writes nothing', async () => {
    const { adapter, inbox } = setup();
    expect(await adapter.pay(CODE, 'full', { webhook: true })).toBeNull();
    expect(inbox.store).not.toHaveBeenCalled();
  });

  it('a cancelled link cannot be paid (the page offers no payment after "Hủy")', async () => {
    const { adapter, inbox } = setup();
    await adapter.createCheckout(order);
    await adapter.cancelCheckout(CODE);
    expect(await adapter.pay(CODE, 'full', { webhook: true })).toBeNull();
    expect(await adapter.getCheckout(CODE)).toMatchObject({ status: 'CANCELLED', amountPaid: 0 });
    expect(inbox.store).not.toHaveBeenCalled();
  });
});

describe('FakePayosAdapter.verify', () => {
  it('refuses a body that is not signed with BILLING_FAKE_SECRET', async () => {
    const { adapter } = setup();
    expect(await adapter.verify({ method: 'POST', headers: {}, query: {}, rawBody: Buffer.from('{"data":{},"signature":"x"}') })).toEqual({ ok: false });
  });
});
