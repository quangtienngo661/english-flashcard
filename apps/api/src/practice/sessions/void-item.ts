import type { Prisma } from '../../generated/prisma/client.js';

/** An item becomes void only while it has no final result: it is never asked again in its round and never counts (`asked`, `answered`). */
export async function voidUnanswered(tx: Prisma.TransactionClient, itemId: string): Promise<void> {
  await tx.practiceSessionItem.updateMany({ where: { id: itemId, result: null }, data: { result: 'void' } });
}
