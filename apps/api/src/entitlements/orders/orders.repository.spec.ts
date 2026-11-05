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

  it('payosTransfers gives each webhook or reconcile payment of the order as an amount (a number) and the moment payOS gave', async () => {
    const findMany = vi.fn(async () => [{ amountMinor: 79000n, providerTime: '2026-11-05 10:02:00' }, { amountMinor: 40000n, providerTime: null }]);
    expect(await repo.payosTransfers({ billingOrderPayment: { findMany } } as never, 'o1')).toEqual([
      { amount: 79000, providerTime: '2026-11-05 10:02:00' }, { amount: 40000, providerTime: null },
    ]);
    expect(findMany).toHaveBeenCalledWith({ where: { orderId: 'o1', source: { in: ['webhook', 'reconcile'] } }, select: { amountMinor: true, providerTime: true } });
  });

  describe('neverApplied (review I1): no payment counted, and every inbox row final without being applied', () => {
    const KEYS = ['payos:production:1000000123:FT1', 'payos:production:1000000123:FT2'];
    const db = (counted: number, events: Array<{ status: string; attempts: number }>) => ({
      billingOrderPayment: { count: vi.fn(async () => counted) }, billingEvent: { findMany: vi.fn(async () => events) },
    });
    const ask = (counted: number, events: Array<{ status: string; attempts: number }>, keys = KEYS) => repo.neverApplied(db(counted, events) as never, keys);

    it('ignored rows, or rows that failed 5 times → true; the query reads both tables by the keys', async () => {
      expect(await ask(0, [{ status: 'ignored', attempts: 0 }, { status: 'failed', attempts: 5 }])).toBe(true);
      const probe = db(0, [{ status: 'ignored', attempts: 0 }, { status: 'ignored', attempts: 0 }]);
      await repo.neverApplied(probe as never, KEYS);
      expect(probe.billingOrderPayment.count).toHaveBeenCalledWith({ where: { paymentKey: { in: KEYS } } });
      expect(probe.billingEvent.findMany).toHaveBeenCalledWith({ where: { dedupeKey: { in: KEYS } }, select: { status: true, attempts: true } });
    });

    it('any payment counted → false, and the inbox is not read', async () => {
      const probe = db(1, [{ status: 'ignored', attempts: 0 }, { status: 'ignored', attempts: 0 }]);
      expect(await repo.neverApplied(probe as never, KEYS)).toBe(false);
      expect(probe.billingEvent.findMany).not.toHaveBeenCalled();
    });

    it('a row still on its way is false: pending, applied, or failed fewer than 5 times (the hourly job retries it)', async () => {
      for (const row of [{ status: 'pending', attempts: 0 }, { status: 'applied', attempts: 0 }, { status: 'failed', attempts: 4 }, { status: 'stale', attempts: 0 }]) {
        expect(await ask(0, [{ status: 'ignored', attempts: 0 }, row]), row.status).toBe(false);
      }
    });

    it('a transfer with no inbox row at all, or an empty list of transfers → false', async () => {
      expect(await ask(0, [{ status: 'ignored', attempts: 0 }])).toBe(false);
      expect(await ask(0, [], [])).toBe(false);
    });
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

describe('OrdersRepository — reconcile queries (shapes; the rows are checked by the payments smoke)', () => {
  const repo = new OrdersRepository();
  const NOW = new Date('2026-11-05T04:00:00Z');
  const sqlOf = (call: unknown[]) => (call[0] as TemplateStringsArray).join('?').replace(/\s+/g, ' ');

  it('claimForReconcile writes checked_at on at most N orders chosen with SKIP LOCKED, oldest first, by the three conditions of design §3.6', async () => {
    const queryRaw = vi.fn(async (..._args: unknown[]) => [{
      id: 'o1', user_id: 'u1', status: 'pending', order_code: 1_000_000_123n, payment_link_id: 'link-1', expires_at: new Date('2026-11-05T03:17:00Z'), created_at: new Date('2026-11-05T03:02:00Z'),
    }]);
    const claimed = await repo.claimForReconcile({ $queryRaw: queryRaw } as never, NOW, 100);
    expect(claimed).toEqual([{
      id: 'o1', userId: 'u1', status: 'pending', orderCode: 1_000_000_123, paymentLinkId: 'link-1', expiresAt: new Date('2026-11-05T03:17:00Z'), createdAt: new Date('2026-11-05T03:02:00Z'),
    }]);
    const sql = sqlOf(queryRaw.mock.calls[0]);
    expect(sql).toContain('UPDATE billing_orders SET checked_at = ?');
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain('ORDER BY created_at ASC LIMIT ?');
    expect(sql).toContain("status = 'pending' AND payment_link_id IS NOT NULL AND created_at < ?::timestamptz - interval '5 minutes'");
    expect(sql).toContain("status = 'pending' AND payment_link_id IS NULL AND created_at < ?::timestamptz - interval '2 minutes'");
    expect(sql).toContain("status = 'failed' AND payment_link_id IS NULL AND created_at > ?::timestamptz - interval '24 hours' AND checked_at IS NULL");
    expect(sql).toContain('RETURNING');
    expect(queryRaw.mock.calls[0].slice(1)).toContain(100);
  });

  it('claimForCheck claims one pending order of the learner when it was not asked in the last gap, and is null otherwise', async () => {
    const queryRaw = vi.fn(async (..._args: unknown[]) => [{
      id: 'o1', user_id: 'u1', status: 'pending', order_code: 1_000_000_123n, payment_link_id: 'link-1', expires_at: new Date('2026-11-05T03:17:00Z'), created_at: new Date('2026-11-05T03:02:00Z'),
    }]);
    expect((await repo.claimForCheck({ $queryRaw: queryRaw } as never, 'o1', 'u1', NOW, 10_000))?.orderCode).toBe(1_000_000_123);
    const sql = sqlOf(queryRaw.mock.calls[0]);
    expect(sql).toContain('UPDATE billing_orders SET checked_at = ?');
    expect(sql).toContain("WHERE id = ?::uuid AND user_id = ?::uuid AND status = 'pending' AND (checked_at IS NULL OR checked_at < ?");
    expect(await repo.claimForCheck({ $queryRaw: vi.fn(async () => []) } as never, 'o1', 'u1', NOW, 10_000)).toBeNull();
  });

  it('transition changes the order only while it still has the status that was read, and says whether it did', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    expect(await repo.transition({ billingOrder: { updateMany } } as never, 'o1', 'pending', { status: 'expired' })).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'o1', status: 'pending' }, data: { status: 'expired' } });
    expect(await repo.transition({ billingOrder: { updateMany: vi.fn(async () => ({ count: 0 })) } } as never, 'o1', 'pending', { status: 'expired' })).toBe(false);
  });
});

