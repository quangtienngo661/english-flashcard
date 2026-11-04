import { describe, expect, it, vi } from 'vitest';
import { OrdersRepository } from './orders.repository.js';

const ROW = {
  id: 'o1', userId: 'u1', provider: 'payos', environment: 'production', orderCode: 1_000_000_123n, description: 'WM0XSNJKV', periodMonths: 3,
  amountMinor: 199000n, currency: 'VND', status: 'pending', reviewReason: null, paidVia: null, paymentLinkId: 'link-1',
  expiresAt: new Date('2026-11-05T03:17:00Z'),
};

describe('OrdersRepository (query shapes; the data itself is checked by the payments smoke)', () => {
  const repo = new OrdersRepository();

  it('findByCode asks for the unique (provider, order code) and gives numbers, not bigints', async () => {
    const db = { billingOrder: { findUnique: vi.fn(async () => ROW) } };
    expect(await repo.findByCode(db as never, 'payos', 1_000_000_123)).toEqual({
      id: 'o1', userId: 'u1', provider: 'payos', environment: 'production', orderCode: 1_000_000_123, periodMonths: 3, amount: 199000, currency: 'VND',
      status: 'pending', reviewReason: null, paidVia: null, paymentLinkId: 'link-1', expiresAt: ROW.expiresAt,
    });
    expect(db.billingOrder.findUnique).toHaveBeenCalledWith({ where: { provider_orderCode: { provider: 'payos', orderCode: 1_000_000_123n } } });
  });

  it('findByCode and findById give null for no row', async () => {
    const db = { billingOrder: { findUnique: vi.fn(async () => null) } };
    expect(await repo.findByCode(db as never, 'payos', 5)).toBeNull();
    expect(await repo.findById(db as never, 'nope')).toBeNull();
  });

  it('lock takes the row FOR UPDATE and then reads its fresh state; a vanished row is null and reads nothing', async () => {
    const queryRaw = vi.fn(async (_strings: TemplateStringsArray, ..._values: unknown[]) => [{ id: 'o1' }]);
    const db = { $queryRaw: queryRaw, billingOrder: { findUnique: vi.fn(async () => ROW) } };
    expect((await repo.lock(db as never, 'o1'))?.id).toBe('o1');
    expect(queryRaw.mock.calls[0][0].join('?').replace(/\s+/g, ' ')).toContain('FROM billing_orders WHERE id = ?::uuid FOR UPDATE');
    expect(queryRaw.mock.calls[0][1]).toBe('o1');
    const gone = { $queryRaw: vi.fn(async () => []), billingOrder: { findUnique: vi.fn() } };
    expect(await repo.lock(gone as never, 'o1')).toBeNull();
    expect(gone.billingOrder.findUnique).not.toHaveBeenCalled();
  });

  it('payosTotals sums only webhook and reconcile payments of the order, as a number', async () => {
    const aggregate = vi.fn(async () => ({ _sum: { amountMinor: 298000n }, _count: { _all: 2 } }));
    expect(await repo.payosTotals({ billingOrderPayment: { aggregate } } as never, 'o1')).toEqual({ total: 298000, count: 2 });
    expect(aggregate).toHaveBeenCalledWith({ where: { orderId: 'o1', source: { in: ['webhook', 'reconcile'] } }, _sum: { amountMinor: true }, _count: { _all: true } });
    expect(await repo.payosTotals({ billingOrderPayment: { aggregate: vi.fn(async () => ({ _sum: { amountMinor: null }, _count: { _all: 0 } })) } } as never, 'o1'))
      .toEqual({ total: 0, count: 0 });
  });

  it('insertPayment writes the amount as bigint and fills the optional columns with null', async () => {
    const create = vi.fn(async () => ({ id: 'p1' }));
    const result = await repo.insertPayment({ billingOrderPayment: { create } } as never, {
      orderId: 'o1', paymentKey: 'k', source: 'webhook', reference: 'R', amount: 79000, providerTime: '2026-11-05 10:02:00', outcome: 'counted',
    });
    expect(result).toEqual({ id: 'p1' });
    expect(create).toHaveBeenCalledWith({
      data: { orderId: 'o1', paymentKey: 'k', source: 'webhook', reference: 'R', amountMinor: 79000n, providerTime: '2026-11-05 10:02:00', outcome: 'counted', confirmedBy: null, reason: null },
      select: { id: true },
    });
  });

  it('findPaymentByKey, attachPeriod, insertPeriod and updateOrder use the columns the migration has', async () => {
    const db = {
      billingOrderPayment: { findUnique: vi.fn(async () => ({ id: 'p1', outcome: 'counted' })), update: vi.fn(async () => ({})) },
      prepaidPeriod: { create: vi.fn(async () => ({ id: 'per1' })) },
      billingOrder: { update: vi.fn(async () => ({})) },
    };
    expect(await repo.findPaymentByKey(db as never, 'k')).toEqual({ id: 'p1', outcome: 'counted' });
    expect(db.billingOrderPayment.findUnique).toHaveBeenCalledWith({ where: { paymentKey: 'k' }, select: { id: true, outcome: true } });
    await repo.attachPeriod(db as never, 'p1', 'per1');
    expect(db.billingOrderPayment.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { periodId: 'per1' } });
    const startsAt = new Date('2026-11-05T03:02:00Z');
    const endsAt = new Date('2026-12-05T17:00:00Z');
    expect(await repo.insertPeriod(db as never, { userId: 'u1', orderId: 'o1', paymentId: 'p1', startsAt, endsAt })).toEqual({ id: 'per1' });
    expect(db.prepaidPeriod.create).toHaveBeenCalledWith({ data: { userId: 'u1', orderId: 'o1', paymentId: 'p1', startsAt, endsAt }, select: { id: true } });
    await repo.updateOrder(db as never, 'o1', { status: 'paid', paidVia: 'webhook', reviewReason: null });
    expect(db.billingOrder.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { status: 'paid', paidVia: 'webhook', reviewReason: null } });
  });

  it('nextOrderCode reads the sequence and gives a number', async () => {
    const queryRaw = vi.fn(async (_strings: TemplateStringsArray) => [{ code: 1_000_000_007n }]);
    expect(await repo.nextOrderCode({ $queryRaw: queryRaw } as never)).toBe(1_000_000_007);
    expect(queryRaw.mock.calls[0][0].join('?')).toContain("nextval('billing_order_code_seq')");
  });

  it('insertPending writes a pending order with bigint amount and order code and no link yet', async () => {
    const create = vi.fn(async () => ({ id: 'o9' }));
    const expiresAt = new Date('2026-11-05T03:17:00Z');
    expect(await repo.insertPending({ billingOrder: { create } } as never, {
      userId: 'u1', provider: 'payos', environment: 'sandbox', orderCode: 1_000_000_000, description: 'WM0XSNJG0', periodMonths: 1, amount: 79000, currency: 'VND', expiresAt,
    })).toEqual({ id: 'o9' });
    expect(create).toHaveBeenCalledWith({
      data: { userId: 'u1', provider: 'payos', environment: 'sandbox', orderCode: 1_000_000_000n, description: 'WM0XSNJG0', periodMonths: 1, amountMinor: 79000n, currency: 'VND', status: 'pending', expiresAt },
      select: { id: true },
    });
  });

  it('setLink and markFailed only touch an order that is still pending, and say whether they did', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const db = { billingOrder: { updateMany } };
    expect(await repo.setLink(db as never, 'o1', 'link', 'https://pay.example')).toBe(true);
    expect(updateMany).toHaveBeenLastCalledWith({ where: { id: 'o1', status: 'pending' }, data: { paymentLinkId: 'link', checkoutUrl: 'https://pay.example' } });
    expect(await repo.markFailed(db as never, 'o1')).toBe(true);
    expect(updateMany).toHaveBeenLastCalledWith({ where: { id: 'o1', status: 'pending' }, data: { status: 'failed' } });
    updateMany.mockResolvedValue({ count: 0 });
    expect(await repo.setLink(db as never, 'o1', 'l', 'u')).toBe(false);
    expect(await repo.markFailed(db as never, 'o1')).toBe(false);
  });

  it('findOwned asks for the order of this learner with its first period, and is null for anyone else’s', async () => {
    const start = new Date('2026-11-05T03:02:00Z');
    const end = new Date('2026-12-05T17:00:00Z');
    const findFirst = vi.fn(async () => ({ ...ROW, periods: [{ startsAt: start, endsAt: end }] }));
    expect(await repo.findOwned({ billingOrder: { findFirst } } as never, 'o1', 'u1')).toEqual({
      id: 'o1', status: 'pending', periodMonths: 3, amount: 199000, description: 'WM0XSNJKV', expiresAt: ROW.expiresAt, period: { startsAt: start, endsAt: end },
    });
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'o1', userId: 'u1' }, include: { periods: { orderBy: { startsAt: 'asc' }, take: 1 } } });
    expect(await repo.findOwned({ billingOrder: { findFirst: vi.fn(async () => null) } } as never, 'o1', 'other')).toBeNull();
    expect((await repo.findOwned({ billingOrder: { findFirst: vi.fn(async () => ({ ...ROW, periods: [] })) } } as never, 'o1', 'u1'))?.period).toBeNull();
  });
});
