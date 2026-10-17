import type { Prisma } from '../generated/prisma/client.js';

/** Serialises one learner's Learning writes, so counted limits (groups, items) hold under concurrent requests. */
export async function withLearnerLock(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'learning.user:' + userId}, 0))`;
}
