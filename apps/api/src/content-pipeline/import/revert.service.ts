import type { Clock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

type RevertRecord = Parameters<ContentService['revertRecords']>[0][number];
type RevertReport = Awaited<ReturnType<ContentService['revertRecords']>>;
const recordTypes: RevertRecord['type'][] = ['entry', 'variant', 'level', 'sense', 'revision'];

function checkBatch(batch: { revertedAt: Date | null; job: { status: string } } | null): asserts batch {
  if (!batch) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
  if (batch.revertedAt !== null || ['queued', 'running'].includes(batch.job.status)) {
    throw new ProblemDetailsException({ status: 409, title: 'Batch not revertable', type: 'batch-not-revertable' });
  }
}

/** Plain function: synchronous pipeline orchestration; Content owns its entry transactions. */
export async function revertBatch(prisma: PrismaClient, content: ContentService, clock: Clock, batchId: string): Promise<RevertReport> {
  const select = { revertedAt: true, job: { select: { status: true, finishedAt: true } } } as const;
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId }, select });
  checkBatch(batch);
  const created = await prisma.batchRecord.findMany({ where: { batchId },
    select: { recordType: true, recordId: true, meta: true }, orderBy: [{ recordType: 'asc' }, { recordId: 'asc' }],
  });
  const records: RevertRecord[] = created.map(({ recordType, recordId, meta }) => {
    if (!recordTypes.includes(recordType as RevertRecord['type'])) throw new Error(`Unknown batch record type: ${recordType}`);
    const record: RevertRecord = { type: recordType as RevertRecord['type'], id: recordId };
    if (record.type === 'revision' && meta !== null && typeof meta === 'object' && !Array.isArray(meta)) {
      if (typeof meta.replacedRevisionId === 'string') record.replacedRevisionId = meta.replacedRevisionId;
      if (meta.replacedRevisionPreviousStatus === 'draft' || meta.replacedRevisionPreviousStatus === 'reviewed') {
        record.replacedRevisionPreviousStatus = meta.replacedRevisionPreviousStatus;
      }
    }
    return record;
  });
  // Plain values for Content (D3): when the batch finished, and which revisions it recorded itself.
  const reverted = await content.revertRecords(records, {
    batchFinishedAt: batch.job.finishedAt,
    ownRevisionIds: new Set(records.filter((record) => record.type === 'revision').map((record) => record.id)),
  });
  // Bước 3 does not record inflection changes per batch (L8): a file with an inflections column leaves them in place.
  const headers = await prisma.importBatch.findUniqueOrThrow({ where: { id: batchId }, select: { rawHeaders: true } });
  const rawHeaders = Array.isArray(headers.rawHeaders) ? headers.rawHeaders : [];
  const report = rawHeaders.some((header) => typeof header === 'string' && header.trim().toLowerCase() === 'inflections')
    ? { ...reverted, not_reverted: [{ kind: 'inflections', detail:
      'Dạng chia (inflections) do file này đặt không được hoàn tác; upload một file sửa lại cột inflections nếu cần.' }] }
    : reverted;
  await prisma.$transaction(async (tx) => {
    // Serialize finalization of different idempotency keys without holding a batch-wide content transaction.
    await tx.$queryRaw`SELECT id FROM import_batches WHERE id = ${batchId}::uuid FOR UPDATE`;
    checkBatch(await tx.importBatch.findUnique({ where: { id: batchId }, select }));
    await tx.importRowKey.deleteMany({ where: { batchId } });
    await tx.importBatch.update({ where: { id: batchId }, data: { revertedAt: clock.now(), revertReport: report } });
    // GET uploads/:id derives reverted from revertedAt; preserve the job's terminal status.
  }, { timeout: 30_000, maxWait: 5_000 });
  return report;
}
