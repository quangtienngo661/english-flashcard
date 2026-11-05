import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { BILLING_MAX_ATTEMPTS } from '../entitlements.constants.js';
import type { BillingEnvironment } from '../entitlements.types.js';
import type { OrderStatus, PaidVia, PaymentOutcome, ReviewReason } from './order-rules.js';

type Db = PrismaClient | Prisma.TransactionClient;

/** One `billing_orders` row as the order rules need it (amounts in whole dong). */
export type OrderRecord = {
  id: string;
  userId: string;
  provider: string;
  environment: BillingEnvironment;
  orderCode: number;
  periodMonths: number;
  amount: number;
  currency: string;
  status: OrderStatus;
  reviewReason: ReviewReason | null;
  paidVia: PaidVia | null;
  paymentLinkId: string | null;
  expiresAt: Date;
};

export type NewPayment = {
  orderId: string;
  paymentKey: string;
  source: 'webhook' | 'reconcile' | 'manual';
  reference: string;
  amount: number;
  providerTime: string | null;
  outcome: PaymentOutcome;
  confirmedBy?: string | null;
  reason?: string | null;
};

export type NewPeriod = { userId: string; orderId: string; paymentId: string; startsAt: Date; endsAt: Date };

/** An order as the staff screens read it (design §3.9). */
export type AdminOrderRow = {
  id: string;
  userId: string;
  status: OrderStatus;
  reviewReason: ReviewReason | null;
  paidVia: PaidVia | null;
  orderCode: number;
  periodMonths: number;
  amount: number;
  description: string;
  paymentLinkId: string | null;
  createdAt: Date;
  expiresAt: Date;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  refundPayerName: string | null;
  refundPayerAccount: string | null;
  refundPayerBank: string | null;
  refundSavedAt: Date | null;
};

export type AdminOrderDetailRow = AdminOrderRow & {
  payments: Array<{
    id: string; source: string; reference: string; amount: number; providerTime: string | null; outcome: string; periodId: string | null;
    confirmedBy: string | null; reason: string | null; receivedAt: Date;
  }>;
  periods: Array<{ id: string; startsAt: Date; endsAt: Date; revokedAt: Date | null; revokeReason: string | null }>;
};

export type AdminOrderFilter = {
  status?: OrderStatus;
  needsAttention?: boolean;
  userId?: string;
  from?: Date;
  to?: Date;
  /** Upper case, part of the transfer note. */
  q?: string;
  cursor?: { createdAt: Date; id: string };
  take: number;
};

/** `undefined` leaves a column alone, `null` clears it. */
export type OrderUpdate = {
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
  status?: OrderStatus;
  reviewReason?: ReviewReason | null;
  paidVia?: PaidVia | null;
  refundPayerName?: string | null;
  refundPayerAccount?: string | null;
  refundPayerBank?: string | null;
  refundSavedAt?: Date | null;
};

export type PaymentRecord = { id: string; outcome: string };

/** An order the reconcile job or the return page asks payOS about (design §3.6). */
export type ReconcileOrder = {
  id: string;
  userId: string;
  status: string;
  orderCode: number;
  paymentLinkId: string | null;
  expiresAt: Date;
  createdAt: Date;
};

type ReconcileRow = {
  id: string;
  user_id: string;
  status: string;
  order_code: bigint;
  payment_link_id: string | null;
  expires_at: Date;
  created_at: Date;
};

const toReconcile = (row: ReconcileRow): ReconcileOrder => ({
  id: row.id, userId: row.user_id, status: row.status, orderCode: Number(row.order_code), paymentLinkId: row.payment_link_id,
  expiresAt: row.expires_at, createdAt: row.created_at,
});

/** A new `pending` order: the order code comes from the sequence, the status and the link are not set yet. */
export type NewOrder = {
  userId: string;
  provider: string;
  environment: BillingEnvironment;
  orderCode: number;
  description: string;
  periodMonths: number;
  amount: number;
  currency: string;
  expiresAt: Date;
};

/** What a learner sees of their own order (design §3.8): the first period it opened is `period`. */
export type OrderView = {
  id: string;
  status: string;
  periodMonths: number;
  amount: number;
  description: string;
  expiresAt: Date;
  period: { startsAt: Date; endsAt: Date } | null;
};

