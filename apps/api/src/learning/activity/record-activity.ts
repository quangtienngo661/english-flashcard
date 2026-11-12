import { dateValue } from '../../common/time/local-date.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

/**
 * A "lần học" of the learner on `localDate` (their own calendar date, `YYYY-MM-DD`; nhóm B D39). INSERT … ON CONFLICT DO NOTHING:
 * a second call on the same day, or a replay of the write it marks, adds nothing and is never a unique violation. Call it as the
 * last write of the transaction of the write it marks, so the row lock it may wait on is held for the least time.
 *
 * `studied` (round C, DC28) marks the day as one the learner studied — a flashcard, the final answer of a session, a review button —
 * as against only adding or removing words. It never turns back to false. `firstStudied` is true for the one call that makes the
 * day a study day: the update takes the row lock, so of two requests racing for the same day exactly one gets it.
 */
export async function recordActivityIn(
  db: Prisma.TransactionClient | PrismaClient, userId: string, localDate: string, opts: { studied: boolean },
): Promise<{ firstStudied: boolean }> {
  const day = dateValue(localDate);
  if (!opts.studied) {
    await db.learningActivityDay.createMany({ data: [{ userId, localDate: day }], skipDuplicates: true });
    return { firstStudied: false };
  }
  const flip = () => db.learningActivityDay.updateMany({ where: { userId, localDate: day, studied: false }, data: { studied: true } });
  if ((await flip()).count > 0) return { firstStudied: true };
  const created = await db.learningActivityDay.createMany({ data: [{ userId, localDate: day, studied: true }], skipDuplicates: true });
  if (created.count > 0) return { firstStudied: true };
  // The row exists: studied already (not the first), or inserted as "not studied" by a request that slipped in after our update.
  return { firstStudied: (await flip()).count > 0 };
}
