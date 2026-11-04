import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { testConfig } from '../../../test/support/test-config.js';
import { BillingAdapterRegistry } from '../billing/billing-adapter.registry.js';
import type { BillingAdapter, CheckoutState, ParsedEvent } from '../billing/billing-adapter.js';
import type { OrderPaymentPayload } from '../billing/billing.types.js';
import { OrdersReconcileJob } from './orders-reconcile.job.js';
import { OrdersReconcileService, type ReconcileOrder } from './orders-reconcile.service.js';

const NOW = new Date('2026-11-05T04:00:00.000Z');
const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const CODE = 1_000_000_123;
const minutes = (n: number) => n * 60_000;

const order = (over: Partial<ReconcileOrder> = {}): ReconcileOrder => ({
  id: 'order-1', userId: USER, status: 'pending', orderCode: CODE, paymentLinkId: 'link-1',
  expiresAt: new Date(NOW.getTime() - minutes(30)), createdAt: new Date(NOW.getTime() - minutes(60)), ...over,
});
const state = (over: Partial<CheckoutState> = {}): CheckoutState => ({ status: 'PENDING', amount: 79000, amountPaid: 0, transactions: [], ...over });
const tx = (reference: string, amount = 79000) => ({
  reference, amount, transactionDateTime: '2026-11-05 10:02:00',
  payer: { counterAccountName: 'NGUYEN THI LAN', counterAccountNumber: '0123456789', counterAccountBankName: 'MB Bank' },
});

/** The order table in memory, and `transition` like the repository's conditional UPDATE. */
function setup(opts: { account?: 'production' | 'sandbox'; stored?: Partial<ReconcileOrder>; getCheckout?: () => Promise<CheckoutState | null>; withAdapter?: boolean } = {}) {
  const stored = order(opts.stored);
  const row = { ...stored };
  const calls: string[] = [];
  let inTx = false;
  const transitions: Array<{ id: string; from: string; to: Record<string, unknown> }> = [];
  const orders = {
    lock: vi.fn(async (_db: unknown, id: string) => { calls.push(`lock-order:${id}`); return { ...row, orderCode: row.orderCode } as never; }),
    transition: vi.fn(async (_db: unknown, id: string, from: string, data: Record<string, unknown>) => {
      calls.push(`transition:${from}->${String(data.status)}`);
      transitions.push({ id, from, to: data });
      if (row.status !== from) return false;
      Object.assign(row, data);
      return true;
    }),
  };
  const answer = opts.getCheckout ?? (async () => state());
  const getCheckout = vi.fn(async (_code: number): Promise<CheckoutState | null> => answer());
  const cancelCheckout = vi.fn(async (_code: number) => { calls.push(`cancel(inTx=${inTx})`); });
  const registry = new BillingAdapterRegistry();
  if (opts.withAdapter !== false) {
    registry.register({
      provider: 'payos',
      getCheckout: async (code: number) => { calls.push(`get(inTx=${inTx})`); return getCheckout(code); },
      cancelCheckout,
    } as unknown as BillingAdapter);
  }
  const stores: ParsedEvent[][] = [];
  const inbox = { store: vi.fn(async (_provider: string, events: ParsedEvent[]) => { stores.push(events); return events.map((_, i) => `evt-${stores.length}-${i}`); }) };
  const applier = { applyMany: vi.fn(async (_ids: string[]) => {}) };
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => logs.push(entry) });
  const prisma = { $transaction: vi.fn(async <T>(fn: (client: unknown) => Promise<T>) => { inTx = true; try { return await fn({ $executeRaw: async (_s: TemplateStringsArray, ...v: unknown[]) => { calls.push(`lock-user:${String(v[0]).replace('entitlements.user:', '')}`); return 1; } }); } finally { inTx = false; } }) };
  const config = testConfig({ payos: { mode: opts.account === 'sandbox' ? 'fake' : 'real', clientId: null, apiKey: null, checksumKey: null } });
  const service = new OrdersReconcileService(prisma as never, new FakeClock(NOW), config, registry, inbox as never, applier as never, orders as never, logger);
  return { service, row, calls, orders, getCheckout, cancelCheckout, inbox, stores, applier, logs, transitions, prisma };
}

