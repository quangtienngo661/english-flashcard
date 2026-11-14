import type { Prisma, PrismaClient } from '../generated/prisma/client.js';

export const BATCH_SCOPE = 'CONTENT_BATCH_SCOPE';

/**
 * Pipeline supplies this port without Content importing pipeline tables or providers. A caller inside an open transaction
 * passes its `tx` as `db`, so the read needs no second connection.
 */
export interface BatchScope {
  entryIdsOf(batchId: string, db?: Prisma.TransactionClient | PrismaClient): Promise<string[]>;
  senseIdsOf(batchId: string, db?: Prisma.TransactionClient | PrismaClient): Promise<string[]>;
}
