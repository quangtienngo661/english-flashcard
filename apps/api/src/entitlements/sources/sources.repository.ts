import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { POOL_OF_LIMIT, type Interval, type LimitKey, type SubscriptionStatus } from '../entitlements.types.js';
import type { GrantSource, SubscriptionSource } from '../rules/plan-rules.js';

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

/** Reads the sources `resolve` works on (design §5.3). Pass a transaction client when a lock is held. */
@Injectable()
export class SourcesRepository {
  /**
   * Subscriptions whose stored status is not final (`effectiveStatus` applies the time transitions), and grants not revoked
   * and not ended at `now` (a grant starting later is returned; `resolve` leaves it out until it starts).
   */
  async load(db: Db, userId: string, now: Date): Promise<{ subscriptions: SubscriptionSource[]; grants: GrantSource[] }> {
    const subscriptions = await db.subscription.findMany({
      where: { userId, status: { notIn: ['expired', 'revoked'] } }, orderBy: { createdAt: 'asc' },
    });
    const grants = await db.entitlementGrant.findMany({
      where: { userId, revokedAt: null, endsAt: { gt: now } }, orderBy: { createdAt: 'asc' },
    });
    return {
      subscriptions: subscriptions.map((row) => ({
        id: row.id, provider: row.provider, externalSubscriptionId: row.externalSubscriptionId,
        status: row.status as SubscriptionStatus, trialDenied: row.trialDenied, cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        trialEndsAt: row.trialEndsAt, currentPeriodEnd: row.currentPeriodEnd, graceEndsAt: row.graceEndsAt,
        quotaAnchorAt: row.quotaAnchorAt, interval: row.interval as Interval, pendingInterval: row.pendingInterval as Interval | null,
      })),
      grants: grants.map((row) => ({
        id: row.id, kind: row.kind as GrantSource['kind'], limits: grantLimits(row.limits), startsAt: row.startsAt,
        endsAt: row.endsAt, revokedAt: row.revokedAt, createdAt: row.createdAt,
      })),
    };
  }

  /** Whether the user already had a trial (design §8). */
  async trialUsed(db: Db, userId: string): Promise<boolean> {
    return (await db.trialHistory.findUnique({ where: { userId }, select: { id: true } })) !== null;
  }
}
