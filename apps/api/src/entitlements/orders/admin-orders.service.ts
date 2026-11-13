import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { callAdapter } from '../billing/adapter-call.js';
import { BillingAdapterRegistry } from '../billing/billing-adapter.registry.js';
import { lockUser } from '../entitlements.locks.js';
import { proSpans } from '../rules/pro-spans.js';
import { SourcesRepository } from '../sources/sources.repository.js';
import { OrderApplier } from './order-applier.service.js';
import { OrdersRepository, type AdminOrderDetailRow, type AdminOrderRow, type OrderUpdate } from './orders.repository.js';
import type { AdminOrdersQuery } from './orders.schemas.js';
import { continuousProUntil } from './period-window.js';

export type AdminOrderListItem = {
  id: string;
  status: string;
  review_reason: string | null;
  needs_attention: boolean;
  period_months: number;
  amount: number;
  description: string;
  paid_via: string | null;
  created_at: string;
  expires_at: string;
  user: { id: string; email: string | null };
};

export type AdminOrderDetail = AdminOrderListItem & {
  order_code: number;
  payments: Array<{
    id: string; source: string; reference: string; amount: number; provider_time: string | null; outcome: string; period_id: string | null;
    confirmed_by: string | null; reason: string | null; received_at: string;
  }>;
  periods: Array<{ id: string; starts_at: string; ends_at: string; revoked_at: string | null; revoke_reason: string | null }>;
  refund: { payer_name: string | null; payer_account: string | null; payer_bank: string | null; saved_at: string | null } | null;
  resolution: { resolved_at: string; note: string | null } | null;
  /** The learner's Pro now: where the unbroken run ends and every source that makes it (so a gap after a revoke is visible). */
  pro: { until: string | null; sources: Array<{ kind: 'grant' | 'prepaid'; id: string; starts_at: string; ends_at: string }> } | null;
};

const cursorSchema = z.strictObject({ created_at: z.iso.datetime(), id: z.string().min(1) });
const invalid = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
const conflict = (type: string, title: string) => new ProblemDetailsException({ status: 409, title, type });
const FINAL_STATUS_NOTE = 'order-not-pending';
/** payOS link states that take no more money; any other state (or no answer) means the old QR may still be paid. */
const LINK_CLOSED: ReadonlySet<string> = new Set(['PAID', 'CANCELLED', 'EXPIRED']);