describe('OrdersRepository — staff queries (shapes; the rows are checked by the payments smoke)', () => {
  const repo = new OrdersRepository();
  const FULL = {
    id: 'o1', userId: 'u1', provider: 'payos', environment: 'production', orderCode: 1_000_000_123n, description: 'WM0XSNJKV', periodMonths: 1, amountMinor: 79000n,
    currency: 'VND', status: 'needs_review', reviewReason: 'amount-short', paidVia: null, paymentLinkId: 'link-1', checkoutUrl: 'https://x',
    expiresAt: new Date('2026-11-05T03:17:00Z'), checkedAt: null, refundPayerName: null, refundPayerAccount: null, refundPayerBank: null, refundSavedAt: null,
    resolvedAt: null, resolvedBy: null, resolutionNote: null, createdAt: new Date('2026-11-05T03:02:00Z'), updatedAt: new Date('2026-11-05T03:02:00Z'),
  };

  it('listAdmin reads newest first by (created_at, id) with the filters of the screen, and numbers instead of bigints', async () => {
    const findMany = vi.fn(async () => [FULL]);
    const cursor = { createdAt: new Date('2026-11-05T03:00:00Z'), id: 'o0' };
    const rows = await repo.listAdmin({ billingOrder: { findMany } } as never, {
      status: 'needs_review', needsAttention: true, userId: 'u1', from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-12-01T00:00:00Z'), q: 'WM0X', cursor, take: 21,
    });
    expect(rows[0]).toMatchObject({ id: 'o1', orderCode: 1_000_000_123, amount: 79000, status: 'needs_review', reviewReason: 'amount-short' });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: 'needs_review', userId: 'u1', description: { contains: 'WM0X' },
        createdAt: { gte: new Date('2026-11-01T00:00:00Z'), lt: new Date('2026-12-01T00:00:00Z') },
        AND: [
          { OR: [{ status: 'needs_review' }, { reviewReason: { not: null } }] },
          { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: 'o0' } }] },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21,
    });
  });

  it('listAdmin with no filter asks for nothing but the page', async () => {
    const findMany = vi.fn(async () => []);
    await repo.listAdmin({ billingOrder: { findMany } } as never, { take: 21 });
    expect(findMany).toHaveBeenCalledWith({ where: { AND: [] }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21 });
  });

  it('adminDetail reads the payments oldest first and the periods by start, and is null for an unknown order', async () => {
    const findUnique = vi.fn(async () => ({
      ...FULL,
      payments: [{ id: 'p1', source: 'webhook', reference: 'FT1', amountMinor: 79000n, providerTime: '2026-11-05 10:02:00', outcome: 'counted', periodId: null, confirmedBy: null, reason: null, receivedAt: new Date('2026-11-05T03:02:05Z') }],
      periods: [{ id: 'per1', startsAt: new Date('2026-11-05T03:02:00Z'), endsAt: new Date('2026-12-05T17:00:00Z'), revokedAt: null, revokeReason: null }],
    }));
    const detail = await repo.adminDetail({ billingOrder: { findUnique } } as never, 'o1');
    expect(detail?.payments).toEqual([expect.objectContaining({ id: 'p1', amount: 79000, outcome: 'counted' })]);
    expect(detail?.periods).toEqual([{ id: 'per1', startsAt: new Date('2026-11-05T03:02:00Z'), endsAt: new Date('2026-12-05T17:00:00Z'), revokedAt: null, revokeReason: null }]);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'o1' }, include: { payments: { orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }] }, periods: { orderBy: { startsAt: 'asc' } } },
    });
    expect(await repo.adminDetail({ billingOrder: { findUnique: vi.fn(async () => null) } } as never, 'x')).toBeNull();
  });

  it('revokePeriod only revokes a period that is not revoked, and writes who, when and why', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const now = new Date('2026-11-05T04:00:00Z');
    expect(await repo.revokePeriod({ prepaidPeriod: { updateMany } } as never, 'per1', 'admin-1', 'wrong learner', now)).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'per1', revokedAt: null }, data: { revokedAt: now, revokedBy: 'admin-1', revokeReason: 'wrong learner' } });
    expect(await repo.revokePeriod({ prepaidPeriod: { updateMany: vi.fn(async () => ({ count: 0 })) } } as never, 'per1', 'a', 'r', now)).toBe(false);
  });

  it('findPeriod asks for the id, the learner and whether it is revoked', async () => {
    const findUnique = vi.fn(async () => ({ id: 'per1', userId: 'u1', revokedAt: null }));
    expect(await repo.findPeriod({ prepaidPeriod: { findUnique } } as never, 'per1')).toEqual({ id: 'per1', userId: 'u1', revokedAt: null });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'per1' }, select: { id: true, userId: true, revokedAt: true } });
  });
});
