import type { Prisma } from '../../generated/prisma/client.js';

export type BatchRecordInput = {
  batchId: string;
  recordType: 'entry' | 'variant' | 'level' | 'sense' | 'revision';
  recordId: string;
  meta?: Prisma.InputJsonObject;
};

/** Keep the first record (and its metadata) when a crashed row is attempted again. */
export async function recordBatchRecord(tx: Prisma.TransactionClient, input: BatchRecordInput): Promise<void> {
  await tx.batchRecord.createMany({ data: [input], skipDuplicates: true });
}
