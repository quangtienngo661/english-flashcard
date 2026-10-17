import type { Prisma } from '../generated/prisma/client.js';

/** Serialises one learner's Learning writes, so counted limits (groups, items) hold under concurrent requests. */
export async function withLearnerLock(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'learning.user:' + userId}, 0))`;
}

/**
 * Locks the given items of the learner (ids order, so two lockers never deadlock). Reviews lock only their item row, not
 * the learner, so any write that reads an item's level or date and then changes or logs it takes this lock first (L4).
 */
export async function lockItems(tx: Prisma.TransactionClient, userId: string, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;
  await tx.$queryRaw`
    SELECT id FROM learning_items WHERE id = ANY(${itemIds}::uuid[]) AND user_id = ${userId}::uuid ORDER BY id FOR UPDATE`;
}
