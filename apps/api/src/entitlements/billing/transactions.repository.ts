import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { NormalizedEvent } from './billing.types.js';
import { toMinorUnits } from './transaction-amount.js';

type Tx = Prisma.TransactionClient;

/** The interval of a transaction: a prepaid period of 3 months is a `quarter`; subscriptions keep `month | year` (launch prep B §3.2). */
export type TransactionInterval = 'month' | 'quarter' | 'year';

/** What a prepaid purchase writes (one row per period opened, design §3.2). */
export type PrepaidPurchase = {
  userId: string;
  provider: string;
  environment: string;
  /** `<orderCode>:<reference>` for payOS money, `manual:<order_id>` for a staff confirmation: unique, so two orders with one reference never collide. */
  providerTransactionId: string;
  amountMinor: bigint;
  currency: string;
  periodMonths: number;
  occurredAt: Date;
  periodStart: Date;
  periodEnd: Date;
};

const INTERVAL_OF_MONTHS: Record<number, TransactionInterval> = { 1: 'month', 3: 'quarter', 12: 'year' };

export type TransactionKind = 'purchase' | 'renewal' | 'plan_change' | 'refund' | 'trial';
export type TransactionStatus = 'succeeded' | 'refunded' | 'pending' | 'reversed';

/** One `billing_transactions` row as written (id and created_at come from the database). */
export type TransactionRow = {
  userId: string;
  subscriptionId: string | null;
  kind: TransactionKind;
  plan: string;
  interval: string | null;
  amountMinor: bigint | null;
  currency: string | null;
  occurredAt: Date;
  periodStart: Date;
  periodEnd: Date | null;
  status: TransactionStatus;
  provider: string;
  environment: string;
  providerTransactionId: string | null;
};

export type RecordContext = { userId: string; subscriptionId: string | null; provider: string };

/** Every paid subscription is Pro (Bước 5 design §5). */
const PLAN = 'pro';

/**
 * Optional fields never fail the event (review I1, M1): a payload stored before these fields existed has neither key, and an
 * amount that is negative or past what a number holds exactly is kept as "no amount".
 */
function money(amount: unknown, currency: unknown): Pick<TransactionRow, 'amountMinor' | 'currency'> {
  if (typeof amount !== 'number' || typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) return { amountMinor: null, currency: null };
  const minor = toMinorUnits(amount, currency);
  if (!Number.isSafeInteger(minor) || minor < 0) return { amountMinor: null, currency: null };
  return { amountMinor: BigInt(minor), currency };
}

/**
 * Writes the transaction history from applied billing events (learner UI design §8.9), inside the applier's transaction.
 * A repeated event writes nothing: the unique (provider, environment, provider_transaction_id, kind) skips it (GI5).
 */
@Injectable()
export class TransactionsRepository {
  async recordFromEvent(tx: Tx, event: NormalizedEvent, ctx: RecordContext): Promise<void> {
    const base = { userId: ctx.userId, subscriptionId: ctx.subscriptionId, plan: PLAN, provider: ctx.provider, environment: event.environment };
    switch (event.type) {
      case 'subscription_started': {
        const trial = event.trialEndsAt !== null;
        await this.insert(tx, {
          ...base, kind: trial ? 'trial' : 'purchase', interval: event.interval,
          ...(trial ? { amountMinor: null, currency: null } : money(event.amount, event.currency)),
          occurredAt: event.occurredAt, periodStart: event.currentPeriodStart, periodEnd: event.trialEndsAt ?? event.currentPeriodEnd,
          status: 'succeeded', providerTransactionId: event.transactionId,
        });
        return;
      }
      case 'renewed':
      case 'plan_changed':
        await this.insert(tx, {
          ...base, kind: event.type === 'renewed' ? 'renewal' : 'plan_change', interval: event.interval,
          ...money(event.amount, event.currency), occurredAt: event.occurredAt, periodStart: event.currentPeriodStart,
          periodEnd: event.currentPeriodEnd, status: 'succeeded', providerTransactionId: event.transactionId,
        });
        return;
      case 'refunded': {
        const original = { provider: ctx.provider, environment: event.environment, providerTransactionId: event.transactionId, kind: { not: 'refund' } };
        const paid = await tx.billingTransaction.findFirst({ where: original });
        await this.insert(tx, {
          ...base, kind: 'refund', interval: paid?.interval ?? null, ...money(event.amount, event.currency), occurredAt: event.occurredAt,
          periodStart: paid?.periodStart ?? event.occurredAt, periodEnd: paid?.periodEnd ?? null, status: 'succeeded',
          providerTransactionId: event.transactionId,
        });
        await tx.billingTransaction.updateMany({ where: original, data: { status: 'refunded' } });
        // The insert above skipped a refund row that already exists: one the provider reversed is a refund again (B5-3).
        await tx.billingTransaction.updateMany({
          where: { provider: ctx.provider, environment: event.environment, providerTransactionId: event.transactionId, kind: 'refund', status: 'reversed' },
          data: { status: 'succeeded', occurredAt: event.occurredAt, ...money(event.amount, event.currency) },
        });
        return;
      }
      case 'refund_reversed': {
        const same = { provider: ctx.provider, environment: event.environment, providerTransactionId: event.transactionId };
        await tx.billingTransaction.updateMany({ where: { ...same, kind: 'refund' }, data: { status: 'reversed' } });
        await tx.billingTransaction.updateMany({ where: { ...same, kind: { not: 'refund' }, status: 'refunded' }, data: { status: 'succeeded' } });
        return;
      }
      default:
        return;
    }
  }

  /** The `purchase` row of one prepaid period. A repeat of the same payment writes nothing (the unique skips it). */
  async recordPrepaidPurchase(tx: Tx, purchase: PrepaidPurchase): Promise<void> {
    await this.insert(tx, {
      userId: purchase.userId, subscriptionId: null, kind: 'purchase', plan: PLAN, interval: INTERVAL_OF_MONTHS[purchase.periodMonths] ?? null,
      amountMinor: purchase.amountMinor, currency: purchase.currency, occurredAt: purchase.occurredAt, periodStart: purchase.periodStart,
      periodEnd: purchase.periodEnd, status: 'succeeded', provider: purchase.provider, environment: purchase.environment,
      providerTransactionId: purchase.providerTransactionId,
    });
  }

  private async insert(tx: Tx, row: TransactionRow): Promise<void> {
    await tx.billingTransaction.createMany({ data: [row], skipDuplicates: true });
  }
}
