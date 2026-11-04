import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService, type AppSettings } from '../../settings/index.js';
import { RESERVATION_TTL_MS } from '../entitlements.constants.js';
import { lockAiDaily, lockPool } from '../entitlements.locks.js';
import type { AiPool } from '../entitlements.types.js';
import { planNumbers } from '../plan-numbers.js';
import type { Refusal } from '../refusal.js';
import { aiWindow, endedSinceOf } from '../rules/ai-cycle.js';
import { aiDay } from '../rules/cycle.js';
import { resolve, type Resolved } from '../rules/plan-rules.js';
import { SourcesRepository } from '../sources/sources.repository.js';
import { decideCap, decideConfirm, decideReserve, type LatestRow } from './ledger-rules.js';
import { UsageQueries } from './usage.queries.js';

export type ReserveResult = { state: 'reserved'; expires_at: string } | { state: 'confirmed' } | ({ state: 'refused' } & Refusal);

type Tx = Prisma.TransactionClient;
type Row = { id: string; status: LatestRow['status']; release_reason: string | null; expires_at: Date | null };

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

/** A learner without a profile counts months and days in UTC, as `checkQuota` does. */
const NO_PROFILE_ZONE = 'UTC';

/**
 * The AI unit ledger (design §7.1–§7.3). Every call reads Settings first, then runs its own short transaction in which
 * every query goes through `tx` (no second connection while a lock is held): `lockPool`, the operation's rows `FOR UPDATE`,
 * the decision; only a reservation that passes the user's checks takes the global `entitlements.ai_daily` lock.
 * Never call AI while one of these transactions is open (R6).
 */
