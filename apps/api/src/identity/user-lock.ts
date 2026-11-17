import type { Prisma } from '../generated/prisma/client.js';

export async function withUserLock(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'identity.user:' + userId}, 0))`;
}

/**
 * Options for a transaction that waits for the user lock. Account deletion (Tx B) holds that lock for up to 120 s, so the default
 * 5 s Prisma timeout would fail the waiting write. Keep the timeout above Tx B's.
 */
export const USER_DATA_TX = { isolationLevel: 'ReadCommitted', maxWait: 5_000, timeout: 125_000 } as const;

/** Use a Read Committed transaction so this read sees a deletion that committed while the lock was held. */
export async function lockUserForDataWrite(tx: Prisma.TransactionClient, userId: string): Promise<boolean> {
  await withUserLock(tx, userId);
  const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true } });
  return user !== null && user.status !== 'deleting';
}
