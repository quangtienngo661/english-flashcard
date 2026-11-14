import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ContentService, type EntryUsageProbe, type EntryUsageReason, type EntryUsageScope } from '../content/index.js';
import type { Prisma } from '../generated/prisma/client.js';

const isActive = (status: string) => status === 'queued' || status === 'running';

/**
 * The part of "may this catalog entry be deleted" that reads the Pipeline's tables (run by Content in the delete transaction):
 *  - records of an import batch that has not been reverted, and the row keys such a batch holds for the entry's lemma and
 *    pos: a re-upload of the same rows would skip them as already applied, so the batch is reverted first (its revert also
 *    frees the keys);
 *  - the sense in a publish job's items (a finished job's report still lists it);
 *  - any queued or running job that is working on the entry, or on every entry (the inflection backfill).
 */
@Injectable()
export class PipelineEntryUsageProbe implements EntryUsageProbe, OnModuleInit {
  readonly module = 'pipeline' as const;

  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  onModuleInit(): void {
    this.content.registerEntryUsageProbe(this);
  }

  async reasonsFor(tx: Prisma.TransactionClient, scope: EntryUsageScope): Promise<EntryUsageReason[]> {
    const { entryId, lemma, pos, senseIds, revisionIds, variantIds, levelIds } = scope;
    const ofBatches: string[] = [];
    const records = await tx.batchRecord.findMany({
      where: {
        batch: { revertedAt: null },
        OR: [
          { recordType: 'entry', recordId: entryId },
          ...(senseIds.length ? [{ recordType: 'sense', recordId: { in: senseIds } }] : []),
          ...(revisionIds.length ? [{ recordType: 'revision', recordId: { in: revisionIds } }] : []),
          ...(variantIds.length ? [{ recordType: 'variant', recordId: { in: variantIds } }] : []),
          ...(levelIds.length ? [{ recordType: 'level', recordId: { in: levelIds } }] : []),
        ],
      },
      select: { batch: { select: { job: { select: { status: true } } } } },
    });
    ofBatches.push(...records.map(({ batch }) => batch.job.status));
    // The key is a JSON array [source id, lemma, pos, ...]; the CASE keeps the cast off any key that is not a level or content key.
    const keys = await tx.$queryRaw<Array<{ status: string }>>`
      SELECT DISTINCT j.status FROM import_row_keys k
      JOIN import_batches b ON b.id = k.batch_id
      JOIN background_jobs j ON j.id = b.id
      WHERE b.reverted_at IS NULL AND k.kind IN ('level', 'content')
        AND CASE WHEN k.kind IN ('level', 'content') THEN k.row_key::jsonb ->> 1 END = ${lemma}
        AND CASE WHEN k.kind IN ('level', 'content') THEN k.row_key::jsonb ->> 2 END = ${pos}`;
    ofBatches.push(...keys.map(({ status }) => status));

    const items = senseIds.length === 0 ? [] : await tx.publishJobItem.findMany({
      where: { senseId: { in: senseIds } }, select: { job: { select: { job: { select: { status: true } } } } },
    });
    const ofPublishJobs = items.map(({ job }) => job.job.status);
    const backfill = await tx.backgroundJob.findFirst({
      where: { queue: 'content-inflections', status: { in: ['queued', 'running'] } }, select: { id: true },
    });

    const reasons: EntryUsageReason[] = [];
    if (ofBatches.length > 0) reasons.push('batch-record');
    if (ofPublishJobs.length > 0) reasons.push('publish-job');
    if (backfill || ofBatches.some(isActive) || ofPublishJobs.some(isActive)) reasons.push('active-job');
    return reasons;
  }
}