@Injectable()
export class UsageLedgerService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SourcesRepository) private readonly sources: SourcesRepository,
    @Inject(UsageQueries) private readonly usage: UsageQueries,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async reserve(userId: string, pool: AiPool, operationId: string): Promise<ReserveResult> {
    const { entitlements } = await this.settings.get();
    return this.prisma.$transaction(async (tx) => {
      const now = this.clock.now();
      await lockPool(tx, userId, pool);
      const [latest] = await this.rows(tx, userId, pool, operationId);
      const { limit, used, cycleEnd, plan } = await this.standing(tx, userId, pool, entitlements, now);
      const freeCap = plan === 'free' ? entitlements.freeAiDailyCap : null;
      const input = { now, aiEnabled: entitlements.aiEnabled, limit, used, cycleEnd, cap: entitlements.aiDailyCap, freeCap };
      const live = latest && latest.status !== 'released' ? { status: latest.status, expiresAt: latest.expires_at } : null;
      let decision = decideReserve({ ...input, existing: live });
      if (decision.action === 'release-expired-then-continue') {
        await tx.usageRecord.update({
          where: { id: latest.id }, data: { status: 'released', releaseReason: 'expired', releasedAt: now },
        });
        decision = decideReserve({ ...input, existing: null });
      }
      if (decision.action === 'return-existing') {
        return decision.state === 'confirmed'
          ? { state: 'confirmed' as const }
          : { state: 'reserved' as const, expires_at: (latest.expires_at as Date).toISOString() };
      }
      if (decision.action === 'refuse') return { state: 'refused' as const, ...decision.refusal };

      await lockAiDaily(tx);
      const day = aiDay(now);
      const cap = await this.usage.capUsed(tx, day, now);
      const capDecision = decideCap({ capUsed: cap.confirmed + cap.reserved, cap: entitlements.aiDailyCap, now });
      if (capDecision.action === 'refuse') return { state: 'refused' as const, ...capDecision.refusal };
      if (freeCap !== null) {
        // The Free accounts together keep under their own daily cap, so they cannot use up the system cap that Pro shares (design 6.4).
        const free = await this.usage.capUsedFree(tx, day, now);
        const freeDecision = decideCap({ capUsed: free.confirmed + free.reserved, cap: freeCap, now });
        if (freeDecision.action === 'refuse') return { state: 'refused' as const, ...freeDecision.refusal };
      }

      const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MS);
      // The pool lock and the live-row check make a conflict impossible; DO NOTHING keeps the transaction usable regardless (R14).
      await tx.$executeRaw`
        INSERT INTO usage_records (user_id, pool, operation_id, kind, status, system_date, reserved_at, expires_at, plan)
        VALUES (${userId}::uuid, ${pool}, ${operationId}, 'use', 'reserved', ${day}::date, ${now}, ${expiresAt}, ${plan})
        ON CONFLICT DO NOTHING`;
      return { state: 'reserved' as const, expires_at: expiresAt.toISOString() };
    }, transactionOptions);
  }

  async confirm(userId: string, pool: AiPool, operationId: string): Promise<{ state: 'confirmed' | 'released' | 'not-found' }> {
    const { entitlements } = await this.settings.get();
    return this.prisma.$transaction(async (tx) => {
      const now = this.clock.now();
      await lockPool(tx, userId, pool);
      const [latest, ...older] = await this.rows(tx, userId, pool, operationId);
      const { limit, used } = await this.standing(tx, userId, pool, entitlements, now);
      const decision = decideConfirm({
        latest: latest ? { status: latest.status, releaseReason: latest.release_reason, expiresAt: latest.expires_at } : null,
        now,
        remainingWithoutRow: limit - used,
        otherActive: older.some((row) => row.status !== 'released'),
      });
      switch (decision) {
        case 'confirm':
        case 'late-confirm':
          await tx.usageRecord.update({
            where: { id: latest.id },
            data: { status: 'confirmed', confirmedAt: now, releaseReason: null, releasedAt: null },
          });
          return { state: 'confirmed' as const };
        case 'late-free':
          await tx.usageRecord.update({
            where: { id: latest.id },
            data: { status: 'released', releaseReason: 'late-confirm-free', releasedAt: now },
          });
          return { state: 'released' as const };
        case 'already-confirmed':
          return { state: 'confirmed' as const };
        case 'keep-released':
          return { state: 'released' as const };
        case 'not-found':
          this.logger.warn('usage_confirm_not_found', { user_id: userId, pool, operation_id: operationId });
          return { state: 'not-found' as const };
      }
    }, transactionOptions);
  }

  /** The caller gives the unit back (AI failed); a confirmed unit stays confirmed. */
  async release(userId: string, pool: AiPool, operationId: string): Promise<{ state: 'released' | 'confirmed' | 'not-found' }> {
    return this.prisma.$transaction(async (tx) => {
      const now = this.clock.now();
      await lockPool(tx, userId, pool);
      const [latest] = await this.rows(tx, userId, pool, operationId);
      if (!latest) return { state: 'not-found' as const };
      if (latest.status === 'confirmed') return { state: 'confirmed' as const };
      if (latest.status === 'reserved') {
        await tx.usageRecord.update({
          where: { id: latest.id }, data: { status: 'released', releaseReason: 'caller', releasedAt: now },
        });
      }
      return { state: 'released' as const };
    }, transactionOptions);
  }

  /**
   * Gives one unit back in the current cycle (R21): only while the cycle's confirmed uses exceed its credits; one credit
   * per operation, so a second call answers `refunded: true` without a second row.
   */
  async refund(userId: string, pool: AiPool, operationId: string, reportId: string): Promise<{ refunded: boolean }> {
    const { entitlements } = await this.settings.get();
    return this.prisma.$transaction(async (tx) => {
      const now = this.clock.now();
      await lockPool(tx, userId, pool);
      if (await tx.usageRecord.findFirst({ where: { userId, pool, operationId, kind: 'credit' }, select: { id: true } })) {
        return { refunded: true };
      }
      const { cycle } = await this.resolved(tx, userId, entitlements, now);
      if (!cycle) return { refunded: false };
      // B5-7: the unit given back is this operation's own confirmed use of the current cycle; without one nothing is credited.
      if (!(await this.usage.hasConfirmedUseInCycle(tx, userId, pool, operationId, cycle))) return { refunded: false };
      const confirmed = await this.usage.confirmedInCycle(tx, userId, pool, cycle);
      const credits = await this.usage.creditsInCycle(tx, userId, pool, cycle);
      if (confirmed - credits <= 0) return { refunded: false };
      await tx.$executeRaw`
        INSERT INTO usage_records (user_id, pool, operation_id, kind, status, credited_at, note)
        VALUES (${userId}::uuid, ${pool}, ${operationId}, 'credit', 'confirmed', ${now}, ${reportId})
        ON CONFLICT DO NOTHING`;
      return { refunded: true };
    }, transactionOptions);
  }

  /** The operation's `use` rows, newest first, locked. */
  private rows(tx: Tx, userId: string, pool: AiPool, operationId: string): Promise<Row[]> {
    return tx.$queryRaw<Row[]>`
      SELECT id, status, release_reason, expires_at FROM usage_records
      WHERE user_id = ${userId}::uuid AND pool = ${pool} AND operation_id = ${operationId} AND kind = 'use'
      ORDER BY created_at DESC, id DESC
      FOR UPDATE`;
  }

  /**
   * What the learner has now and the window their AI units are counted in (design 6.2): the one place the ledger asks `aiWindow`,
   * with the learner's zone and the sources that ended since the first of the month, all read through the open transaction.
   */
  private async resolved(
    tx: Tx, userId: string, settings: AppSettings['entitlements'], now: Date,
  ): Promise<{ resolved: Resolved; cycle: { start: Date; end: Date } | null }> {
    const zone = (await this.identity.getProfile(userId, tx))?.timezone ?? NO_PROFILE_ZONE;
    const { subscriptions, grants, prepaidPeriods, ended } = await this.sources.load(tx, userId, now, endedSinceOf(zone, now));
    const resolved = resolve({ subscriptions, grants, prepaidPeriods, numbers: planNumbers(settings), graceDays: settings.graceDays, now });
    return { resolved, cycle: aiWindow({ resolved, subscriptions, grants, ended, graceDays: settings.graceDays, zone, now }) };
  }

  /** The pool's limit now, what the current cycle has used (design §7.2), when that cycle ends and the plan the learner has. */
  private async standing(
    tx: Tx, userId: string, pool: AiPool, settings: AppSettings['entitlements'], now: Date,
  ): Promise<{ limit: number; used: number; cycleEnd: Date | null; plan: Resolved['plan'] }> {
    const { resolved, cycle } = await this.resolved(tx, userId, settings, now);
    const used = cycle ? await this.usage.aiUsed(tx, userId, pool, cycle, now) : 0;
    return { limit: resolved.limits[pool], used, cycleEnd: cycle?.end ?? null, plan: resolved.plan };
  }
}
