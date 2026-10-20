import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../common/clock/clock.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { localDate, nextLocalMidnight } from '../common/time/local-date.js';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { IdentityService } from '../identity/profile/identity.service.js';
import { SettingsService, type AppSettings } from '../settings/index.js';
import { alertReached, type AiUsageView } from './api/ai-usage.js';
import type { AiPool, LimitKey, Pool, SubscriptionStatus } from './entitlements.types.js';
import type { Refusal } from './refusal.js';
import { aiDay, cycleAt } from './rules/cycle.js';
import { planNumbers } from './plan-numbers.js';
import { effectiveStatus, resolve, type Resolved } from './rules/plan-rules.js';
import { SourcesRepository } from './sources/sources.repository.js';
import { UsageLedgerService, type ReserveResult } from './usage/usage-ledger.service.js';
import { UsageQueries } from './usage/usage.queries.js';

export { planNumbers } from './plan-numbers.js';

export type Feature = 'practice.basic' | 'ai.practice' | 'ai.lookup';

type Db = PrismaClient | Prisma.TransactionClient;
type Decision = { allowed: true } | ({ allowed: false } & Refusal);

export type EntitlementsSnapshot = {
  plan: 'free' | 'trial' | 'pro';
  sources: Array<{
    kind: 'subscription' | 'grant_plan' | 'grant_limits'; id: string; status: SubscriptionStatus | null; ends_at: string | null;
    renews_at: string | null; cancel_at_period_end: boolean | null; pending_interval: 'month' | 'year' | null;
    limits: Partial<Record<LimitKey, number>> | null;
  }>;
  pools: Record<Pool, { limit: number; used: number; remaining: number; resets_at: string | null }>;
  features: Record<'ai.practice' | 'ai.lookup', { allowed: boolean; reason: 'plan-required' | null }>;
  ai_available: { enabled: boolean; cap_reached: boolean };
  ads: { show: boolean; interstitial_per_day: number; min_interval_minutes: number };
  trial_eligible: boolean;
};

/** A user with no profile counts days in UTC (design §12.1). */
const NO_PROFILE_ZONE = 'UTC';
const FEATURE_POOL: Record<Exclude<Feature, 'practice.basic'>, AiPool> = { 'ai.practice': 'ai_practice', 'ai.lookup': 'ai_lookup' };