describe('OrdersReconcileService.reconcileOne — payOS answered with money (design §3.6)', () => {
  it('LB1A3, LB1A4: every transaction becomes a payment_succeeded event of the inbox, keyed <orderCode>:<reference>, source reconcile, and is applied; the order itself is left to the applier', async () => {
    const { service, stores, applier, row, transitions } = setup({ getCheckout: async () => state({ status: 'PAID', amountPaid: 79000, transactions: [tx('FT1')] }) });
    await service.reconcileOne(order(), NOW);
    expect(stores).toHaveLength(1);
    expect(stores[0]).toHaveLength(1);
    expect(stores[0][0]).toMatchObject({
      type: 'payment_succeeded', environment: 'production', externalEventId: `${CODE}:FT1`, transactionId: `${CODE}:FT1`, appUserId: null, externalSubscriptionId: null,
      occurredAt: NOW, missing: [],
    });
    expect(stores[0][0].event as OrderPaymentPayload).toEqual({
      orderCode: CODE, paymentLinkId: 'link-1', amount: 79000, reference: 'FT1', transactionDateTime: '2026-11-05 10:02:00', source: 'reconcile', success: true, code: '00',
      payer: { counterAccountName: 'NGUYEN THI LAN', counterAccountNumber: '0123456789', counterAccountBankName: 'MB Bank' },
    });
    expect(applier.applyMany).toHaveBeenCalledWith(['evt-1-0']);
    expect(transitions).toEqual([]);
    expect(row.status).toBe('pending');
  });

  it('§3.12: the raw payload kept for 90 days has no payer: the payer travels only in the payload the applier clears', async () => {
    const { service, stores } = setup({ getCheckout: async () => state({ status: 'PAID', transactions: [tx('FT1')] }) });
    await service.reconcileOne(order(), NOW);
    expect(stores[0][0].raw).toEqual({ source: 'reconcile', reference: 'FT1', amount: 79000, transactionDateTime: '2026-11-05 10:02:00' });
    expect(JSON.stringify(stores[0][0].raw)).not.toMatch(/NGUYEN THI LAN|0123456789|MB Bank|counterAccount/);
  });

  it('two transactions are two events (a short payment and its rest)', async () => {
    const { service, stores } = setup({ getCheckout: async () => state({ status: 'PAID', transactions: [tx('FT1', 40000), tx('FT2', 39000)] }) });
    await service.reconcileOne(order(), NOW);
    expect(stores[0].map((e) => e.externalEventId)).toEqual([`${CODE}:FT1`, `${CODE}:FT2`]);
  });

  it('money counts whatever status payOS gives the link (an expired link with a transfer on it)', async () => {
    for (const status of ['EXPIRED', 'CANCELLED', 'UNDERPAID', 'PENDING', 'PROCESSING', 'FAILED'] as const) {
      const { service, stores, transitions } = setup({ getCheckout: async () => state({ status, transactions: [tx('FT1')] }) });
      await service.reconcileOne(order(), NOW);
      expect(stores, status).toHaveLength(1);
      expect(transitions, status).toEqual([]);
    }
  });

  it('LB1E2: a payment the webhook already stored is a duplicate for the inbox: nothing new, nothing applied', async () => {
    const ctx = setup({ getCheckout: async () => state({ status: 'PAID', transactions: [tx('FT1')] }) });
    ctx.inbox.store.mockResolvedValue([]);
    await ctx.service.reconcileOne(order(), NOW);
    expect(ctx.applier.applyMany).not.toHaveBeenCalled();
  });

  it('the sandbox environment follows the fake payOS', async () => {
    const { service, stores } = setup({ account: 'sandbox', getCheckout: async () => state({ status: 'PAID', transactions: [tx('FT1')] }) });
    await service.reconcileOne(order(), NOW);
    expect(stores[0][0].environment).toBe('sandbox');
  });

  it('a payer with no fields becomes a null payer; an order with no stored link id still produces the event', async () => {
    const { service, stores } = setup({ getCheckout: async () => state({ status: 'PAID', transactions: [{ ...tx('FT1'), payer: null }] }) });
    await service.reconcileOne(order({ paymentLinkId: null, status: 'failed' }), NOW);
    expect(stores[0][0].event).toMatchObject({ paymentLinkId: '', payer: { counterAccountName: null, counterAccountNumber: null, counterAccountBankName: null } });
  });
});

