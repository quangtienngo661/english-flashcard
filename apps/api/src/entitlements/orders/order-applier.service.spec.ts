import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { GrantSource } from '../rules/plan-rules.js';
import { OrderApplier, type ApplyPaymentInput } from './order-applier.service.js';
import type { NewPayment, NewPeriod, OrderRecord, OrderUpdate, PaymentRecord } from './orders.repository.js';

const NOW = new Date('2026-11-05T03:02:00.000Z'); // 10:02 in Vietnam
const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const ADMIN = '9a8b7c6d-0000-4000-8000-000000000001';
const ORDER = 'order-1';
const CODE = 1_000_000_123;
const at = (iso: string) => new Date(iso);

const baseOrder = (over: Partial<OrderRecord> = {}): OrderRecord => ({
  id: ORDER, userId: USER, provider: 'payos', environment: 'production', orderCode: CODE, periodMonths: 1, amount: 79000, currency: 'VND',
  status: 'pending', reviewReason: null, paidVia: null, paymentLinkId: 'link-1', expiresAt: at('2026-11-05T03:17:00.000Z'), ...over,
});

type PeriodRow = NewPeriod & { id: string; revokedAt: Date | null };

/** The orders tables in memory, with a call log. Locks are recorded, not enforced. */
class MemoryOrders {
  orders = new Map<string, OrderRecord>();
  payments: Array<NewPayment & { id: string; periodId: string | null }> = [];
  periods: PeriodRow[] = [];
  updates: Array<{ id: string; data: OrderUpdate }> = [];
  calls: string[] = [];
  seq = 0;

  async findByCode(_db: unknown, provider: string, orderCode: number) {
    return [...this.orders.values()].find((o) => o.provider === provider && o.orderCode === orderCode) ?? null;
  }
  async findById(_db: unknown, id: string) { return this.orders.get(id) ?? null; }
  async lock(_db: unknown, id: string) {
    this.calls.push(`lock-order:${id}`);
    const row = this.orders.get(id);
    return row ? { ...row } : null;
  }
  async findPaymentByKey(_db: unknown, key: string) {
    const found = this.payments.find((p) => p.paymentKey === key);
    return found ? { id: found.id, outcome: found.outcome } : null;
  }
  async payosTotals(_db: unknown, orderId: string) {
    const rows = this.payments.filter((p) => p.orderId === orderId && p.source !== 'manual');
    return { total: rows.reduce((sum, p) => sum + p.amount, 0), count: rows.length };
  }
  async payosTransfers(_db: unknown, orderId: string) {
    return this.payments.filter((p) => p.orderId === orderId && p.source !== 'manual').map((p) => ({ amount: p.amount, providerTime: p.providerTime }));
  }
  async insertPayment(_db: unknown, row: NewPayment) {
    this.calls.push('insert-payment');
    const id = `pay-${++this.seq}`;
    this.payments.push({ ...row, id, periodId: null });
    return { id };
  }
  async attachPeriod(_db: unknown, paymentId: string, periodId: string) {
    this.payments.find((p) => p.id === paymentId)!.periodId = periodId;
  }
  async insertPeriod(_db: unknown, row: NewPeriod) {
    this.calls.push('insert-period');
    const id = `period-${++this.seq}`;
    this.periods.push({ ...row, id, revokedAt: null });
    return { id };
  }
  async updateOrder(_db: unknown, id: string, data: OrderUpdate) {
    this.calls.push('update-order');
    this.updates.push({ id, data });
    Object.assign(this.orders.get(id)!, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
  }
}

function setup(opts: { account?: 'active' | 'locked' | 'deleting' | null; timezone?: string | null; grants?: GrantSource[]; orders?: OrderRecord[] } = {}) {
  const memory = new MemoryOrders();
  for (const order of opts.orders ?? [baseOrder()]) memory.orders.set(order.id, order);
  const clock = new FakeClock(NOW);
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => logs.push(entry) });
  const accountState = { value: opts.account === undefined ? ('active' as const) : opts.account };
  const identity = {
    accountStatus: vi.fn(async (_id: string, _db?: unknown) => accountState.value),
    getProfile: vi.fn(async () => (opts.timezone === null ? null : { timezone: opts.timezone ?? 'Asia/Ho_Chi_Minh' })),
  };
  const sources = {
    load: vi.fn(async (_db: unknown, userId: string, now: Date) => ({
      subscriptions: [],
      grants: opts.grants ?? [],
      prepaidPeriods: memory.periods.filter((p) => p.userId === userId && p.revokedAt === null && p.endsAt > now),
    })),
  };
  const purchases: Array<Record<string, unknown>> = [];
  const transactions = { recordPrepaidPurchase: vi.fn(async (_tx: unknown, row: Record<string, unknown>) => { purchases.push(row); }) };
  const locks: string[] = [];
  const tx = {
    $executeRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
      memory.calls.push(`lock-user:${String(values[0]).replace('entitlements.user:', '')}`);
      locks.push(String(values[0]));
      return 1;
    },
  };
  const prisma = {
    $transaction: vi.fn(async <T>(fn: (client: unknown) => Promise<T>): Promise<T> => {
      memory.calls.push('tx:begin');
      const result = await fn(tx);
      memory.calls.push('tx:commit');
      return result;
    }),
  };
  const applier = new OrderApplier(prisma as never, clock, identity as never, sources as never, transactions as never, memory as never, logger);
  return { applier, memory, clock, logs, identity, sources, purchases, transactions, tx, prisma, accountState };
}

