import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { Clock } from '../../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../../common/db/prisma.module.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { Interval, SubscriptionStatus } from '../../entitlements.types.js';
import { BillingAdapter, type BillingRequest, type ParsedEvent } from '../billing-adapter.js';
import { BillingAdapterRegistry } from '../billing-adapter.registry.js';
import type { FetchedState, NormalizedEvent } from '../billing.types.js';
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

  async cancelAtPeriodEnd(externalSubscriptionId: string): Promise<void> {
    await this.prisma.fakeBillingSubscription.updateMany({
      where: { externalSubscriptionId },
      data: { cancelCalledAt: this.clock.now(), cancelAtPeriodEnd: true },
    });
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

  /** Applies an event to the fake truth only when it is not older than the last one applied (the provider's latest view). */
  private async track(userId: string, event: NormalizedEvent): Promise<void> {
    const { externalSubscriptionId, occurredAt } = event;
    const row = await this.find(externalSubscriptionId);
    if (row !== null && occurredAt < row.lastOccurredAt) return;
    const next = fakeTruth(row, event);
    if (next === null) return;
    if (row === null) {
      await this.prisma.fakeBillingSubscription.createMany({
        data: [{ externalSubscriptionId, userId, ...next, lastOccurredAt: occurredAt }],
        skipDuplicates: true,
      });
    } else {
      await this.prisma.fakeBillingSubscription.updateMany({
        where: { externalSubscriptionId, lastOccurredAt: { lte: occurredAt } },
        data: { ...next, lastOccurredAt: occurredAt },
      });
    }
  }
}

/**
 * What a simple provider would now say about the subscription; null = nothing to change. It keeps the transaction of the
 * current period like the core (D34, D37), so after a refund of that transaction fetchState says revoked (B5#33, D39).
 * Scheduled interval changes leave it as it is.
 */
function fakeTruth(row: FakeRow | null, event: NormalizedEvent): FakeTruth | null {
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
  const { lastOccurredAt: _, ...current } = row;
  switch (event.type) {
    case 'plan_changed':
      return {
        ...current,
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
