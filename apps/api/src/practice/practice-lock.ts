import type { Prisma } from '../generated/prisma/client.js';

/**
 * Serialises one learner's session starts and report creation (lock order step 1, before the session row, Practice items
 * and Learning items).
 */
export async function withPracticeLock(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'practice.user:' + userId}, 0))`;
}
