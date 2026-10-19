import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { BILLING_MAX_ATTEMPTS } from '../entitlements.constants.js';
import { lockUser } from '../entitlements.locks.js';
import type { Interval, SubscriptionStatus } from '../entitlements.types.js';
import { callAdapter } from './adapter-call.js';
import type { BillingAdapter } from './billing-adapter.js';
import { BillingAdapterRegistry } from './billing-adapter.registry.js';
import type { BillingApplyPort } from './billing-inbox.service.js';
import type { NormalizedEvent, SubscriptionState } from './billing.types.js';
import { nextLastEventAt, orderDecision } from './event-order.js';
import { applyEvent, applyFetched, startsTrial } from './subscription-machine.js';

type Tx = Prisma.TransactionClient;
type Outcome = 'applied' | 'stale' | 'ignored' | 'failed' | 'skipped';
type EventRow = NonNullable<Awaited<ReturnType<PrismaClient['billingEvent']['findUnique']>>>;
type SubscriptionRow = NonNullable<Awaited<ReturnType<PrismaClient['subscription']['findUnique']>>>;

/** What transaction 1 leaves for the steps that must run without a lock. */
type FirstPass = {
  outcome: Exclude<Outcome, 'failed'>;
  /** Refetch this row when the adapter has fetchState, guarded by the `updated_at` transaction 1 saw or wrote. */
  refetch: { subscriptionId: string; externalSubscriptionId: string; updatedAt: Date } | null;
  /** D30: a trial the rules refused; ask the provider to end it now. */
  endTrial: string | null;
};

const DATE_FIELDS = ['occurredAt', 'currentPeriodStart', 'currentPeriodEnd', 'trialEndsAt', 'graceEndsAt'] as const;

/**
 * Applies stored billing events (design §9.2 step 4, §9.4). Three phases per event so no adapter call ever runs under a lock
 * (R6, plan review #1): reads on the shared client first, one transaction (claim → lockUser → subscription row) that decides
 * and writes, then `fetchState` / `endTrialNow` after commit, with a second short transaction for a fetched state.
 */
@Injectable()
export class BillingEventApplier implements BillingApplyPort {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(BillingAdapterRegistry) private readonly registry: BillingAdapterRegistry,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async applyMany(ids: string[]): Promise<void> {
    for (const id of ids) await this.apply(id);
  }

  async apply(eventId: string): Promise<Outcome> {
    // Before: shared client, no lock (plan review #2: no second connection inside a locked transaction).
    const row = await this.prisma.billingEvent.findUnique({ where: { id: eventId } });
    if (row === null || (row.status !== 'pending' && row.status !== 'failed')) return 'skipped';
    const { graceDays } = (await this.settings.get()).entitlements;
    const known = row.appUserId !== null && (await this.identity.getProfile(row.appUserId)) !== null;
    const adapter = this.registry.get(row.provider);

    let first: FirstPass;
    try {
      first = await this.prisma.$transaction((tx) => this.decide(tx, row, known, graceDays, adapter));
    } catch (err) {
      await this.fail(row, err);
      return 'failed';
    }

    // After commit: adapter calls, no lock held.
    if (first.refetch !== null && adapter?.fetchState) await this.refetch(adapter, first.refetch, row.id);
    if (first.endTrial !== null && adapter?.endTrialNow) {
      const ended = await callAdapter(() => adapter.endTrialNow!(first.endTrial!));
      if (!ended.ok) this.logger.warn('billing_end_trial_failed', { event_id: row.id, provider: row.provider });
    }
    return first.outcome;
  }

