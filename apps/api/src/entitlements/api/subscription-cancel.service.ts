import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import { callAdapter } from '../billing/adapter-call.js';
import { isAutoRenewing } from '../billing/auto-renewing.js';
import { BillingAdapterRegistry } from '../billing/billing-adapter.registry.js';
import { effectiveStatus } from '../rules/plan-rules.js';
import { SourcesRepository } from '../sources/sources.repository.js';

const problem = (status: number, title: string, type: string) => new ProblemDetailsException({ status, title, type });

/** "Hủy gói" (Bước 8 D11, design §8.1): turn automatic renewal off at the provider; the plan stays to the end of the paid period. */
@Injectable()
export class SubscriptionCancelService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(SourcesRepository) private readonly sources: SourcesRepository,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(BillingAdapterRegistry) private readonly adapters: BillingAdapterRegistry,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * The provider is called with no lock held (R6). `cancel_at_period_end` changes when the provider's `cancel_scheduled` event is
   * applied (at once with the fake provider), so the answer is 202 "requested", not "done".
   */
  async cancel(userId: string, subscriptionId: string): Promise<{ status: 'requested' }> {
    const now = this.clock.now();
    const { graceDays } = (await this.settings.get()).entitlements;
    const { subscriptions } = await this.sources.load(this.prisma, userId, now);
    const sub = subscriptions.find((candidate) => candidate.id === subscriptionId);
    // Someone else's subscription looks the same as one that does not renew: the caller learns nothing about other accounts.
    if (!sub || !isAutoRenewing({ status: effectiveStatus(sub, now, graceDays).status, cancelAtPeriodEnd: sub.cancelAtPeriodEnd })) {
      throw problem(409, 'Subscription not cancellable', 'subscription-not-cancellable');
    }
    const adapter = this.adapters.get(sub.provider);
    const cancel = adapter?.cancelAtPeriodEnd?.bind(adapter);
    // A subscription bought in a store is cancelled in that store (design §18).
    if (!cancel) throw problem(409, 'Cancel in store', 'cancel-in-store');
    const result = await callAdapter(() => cancel(sub.externalSubscriptionId));
    if (!result.ok) {
      this.logger.warn('subscription_cancel_failed', { subscription_id: sub.id });
      throw problem(503, 'Billing provider unavailable', 'provider-unavailable');
    }
    this.logger.info('subscription_cancel_requested', { subscription_id: sub.id });
    return { status: 'requested' };
  }
}
