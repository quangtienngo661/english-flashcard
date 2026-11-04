import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import type { Payer } from '../billing/billing-adapter.js';
import { TransactionsRepository } from '../billing/transactions.repository.js';
import { lockUser } from '../entitlements.locks.js';
import type { BillingEnvironment } from '../entitlements.types.js';
import { proSpans } from '../rules/pro-spans.js';
import { SourcesRepository } from '../sources/sources.repository.js';
import { paymentKeyManual, paymentKeyPayos } from './order-codes.js';
import {
  decideManualConfirm, decideOrderPayment, parsePayosTime, precheckPayment, type OrderState, type PaymentOutcome,
} from './order-rules.js';
import { OrdersRepository, type OrderRecord } from './orders.repository.js';
import { continuousProUntil, periodEnd } from './period-window.js';

type Tx = Prisma.TransactionClient;

/** What happened to a payment. `ignored` carries the reason (`not-success`, `unknown-order`, `link-mismatch`). */
export type OrderApplyResult = {
  outcome: PaymentOutcome | 'ignored';
  reason?: string;
  periodId?: string;
  /** The learner the order belonged to; null when the account is gone, so the stored event keeps no id that could name them. */
  userId?: string | null;
};

export type ApplyPaymentInput = {
  source: 'webhook' | 'reconcile';
  env: BillingEnvironment;
  orderCode: number;
  paymentLinkId: string;
  reference: string;
  amount: number;
  /** As payOS wrote it (Vietnam time, no zone), or null. */
  providerTime: string | null;
  success: boolean;
  code: string;
  payer: Payer | null;
  eventId?: string;
};

export type ConfirmManualInput = { orderId: string; adminId: string; reference: string; amount: number; reason: string };

/** A learner whose profile row is missing still has a day boundary: Vietnam's (design §3.7). */
const FALLBACK_ZONE = 'Asia/Ho_Chi_Minh';

const REFUSAL_TITLE = {
  '409-order-already-paid': 'Order already paid', '409-order-closed': 'Order closed',
  '409-account-deleted': 'Account deleted', '409-account-deleting': 'Account deleting',
} as const;

/**
 * Applies one-time payments to orders (launch prep B design §3.4). Lock order, never backwards: inbox claim (the event applier's) →
 * read the order → `lockUser` → the order's row `FOR UPDATE` → read the learner's account state and sources → decide → write. Pure
 * rules are in `order-rules.ts`; this class is the reading and writing around them.
 */
