import { dateValue } from '../../common/time/local-date.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

/**
 * A "lần học" of the learner on `localDate` (their own calendar date, `YYYY-MM-DD`; nhóm B D39). INSERT … ON CONFLICT DO NOTHING:
 * a second call on the same day, or a replay of the write it marks, adds nothing and is never a unique violation. Call it as the
 * last write of the transaction of the write it marks, so the row lock it may wait on is held for the least time.
 */
export async function recordActivityIn(db: Prisma.TransactionClient | PrismaClient, userId: string, localDate: string): Promise<void> {
  await db.learningActivityDay.createMany({ data: [{ userId, localDate: dateValue(localDate) }], skipDuplicates: true });
}
