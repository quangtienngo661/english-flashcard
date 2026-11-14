import { Inject, Injectable, Optional, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Clock } from '../../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../../common/db/prisma.module.js';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import type { Interval, SubscriptionStatus } from '../../entitlements.types.js';
import { BillingAdapter, type BillingRequest, type ParsedEvent } from '../billing-adapter.js';
import { BillingAdapterRegistry } from '../billing-adapter.registry.js';
import { BILLING_APPLY_PORT, BillingInbox, type BillingApplyPort } from '../billing-inbox.service.js';
import { eventFromJson, type FetchedState, type NormalizedEvent } from '../billing.types.js';
import { fakeParse, fakeReadRequest, fakeVerifySignature } from './fake-wire.js';

type FakeTruth = FetchedState & { currentTransactionId: string | null };
type FakeRow = FakeTruth & { lastOccurredAt: Date };

/**
 * The fake provider (design §9.1): HMAC with `BILLING_FAKE_SECRET`, registered only when `BILLING_FAKE_ENABLED=true` (never
 * in production, R17). It keeps the provider's truth of each fake subscription in its own table, from the newest event it
 * was sent, so `fetchState` can answer like a real provider; without `BILLING_FAKE_FETCH_STATE` it has no `fetchState` (R10).
 */
@Injectable()
export class FakeBillingAdapter extends BillingAdapter implements OnModuleInit {
  readonly provider = 'fake';

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(BillingAdapterRegistry) private readonly registry: BillingAdapterRegistry,
    @Optional() @Inject(BillingInbox) private readonly inbox?: BillingInbox,
    @Optional() @Inject(BILLING_APPLY_PORT) private readonly applier?: BillingApplyPort,
  ) {
    super();
    this.fetchState = config.billing.fakeFetchState ? (id) => this.readState(id) : undefined;
  }

  onModuleInit(): void {
    if (this.config.billing.fakeEnabled) this.registry.register(this);
  }

  async verify(req: BillingRequest): Promise<{ ok: true; events: ParsedEvent[]; skipped: number } | { ok: false }> {
    const read = fakeReadRequest(req);
    const secret = this.config.billing.fakeSecret;
    if (read === null || secret === null || !fakeVerifySignature(secret, read.body, read.signature)) return { ok: false };
    // Signed but not a batch: acked and counted, since only a wrong signature may be refused.
    const parsed = fakeParse(read.body) ?? { events: [], skipped: 1 };
    for (const event of parsed.events) {
      if (event.event !== null && event.appUserId !== null) await this.track(event.appUserId, event.event);
    }
    return { ok: true, ...parsed };
  }

  ack(result: { received: number }): { status: number; body: unknown } {
    return { status: 200, body: { received: result.received } };
  }

  async endTrialNow(externalSubscriptionId: string): Promise<void> {
    await this.prisma.fakeBillingSubscription.updateMany({
      where: { externalSubscriptionId },
      data: { endTrialCalledAt: this.clock.now(), status: 'active' },
    });
  }

  /**
   * Stamps the provider's own row and, like a real provider confirming the cancel, sends Wordmet a `cancel_scheduled` event. The event is
   * stored and **applied before this returns**, so `subscriptions.cancel_at_period_end` is true when the call ends: CI and the smoke stay
   * deterministic (Bước 8 plan review P5). A real provider's webhook arrives seconds or minutes later.
   */
  async cancelAtPeriodEnd(externalSubscriptionId: string): Promise<void> {
    await this.prisma.fakeBillingSubscription.updateMany({
      where: { externalSubscriptionId },
      data: { cancelCalledAt: this.clock.now(), cancelAtPeriodEnd: true },
    });
    if (!this.inbox || !this.applier) return;
    const subscription = await this.prisma.subscription.findFirst({
      where: { provider: this.provider, externalSubscriptionId }, select: { userId: true, environment: true },
    });
    if (subscription === null) return;
    const occurredAt = this.clock.now();
    const event: NormalizedEvent = {
      type: 'cancel_scheduled', provider: this.provider, environment: subscription.environment as NormalizedEvent['environment'],
      externalEventId: `fake-cancel-${randomUUID()}`, externalSubscriptionId, appUserId: subscription.userId, occurredAt,
    };
    await this.track(subscription.userId, event);
    const ids = await this.inbox.store(this.provider, [{
      externalEventId: event.externalEventId, type: event.type, environment: event.environment, externalSubscriptionId,
      appUserId: subscription.userId, occurredAt, transactionId: null, event, missing: [], raw: { source: 'fake cancelAtPeriodEnd' },
    }]);
    await this.applier.applyMany(ids);
  }

  private async readState(externalSubscriptionId: string): Promise<FetchedState | null> {
    const row = await this.find(externalSubscriptionId);
    if (row === null) return null;
    const { lastOccurredAt: _, currentTransactionId: __, ...state } = row;
    return state;
  }

  private async find(externalSubscriptionId: string): Promise<FakeRow | null> {
    const row = await this.prisma.fakeBillingSubscription.findUnique({ where: { externalSubscriptionId } });
    if (row === null) return null;
    return {
      status: row.status as SubscriptionStatus,
      interval: row.interval as Interval,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      trialEndsAt: row.trialEndsAt,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      currentTransactionId: row.currentTransactionId,
      lastOccurredAt: row.lastOccurredAt,
    };
  }

  /**
   * Adds an event to the subscription's history and recomputes the truth from the whole history in occurred_at order: the
   * fake answers like a provider that saw every event happen, whatever order Wordmet receives them in (B5#10, B5E102).
   */
  private async track(userId: string, event: NormalizedEvent): Promise<void> {
    const { externalSubscriptionId } = event;
    const stored = await this.prisma.fakeBillingSubscription.findUnique({ where: { externalSubscriptionId } });
    const history = stored === null ? [] : (stored.history as unknown[]).map(eventFromJson);
    if (history.some((seen) => seen.externalEventId === event.externalEventId)) return;
    history.push(event);
    history.sort((x, y) => x.occurredAt.getTime() - y.occurredAt.getTime());
    let truth: FakeTruth | null = null;
    for (const seen of history) truth = fakeTruth(truth, seen) ?? truth;
    // Nothing a provider would know yet (no start or renewal): keep nothing.
    if (truth === null) return;
    const data = {
      ...truth,
      lastOccurredAt: history[history.length - 1].occurredAt,
      history: JSON.parse(JSON.stringify(history)) as Prisma.InputJsonArray,
    };
    if (stored === null) {
      await this.prisma.fakeBillingSubscription.createMany({ data: [{ externalSubscriptionId, userId, ...data }], skipDuplicates: true });
    } else {
      await this.prisma.fakeBillingSubscription.updateMany({ where: { externalSubscriptionId }, data });
    }
  }
}