/**
 * What a user may use and how much is left (design §5, §7.2, §7.4). Nothing is cached (D28): every call resolves the
 * user's subscriptions and grants and counts the ledger.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SourcesRepository) private readonly sources: SourcesRepository,
    @Inject(UsageQueries) private readonly usage: UsageQueries,
    @Inject(UsageLedgerService) private readonly ledger: UsageLedgerService,
  ) {}

  /** Holds one AI unit for `operationId` (design §7.1). Runs and commits its own short transaction: never call it inside yours (R6). */
  reserve(userId: string, pool: AiPool, operationId: string): Promise<ReserveResult> {
    return this.ledger.reserve(userId, pool, operationId);
  }

  confirm(userId: string, pool: AiPool, operationId: string): Promise<{ state: 'confirmed' | 'released' | 'not-found' }> {
    return this.ledger.confirm(userId, pool, operationId);
  }

  release(userId: string, pool: AiPool, operationId: string): Promise<{ state: 'released' | 'confirmed' | 'not-found' }> {
    return this.ledger.release(userId, pool, operationId);
  }

  refund(userId: string, pool: AiPool, operationId: string, reportId: string): Promise<{ refunded: boolean }> {
    return this.ledger.refund(userId, pool, operationId, reportId);
  }

  /**
   * `practice.basic` is open to every plan (D4); an AI feature needs its pool's limit above 0 (design §5.4). A caller inside an
   * open transaction passes its `tx`, so the reads need no second connection.
   */
  async check(userId: string, feature: Feature, tx?: Prisma.TransactionClient): Promise<Decision> {
    if (feature === 'practice.basic') return { allowed: true };
    const { entitlements } = tx ? await this.settings.get(tx) : await this.settings.get();
    const now = this.clock.now();
    const resolved = await this.resolve(tx ?? this.prisma, userId, entitlements, now);
    return resolved.limits[FEATURE_POOL[feature]] > 0 ? { allowed: true } : { allowed: false, reason: 'plan-required' };
  }

  /**
   * Whether the learner may open one more practice session today (design §7.4). With `tx`, every read goes through it, so
   * the count runs after Practice closed the previous session in that transaction (R4).
   */
  async checkQuota(userId: string, _pool: 'practice_sessions', tx?: Prisma.TransactionClient): Promise<Decision> {
    const db = tx ?? this.prisma;
    const { entitlements } = tx ? await this.settings.get(tx) : await this.settings.get();
    const profile = tx ? await this.identity.getProfile(userId, tx) : await this.identity.getProfile(userId);
    const zone = profile?.timezone ?? NO_PROFILE_ZONE;
    const now = this.clock.now();
    const limit = (await this.resolve(db, userId, entitlements, now)).limits.practice_sessions;
    if (limit === 0) return { allowed: false, reason: 'plan-required' };
    const used = await this.usage.practiceUsed(db, userId, localDate(zone, now));
    if (used >= limit) {
      return { allowed: false, reason: 'quota-exhausted', resets_at: nextLocalMidnight(zone, now).toISOString() };
    }
    return { allowed: true };
  }

  /** Counts one session on `localDate`; a second call for the same session changes nothing (R14). */
  async recordPracticeSession(tx: Prisma.TransactionClient, userId: string, sessionId: string, date: string): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO usage_records (user_id, pool, operation_id, kind, status, local_date, confirmed_at)
      VALUES (${userId}::uuid, 'practice_sessions', ${sessionId}, 'use', 'confirmed', ${date}::date, ${this.clock.now()})
      ON CONFLICT DO NOTHING`;
  }

  /** The user's plan, sources, pools, features, AI availability, ads and trial eligibility; `null` without a profile. */
  async snapshot(userId: string): Promise<EntitlementsSnapshot | null> {
    const profile = await this.identity.getProfile(userId);
    if (!profile) return null;
    const { entitlements } = await this.settings.get();
    const now = this.clock.now();
    const { subscriptions, grants } = await this.sources.load(this.prisma, userId, now);
    const resolved = resolve({
      subscriptions, grants, numbers: planNumbers(entitlements), graceDays: entitlements.graceDays, now,
    });

    const cycle = resolved.anchor ? cycleAt(resolved.anchor, now) : null;
    const pool = (limit: number, used: number, resetsAt: Date | null) => ({
      limit, used, remaining: Math.max(0, limit - used), resets_at: resetsAt?.toISOString() ?? null,
    });
    const aiPool = async (name: AiPool) => pool(
      resolved.limits[name], cycle ? await this.usage.aiUsed(this.prisma, userId, name, cycle, now) : 0, cycle?.end ?? null,
    );
    const practiceUsed = await this.usage.practiceUsed(this.prisma, userId, localDate(profile.timezone, now));
    const pools = {
      practice_sessions: pool(resolved.limits.practice_sessions, practiceUsed, nextLocalMidnight(profile.timezone, now)),
      ai_practice: await aiPool('ai_practice'),
      ai_lookup: await aiPool('ai_lookup'),
    };
    const feature = (name: AiPool) => resolved.limits[name] > 0
      ? { allowed: true, reason: null } : { allowed: false, reason: 'plan-required' as const };
    const cap = await this.usage.capUsed(this.prisma, aiDay(now), now);

    const sourceViews: EntitlementsSnapshot['sources'] = [];
    for (const sub of subscriptions) {
      const { status } = effectiveStatus(sub, now, entitlements.graceDays);
      if (status === 'expired' || status === 'revoked') continue;
      const end = sub.status === 'trialing' ? sub.trialEndsAt ?? sub.currentPeriodEnd : sub.currentPeriodEnd;
      sourceViews.push({
        kind: 'subscription', id: sub.id, status, ends_at: sub.cancelAtPeriodEnd ? end?.toISOString() ?? null : null,
        renews_at: sub.cancelAtPeriodEnd ? null : end?.toISOString() ?? null, cancel_at_period_end: sub.cancelAtPeriodEnd,
        pending_interval: sub.pendingInterval, limits: null,
      });
    }
    for (const grant of grants) {
      if (grant.startsAt > now) continue;
      sourceViews.push({
        kind: grant.kind === 'plan' ? 'grant_plan' : 'grant_limits', id: grant.id, status: null,
        ends_at: grant.endsAt.toISOString(), renews_at: null, cancel_at_period_end: null, pending_interval: null,
        limits: grant.kind === 'limits' ? grant.limits : null,
      });
    }

    return {
      plan: resolved.plan,
      sources: sourceViews,
      pools,
      features: { 'ai.practice': feature('ai_practice'), 'ai.lookup': feature('ai_lookup') },
      ai_available: { enabled: entitlements.aiEnabled, cap_reached: cap.confirmed + cap.reserved >= entitlements.aiDailyCap },
      ads: {
        show: entitlements.adsEnabled && resolved.plan === 'free',
        interstitial_per_day: entitlements.adsInterstitialPerDay, min_interval_minutes: entitlements.adsMinIntervalMinutes,
      },
      trial_eligible: profile.email_verified && !(await this.sources.trialUsed(this.prisma, userId)),
    };
  }

  /** The system cap's day `date` (default: today in Vietnam), computed when read (D36). */
  async aiUsage(date?: string): Promise<AiUsageView> {
    const { entitlements } = await this.settings.get();
    const now = this.clock.now();
    const day = date ?? aiDay(now);
    const { confirmed, reserved } = await this.usage.capUsed(this.prisma, day, now);
    const used = confirmed + reserved;
    return {
      date: day, used, confirmed, reserved, cap: entitlements.aiDailyCap, alert_percent: entitlements.aiCapAlertPercent,
      alert_reached: alertReached(used, entitlements.aiDailyCap, entitlements.aiCapAlertPercent), enabled: entitlements.aiEnabled,
    };
  }

  private async resolve(db: Db, userId: string, settings: AppSettings['entitlements'], now: Date): Promise<Resolved> {
    const { subscriptions, grants } = await this.sources.load(db, userId, now);
    return resolve({ subscriptions, grants, numbers: planNumbers(settings), graceDays: settings.graceDays, now });
  }
}
