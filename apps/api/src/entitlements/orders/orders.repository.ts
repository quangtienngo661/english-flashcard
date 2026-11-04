import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
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

/** `undefined` leaves a column alone, `null` clears it. */
export type OrderUpdate = {
  status?: OrderStatus;
  reviewReason?: ReviewReason | null;
  paidVia?: PaidVia | null;
  refundPayerName?: string | null;
  refundPayerAccount?: string | null;
  refundPayerBank?: string | null;
  refundSavedAt?: Date | null;
};

export type PaymentRecord = { id: string; outcome: string };

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