type OrderRow = NonNullable<Awaited<ReturnType<PrismaClient['billingOrder']['findUnique']>>>;

const toAdminRow = (row: OrderRow): AdminOrderRow => ({
  id: row.id, userId: row.userId, status: row.status as OrderStatus, reviewReason: row.reviewReason as ReviewReason | null,
  paidVia: row.paidVia as PaidVia | null, orderCode: Number(row.orderCode), periodMonths: row.periodMonths, amount: Number(row.amountMinor),
  description: row.description, paymentLinkId: row.paymentLinkId, createdAt: row.createdAt, expiresAt: row.expiresAt, resolvedAt: row.resolvedAt,
  resolutionNote: row.resolutionNote, refundPayerName: row.refundPayerName, refundPayerAccount: row.refundPayerAccount,
  refundPayerBank: row.refundPayerBank, refundSavedAt: row.refundSavedAt,
});

const toRecord = (row: OrderRow): OrderRecord => ({
  id: row.id,
  userId: row.userId,
  provider: row.provider,
  environment: row.environment as BillingEnvironment,
  orderCode: Number(row.orderCode),
  periodMonths: row.periodMonths,
  amount: Number(row.amountMinor),
  currency: row.currency,
  status: row.status as OrderStatus,
  reviewReason: row.reviewReason as ReviewReason | null,
  paidVia: row.paidVia as PaidVia | null,
  paymentLinkId: row.paymentLinkId,
  expiresAt: row.expiresAt,
});

/**
 * The data the order rules read and write (launch prep B design §3.2). Every method takes the caller's client, so the applier's
 * transaction (inbox claim → lockUser → this order's row) is the only connection in use.
 */
@Injectable()
export class OrdersRepository {
  async findByCode(db: Db, provider: string, orderCode: number): Promise<OrderRecord | null> {
    const row = await db.billingOrder.findUnique({ where: { provider_orderCode: { provider, orderCode: BigInt(orderCode) } } });
    return row === null ? null : toRecord(row);
  }

  /** The next order code: 10^9 and up (the migration's sequence), never reused, also not after a failed order. */
  async nextOrderCode(db: Db): Promise<number> {
    const rows = await db.$queryRaw<Array<{ code: bigint }>>`SELECT nextval('billing_order_code_seq') AS code`;
    return Number(rows[0].code);
  }

  async insertPending(db: Db, row: NewOrder): Promise<{ id: string }> {
    return db.billingOrder.create({
      data: {
        userId: row.userId, provider: row.provider, environment: row.environment, orderCode: BigInt(row.orderCode), description: row.description,
        periodMonths: row.periodMonths, amountMinor: BigInt(row.amount), currency: row.currency, status: 'pending', expiresAt: row.expiresAt,
      },
      select: { id: true },
    });
  }

  /** Keeps payOS's link on the order, only while it is still pending: false when a webhook, the job or staff changed it first. */
  async setLink(db: Db, id: string, paymentLinkId: string, checkoutUrl: string): Promise<boolean> {
    const result = await db.billingOrder.updateMany({ where: { id, status: 'pending' }, data: { paymentLinkId, checkoutUrl } });
    return result.count > 0;
  }

  /** `pending` → `failed`, only while it is still pending. */
  async markFailed(db: Db, id: string): Promise<boolean> {
    const result = await db.billingOrder.updateMany({ where: { id, status: 'pending' }, data: { status: 'failed' } });
    return result.count > 0;
  }

  /** The order if it is this learner's, with the first period it opened; null for anyone else's or an unknown id. */
  async findOwned(db: Db, id: string, userId: string): Promise<OrderView | null> {
    const row = await db.billingOrder.findFirst({ where: { id, userId }, include: { periods: { orderBy: { startsAt: 'asc' }, take: 1 } } });
    if (row === null) return null;
    const period = row.periods[0];
    return {
      id: row.id, status: row.status, periodMonths: row.periodMonths, amount: Number(row.amountMinor), description: row.description,
      expiresAt: row.expiresAt, period: period ? { startsAt: period.startsAt, endsAt: period.endsAt } : null,
    };
  }

