import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { callAdapter } from '../billing/adapter-call.js';
import type { CheckoutState, ParsedEvent } from '../billing/billing-adapter.js';
import { BillingAdapterRegistry } from '../billing/billing-adapter.registry.js';
import { BILLING_APPLY_PORT, BillingInbox, type BillingApplyPort } from '../billing/billing-inbox.service.js';
import type { OrderPaymentPayload } from '../billing/billing.types.js';
import { lockUser } from '../entitlements.locks.js';
import { paymentKeyPayos } from './order-codes.js';
import type { OrderStatus } from './order-rules.js';
import { OrdersRepository, type OrderUpdate, type ReconcileOrder } from './orders.repository.js';

export type { ReconcileOrder } from './orders.repository.js';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** An order with no link younger than this may still be in the middle of being created: leave it (design §3.6). */
const NO_LINK_GRACE_MS = 2 * MINUTE;
/** A pending order this far past its expiry that payOS cannot be asked about is expired anyway. */
const GIVE_UP_AFTER_EXPIRY_MS = DAY;

/**
 * Asks payOS about one order and brings Wordmet in line (launch prep B design §3.6): money it lists becomes events of the inbox (the
 * applier decides, by the same table as for a webhook), no money becomes a status. payOS is asked and the link cancelled outside
 * every lock; each status change is a conditional UPDATE under the user lock then the order lock, so a webhook or staff that got
 * there first wins and the order is never overwritten.
 */
@Injectable()
export class OrdersReconcileService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(BillingAdapterRegistry) private readonly registry: BillingAdapterRegistry,
    @Inject(BillingInbox) private readonly inbox: BillingInbox,
    @Inject(BILLING_APPLY_PORT) private readonly applier: BillingApplyPort,
    @Inject(OrdersRepository) private readonly orders: OrdersRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async reconcileOne(order: ReconcileOrder, now: Date = this.clock.now()): Promise<void> {
    const adapter = this.registry.get('payos');
    if (adapter?.getCheckout === undefined) return;
    if (order.paymentLinkId === null && order.status === 'pending' && now.getTime() - order.createdAt.getTime() < NO_LINK_GRACE_MS) return;

    const asked = await callAdapter(() => adapter.getCheckout!(order.orderCode));
    if (!asked.ok) {
      this.logger.warn('order_reconcile_unavailable', { order_ref: order.id });
      if (order.status === 'pending' && now.getTime() > order.expiresAt.getTime() + GIVE_UP_AFTER_EXPIRY_MS) await this.move(order, 'pending', { status: 'expired' });
      return;
    }
    const link = asked.value;
    if (link === null) {
      if (order.paymentLinkId === null) await this.move(order, order.status as OrderStatus, { status: 'failed' });
      else this.logger.warn('order_link_unknown', { order_ref: order.id });
      return;
    }
    // Money first, in whatever state payOS says the link is in.
    if (link.transactions.length > 0) {
      await this.deliver(order, link, now);
      return;
    }
    await this.settle(order, link, now);
  }

  private async settle(order: ReconcileOrder, link: CheckoutState, now: Date): Promise<void> {
    const status = order.status as OrderStatus;
    const expired = now.getTime() > order.expiresAt.getTime();
    switch (link.status) {
      case 'PAID':
      case 'UNDERPAID':
        // payOS says money came but lists no transfer: staff have to look (design §3.6).
        this.logger.warn('order_provider_mismatch', { order_ref: order.id });
        await this.move(order, status, { status: 'needs_review', reviewReason: 'provider-mismatch' });
        return;
      case 'PENDING':
        // A link payOS still holds for an order that is failed or never got its link: cancel it, so nobody can pay it.
        if (order.paymentLinkId === null || status === 'failed') {
          const cancelled = await callAdapter(() => this.registry.get('payos')!.cancelCheckout!(order.orderCode));
          if (!cancelled.ok) this.logger.warn('order_cancel_failed', { order_ref: order.id });
          if (status !== 'failed') await this.move(order, status, { status: 'failed' });
          return;
        }
        if (!expired) return;
        {
          const cancelled = await callAdapter(() => this.registry.get('payos')!.cancelCheckout!(order.orderCode));
          if (cancelled.ok || now.getTime() > order.expiresAt.getTime() + GIVE_UP_AFTER_EXPIRY_MS) await this.move(order, 'pending', { status: 'expired' });
          else this.logger.warn('order_cancel_failed', { order_ref: order.id });
        }
        return;
      case 'PROCESSING':
        return;
      case 'EXPIRED':
        if (status === 'pending') await this.move(order, 'pending', { status: 'expired' });
        return;
      case 'CANCELLED':
        if (status === 'pending') await this.move(order, 'pending', { status: 'cancelled' });
        return;
      case 'FAILED':
        if (status === 'pending') await this.move(order, 'pending', { status: 'failed' });
        return;
    }
  }

  /** Every transfer payOS lists becomes a `payment_succeeded` event of the inbox, under the key the webhook would use. */
  private async deliver(order: ReconcileOrder, link: CheckoutState, now: Date): Promise<void> {
    const environment = this.config.payos.mode === 'fake' ? 'sandbox' : 'production';
    const events: ParsedEvent[] = link.transactions.map((transaction) => {
      const identity = `${order.orderCode}:${transaction.reference}`;
      const payload: OrderPaymentPayload = {
        orderCode: order.orderCode, paymentLinkId: order.paymentLinkId ?? '', amount: transaction.amount, reference: transaction.reference,
        transactionDateTime: transaction.transactionDateTime, source: 'reconcile', success: true, code: '00',
        payer: {
          counterAccountName: transaction.payer?.counterAccountName ?? null, counterAccountNumber: transaction.payer?.counterAccountNumber ?? null,
          counterAccountBankName: transaction.payer?.counterAccountBankName ?? null,
        },
      };
      return {
        externalEventId: identity, type: 'payment_succeeded', environment, externalSubscriptionId: null, appUserId: null, occurredAt: now,
        transactionId: identity, event: payload, missing: [],
        // No payer here: the raw payload is kept 90 days (design §3.12).
        raw: { source: 'reconcile', reference: transaction.reference, amount: transaction.amount, transactionDateTime: transaction.transactionDateTime },
      };
    });
    const ids = await this.inbox.store('payos', events);
    if (ids.length > 0) await this.applier.applyMany(ids);
    // Review I1: a key the webhook already stored gives no new row, so a webhook the applier ignored (or gave up on) leaves this money with
    // no path that applies it. Nothing counted and every row final → staff have to look; the order is not left pending without a word.
    const keys = link.transactions.map((transaction) => paymentKeyPayos(environment, order.orderCode, transaction.reference));
    if (await this.orders.neverApplied(this.prisma, keys)) {
      this.logger.warn('order_money_unapplied', { order_ref: order.id });
      await this.move(order, order.status as OrderStatus, { status: 'needs_review', reviewReason: 'provider-mismatch' });
    }
  }

  /** The order's change of state: user lock, order lock, then `UPDATE … WHERE status = <what was read>`. False when nothing changed. */
  private async move(order: ReconcileOrder, from: OrderStatus, data: OrderUpdate): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await lockUser(tx, order.userId);
      const locked = await this.orders.lock(tx, order.id);
      if (locked === null) return false;
      return this.orders.transition(tx, order.id, from, data);
    });
  }
}
