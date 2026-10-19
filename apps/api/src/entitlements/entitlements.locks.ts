import type { Prisma } from '../generated/prisma/client.js';
import type { Pool } from './entitlements.types.js';

/*
 * Transaction-scoped advisory locks of Entitlements. Lock order inside one transaction, never backwards (plan Global
 * Constraints): billing_events row → lockUser → subscriptions row; ledger: lockPool → lockAiDaily (AI pools only).
 * While holding one, run every query through the same `tx` (no second connection).
 */

async function lock(tx: Prisma.TransactionClient, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

/** Serialises the billing applier and grant writes for one user. */
export function lockUser(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  return lock(tx, `entitlements.user:${userId}`);
}

/** Serialises reserve / confirm / release / refund of one user's pool. */
export function lockPool(tx: Prisma.TransactionClient, userId: string, pool: Pool): Promise<void> {
  return lock(tx, `entitlements.pool:${userId}:${pool}`);
}

/** Serialises every AI reservation against the system-wide daily cap (design §7.3). */
export function lockAiDaily(tx: Prisma.TransactionClient): Promise<void> {
  return lock(tx, 'entitlements.ai_daily');
}
