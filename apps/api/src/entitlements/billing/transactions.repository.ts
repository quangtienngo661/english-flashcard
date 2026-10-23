import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { NormalizedEvent } from './billing.types.js';
import { toMinorUnits } from './transaction-amount.js';

type Tx = Prisma.TransactionClient;

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

function money(amount: number | null, currency: string | null): Pick<TransactionRow, 'amountMinor' | 'currency'> {
  if (amount === null || currency === null) return { amountMinor: null, currency: null };
  return { amountMinor: BigInt(toMinorUnits(amount, currency)), currency };
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

  private async insert(tx: Tx, row: TransactionRow): Promise<void> {
    await tx.billingTransaction.createMany({ data: [row], skipDuplicates: true });
  }
}