describe('OrdersReconcileService.reconcileOne — no money (design §3.6 table)', () => {
  const only = (status: CheckoutState['status'], over: Partial<CheckoutState> = {}) => async () => state({ status, ...over });

  it('PAID or UNDERPAID with no transaction listed → needs_review provider-mismatch, with a warning', async () => {
    for (const status of ['PAID', 'UNDERPAID'] as const) {
      const { service, row, logs } = setup({ getCheckout: only(status, { amountPaid: 79000 }) });
      await service.reconcileOne(order(), NOW);
      expect(row, status).toMatchObject({ status: 'needs_review', reviewReason: 'provider-mismatch' });
      expect(logs.some((l) => l.level === 'warn'), status).toBe(true);
    }
  });

  it('PENDING or PROCESSING before the expiry → nothing', async () => {
    for (const status of ['PENDING', 'PROCESSING'] as const) {
      const { service, row, cancelCheckout, transitions } = setup({ stored: { expiresAt: new Date(NOW.getTime() + minutes(5)) }, getCheckout: only(status) });
      await service.reconcileOne(order({ expiresAt: new Date(NOW.getTime() + minutes(5)) }), NOW);
      expect(row.status, status).toBe('pending');
      expect(cancelCheckout).not.toHaveBeenCalled();
      expect(transitions).toEqual([]);
    }
  });

  it('LB1E15: PENDING after the expiry → cancel the link (outside any lock), then expired', async () => {
    const { service, row, cancelCheckout, calls } = setup({ getCheckout: only('PENDING') });
    await service.reconcileOne(order(), NOW);
    expect(cancelCheckout).toHaveBeenCalledWith(CODE);
    expect(row.status).toBe('expired');
    expect(calls).toContain('cancel(inTx=false)');
    expect(calls).toContain('get(inTx=false)');
    expect(calls.indexOf('cancel(inTx=false)')).toBeLessThan(calls.indexOf('transition:pending->expired'));
  });

  it('LB1E15: the cancel fails → the order stays pending; more than 24 hours past the expiry it is expired anyway', async () => {
    const failing = setup({ getCheckout: only('PENDING') });
    failing.cancelCheckout.mockRejectedValue(new Error('payos said no'));
    await failing.service.reconcileOne(order(), NOW);
    expect(failing.row.status).toBe('pending');
    const old = setup({ getCheckout: only('PENDING') });
    old.cancelCheckout.mockRejectedValue(new Error('payos said no'));
    await old.service.reconcileOne(order({ expiresAt: new Date(NOW.getTime() - 25 * 3_600_000) }), NOW);
    expect(old.row.status).toBe('expired');
  });

  it('PROCESSING after the expiry → nothing, asked again next time', async () => {
    const { service, row, cancelCheckout } = setup({ getCheckout: only('PROCESSING') });
    await service.reconcileOne(order(), NOW);
    expect(row.status).toBe('pending');
    expect(cancelCheckout).not.toHaveBeenCalled();
  });

  it('EXPIRED → expired, CANCELLED → cancelled (LB1A6), FAILED → failed', async () => {
    for (const [status, expected] of [['EXPIRED', 'expired'], ['CANCELLED', 'cancelled'], ['FAILED', 'failed']] as const) {
      const { service, row } = setup({ getCheckout: only(status) });
      await service.reconcileOne(order(), NOW);
      expect(row.status, status).toBe(expected);
    }
  });

  it('payOS does not know the link: an order with no link is failed, an order with a link is left alone with a warning', async () => {
    const noLink = setup({ getCheckout: async () => null, stored: { paymentLinkId: null } });
    await noLink.service.reconcileOne(order({ paymentLinkId: null }), NOW);
    expect(noLink.row.status).toBe('failed');
    const withLink = setup({ getCheckout: async () => null });
    await withLink.service.reconcileOne(order(), NOW);
    expect(withLink.row.status).toBe('pending');
    expect(withLink.logs.some((l) => l.level === 'warn')).toBe(true);
  });

  it('LB1E18, LB1E19: an order with no link, or a failed one, whose link payOS still has as PENDING → cancel that link, and the order is failed', async () => {
    const lost = setup({ getCheckout: only('PENDING'), stored: { paymentLinkId: null } });
    await lost.service.reconcileOne(order({ paymentLinkId: null }), NOW);
    expect(lost.cancelCheckout).toHaveBeenCalledWith(CODE);
    expect(lost.row.status).toBe('failed');
    const failed = setup({ getCheckout: only('PENDING'), stored: { status: 'failed' } });
    await failed.service.reconcileOne(order({ status: 'failed' }), NOW);
    expect(failed.cancelCheckout).toHaveBeenCalledWith(CODE);
    expect(failed.row.status).toBe('failed');
  });

  it('LB1E16: payOS errors or does not answer → no change; a pending order more than 24 hours past its expiry that cannot be asked is expired', async () => {
    const quiet = setup({ getCheckout: async () => { throw new Error('timeout'); } });
    await quiet.service.reconcileOne(order(), NOW);
    expect(quiet.row.status).toBe('pending');
    expect(quiet.transitions).toEqual([]);
    const stale = setup({ getCheckout: async () => { throw new Error('429'); } });
    await stale.service.reconcileOne(order({ expiresAt: new Date(NOW.getTime() - 25 * 3_600_000) }), NOW);
    expect(stale.row.status).toBe('expired');
  });

  it('a failed order that payOS cannot be asked about stays failed', async () => {
    const { service, row } = setup({ getCheckout: async () => { throw new Error('down'); }, stored: { status: 'failed' } });
    await service.reconcileOne(order({ status: 'failed', expiresAt: new Date(NOW.getTime() - 48 * 3_600_000) }), NOW);
    expect(row.status).toBe('failed');
  });

  it('a pending order with no link that is younger than 2 minutes is still being created: payOS is not asked, nothing changes', async () => {
    const { service, row, getCheckout } = setup({ stored: { paymentLinkId: null } });
    await service.reconcileOne(order({ paymentLinkId: null, createdAt: new Date(NOW.getTime() - minutes(1)) }), NOW);
    expect(getCheckout).not.toHaveBeenCalled();
    expect(row.status).toBe('pending');
  });

  it('no payOS adapter (the provider is off): nothing is asked, nothing changes', async () => {
    const { service, row } = setup({ withAdapter: false });
    await service.reconcileOne(order(), NOW);
    expect(row.status).toBe('pending');
  });

  it('LB1E13: a webhook marks the order paid while the job waits for payOS → the job’s UPDATE touches no row and the order stays paid', async () => {
    const ctx = setup({ getCheckout: async () => state({ status: 'EXPIRED' }) });
    ctx.getCheckout.mockImplementation(async () => { ctx.row.status = 'paid'; return state({ status: 'EXPIRED' }); });
    await ctx.service.reconcileOne(order(), NOW);
    expect(ctx.row.status).toBe('paid');
    expect(ctx.transitions).toHaveLength(1);
  });

  it('every change of the order is `UPDATE … WHERE status = <what was read>` under the user lock, then the order lock', async () => {
    const { service, calls, transitions } = setup({ getCheckout: only('CANCELLED') });
    await service.reconcileOne(order(), NOW);
    expect(transitions[0]).toMatchObject({ id: 'order-1', from: 'pending' });
    expect(calls.indexOf(`lock-user:${USER}`)).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf('lock-order:order-1')).toBeGreaterThan(calls.indexOf(`lock-user:${USER}`));
    expect(calls.indexOf('transition:pending->cancelled')).toBeGreaterThan(calls.indexOf('lock-order:order-1'));
  });

  it('§3.12: no log entry carries the order code, the payer or the reference', async () => {
    const { service, logs } = setup({ getCheckout: async () => state({ status: 'PAID', transactions: [] }) });
    await service.reconcileOne(order(), NOW);
    const money = setup({ getCheckout: async () => state({ status: 'PAID', transactions: [tx('FT-SECRET')] }) });
    await money.service.reconcileOne(order(), NOW);
    const text = JSON.stringify([...logs, ...money.logs]);
    expect(logs.length).toBeGreaterThan(0);
    for (const secret of [String(CODE), 'NGUYEN THI LAN', '0123456789', 'FT-SECRET', 'order_code']) expect(text, secret).not.toContain(secret);
  });
});