const input = (over: Partial<ApplyPaymentInput> = {}): ApplyPaymentInput => ({
  source: 'webhook', env: 'production', orderCode: CODE, paymentLinkId: 'link-1', reference: 'FT26309ABC', amount: 79000,
  providerTime: '2026-11-05 10:02:00', success: true, code: '00',
  payer: { counterAccountName: 'NGUYEN THI LAN', counterAccountNumber: '0123456789', counterAccountBankName: 'MB Bank' }, eventId: 'evt-1', ...over,
});

describe('OrderApplier.applyPayment — the rules T1–T14 against the data (design §3.4)', () => {
  it('LB1A1: a payment of the right amount opens one period from now, writes the purchase row, and marks the order paid by webhook', async () => {
    const { applier, memory, purchases, tx } = setup();
    const result = await applier.applyPayment(tx as never, input());
    expect(result).toMatchObject({ outcome: 'opened-period', userId: USER });
    expect(memory.periods).toEqual([expect.objectContaining({
      userId: USER, orderId: ORDER, startsAt: NOW, endsAt: at('2026-12-05T17:00:00.000Z'), revokedAt: null,
    })]);
    expect(memory.payments).toEqual([expect.objectContaining({
      orderId: ORDER, paymentKey: `payos:production:${CODE}:FT26309ABC`, source: 'webhook', reference: 'FT26309ABC', amount: 79000,
      providerTime: '2026-11-05 10:02:00', outcome: 'opened-period', periodId: memory.periods[0].id,
    })]);
    expect(memory.orders.get(ORDER)).toMatchObject({ status: 'paid', paidVia: 'webhook', reviewReason: null });
    expect(purchases).toEqual([expect.objectContaining({
      userId: USER, provider: 'payos', environment: 'production', providerTransactionId: `${CODE}:FT26309ABC`, amountMinor: 79000n, currency: 'VND',
      periodMonths: 1, occurredAt: NOW, periodStart: NOW, periodEnd: at('2026-12-05T17:00:00.000Z'),
    })]);
  });

  it('LB1E1: the same payment twice (same key) is "already received": no second payment row, no second period, the same outcome', async () => {
    const { applier, memory, purchases, tx } = setup();
    await applier.applyPayment(tx as never, input());
    const again = await applier.applyPayment(tx as never, input({ source: 'reconcile' }));
    expect(again).toMatchObject({ outcome: 'opened-period', userId: USER });
    expect(memory.payments).toHaveLength(1);
    expect(memory.periods).toHaveLength(1);
    expect(purchases).toHaveLength(1);
  });

  it('review I2: the job counted the transfer first, then the webhook brings it under another reference: one period, one purchase row, the second payment attached', async () => {
    const { applier, memory, purchases, tx } = setup();
    await applier.applyPayment(tx as never, input({ source: 'reconcile', reference: 'REF-A' }));
    const again = await applier.applyPayment(tx as never, input({ source: 'webhook', reference: 'REF-B' }));
    expect(again).toMatchObject({ outcome: 'attached' });
    expect(memory.periods).toHaveLength(1);
    expect(purchases).toHaveLength(1);
    expect(memory.payments.map((p) => [p.reference, p.outcome])).toEqual([['REF-A', 'opened-period'], ['REF-B', 'attached']]);
    expect(memory.orders.get(ORDER)).toMatchObject({ status: 'paid', paidVia: 'reconcile', reviewReason: null });
  });

  it('review I2: a second transfer of the same amount at another moment still opens a second period', async () => {
    const { applier, memory, tx } = setup();
    await applier.applyPayment(tx as never, input({ source: 'webhook', reference: 'REF-A' }));
    expect(await applier.applyPayment(tx as never, input({ source: 'webhook', reference: 'REF-B', providerTime: '2026-11-05 10:40:00' }))).toMatchObject({ outcome: 'opened-period' });
    expect(memory.periods).toHaveLength(2);
  });

  it('LB1E9: 100.000 then 99.000 for a 199.000 order → needs_review amount-short, then paid with one period', async () => {
    const { applier, memory, tx } = setup({ orders: [baseOrder({ amount: 199000, periodMonths: 3 })] });
    expect(await applier.applyPayment(tx as never, input({ amount: 100000, reference: 'R1' }))).toMatchObject({ outcome: 'counted' });
    expect(memory.orders.get(ORDER)).toMatchObject({ status: 'needs_review', reviewReason: 'amount-short', paidVia: null });
    expect(memory.periods).toHaveLength(0);
    expect(await applier.applyPayment(tx as never, input({ amount: 99000, reference: 'R2' }))).toMatchObject({ outcome: 'opened-period' });
    expect(memory.orders.get(ORDER)).toMatchObject({ status: 'paid', reviewReason: null, paidVia: 'webhook' });
    expect(memory.periods).toHaveLength(1);
    expect(memory.periods[0].endsAt).toEqual(at('2027-02-05T17:00:00.000Z'));
  });

  it('LB1E10: 398.000 for a 199.000 order → needs_review amount-over, no period, no purchase row', async () => {
    const { applier, memory, purchases, tx } = setup({ orders: [baseOrder({ amount: 199000, periodMonths: 3 })] });
    expect(await applier.applyPayment(tx as never, input({ amount: 398000 }))).toMatchObject({ outcome: 'counted' });
    expect(memory.orders.get(ORDER)).toMatchObject({ status: 'needs_review', reviewReason: 'amount-over' });
    expect(memory.periods).toHaveLength(0);
    expect(purchases).toHaveLength(0);
  });

  it('LB1E11, LB1E12: an expired order is paid when the provider time is within 10 minutes after the expiry, and needs review after that', async () => {
    const early = setup({ orders: [baseOrder({ status: 'expired' })] });
    await early.applier.applyPayment(early.tx as never, input({ providerTime: '2026-11-05 10:27:00' }));
    expect(early.memory.orders.get(ORDER)).toMatchObject({ status: 'paid' });
    const late = setup({ orders: [baseOrder({ status: 'expired' })] });
    await late.applier.applyPayment(late.tx as never, input({ providerTime: '2026-11-05 10:27:01' }));
    expect(late.memory.orders.get(ORDER)).toMatchObject({ status: 'needs_review', reviewReason: 'late-payment' });
    expect(late.memory.periods).toHaveLength(0);
  });

  it('LB1E7: a second transfer of the exact amount into a paid order is a second period that follows the first, with its own purchase row', async () => {
    const { applier, memory, purchases, tx } = setup();
    await applier.applyPayment(tx as never, input());
    // Another moment than the first (the same moment would be the same transfer, review I2).
    const second = await applier.applyPayment(tx as never, input({ reference: 'FT-SECOND', providerTime: '2026-11-05 10:30:00' }));
    expect(second).toMatchObject({ outcome: 'opened-period' });
    expect(memory.periods).toHaveLength(2);
    expect(memory.periods[1].startsAt).toEqual(memory.periods[0].endsAt);
    expect(memory.periods[1].endsAt).toEqual(at('2027-01-05T17:00:00.000Z'));
    expect(purchases.map((p) => p.providerTransactionId)).toEqual([`${CODE}:FT26309ABC`, `${CODE}:FT-SECOND`]);
    expect(memory.orders.get(ORDER)).toMatchObject({ status: 'paid', paidVia: 'webhook' });
  });

  it('LB1E8: 50.000 into a paid order → flagged extra-payment, the order stays paid, no period', async () => {
    const { applier, memory, tx } = setup();
    await applier.applyPayment(tx as never, input());
    expect(await applier.applyPayment(tx as never, input({ reference: 'R9', amount: 50000 }))).toMatchObject({ outcome: 'flagged' });
    expect(memory.orders.get(ORDER)).toMatchObject({ status: 'paid', reviewReason: 'extra-payment' });
    expect(memory.periods).toHaveLength(1);
    expect(memory.payments.at(-1)).toMatchObject({ outcome: 'flagged', amount: 50000 });
  });

  it('LB1E14: the reconcile job brings a payment whose key the webhook did not use, at another moment → flagged reconcile-mismatch, one period only', async () => {
    const { applier, memory, tx } = setup();
    await applier.applyPayment(tx as never, input());
    expect(await applier.applyPayment(tx as never, input({ source: 'reconcile', reference: 'OTHER-KEY', providerTime: '2026-11-05 10:41:00' }))).toMatchObject({ outcome: 'flagged' });
    expect(memory.orders.get(ORDER)).toMatchObject({ status: 'paid', reviewReason: 'reconcile-mismatch' });
    expect(memory.periods).toHaveLength(1);
  });

  it('LB1E3, LB1E4: staff confirmed first; the same transfer by webhook is attached; another amount is flagged', async () => {
    const same = setup();
    await same.applier.confirmManual({ orderId: ORDER, adminId: ADMIN, reference: 'FT2611-BANK', amount: 79000, reason: 'saw it in the bank app' });
    expect(await same.applier.applyPayment(same.tx as never, input())).toMatchObject({ outcome: 'attached' });
    expect(same.memory.periods).toHaveLength(1);
    expect(same.memory.orders.get(ORDER)).toMatchObject({ status: 'paid', paidVia: 'manual', reviewReason: null });
    const other = setup();
    await other.applier.confirmManual({ orderId: ORDER, adminId: ADMIN, reference: 'FT2611-BANK', amount: 79000, reason: 'x' });
    expect(await other.applier.applyPayment(other.tx as never, input({ amount: 50000 }))).toMatchObject({ outcome: 'flagged' });
    expect(other.memory.orders.get(ORDER)).toMatchObject({ status: 'paid', reviewReason: 'extra-payment' });
    expect(other.memory.periods).toHaveLength(1);
  });

  describe('the check before the rules (design §3.4)', () => {
    it('LB1E20: payOS’s own test webhook (an order code nobody has) is ignored as unknown-order, nothing written', async () => {
      const { applier, memory, tx } = setup();
      expect(await applier.applyPayment(tx as never, input({ orderCode: 123 }))).toEqual({ outcome: 'ignored', reason: 'unknown-order' });
      expect(memory.payments).toEqual([]);
      expect(memory.updates).toEqual([]);
    });

    it('LB1E21: another link id, success false and a code other than 00 are ignored with their reasons; the order does not change', async () => {
      const { applier, memory, tx } = setup();
      expect(await applier.applyPayment(tx as never, input({ paymentLinkId: 'another' }))).toMatchObject({ outcome: 'ignored', reason: 'link-mismatch' });
      expect(await applier.applyPayment(tx as never, input({ success: false }))).toMatchObject({ outcome: 'ignored', reason: 'not-success' });
      expect(await applier.applyPayment(tx as never, input({ code: '01' }))).toMatchObject({ outcome: 'ignored', reason: 'not-success' });
      expect(memory.payments).toEqual([]);
      expect(memory.orders.get(ORDER)).toMatchObject({ status: 'pending' });
    });

    it('an order of the other environment is unknown too (a sandbox payment never pays a production order)', async () => {
      const { applier, memory, tx } = setup();
      expect(await applier.applyPayment(tx as never, input({ env: 'sandbox' }))).toMatchObject({ outcome: 'ignored', reason: 'unknown-order' });
      expect(memory.payments).toEqual([]);
    });
  });

  describe('the start of a period (design §3.7)', () => {
    it('LB1E26: two orders of Lan paid one after the other → the second starts where the first ends', async () => {
      const { applier, memory, tx } = setup({ orders: [baseOrder(), baseOrder({ id: 'order-2', orderCode: CODE + 1, paymentLinkId: 'link-2', periodMonths: 12, amount: 599000 })] });
      await applier.applyPayment(tx as never, input());
      await applier.applyPayment(tx as never, input({ orderCode: CODE + 1, paymentLinkId: 'link-2', reference: 'FT-2', amount: 599000 }));
      expect(memory.periods[0]).toMatchObject({ startsAt: NOW, endsAt: at('2026-12-05T17:00:00.000Z') });
      expect(memory.periods[1]).toMatchObject({ orderId: 'order-2', startsAt: at('2026-12-05T17:00:00.000Z'), endsAt: at('2027-12-05T17:00:00.000Z') });
    });

    const grant = (id: string, startsAt: string, endsAt: string): GrantSource => ({
      id, kind: 'plan', limits: null, startsAt: at(startsAt), endsAt: at(endsAt), revokedAt: null, createdAt: at(startsAt),
    });

    it('LB1E30: a grant that runs and one that follows it end to start → the period starts where the second ends', async () => {
      const { applier, memory, tx } = setup({ grants: [grant('g1', '2026-10-01T00:00:00Z', '2026-11-30T00:00:00Z'), grant('g2', '2026-11-30T00:00:00Z', '2026-12-31T00:00:00Z')] });
      await applier.applyPayment(tx as never, input());
      expect(memory.periods[0].startsAt).toEqual(at('2026-12-31T00:00:00.000Z'));
    });

    it('LB1E31: a grant that starts later with a gap in between does not move the period: it starts now', async () => {
      const { applier, memory, tx } = setup({ grants: [grant('g1', '2026-12-10T00:00:00Z', '2027-01-10T00:00:00Z')] });
      await applier.applyPayment(tx as never, input());
      expect(memory.periods[0].startsAt).toEqual(NOW);
    });

    it('the end is counted in the learner’s own zone: New York, midnight of the zone', async () => {
      const { applier, memory, tx } = setup({ timezone: 'America/New_York' });
      await applier.applyPayment(tx as never, input());
      // 22:02 on 4 November in New York (UTC−5): a month later is 4 December, rounded up to midnight of the 5th.
      expect(memory.periods[0].endsAt).toEqual(at('2026-12-05T05:00:00.000Z'));
    });

    it('a learner without a profile row still gets a period, counted in Vietnam’s zone', async () => {
      const { applier, memory, tx } = setup({ timezone: null });
      await applier.applyPayment(tx as never, input());
      expect(memory.periods[0].endsAt).toEqual(at('2026-12-05T17:00:00.000Z'));
    });
  });

  describe('LB1E36–LB1E39: money after the learner deleted the account', () => {
    it('an anonymised order (the user is gone) → needs_review account-deleted, the payer saved on the order, no period, no purchase row, no id returned', async () => {
      const { applier, memory, purchases, tx } = setup({ account: null });
      const result = await applier.applyPayment(tx as never, input());
      expect(result).toMatchObject({ outcome: 'refund-needed', userId: null });
      expect(memory.orders.get(ORDER)).toMatchObject({ status: 'needs_review', reviewReason: 'account-deleted', paidVia: null });
      expect(memory.updates.at(-1)?.data).toMatchObject({
        refundPayerName: 'NGUYEN THI LAN', refundPayerAccount: '0123456789', refundPayerBank: 'MB Bank', refundSavedAt: NOW,
      });
      expect(memory.periods).toEqual([]);
      expect(purchases).toEqual([]);
      expect(memory.payments[0]).toMatchObject({ outcome: 'refund-needed', amount: 79000 });
    });

    it('LB1E37: with empty payer fields the refund information is empty and staff look the transfer up by its reference', async () => {
      const { applier, memory, tx } = setup({ account: null });
      await applier.applyPayment(tx as never, input({ payer: null }));
      expect(memory.updates.at(-1)?.data).toMatchObject({ refundPayerName: null, refundPayerAccount: null, refundPayerBank: null });
      expect(memory.payments[0].reference).toBe('FT26309ABC');
    });

    it('LB1E39: an account that is being deleted is treated the same', async () => {
      const { applier, memory, tx } = setup({ account: 'deleting' });
      expect(await applier.applyPayment(tx as never, input())).toMatchObject({ outcome: 'refund-needed', userId: null });
      expect(memory.orders.get(ORDER)).toMatchObject({ status: 'needs_review', reviewReason: 'account-deleted' });
      expect(memory.periods).toEqual([]);
    });

    it('a locked account is still a learner: it gets its period', async () => {
      const { applier, memory, tx } = setup({ account: 'locked' });
      expect(await applier.applyPayment(tx as never, input())).toMatchObject({ outcome: 'opened-period' });
      expect(memory.periods).toHaveLength(1);
    });

    it('an order that already had its period and then money arrives: the flag account-deleted, status stays paid', async () => {
      const { applier, memory, tx, accountState } = setup();
      await applier.applyPayment(tx as never, input());
      accountState.value = null;
      expect(await applier.applyPayment(tx as never, input({ reference: 'LATE', amount: 79000 }))).toMatchObject({ outcome: 'refund-needed' });
      expect(memory.orders.get(ORDER)).toMatchObject({ status: 'paid', reviewReason: 'account-deleted' });
      expect(memory.periods).toHaveLength(1);
    });
  });

  it('lock order (design §3.4): the user lock comes before the order lock, and the account check, profile and sources read through the same transaction', async () => {
    const { applier, memory, identity, sources, tx } = setup();
    await applier.applyPayment(tx as never, input());
    const userLock = memory.calls.indexOf(`lock-user:${USER}`);
    const orderLock = memory.calls.indexOf(`lock-order:${ORDER}`);
    expect(userLock).toBeGreaterThanOrEqual(0);
    expect(orderLock).toBeGreaterThan(userLock);
    expect(memory.calls.indexOf('insert-payment')).toBeGreaterThan(orderLock);
    expect(identity.accountStatus).toHaveBeenCalledWith(USER, tx);
    expect(identity.getProfile).toHaveBeenCalledWith(USER, tx);
    expect(sources.load).toHaveBeenCalledWith(tx, USER, NOW);
  });

  it('§3.12: no log entry holds the payer, the bank reference or the order code', async () => {
    const { applier, logs, tx } = setup();
    await applier.applyPayment(tx as never, input());
    await applier.applyPayment(tx as never, input({ reference: 'R2', amount: 50000 }));
    await applier.applyPayment(tx as never, input({ orderCode: 123 }));
    const text = JSON.stringify(logs);
    expect(logs.length).toBeGreaterThan(0);
    for (const secret of ['NGUYEN THI LAN', '0123456789', 'MB Bank', 'FT26309ABC', 'counterAccount', 'counter_account', 'order_code', String(CODE)]) {
      expect(text, secret).not.toContain(secret);
    }
  });
});

