import type { Prisma } from '../generated/prisma/client.js';

export const PRIVATE_SENSES_CLEANUP = 'LEARNING_PRIVATE_SENSES_CLEANUP';

/**
 * Practice supplies this port without Learning importing Practice (design Bước 4 R2): it removes what Practice keeps about
 * private senses being deleted, inside `deleteMyWord`'s transaction, before Learning deletes their items (lock order).
 */
export interface PrivateSensesCleanup {
  deleteForSenses(tx: Prisma.TransactionClient, userId: string, senseIds: string[]): Promise<void>;
}