describe('OrdersReconcileJob (hourly, design §3.6)', () => {
  function jobSetup(claimed: ReconcileOrder[]) {
    const claim = vi.fn(async (_db: unknown, _now: Date, _limit: number) => claimed);
    const service = { reconcileOne: vi.fn(async (_order: ReconcileOrder, _now: Date) => {}) };
    const scheduler = { register: vi.fn() };
    const logs: LogEntry[] = [];
    const logger = new AppLogger({ write: (entry) => logs.push(entry) });
    const job = new OrdersReconcileJob({} as never, scheduler as never, { claimForReconcile: claim } as never, service as never, logger);
    return { job, claim, service, scheduler, logs };
  }

  it('registers itself with the hourly scheduler', () => {
    const { job, scheduler } = jobSetup([]);
    job.onModuleInit();
    expect(scheduler.register).toHaveBeenCalledWith('billing.orders-reconcile', expect.any(Function));
  });

  it('LB1E47: claims at most 100 orders by writing checked_at, then looks at each one', async () => {
    const orders = [order({ id: 'a' }), order({ id: 'b' }), order({ id: 'c' })];
    const { job, claim, service } = jobSetup(orders);
    expect(await job.run(NOW)).toBe(3);
    expect(claim).toHaveBeenCalledWith(expect.anything(), NOW, 100);
    expect(service.reconcileOne.mock.calls.map(([o]) => o.id)).toEqual(['a', 'b', 'c']);
    expect(service.reconcileOne.mock.calls.every(([, now]) => now === NOW)).toBe(true);
  });

  it('one order that throws does not stop the others, and is logged without its code', async () => {
    const { job, service, logs } = jobSetup([order({ id: 'a' }), order({ id: 'b' })]);
    service.reconcileOne.mockRejectedValueOnce(new Error('boom'));
    expect(await job.run(NOW)).toBe(2);
    expect(service.reconcileOne).toHaveBeenCalledTimes(2);
    expect(logs.some((l) => l.event === 'order_reconcile_failed')).toBe(true);
    expect(JSON.stringify(logs)).not.toContain(String(CODE));
  });

  it('nothing to look at → 0', async () => {
    const { job, service } = jobSetup([]);
    expect(await job.run(NOW)).toBe(0);
    expect(service.reconcileOne).not.toHaveBeenCalled();
  });
});