  private async decide(tx: Tx, row: EventRow, known: boolean, graceDays: number, adapter: BillingAdapter | undefined): Promise<FirstPass> {
    const now = this.clock.now();
    const none: FirstPass = { outcome: 'skipped', refetch: null, endTrial: null };
    const claimed = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM billing_events WHERE id = ${row.id}::uuid AND status IN ('pending', 'failed') FOR UPDATE SKIP LOCKED`;
    if (claimed.length === 0) return none;

    const finish = async (status: 'applied' | 'stale' | 'ignored', data: { error?: string; userId?: string; subscriptionId?: string } = {}) => {
      await tx.billingEvent.update({ where: { id: row.id }, data: { status, processedAt: now, error: data.error ?? null, ...data } });
    };

    // R17: production applies production events only.
    if (this.config.billing.production && row.environment === 'sandbox') {
      await finish('ignored', { error: 'sandbox-in-production' });
      this.logger.warn('billing_event_ignored', { event_id: row.id, reason: 'sandbox-in-production' });
      return { ...none, outcome: 'ignored' };
    }
    if (row.appUserId === null || !known) {
      await finish('ignored', { error: 'unknown-user' });
      this.logger.warn('billing_event_unknown_user', { event_id: row.id, provider: row.provider });
      return { ...none, outcome: 'ignored' };
    }

    const userId = row.appUserId;
    await lockUser(tx, userId);
    const sub = await this.lockSubscription(tx, row);
    const refetch = sub !== null && adapter?.fetchState
      ? { subscriptionId: sub.id, externalSubscriptionId: sub.externalSubscriptionId, updatedAt: sub.updatedAt }
      : null;

    if (row.payload === null) {
      await finish('ignored', { error: 'missing-fields', userId });
      this.logger.warn('billing_event_incomplete', { event_id: row.id, type: row.type });
      return { outcome: 'ignored', refetch, endTrial: null };
    }
    const event = toEvent(row.payload);

    if (row.kind === 'additive') {
      const duplicate = await tx.billingEvent.findFirst({
        where: { provider: row.provider, environment: row.environment, type: row.type, transactionId: row.transactionId, status: 'applied' },
        select: { id: true },
      });
      if (duplicate !== null) {
        await finish('ignored', { error: 'duplicate-transaction', userId, subscriptionId: sub?.id });
        return { ...none, outcome: 'ignored' };
      }
    } else if (sub !== null && orderDecision('state', row.occurredAt, sub.lastEventAt) === 'stale') {
      await finish('stale', { userId, subscriptionId: sub.id });
      return { outcome: 'stale', refetch, endTrial: null };
    }

    const state = sub === null ? null : toState(sub);
    let trialAllowed = true;
    if (startsTrial(state, event) && event.type === 'subscription_started') {
      // No conflict target: catches both the user and the card uniques (B5E55, B5E89). Email is not checked (R25).
      const inserted = await tx.trialHistory.createManyAndReturn({
        data: [{ userId, provider: row.provider, paymentFingerprint: event.paymentFingerprint, startedAt: event.occurredAt }],
        skipDuplicates: true,
        select: { id: true },
      });
      trialAllowed = inserted.length > 0;
      if (!trialAllowed) this.logger.warn('trial_reuse_detected', { user_id: userId });
    }

    const result = applyEvent(state, event, { now, graceDays, trialAllowed });
    if (result.log !== null) this.logger.info(result.log, { event_id: row.id, type: row.type, status: state?.status ?? 'none' });
    if (result.next === null) {
      await finish('applied', { userId });
      return { ...none, outcome: 'applied' };
    }

    const columns = {
      ...result.next,
      lastEventAt: nextLastEventAt(sub?.lastEventAt ?? null, row.occurredAt),
      updatedAt: now,
    };
    const written = sub === null
      ? await tx.subscription.create({
        data: { ...columns, userId, provider: row.provider, environment: row.environment, externalSubscriptionId: event.externalSubscriptionId },
      })
      : await tx.subscription.update({ where: { id: sub.id }, data: columns });
    await finish('applied', { userId, subscriptionId: written.id });

    const trialStarted = startsTrial(state, event) && result.next.status === 'trialing';
    if (trialStarted && trialAllowed && result.next.trialEndsAt !== null) {
      await tx.entitlementNotice.createMany({
        data: [{
          userId, recipientUserId: userId, kind: 'trial_started', subjectKey: written.id,
          periodKey: result.next.trialEndsAt.toISOString(), state: 'pending', dueAt: now, windowEndsAt: result.next.trialEndsAt,
        }],
        skipDuplicates: true,
      });
    }
    return {
      outcome: 'applied',
      refetch: null,
      endTrial: trialStarted && !trialAllowed ? written.externalSubscriptionId : null,
    };
  }

  private async lockSubscription(tx: Tx, row: EventRow): Promise<SubscriptionRow | null> {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM subscriptions
      WHERE provider = ${row.provider} AND environment = ${row.environment} AND external_subscription_id = ${row.externalSubscriptionId}
      FOR UPDATE`;
    if (locked.length === 0) return null;
    return tx.subscription.findUnique({ where: { id: locked[0].id } });
  }

  /** design §9.2 "fetchState": a failure falls back to the event order (the event keeps its status, never `failed`). */
  private async refetch(adapter: BillingAdapter, target: NonNullable<FirstPass['refetch']>, eventId: string): Promise<void> {
    const fetched = await callAdapter(() => adapter.fetchState!(target.externalSubscriptionId));
    if (!fetched.ok || fetched.value === null) {
      this.logger.warn('billing_state_refetch_failed', { event_id: eventId, subscription_id: target.subscriptionId });
      return;
    }
    const state = fetched.value;
    const written = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { id: target.subscriptionId }, select: { userId: true } });
      if (sub === null) return false;
      await lockUser(tx, sub.userId);
      const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM subscriptions WHERE id = ${target.subscriptionId}::uuid FOR UPDATE`;
      const row = rows.length === 0 ? null : await tx.subscription.findUnique({ where: { id: target.subscriptionId } });
      // A newer event already wrote this row: its view wins over this fetch.
      if (row === null || row.updatedAt.getTime() !== target.updatedAt.getTime()) return false;
      await tx.subscription.update({ where: { id: row.id }, data: { ...applyFetched(toState(row), state), updatedAt: this.clock.now() } });
      return true;
    });
    if (written) this.logger.info('billing_state_refetched', { event_id: eventId, subscription_id: target.subscriptionId });
  }

  private async fail(row: EventRow, err: unknown): Promise<void> {
    const message = err instanceof Error ? err.message.slice(0, 500) : 'unknown error';
    const updated = await this.prisma.billingEvent.update({
      where: { id: row.id },
      data: { status: 'failed', attempts: { increment: 1 }, error: message },
    });
    this.logger.error('billing_event_failed', err, { event_id: row.id, attempts: updated.attempts });
    if (updated.attempts >= BILLING_MAX_ATTEMPTS) this.logger.error('billing_event_stuck', err, { event_id: row.id });
  }
}

/** `billing_events.payload` stores the normalized event as JSON; dates come back as ISO strings. */
function toEvent(payload: Prisma.JsonValue): NormalizedEvent {
  const event = { ...(payload as Record<string, unknown>) };
  for (const field of DATE_FIELDS) {
    if (typeof event[field] === 'string') event[field] = new Date(event[field]);
  }
  return event as NormalizedEvent;
}

function toState(row: SubscriptionRow): SubscriptionState {
  return {
    status: row.status as SubscriptionStatus,
    interval: row.interval as Interval,
    trialEndsAt: row.trialEndsAt,
    trialDenied: row.trialDenied,
    paymentFingerprint: row.paymentFingerprint,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    graceEndsAt: row.graceEndsAt,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    pendingInterval: row.pendingInterval as Interval | null,
    quotaAnchorAt: row.quotaAnchorAt,
    currentTransactionId: row.currentTransactionId,
  };
}