/**
 * What a simple provider would now say about the subscription; null = nothing to change. It keeps the transaction of the
 * current period like the core (D34, D37), so after a refund of that transaction fetchState says revoked (B5#33, D39).
 * Scheduled interval changes leave it as it is.
 */
function fakeTruth(row: FakeTruth | null, event: NormalizedEvent): FakeTruth | null {
  if (event.type === 'subscription_started') {
    return {
      status: event.trialEndsAt === null ? 'active' : 'trialing',
      interval: event.interval,
      currentPeriodStart: event.currentPeriodStart,
      currentPeriodEnd: event.currentPeriodEnd,
      trialEndsAt: event.trialEndsAt,
      cancelAtPeriodEnd: false,
      currentTransactionId: event.trialEndsAt === null ? event.transactionId : null,
    };
  }
  if (event.type === 'renewed') {
    return {
      trialEndsAt: row?.trialEndsAt ?? null,
      cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
      status: 'active',
      interval: event.interval,
      currentPeriodStart: event.currentPeriodStart,
      currentPeriodEnd: event.currentPeriodEnd,
      currentTransactionId: event.transactionId,
    };
  }
  if (row === null) return null;
  const current = row;
  switch (event.type) {
    case 'plan_changed':
      return {
        ...current,
        // D40: an upgrade in grace means the provider charged the new period.
        status: current.status === 'grace' ? 'active' : current.status,
        interval: event.interval,
        currentPeriodStart: event.currentPeriodStart,
        currentPeriodEnd: event.currentPeriodEnd,
        currentTransactionId: event.transactionId,
      };
    case 'renewal_failed':
      return { ...current, status: 'grace' };
    case 'grace_ended':
      return { ...current, status: 'on_hold' };
    case 'cancel_scheduled':
      return { ...current, cancelAtPeriodEnd: true };
    case 'cancel_unscheduled':
      return { ...current, cancelAtPeriodEnd: false };
    case 'expired':
      return { ...current, status: 'expired' };
    case 'revoked':
      return { ...current, status: 'revoked' };
    case 'refunded':
      return event.transactionId === current.currentTransactionId ? { ...current, status: 'revoked' } : null;
    case 'refund_reversed': {
      if (current.status !== 'revoked' || event.transactionId !== current.currentTransactionId) return null;
      const inPeriod = current.currentPeriodEnd !== null && event.occurredAt < current.currentPeriodEnd;
      return { ...current, status: inPeriod ? 'active' : 'expired' };
    }
    default:
      return null;
  }
}
