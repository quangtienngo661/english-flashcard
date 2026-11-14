import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Account deletion (Bước 8, design §4, §7.3): the stored responses of a user's idempotent calls are deleted with the account.
 * Common owns `idempotency_keys`, so the delete lives here and Identity calls it inside the deletion transaction.
 */
export async function deleteIdempotencyKeysOf(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.idempotencyKey.deleteMany({ where: { userId } });
}
