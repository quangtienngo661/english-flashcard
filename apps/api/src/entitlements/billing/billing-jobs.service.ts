import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import { BILLING_MAX_ATTEMPTS, BILLING_PENDING_RETRY_MS, RAW_PAYLOAD_RETENTION_DAYS } from '../entitlements.constants.js';
import { effectiveStatus, type SubscriptionSource } from '../rules/plan-rules.js';
import { callAdapter } from './adapter-call.js';
import { BillingAdapterRegistry } from './billing-adapter.registry.js';
import type { FetchedState, SubscriptionState } from './billing.types.js';
import { BillingEventApplier, toState } from './event-applier.service.js';
import { applyFetched } from './subscription-machine.js';

type SubscriptionRow = NonNullable<Awaited<ReturnType<PrismaClient['subscription']['findUnique']>>>;

const DAY_MS = 86_400_000;
const RETRY_BATCH = 100;
const TIME_BATCH = 500;

/**
 * Hourly billing jobs (design §4 "Bảo trì", §9.2 step 4, §9.4 "Chuyển theo thời gian", D31, R19, R23). Rows are claimed with
 * `FOR UPDATE SKIP LOCKED` and no advisory lock; adapter calls run before any row lock (R6).
 */
@Injectable()
export class BillingJobs implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(BillingAdapterRegistry) private readonly registry: BillingAdapterRegistry,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(BillingEventApplier) private readonly applier: BillingEventApplier,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('billing-events-retry', (now) => this.retryEvents(now));
    this.scheduler.register('subscriptions-time', (now) => this.timeTransitions(now));
    this.scheduler.register('billing-raw-payload-cleanup', (now) => this.cleanupRawPayloads(now));
  }

  /** Failed rows under the attempt limit and pending rows a crash left behind; `apply` claims each with SKIP LOCKED. */
  async retryEvents(now: Date): Promise<number> {
    const rows = await this.prisma.billingEvent.findMany({
      where: { OR: [
        { status: 'failed', attempts: { lt: BILLING_MAX_ATTEMPTS } },
        { status: 'pending', receivedAt: { lt: new Date(now.getTime() - BILLING_PENDING_RETRY_MS) } },
      ] },
      orderBy: { receivedAt: 'asc' },
      take: RETRY_BATCH,
      select: { id: true },
    });
    for (const row of rows) await this.applier.apply(row.id);
    return rows.length;
  }

  /**
   * Writes what time alone changes, decided by `effectiveStatus` (C2). A trialing or active row past its end and not cancelled
   * first asks the provider (D31), outside any lock; the answer is kept only if the row did not change meanwhile.
   */
  async timeTransitions(now: Date): Promise<void> {
    const { graceDays } = (await this.settings.get()).entitlements;
    const candidates = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['trialing', 'active', 'grace'] },
        OR: [{ trialEndsAt: { lte: now } }, { currentPeriodEnd: { lte: now } }, { graceEndsAt: { lte: now } }],
      },
      orderBy: { updatedAt: 'asc' },
      take: TIME_BATCH,
    });
    for (const candidate of candidates) {
      const fetched = await this.fetchIfOverdue(candidate, now, graceDays);
      await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM subscriptions WHERE id = ${candidate.id}::uuid FOR UPDATE SKIP LOCKED`;
        if (locked.length === 0) return;
        const row = await tx.subscription.findUnique({ where: { id: candidate.id } });
        if (row === null) return;
        // updated_at, not last_event_at: an additive event with an older occurred_at changes only updated_at (plan review #4).
        const useFetched = fetched !== null && row.updatedAt.getTime() === candidate.updatedAt.getTime();
        const state = useFetched ? applyFetched(toState(row), fetched) : toState(row);
        const { status } = effectiveStatus(toSource(row, state), now, graceDays);
        if (!useFetched && status === row.status) return;
        await tx.subscription.update({ where: { id: row.id }, data: { ...state, status, updatedAt: now } });
      });
    }
  }

  /** R23: the raw provider body may hold the buyer's email; it is kept 90 days for debugging only. */
  async cleanupRawPayloads(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - RAW_PAYLOAD_RETENTION_DAYS * DAY_MS);
    return this.prisma.$executeRaw`
      UPDATE billing_events SET raw_payload = NULL WHERE raw_payload IS NOT NULL AND received_at < ${cutoff}`;
  }

  private async fetchIfOverdue(row: SubscriptionRow, now: Date, graceDays: number): Promise<FetchedState | null> {
    if ((row.status !== 'trialing' && row.status !== 'active') || row.cancelAtPeriodEnd) return null;
    const adapter = this.registry.get(row.provider);
    if (!adapter?.fetchState) return null;
    const { status, overdue } = effectiveStatus(toSource(row, toState(row)), now, graceDays);
    if (!overdue && status !== 'on_hold') return null;
    const result = await callAdapter(() => adapter.fetchState!(row.externalSubscriptionId));
    if (!result.ok || result.value === null) {
      this.logger.warn('billing_state_refetch_failed', { subscription_id: row.id, provider: row.provider });
      return null;
    }
    return result.value;
  }
}

function toSource(row: SubscriptionRow, state: SubscriptionState): SubscriptionSource {
  return { ...state, id: row.id, provider: row.provider, externalSubscriptionId: row.externalSubscriptionId };
}