/** The staff side of orders (launch prep B design §3.9): look, confirm, cancel, resolve, revoke a period. Admin only (`settings.manage`). */
@Injectable()
export class AdminOrdersService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SourcesRepository) private readonly sources: SourcesRepository,
    @Inject(BillingAdapterRegistry) private readonly registry: BillingAdapterRegistry,
    @Inject(OrdersRepository) private readonly orders: OrdersRepository,
    @Inject(OrderApplier) private readonly applier: OrderApplier,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async list(query: AdminOrdersQuery): Promise<{ items: AdminOrderListItem[]; next_page_token: string | null }> {
    const binding = createHash('sha256').update(JSON.stringify({
      route: 'admin-orders', status: query.status ?? null, needs_attention: query.needs_attention ?? null, email: query.email ?? null,
      from: query.from ?? null, to: query.to ?? null, q: query.q ?? null,
    })).digest('hex');
    let cursor: { createdAt: Date; id: string } | undefined;
    if (query.page_token !== undefined) {
      const parsed = cursorSchema.safeParse(decodeBoundToken(query.page_token, binding));
      if (!parsed.success) throw invalid();
      cursor = { createdAt: new Date(parsed.data.created_at), id: parsed.data.id };
    }
    let userId: string | undefined;
    if (query.email !== undefined) {
      const found = await this.identity.findUserIdByEmail(query.email);
      if (found === null) return { items: [], next_page_token: null };
      userId = found;
    }
    const rows = await this.orders.listAdmin(this.prisma, {
      status: query.status, needsAttention: query.needs_attention, userId,
      from: query.from === undefined ? undefined : new Date(query.from), to: query.to === undefined ? undefined : new Date(query.to),
      q: query.q?.trim().toUpperCase(), cursor, take: query.page_size + 1,
    });
    const page = rows.slice(0, query.page_size);
    const last = page.at(-1);
    const emails = await this.identity.emailsOf(page.map((row) => row.userId));
    return {
      items: page.map((row) => listItem(row, emails.get(row.userId) ?? null)),
      next_page_token: rows.length > query.page_size && last ? encodeBoundToken({ created_at: last.createdAt.toISOString(), id: last.id }, binding) : null,
    };
  }

  async get(orderId: string): Promise<AdminOrderDetail> {
    const row = await this.orders.adminDetail(this.prisma, orderId);
    if (row === null) throw notFound();
    const email = (await this.identity.emailsOf([row.userId])).get(row.userId) ?? null;
    return detail(row, email, email === null ? null : await this.proOf(row.userId));
  }

  /**
   * "Đã nhận tiền" (T11–T14): the rules and the 409s are `OrderApplier.confirmManual`'s. Launch B minor M4: the payOS link is cancelled
   * first, outside any lock, so a second transfer on the old QR cannot arrive after Pro was granted by hand. When payOS cannot cancel,
   * the confirmation goes on only if the link no longer takes money; otherwise 503 and the order is left as it was.
   */
  async confirmPayment(adminId: string, orderId: string, input: { reference: string; amount: number; reason: string }): Promise<AdminOrderDetail> {
    const order = await this.orders.findById(this.prisma, orderId);
    const adapter = this.registry.get('payos');
    if (order !== null && order.paymentLinkId !== null && order.paidVia === null && order.status !== 'closed' && adapter?.cancelCheckout !== undefined) {
      const cancelled = await callAdapter(() => adapter.cancelCheckout!(order.orderCode));
      if (!cancelled.ok) {
        const link = adapter.getCheckout === undefined ? undefined : await callAdapter(() => adapter.getCheckout!(order.orderCode));
        const closed = link?.ok === true && (link.value === null || LINK_CLOSED.has(link.value.status));
        if (!closed) {
          this.logger.warn('order_confirm_link_open', { order_ref: order.id });
          throw new ProblemDetailsException({ status: 503, title: 'Payment provider unavailable', type: 'provider-unavailable' });
        }
      }
    }
    await this.applier.confirmManual({ orderId, adminId, reference: input.reference, amount: input.amount, reason: input.reason });
    return this.get(orderId);
  }

  /**
   * Cancel a pending order. payOS is asked outside any lock; if it refuses or does not answer the order is left exactly as it was (503),
   * so a link that can still be paid is never shown as cancelled. An order with no link, or no payOS set up, has nothing to cancel there.
   */
  async cancel(adminId: string, orderId: string): Promise<AdminOrderDetail> {
    const order = await this.orders.findById(this.prisma, orderId);
    if (order === null) throw notFound();
    if (order.status !== 'pending') throw conflict(FINAL_STATUS_NOTE, 'Order is not pending');
    const adapter = this.registry.get('payos');
    if (order.paymentLinkId !== null && adapter?.cancelCheckout !== undefined) {
      const cancelled = await callAdapter(() => adapter.cancelCheckout!(order.orderCode));
      if (!cancelled.ok) {
        this.logger.warn('order_cancel_refused', { order_ref: order.id });
        throw new ProblemDetailsException({ status: 503, title: 'Payment provider unavailable', type: 'provider-unavailable' });
      }
    }
    await this.change(order.userId, order.id, 'pending', { status: 'cancelled' });
    this.logger.info('order_cancelled_by_staff', { order_ref: order.id, admin_id: adminId });
    return this.get(orderId);
  }

  /** "Đã xử lý": a needs_review order is closed; a paid order's flag is cleared. The refund information goes with it (design §3.11). */
  async resolve(adminId: string, orderId: string, note: string): Promise<AdminOrderDetail> {
    const order = await this.orders.findById(this.prisma, orderId);
    if (order === null) throw notFound();
    const done: OrderUpdate = {
      reviewReason: null, resolvedAt: this.clock.now(), resolvedBy: adminId, resolutionNote: note,
      refundPayerName: null, refundPayerAccount: null, refundPayerBank: null, refundSavedAt: null,
    };
    if (order.status === 'needs_review') await this.change(order.userId, order.id, 'needs_review', { ...done, status: 'closed' });
    else if (order.status === 'paid' && order.reviewReason !== null) await this.change(order.userId, order.id, 'paid', done);
    else throw conflict('order-not-resolvable', 'Nothing to resolve');
    this.logger.info('order_resolved', { order_ref: order.id, admin_id: adminId });
    return this.get(orderId);
  }

  /** Revoke one period (recorded on the wrong learner, say). Later periods keep their dates: a gap shows on the order screen (LB1E33). */
  async revokePeriod(adminId: string, periodId: string, reason: string): Promise<{ id: string; revoked_at: string }> {
    const period = await this.orders.findPeriod(this.prisma, periodId);
    if (period === null) throw notFound();
    const now = this.clock.now();
    const revoked = await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, period.userId);
      return this.orders.revokePeriod(tx, periodId, adminId, reason, now);
    });
    if (!revoked) throw conflict('period-already-revoked', 'Period already revoked');
    this.logger.info('prepaid_period_revoked', { period_id: periodId, admin_id: adminId });
    return { id: periodId, revoked_at: now.toISOString() };
  }

  /** `UPDATE … WHERE status = <what was read>` under the user lock then the order lock; 409 when something else got there first. */
  private async change(userId: string, orderId: string, from: AdminOrderRow['status'], data: OrderUpdate): Promise<void> {
    const changed = await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      const locked = await this.orders.lock(tx, orderId);
      if (locked === null) return false;
      return this.orders.transition(tx, orderId, from, data);
    });
    if (!changed) throw conflict('order-changed', 'Order changed meanwhile');
  }

  private async proOf(userId: string): Promise<NonNullable<AdminOrderDetail['pro']>> {
    const now = this.clock.now();
    const { grants, prepaidPeriods } = await this.sources.load(this.prisma, userId, now);
    const until = continuousProUntil(proSpans(grants, prepaidPeriods), now);
    const sources = [
      ...grants.filter((grant) => grant.kind === 'plan').map((grant) => ({ kind: 'grant' as const, id: grant.id, startsAt: grant.startsAt, endsAt: grant.endsAt })),
      ...prepaidPeriods.map((period) => ({ kind: 'prepaid' as const, id: period.id, startsAt: period.startsAt, endsAt: period.endsAt })),
    ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    return {
      until: until?.toISOString() ?? null,
      sources: sources.map((source) => ({ kind: source.kind, id: source.id, starts_at: source.startsAt.toISOString(), ends_at: source.endsAt.toISOString() })),
    };
  }
}