  /**
   * The orders the hourly job looks at, claimed by writing `checked_at` in the same statement that picks them (`SKIP LOCKED`), so the
   * API and the worker never ask about the same order: pending with a link, created more than 5 minutes ago and not asked in the last
   * 10; pending with no link after 2 minutes (the process died between the insert and the link); failed with no link, within 24
   * hours, never asked. Oldest first, at most `limit` (design §3.6).
   */
  async claimForReconcile(db: Db, now: Date, limit: number): Promise<ReconcileOrder[]> {
    const rows = await db.$queryRaw<ReconcileRow[]>`
      UPDATE billing_orders SET checked_at = ${now}::timestamptz
      WHERE id IN (
        SELECT id FROM billing_orders
        WHERE (
          (status = 'pending' AND payment_link_id IS NOT NULL AND created_at < ${now}::timestamptz - interval '5 minutes'
            AND (checked_at IS NULL OR checked_at < ${now}::timestamptz - interval '10 minutes'))
          OR (status = 'pending' AND payment_link_id IS NULL AND created_at < ${now}::timestamptz - interval '2 minutes'
            AND (checked_at IS NULL OR checked_at < ${now}::timestamptz - interval '10 minutes'))
          OR (status = 'failed' AND payment_link_id IS NULL AND created_at > ${now}::timestamptz - interval '24 hours' AND checked_at IS NULL)
        )
        ORDER BY created_at ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED
      )
      RETURNING id, user_id, status, order_code, payment_link_id, expires_at, created_at`;
    return rows.map(toReconcile);
  }

  /** The return page's claim: this learner's pending order, if it was not asked in the last `minGapMs`; null otherwise. */
  async claimForCheck(db: Db, id: string, userId: string, now: Date, minGapMs: number): Promise<ReconcileOrder | null> {
    const rows = await db.$queryRaw<ReconcileRow[]>`
      UPDATE billing_orders SET checked_at = ${now}::timestamptz
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid AND status = 'pending'
        AND (checked_at IS NULL OR checked_at < ${now}::timestamptz - ${minGapMs}::double precision * interval '1 millisecond')
      RETURNING id, user_id, status, order_code, payment_link_id, expires_at, created_at`;
    return rows.length === 0 ? null : toReconcile(rows[0]);
  }

  /** `UPDATE … WHERE id AND status = from`: false when something else (a webhook, staff) already changed the order. */
  async transition(db: Db, id: string, from: OrderStatus, data: OrderUpdate): Promise<boolean> {
    const result = await db.billingOrder.updateMany({ where: { id, status: from }, data });
    return result.count > 0;
  }