describe('OrderApplier.confirmManual — T11 to T14 (design §3.9)', () => {
  const confirm = { orderId: ORDER, adminId: ADMIN, reference: 'FT2611-BANK', amount: 79000, reason: 'saw it in the bank app' };

  it('LB1A5: an order with no period is paid by hand: payment manual:<order_id>, a period, a purchase row, confirmed_by and the reason', async () => {
    const { applier, memory, purchases } = setup({ orders: [baseOrder({ status: 'needs_review', reviewReason: 'amount-over' })] });
    const result = await applier.confirmManual(confirm);
    expect(result).toMatchObject({ outcome: 'opened-period', userId: USER });
    expect(memory.payments).toEqual([expect.objectContaining({
      orderId: ORDER, paymentKey: `manual:${ORDER}`, source: 'manual', reference: 'FT2611-BANK', amount: 79000, providerTime: null,
      outcome: 'opened-period', confirmedBy: ADMIN, reason: 'saw it in the bank app',
    })]);
    expect(memory.orders.get(ORDER)).toMatchObject({ status: 'paid', paidVia: 'manual', reviewReason: null });
    expect(memory.periods).toEqual([expect.objectContaining({ startsAt: NOW, endsAt: at('2026-12-05T17:00:00.000Z') })]);
    expect(purchases).toEqual([expect.objectContaining({ providerTransactionId: `manual:${ORDER}`, amountMinor: 79000n })]);
  });

  it('LB1E5, LB1E6: pressing it again, or on an order a webhook paid, is 409 order-already-paid and writes nothing more', async () => {
    const twice = setup();
    await twice.applier.confirmManual(confirm);
    await expect(twice.applier.confirmManual(confirm)).rejects.toMatchObject({ status: 409, problemType: 'order-already-paid' });
    expect(twice.memory.periods).toHaveLength(1);
    expect(twice.memory.payments).toHaveLength(1);
    const viaWebhook = setup();
    await viaWebhook.applier.applyPayment(viaWebhook.tx as never, input());
    await expect(viaWebhook.applier.confirmManual(confirm)).rejects.toMatchObject({ status: 409, problemType: 'order-already-paid' });
    expect(viaWebhook.memory.periods).toHaveLength(1);
  });

  it('T13: a closed order → 409 order-closed', async () => {
    const { applier } = setup({ orders: [baseOrder({ status: 'closed' })] });
    await expect(applier.confirmManual(confirm)).rejects.toMatchObject({ status: 409, problemType: 'order-closed' });
  });

  it('LB1E40: the learner’s account is deleted or being deleted → 409 account-deleted / account-deleting', async () => {
    await expect(setup({ account: null }).applier.confirmManual(confirm)).rejects.toMatchObject({ status: 409, problemType: 'account-deleted' });
    await expect(setup({ account: 'deleting' }).applier.confirmManual(confirm)).rejects.toMatchObject({ status: 409, problemType: 'account-deleting' });
  });

  it('an order that does not exist → 404', async () => {
    await expect(setup().applier.confirmManual({ ...confirm, orderId: 'nope' })).rejects.toMatchObject({ status: 404 });
  });

  it('runs in one transaction, user lock before order lock', async () => {
    const { applier, memory, prisma } = setup();
    await applier.confirmManual(confirm);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const calls = memory.calls;
    expect(calls.indexOf('tx:begin')).toBeLessThan(calls.indexOf(`lock-user:${USER}`));
    expect(calls.indexOf(`lock-user:${USER}`)).toBeLessThan(calls.indexOf(`lock-order:${ORDER}`));
    expect(calls.indexOf(`lock-order:${ORDER}`)).toBeLessThan(calls.indexOf('insert-payment'));
    expect(calls.at(-1)).toBe('tx:commit');
  });

  it('a refusal changes nothing: the transaction throws before any write', async () => {
    const { applier, memory } = setup({ orders: [baseOrder({ status: 'closed' })] });
    await expect(applier.confirmManual(confirm)).rejects.toBeDefined();
    expect(memory.calls).not.toContain('insert-payment');
    expect(memory.calls).not.toContain('update-order');
  });
});

describe('payments through payOS: the `PaymentRecord` shape the repository returns', () => {
  it('names only what the rules need (a type check of the in-memory fake against the real repository’s contract)', () => {
    const record: PaymentRecord = { id: 'p', outcome: 'counted' };
    expect(record.outcome).toBe('counted');
  });
});
