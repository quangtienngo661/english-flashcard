import { Inject, Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import { callAdapter } from '../billing/adapter-call.js';
import { BillingAdapterRegistry } from '../billing/billing-adapter.registry.js';
import { priceFor } from '../plan-numbers.js';
import { orderDescription } from './order-codes.js';
import { OrdersReconcileService } from './orders-reconcile.service.js';
import { OrdersRepository } from './orders.repository.js';
import type { createOrderSchema } from './orders.schemas.js';

/** A link lives this long (design §3.1). */
const ORDER_TTL_MS = 15 * 60_000;
/** The return page asks payOS about one order at most this often (LB1E46). */
const CHECK_MIN_GAP_MS = 10_000;

export type OrderViewJson = {
  id: string;
  status: string;
  period_months: number;
  amount: number;
  description: string;
  expires_at: string;
  period: { starts_at: string; ends_at: string } | null;
};

const unavailable = () => new ProblemDetailsException({ status: 503, title: 'Payment provider unavailable', type: 'provider-unavailable' });
const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });

/** A learner's orders (launch prep B design §3.6). The provider call never runs inside a transaction (R6). */
@Injectable()
export class OrdersService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(BillingAdapterRegistry) private readonly registry: BillingAdapterRegistry,
    @Inject(OrdersRepository) private readonly orders: OrdersRepository,
    @Inject(OrdersReconcileService) private readonly reconcile: OrdersReconcileService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Buy. 409 `price-changed` when the price the learner saw is not the price now. Otherwise: commit a `pending` order with a new
   * order code, then ask payOS for the link outside any transaction. payOS failing or not answering in time makes the order `failed`
   * and 503 (the idempotency interceptor then frees the key, so pressing Buy again is a new order).
   */
  async create(userId: string, input: z.infer<typeof createOrderSchema>): Promise<{ order_id: string; checkout_url: string }> {
    const { entitlements } = await this.settings.get();
    const amount = priceFor(entitlements, input.period_months);
    if (input.expected_amount !== amount) {
      throw new ProblemDetailsException({
        status: 409, title: 'Price changed', type: 'price-changed', extensions: { current_amount: amount },
      });
    }
    const adapter = this.registry.get('payos');
    if (adapter === undefined || adapter.createCheckout === undefined) throw unavailable();

    const expiresAt = new Date(this.clock.now().getTime() + ORDER_TTL_MS);
    const created = await this.prisma.$transaction(async (tx) => {
      const orderCode = await this.orders.nextOrderCode(tx);
      const { id } = await this.orders.insertPending(tx, {
        userId, provider: 'payos', environment: this.config.payos.mode === 'fake' ? 'sandbox' : 'production', orderCode,
        description: orderDescription(orderCode), periodMonths: input.period_months, amount, currency: 'VND', expiresAt,
      });
      return { id, orderCode, description: orderDescription(orderCode) };
    });

    const back = `${this.config.learnerAppUrl.replace(/\/+$/, '')}/${input.locale}/app/plans/order?order=${created.id}`;
    const checkout = await callAdapter(() => adapter.createCheckout!({
      orderCode: created.orderCode, amount, description: created.description, returnUrl: back, cancelUrl: back, expiresAt,
    }));
    if (!checkout.ok) {
      await this.orders.markFailed(this.prisma, created.id);
      this.logger.warn('order_checkout_failed', { order_ref: created.id });
      throw unavailable();
    }
    const kept = await this.orders.setLink(this.prisma, created.id, checkout.value.paymentLinkId, checkout.value.checkoutUrl);
    if (!kept) {
      this.logger.warn('order_link_not_kept', { order_ref: created.id });
      throw unavailable();
    }
    return { order_id: created.id, checkout_url: checkout.value.checkoutUrl };
  }

  /**
   * The return page: ask payOS about a pending order of this learner (at most once per 10 seconds per order, so F5 cannot hammer payOS),
   * then answer with the order as it is. A failure while asking does not fail the page.
   */
  async check(userId: string, orderId: string): Promise<OrderViewJson> {
    const view = await this.get(userId, orderId);
    if (view.status !== 'pending') return view;
    const now = this.clock.now();
    const claimed = await this.orders.claimForCheck(this.prisma, orderId, userId, now, CHECK_MIN_GAP_MS);
    if (claimed === null) return view;
    try {
      await this.reconcile.reconcileOne(claimed, now);
    } catch (error) {
      this.logger.error('order_check_failed', error, { order_ref: orderId });
    }
    return this.get(userId, orderId);
  }

  /** The learner's own order; anyone else's is a 404 like an unknown id. */
  async get(userId: string, orderId: string): Promise<OrderViewJson> {
    const order = await this.orders.findOwned(this.prisma, orderId, userId);
    if (order === null) throw notFound();
    return {
      id: order.id, status: order.status, period_months: order.periodMonths, amount: order.amount, description: order.description,
      expires_at: order.expiresAt.toISOString(),
      period: order.period === null ? null : { starts_at: order.period.startsAt.toISOString(), ends_at: order.period.endsAt.toISOString() },
    };
  }
}
