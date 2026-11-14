import { Injectable } from '@nestjs/common';
import { Prisma, type EntitlementGrant, type PrepaidPeriod, type PrismaClient, type Subscription } from '../../generated/prisma/client.js';
import { POOL_OF_LIMIT, type Interval, type LimitKey, type SubscriptionStatus } from '../entitlements.types.js';
import type { GrantSource, PrepaidSource, SubscriptionSource } from '../rules/plan-rules.js';
import type { EndedSources } from '../rules/source-ends.js';

type Db = PrismaClient | Prisma.TransactionClient;

/** Only the known keys with whole-number values: a stored row is never trusted to match the API's schema. */
export function grantLimits(value: Prisma.JsonValue | null): GrantSource['limits'] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const limits: Partial<Record<LimitKey, number>> = {};
  for (const key of Object.keys(POOL_OF_LIMIT) as LimitKey[]) {
    const number = value[key];
    if (typeof number === 'number' && Number.isInteger(number) && number >= 0) limits[key] = number;
  }
  return limits;
}

const toSubscription = (row: Subscription): SubscriptionSource => ({
  id: row.id, provider: row.provider, externalSubscriptionId: row.externalSubscriptionId,
  status: row.status as SubscriptionStatus, trialDenied: row.trialDenied, cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  trialEndsAt: row.trialEndsAt, currentPeriodStart: row.currentPeriodStart, currentPeriodEnd: row.currentPeriodEnd, graceEndsAt: row.graceEndsAt,
  quotaAnchorAt: row.quotaAnchorAt, endedAt: row.endedAt, interval: row.interval as Interval, pendingInterval: row.pendingInterval as Interval | null,
});

const toGrant = (row: EntitlementGrant): GrantSource => ({
  id: row.id, kind: row.kind as GrantSource['kind'], limits: grantLimits(row.limits), startsAt: row.startsAt,
  endsAt: row.endsAt, revokedAt: row.revokedAt, createdAt: row.createdAt,
});

const toPrepaid = (row: PrepaidPeriod): PrepaidSource => ({ id: row.id, startsAt: row.startsAt, endsAt: row.endsAt, revokedAt: row.revokedAt });

export type LoadedSources = { subscriptions: SubscriptionSource[]; grants: GrantSource[]; prepaidPeriods: PrepaidSource[] };
export type LoadedSourcesWithEnded = LoadedSources & { ended: EndedSources };

/** Reads the sources `resolve` works on (design §5.3). Pass a transaction client when a lock is held. */
@Injectable()
export class SourcesRepository {
  /**
   * Subscriptions whose stored status is not final (`effectiveStatus` applies the time transitions), and grants not revoked
   * and not ended at `now` (a grant starting later is returned; `resolve` leaves it out until it starts), and prepaid periods
   * the same way (a period that starts later is returned: the snapshot lists it as upcoming).
   *
   * With `endedSince` the same three queries also return the sources that ended since then (expired or revoked subscriptions with
   * `ended_at` ≥ it, grants and prepaid periods revoked since then or run out between then and `now`), in `ended` only:
   * `subscriptions`, `grants` and `prepaidPeriods` stay exactly what they were, because the snapshot and `resolve` read them
   * (launch prep A, design 6.3.4; launch prep B design 3.13, LB1A8).
   */
  async load(db: Db, userId: string, now: Date, endedSince?: Date): Promise<LoadedSourcesWithEnded> {
    const live: Prisma.SubscriptionWhereInput = { status: { notIn: ['expired', 'revoked'] } };
    const liveGrant: Prisma.EntitlementGrantWhereInput = { revokedAt: null, endsAt: { gt: now } };
    const livePeriod: Prisma.PrepaidPeriodWhereInput = { revokedAt: null, endsAt: { gt: now } };
    const subscriptions = await db.subscription.findMany({
      where: endedSince === undefined
        ? { userId, ...live }
        : { userId, OR: [live, { status: { in: ['expired', 'revoked'] }, endedAt: { gte: endedSince } }] },
      orderBy: { createdAt: 'asc' },
    });
    const grants = await db.entitlementGrant.findMany({
      where: endedSince === undefined
        ? { userId, ...liveGrant }
        : { userId, OR: [liveGrant, { revokedAt: { gte: endedSince } }, { revokedAt: null, endsAt: { gte: endedSince, lte: now } }] },
      orderBy: { createdAt: 'asc' },
    });
    const periods = await db.prepaidPeriod.findMany({
      where: endedSince === undefined
        ? { userId, ...livePeriod }
        : { userId, OR: [livePeriod, { revokedAt: { gte: endedSince } }, { revokedAt: null, endsAt: { gte: endedSince, lte: now } }] },
      orderBy: { startsAt: 'asc' },
    });
    const isLiveSub = (row: Subscription) => row.status !== 'expired' && row.status !== 'revoked';
    const isLiveGrant = (row: EntitlementGrant) => row.revokedAt === null && row.endsAt > now;
    const isLivePeriod = (row: PrepaidPeriod) => row.revokedAt === null && row.endsAt > now;
    return {
      subscriptions: subscriptions.filter(isLiveSub).map(toSubscription),
      grants: grants.filter(isLiveGrant).map(toGrant),
      prepaidPeriods: periods.filter(isLivePeriod).map(toPrepaid),
      ended: {
        subscriptions: subscriptions.filter((row) => !isLiveSub(row)).map(toSubscription),
        grants: grants.filter((row) => !isLiveGrant(row)).map(toGrant),
        prepaidPeriods: periods.filter((row) => !isLivePeriod(row)).map(toPrepaid),
      },
    };
  }

