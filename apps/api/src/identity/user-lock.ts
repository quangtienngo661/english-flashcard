import type { Prisma } from '../generated/prisma/client.js';

export async function withUserLock(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'identity.user:' + userId}, 0))`;
}