  /** Newest first by (created_at, id); `take` is the page size plus one, so the caller knows whether there is another page. */
  async listAdmin(db: Db, filter: AdminOrderFilter): Promise<AdminOrderRow[]> {
    const where: Prisma.BillingOrderWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.q ? { description: { contains: filter.q } } : {}),
      ...(filter.from || filter.to ? { createdAt: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lt: filter.to } : {}) } } : {}),
      AND: [
        ...(filter.needsAttention ? [{ OR: [{ status: 'needs_review' }, { reviewReason: { not: null } }] }] : []),
        ...(filter.cursor ? [{ OR: [{ createdAt: { lt: filter.cursor.createdAt } }, { createdAt: filter.cursor.createdAt, id: { lt: filter.cursor.id } }] }] : []),
      ],
    };
    const rows = await db.billingOrder.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: filter.take });
    return rows.map(toAdminRow);
  }

  /** The order with its payments (oldest first) and periods (earliest start first). */
  async adminDetail(db: Db, id: string): Promise<AdminOrderDetailRow | null> {
    const row = await db.billingOrder.findUnique({
      where: { id },
      include: { payments: { orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }] }, periods: { orderBy: { startsAt: 'asc' } } },
    });
    if (row === null) return null;
    return {
      ...toAdminRow(row),
      payments: row.payments.map((p) => ({
        id: p.id, source: p.source, reference: p.reference, amount: Number(p.amountMinor), providerTime: p.providerTime, outcome: p.outcome,
        periodId: p.periodId, confirmedBy: p.confirmedBy, reason: p.reason, receivedAt: p.receivedAt,
      })),
      periods: row.periods.map((p) => ({ id: p.id, startsAt: p.startsAt, endsAt: p.endsAt, revokedAt: p.revokedAt, revokeReason: p.revokeReason })),
    };
  }

  async findPeriod(db: Db, id: string): Promise<{ id: string; userId: string; revokedAt: Date | null } | null> {
    return db.prepaidPeriod.findUnique({ where: { id }, select: { id: true, userId: true, revokedAt: true } });
  }

  /** Revokes a period that is not revoked yet; false when it already was. Nothing else is touched: later periods keep their dates. */
  async revokePeriod(db: Db, id: string, revokedBy: string, reason: string, now: Date): Promise<boolean> {
    const result = await db.prepaidPeriod.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: now, revokedBy, revokeReason: reason } });
    return result.count > 0;
  }

  async findById(db: Db, id: string): Promise<OrderRecord | null> {
    const row = await db.billingOrder.findUnique({ where: { id } });
    return row === null ? null : toRecord(row);
  }

  /** `SELECT … FOR UPDATE` of the order, then its fresh state; null when it is gone. */
  async lock(db: Db, id: string): Promise<OrderRecord | null> {
    const rows = await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM billing_orders WHERE id = ${id}::uuid FOR UPDATE`;
    return rows.length === 0 ? null : this.findById(db, id);
  }

  async findPaymentByKey(db: Db, paymentKey: string): Promise<PaymentRecord | null> {
    return db.billingOrderPayment.findUnique({ where: { paymentKey }, select: { id: true, outcome: true } });
  }

  /** The money that came through payOS (webhook or reconcile, any outcome) for the order: the sum S and how many payments. */
  async payosTotals(db: Db, orderId: string): Promise<{ total: number; count: number }> {
    const sum = await db.billingOrderPayment.aggregate({
      where: { orderId, source: { in: ['webhook', 'reconcile'] } }, _sum: { amountMinor: true }, _count: { _all: true },
    });
    return { total: Number(sum._sum.amountMinor ?? 0n), count: sum._count._all };
  }

  /**
   * Review I1. True when none of these payOS transfers was ever counted and every one of their inbox rows is final without having been applied
   * (`ignored`, or `failed` for good): money no automatic path will pick up. A payment key is also the inbox `dedupe_key`, so one list serves both.
   */
  async neverApplied(db: Db, keys: string[]): Promise<boolean> {
    if (keys.length === 0) return false;
    if (await db.billingOrderPayment.count({ where: { paymentKey: { in: keys } } }) > 0) return false;
    const events = await db.billingEvent.findMany({ where: { dedupeKey: { in: keys } }, select: { status: true, attempts: true } });
    return events.length === keys.length
      && events.every((event) => event.status === 'ignored' || (event.status === 'failed' && event.attempts >= BILLING_MAX_ATTEMPTS));
  }

  /** The same payments, one by one: what the rules compare an arriving payment with (the amount and payOS's moment). */
  async payosTransfers(db: Db, orderId: string): Promise<Array<{ amount: number; providerTime: string | null }>> {
    const rows = await db.billingOrderPayment.findMany({
      where: { orderId, source: { in: ['webhook', 'reconcile'] } }, select: { amountMinor: true, providerTime: true },
    });
    return rows.map((row) => ({ amount: Number(row.amountMinor), providerTime: row.providerTime }));
  }

  async insertPayment(db: Db, row: NewPayment): Promise<{ id: string }> {
    return db.billingOrderPayment.create({
      data: {
        orderId: row.orderId, paymentKey: row.paymentKey, source: row.source, reference: row.reference, amountMinor: BigInt(row.amount),
        providerTime: row.providerTime, outcome: row.outcome, confirmedBy: row.confirmedBy ?? null, reason: row.reason ?? null,
      },
      select: { id: true },
    });
  }

  async attachPeriod(db: Db, paymentId: string, periodId: string): Promise<void> {
    await db.billingOrderPayment.update({ where: { id: paymentId }, data: { periodId } });
  }

  async insertPeriod(db: Db, row: NewPeriod): Promise<{ id: string }> {
    return db.prepaidPeriod.create({
      data: { userId: row.userId, orderId: row.orderId, paymentId: row.paymentId, startsAt: row.startsAt, endsAt: row.endsAt },
      select: { id: true },
    });
  }

  async updateOrder(db: Db, id: string, data: OrderUpdate): Promise<void> {
    await db.billingOrder.update({ where: { id }, data });
  }
}