  /** `load` for many users in three queries (the AI dashboard); every asked user has an entry, empty when they have no source. */
  async loadMany(db: Db, userIds: string[], now: Date): Promise<Map<string, LoadedSources>> {
    const byUser = new Map<string, LoadedSources>(userIds.map((id) => [id, { subscriptions: [], grants: [], prepaidPeriods: [] }]));
    if (userIds.length === 0) return byUser;
    const [subscriptions, grants, prepaid] = await Promise.all([
      db.subscription.findMany({
        where: { userId: { in: userIds }, status: { notIn: ['expired', 'revoked'] } }, orderBy: { createdAt: 'asc' },
      }),
      db.entitlementGrant.findMany({
        where: { userId: { in: userIds }, revokedAt: null, endsAt: { gt: now } }, orderBy: { createdAt: 'asc' },
      }),
      db.prepaidPeriod.findMany({
        where: { userId: { in: userIds }, revokedAt: null, endsAt: { gt: now } }, orderBy: { startsAt: 'asc' },
      }),
    ]);
    for (const row of subscriptions) byUser.get(row.userId)?.subscriptions.push(toSubscription(row));
    for (const row of grants) byUser.get(row.userId)?.grants.push(toGrant(row));
    for (const row of prepaid) byUser.get(row.userId)?.prepaidPeriods.push(toPrepaid(row));
    return byUser;
  }

  /**
   * Users who can resolve to Pro now: a subscription stored as `active` or `grace` (`effectiveStatus` only ever keeps these Pro or
   * ends them; no other stored status becomes Pro), a plan grant in force, or a prepaid period running. A candidate may still resolve to Free (an `active`
   * row past its grace). Lowest user id first, at most `limit`.
   */
  async proCandidates(db: Db, now: Date, limit: number): Promise<string[]> {
    const rows = await db.$queryRaw<Array<{ user_id: string }>>(Prisma.sql`
      SELECT user_id::text AS user_id FROM (
        SELECT user_id FROM subscriptions WHERE status IN ('active', 'grace')
        UNION
        SELECT user_id FROM entitlement_grants WHERE kind = 'plan' AND revoked_at IS NULL AND starts_at <= ${now} AND ends_at > ${now}
        UNION
        SELECT user_id FROM prepaid_periods WHERE revoked_at IS NULL AND starts_at <= ${now} AND ends_at > ${now}
      ) candidates ORDER BY user_id LIMIT ${limit}`);
    return rows.map((row) => row.user_id);
  }

  /** Whether the user already had a trial (design §8). */
  async trialUsed(db: Db, userId: string): Promise<boolean> {
    return (await db.trialHistory.findUnique({ where: { userId }, select: { id: true } })) !== null;
  }
}