@Injectable()
export class OrderApplier {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SourcesRepository) private readonly sources: SourcesRepository,
    @Inject(TransactionsRepository) private readonly transactions: TransactionsRepository,
    @Inject(OrdersRepository) private readonly orders: OrdersRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /** Runs inside the transaction of the inbox row it came from (claim → this), so the lock order of design §3.4 holds. */
  async applyPayment(tx: Tx, input: ApplyPaymentInput): Promise<OrderApplyResult> {
    const now = this.clock.now();
    const found = await this.orders.findByCode(tx, 'payos', input.orderCode);
    const refused = precheckPayment(
      { success: input.success, code: input.code, paymentLinkId: input.paymentLinkId, env: input.env },
      found === null ? null : { paymentLinkId: found.paymentLinkId, environment: found.environment },
    );
    if (refused !== null || found === null) {
      this.logger.warn('order_payment_ignored', { reason: refused ?? 'unknown-order' });
      return { outcome: 'ignored', reason: refused ?? 'unknown-order' };
    }

    await lockUser(tx, found.userId);
    const order = await this.orders.lock(tx, found.id);
    if (order === null) return { outcome: 'ignored', reason: 'unknown-order' };
    const account = await this.accountOf(tx, order.userId);

    // The same payment seen again, by the webhook or by the job: already received, nothing written (design §3.4).
    const key = paymentKeyPayos(input.env, input.orderCode, input.reference);
    const seen = await this.orders.findPaymentByKey(tx, key);
    if (seen !== null) return { outcome: seen.outcome as PaymentOutcome, userId: account === 'active' ? order.userId : null };

    const totals = await this.orders.payosTotals(tx, order.id);
    const decision = decideOrderPayment(
      this.stateOf(order, account, totals), { source: input.source, amount: input.amount, at: parsePayosTime(input.providerTime, now) },
    );

    const payment = await this.orders.insertPayment(tx, {
      orderId: order.id, paymentKey: key, source: input.source, reference: input.reference, amount: input.amount,
      providerTime: input.providerTime, outcome: decision.outcome as PaymentOutcome,
    });
    let periodId: string | undefined;
    if (decision.openPeriod) {
      periodId = await this.openPeriod(tx, order, payment.id, now, `${input.orderCode}:${input.reference}`);
      await this.orders.attachPeriod(tx, payment.id, periodId);
    }
    await this.orders.updateOrder(tx, order.id, {
      status: decision.orderStatus, reviewReason: decision.reviewReason, paidVia: decision.paidVia,
      ...(decision.saveRefundInfo ? {
        refundPayerName: input.payer?.counterAccountName ?? null, refundPayerAccount: input.payer?.counterAccountNumber ?? null,
        refundPayerBank: input.payer?.counterAccountBankName ?? null, refundSavedAt: now,
      } : {}),
    });
    this.logger.info('order_payment_applied', {
      order_ref: order.id, source: input.source, outcome: decision.outcome, order_status: decision.orderStatus, period_opened: periodId !== undefined,
    });
    return { outcome: decision.outcome as PaymentOutcome, userId: account === 'active' ? order.userId : null, ...(periodId ? { periodId } : {}) };
  }

  /** Staff confirm they saw the money (T11–T14). One transaction of its own: user lock → order lock → write, or a 409/404 and nothing written. */
  async confirmManual(input: ConfirmManualInput): Promise<OrderApplyResult> {
    return this.prisma.$transaction(async (tx) => {
      const found = await this.orders.findById(tx, input.orderId);
      if (found === null) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
      await lockUser(tx, found.userId);
      const order = await this.orders.lock(tx, found.id);
      if (order === null) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
      const account = await this.accountOf(tx, order.userId);
      const decision = decideManualConfirm(this.stateOf(order, account, { total: 0, count: 0 }));
      if (decision.error !== undefined) {
        throw new ProblemDetailsException({ status: 409, title: REFUSAL_TITLE[decision.error], type: decision.error.slice(4) });
      }
      const now = this.clock.now();
      const payment = await this.orders.insertPayment(tx, {
        orderId: order.id, paymentKey: paymentKeyManual(order.id), source: 'manual', reference: input.reference, amount: input.amount,
        providerTime: null, outcome: 'opened-period', confirmedBy: input.adminId, reason: input.reason,
      });
      const periodId = await this.openPeriod(tx, order, payment.id, now, paymentKeyManual(order.id));
      await this.orders.attachPeriod(tx, payment.id, periodId);
      await this.orders.updateOrder(tx, order.id, { status: decision.orderStatus, reviewReason: decision.reviewReason, paidVia: decision.paidVia });
      this.logger.info('order_confirmed_manually', { order_ref: order.id, admin_id: input.adminId });
      return { outcome: 'opened-period' as const, userId: order.userId, periodId };
    });
  }

  private async accountOf(tx: Tx, userId: string): Promise<OrderState['account']> {
    const status = await this.identity.accountStatus(userId, tx);
    return status === null ? 'deleted' : status === 'deleting' ? 'deleting' : 'active';
  }

  private stateOf(order: OrderRecord, account: OrderState['account'], totals: { total: number; count: number }): OrderState {
    return {
      status: order.status, reviewReason: order.reviewReason, paidVia: order.paidVia, amount: order.amount, expiresAt: order.expiresAt,
      payosTotal: totals.total, payosCount: totals.count, account,
    };
  }

  /**
   * Opens the period: it starts where the learner's unbroken Pro ends (now when they are not Pro), and ends `period_months`
   * calendar months later in their zone, rounded up to midnight (design §3.7). Writes the period and the purchase row.
   */
  private async openPeriod(tx: Tx, order: OrderRecord, paymentId: string, now: Date, providerTransactionId: string): Promise<string> {
    const profile = await this.identity.getProfile(order.userId, tx);
    const { grants, prepaidPeriods } = await this.sources.load(tx, order.userId, now);
    const startsAt = continuousProUntil(proSpans(grants, prepaidPeriods), now) ?? now;
    const endsAt = periodEnd(startsAt, order.periodMonths as 1 | 3 | 12, profile?.timezone ?? FALLBACK_ZONE);
    const period = await this.orders.insertPeriod(tx, { userId: order.userId, orderId: order.id, paymentId, startsAt, endsAt });
    await this.transactions.recordPrepaidPurchase(tx, {
      userId: order.userId, provider: order.provider, environment: order.environment, providerTransactionId,
      amountMinor: BigInt(order.amount), currency: order.currency, periodMonths: order.periodMonths,
      occurredAt: now, periodStart: startsAt, periodEnd: endsAt,
    });
    return period.id;
  }
}
