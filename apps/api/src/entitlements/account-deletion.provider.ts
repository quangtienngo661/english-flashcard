import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { Clock } from '../common/clock/clock.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { AppLogger } from '../common/logging/app-logger.js';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import {
  AccountDeletionRegistry, type AccountDataEraser, type AccountDeletionPrecondition, type EraseOptions,
} from '../identity/deletion/account-eraser.js';
import { SettingsService } from '../settings/index.js';
import { callAdapter } from './billing/adapter-call.js';
import { isAutoRenewing } from './billing/auto-renewing.js';
import { BillingAdapterRegistry } from './billing/billing-adapter.registry.js';
import { lockPool, lockUser } from './entitlements.locks.js';
import type { Pool } from './entitlements.types.js';
import { effectiveStatus, type SubscriptionSource } from './rules/plan-rules.js';
import { SourcesRepository } from './sources/sources.repository.js';

const POOLS: readonly Pool[] = ['practice_sessions', 'ai_practice', 'ai_lookup'];

/**
 * Account deletion for Entitlements (Bước 8, design §7.3, §7.4, D11, D12, D15, D16, D28, D30, D31): the eraser, and the precondition
 * Identity asks about renewing subscriptions.
 */
@Injectable()
export class EntitlementsAccountDeletion implements AccountDataEraser, AccountDeletionPrecondition, OnModuleInit {
  readonly module = 'entitlements' as const;

  constructor(
    @Inject(AccountDeletionRegistry) private readonly registry: AccountDeletionRegistry,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(SourcesRepository) private readonly sources: SourcesRepository,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(BillingAdapterRegistry) private readonly adapters: BillingAdapterRegistry,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.registry.registerEraser(this);
    this.registry.registerPrecondition(this);
  }

  /** The subscriptions that would be charged again: the effective status, as the learner's own plan page shows it. */
  private async renewingSubscriptions(db: Prisma.TransactionClient | PrismaClient, userId: string): Promise<SubscriptionSource[]> {
    const now = this.clock.now();
    const { graceDays } = (await this.settings.get()).entitlements;
    const { subscriptions } = await this.sources.load(db, userId, now);
    return subscriptions.filter((sub) =>
      isAutoRenewing({ status: effectiveStatus(sub, now, graceDays).status, cancelAtPeriodEnd: sub.cancelAtPeriodEnd }));
  }

  async renewing(db: Prisma.TransactionClient | PrismaClient, userId: string): Promise<boolean> {
    return (await this.renewingSubscriptions(db, userId)).length > 0;
  }

  /**
   * D31: each call goes to the provider outside any lock. A call that returned in time is recorded at once under the user lock
   * (`cancel_at_period_end = true`), so the deletion does not wait for the provider's `cancel_scheduled` event; the event arriving
   * later finds the flag set and changes nothing. A timeout, an error or an adapter without `cancelAtPeriodEnd` → `'not_supported'`.
   */
  async turnOffRenewalForAdminDelete(userId: string): Promise<'turned_off' | 'none' | 'not_supported'> {
    const renewing = await this.renewingSubscriptions(this.prisma, userId);
    if (renewing.length === 0) return 'none';
    const accepted: SubscriptionSource[] = [];
    for (const sub of renewing) {
      const adapter = this.adapters.get(sub.provider);
      const turnOff = adapter?.cancelAtPeriodEnd?.bind(adapter);
      const result = turnOff ? await callAdapter(() => turnOff(sub.externalSubscriptionId)) : null;
      if (result?.ok) accepted.push(sub);
      else this.logger.warn('paid_renewal_not_cancelled', { subscription_id: sub.id });
    }
    if (accepted.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await lockUser(tx, userId);
        await tx.subscription.updateMany({ where: { id: { in: accepted.map((sub) => sub.id) }, userId }, data: { cancelAtPeriodEnd: true } });
      });
      for (const sub of accepted) this.logger.info('subscription_cancel_recorded_locally', { subscription_id: sub.id });
    }
    return accepted.length === renewing.length ? 'turned_off' : 'not_supported';
  }

  async erase(tx: Prisma.TransactionClient, userId: string, anonId: string, opts: EraseOptions): Promise<void> {
    // Lock order of design §7.2: entitlements.user, then the three pools.
    await lockUser(tx, userId);
    for (const pool of POOLS) await lockPool(tx, userId, pool);
    // B8E52: a webhook may have turned renewal back on between Tx A and Tx B; the retry job tries again. A replay after a restore skips it (B8E53).
    if (opts.checks === 'normal' && await this.renewing(tx, userId)) throw new Error('renewing subscription');

    const subscriptionIds = (await tx.subscription.findMany({ where: { userId }, select: { id: true } })).map(({ id }) => id);
    await tx.billingEvent.deleteMany({
      where: { OR: [{ userId }, { appUserId: userId }, ...(subscriptionIds.length > 0 ? [{ subscriptionId: { in: subscriptionIds } }] : [])] },
    });
    // The grant's changes cascade (D30).
    await tx.entitlementGrant.deleteMany({ where: { userId } });
    await tx.subscription.deleteMany({ where: { userId } });
    await tx.trialHistory.deleteMany({ where: { userId } });
    await tx.entitlementNotice.deleteMany({ where: { OR: [{ userId }, { recipientUserId: userId }] } });
    await tx.fakeBillingSubscription.deleteMany({ where: { userId } });
    // The ledger and the money records stay with a random id (D15, D16); (pool, operation_id) stays unique for it.
    await tx.usageRecord.updateMany({ where: { userId }, data: { userId: anonId } });
    await tx.billingTransaction.updateMany({ where: { userId }, data: { userId: anonId } });
  }
}
