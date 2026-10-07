import type { PrismaClient } from '../../generated/prisma/client.js';

export async function deleteExpiredRateLimitCounters(prisma: PrismaClient, now: Date): Promise<number> {
  const result = await prisma.rateLimitCounter.deleteMany({
    where: { windowStart: { lt: new Date(now.getTime() - 24 * 3600 * 1000) } },
  });
  return result.count;
}