function listItem(row: AdminOrderRow, email: string | null): AdminOrderListItem {
  return {
    id: row.id, status: row.status, review_reason: row.reviewReason, needs_attention: row.status === 'needs_review' || row.reviewReason !== null,
    period_months: row.periodMonths, amount: row.amount, description: row.description, paid_via: row.paidVia,
    created_at: row.createdAt.toISOString(), expires_at: row.expiresAt.toISOString(), user: { id: row.userId, email },
  };
}

function detail(row: AdminOrderDetailRow, email: string | null, pro: AdminOrderDetail['pro']): AdminOrderDetail {
  const hasRefund = row.refundPayerName !== null || row.refundPayerAccount !== null || row.refundPayerBank !== null || row.refundSavedAt !== null;
  return {
    ...listItem(row, email),
    order_code: row.orderCode,
    payments: row.payments.map((p) => ({
      id: p.id, source: p.source, reference: p.reference, amount: p.amount, provider_time: p.providerTime, outcome: p.outcome, period_id: p.periodId,
      confirmed_by: p.confirmedBy, reason: p.reason, received_at: p.receivedAt.toISOString(),
    })),
    periods: row.periods.map((p) => ({
      id: p.id, starts_at: p.startsAt.toISOString(), ends_at: p.endsAt.toISOString(), revoked_at: p.revokedAt?.toISOString() ?? null, revoke_reason: p.revokeReason,
    })),
    refund: hasRefund
      ? { payer_name: row.refundPayerName, payer_account: row.refundPayerAccount, payer_bank: row.refundPayerBank, saved_at: row.refundSavedAt?.toISOString() ?? null }
      : null,
    resolution: row.resolvedAt === null ? null : { resolved_at: row.resolvedAt.toISOString(), note: row.resolutionNote },
    pro,
  };
}
