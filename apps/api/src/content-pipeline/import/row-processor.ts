import { Inject, Injectable } from '@nestjs/common';
import { ContentService } from '../../content/index.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { JobContext } from '../jobs/job-types.js';
import type { RowError } from '../upload/row-errors.js';
import { levelKey, type NormalizedRow } from '../upload/row-normalizer.js';
import { recordBatchRecord } from './batch-records.js';

export class RowRejected extends Error {
  constructor(readonly errors: RowError[]) {
    super(errors.map((e) => e.code).join(', '));
    this.name = 'RowRejected';
  }
}

export type RowResult =
  | { outcome: 'created' | 'updated' | 'unchanged' }
  | { outcome: 'rejected'; errors: RowError[] };

type RowBatch = { id: string; levelSourceId: string | null };
type EntryLevelChanges = { entryId: string; entryCreated: boolean; variantsAdded: boolean; levelAdded: boolean };

/** Called separately by the CSV caller, which owns the original, ordered raw cells.
 * process has already rolled back before this second transaction records a rejection.
 */
export async function recordRejected(
  ctx: JobContext,
  batchId: string,
  row: { rowNumber: number; raw: string[] },
  errors: RowError[],
): Promise<void> {
  await ctx.tx(async (tx) => {
    await tx.importRowOutcome.createMany({ data: [{
      batchId, rowNumber: row.rowNumber, outcome: 'rejected',
      errorCodes: errors.map((error) => error.code), raw: row.raw,
    }], skipDuplicates: true });
  });
}

@Injectable()
export class ImportRowProcessor {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  async process(ctx: JobContext, batch: RowBatch, row: NormalizedRow): Promise<RowResult> {
    try {
      return await ctx.tx(async (tx) => {
        const changes = await this.processEntryAndLevel(tx, batch, row);
        // The content step can compose its changes here, inside this same transaction.
        const outcome = changes.entryCreated ? 'created'
          : changes.variantsAdded || changes.levelAdded ? 'updated' : 'unchanged';

        if (row.level !== null && batch.levelSourceId !== null) {
          const { key, hash } = levelKey(row, batch.levelSourceId);
          await tx.importRowKey.createMany({ data: [{
            kind: 'level', sourceId: batch.levelSourceId, rowKey: key, contentHash: hash, batchId: batch.id,
          }], skipDuplicates: true });
        }
        // Preserve the first persisted outcome on a crash retry, even if this call added nothing.
        await tx.importRowOutcome.createMany({ data: [{
          batchId: batch.id, rowNumber: row.rowNumber, outcome,
        }], skipDuplicates: true });
        return { outcome };
      });
    } catch (error) {
      if (error instanceof RowRejected) return { outcome: 'rejected', errors: error.errors };
      // In particular, LeaseLostError must reach the existing job runner unchanged.
      throw error;
    }
  }

  private async processEntryAndLevel(
    tx: Prisma.TransactionClient,
    batch: RowBatch,
    row: NormalizedRow,
  ): Promise<EntryLevelChanges> {
    await this.content.lockEntryKey(tx, row.lemma, row.pos);
    const { entry, created: entryCreated, addedVariantIds } = await this.content.ensureEntry(tx, {
      lemma: row.lemma, pos: row.pos, variants: row.variants,
    });
    if (entryCreated) {
      await recordBatchRecord(tx, { batchId: batch.id, recordType: 'entry', recordId: entry.id });
    }
    for (const id of addedVariantIds) {
      await recordBatchRecord(tx, { batchId: batch.id, recordType: 'variant', recordId: id });
    }
    const changes: EntryLevelChanges = {
      entryId: entry.id, entryCreated, variantsAdded: addedVariantIds.length > 0, levelAdded: false,
    };
    if (row.level === null || batch.levelSourceId === null) return changes;

    const existingLevels = await this.content.listLevels(tx, entry.id, batch.levelSourceId);
    // Check exact matches FIRST: an earlier upload may legitimately contain both C1 and C2.
    if (existingLevels.some(({ level }) => level === row.level)) return changes;

    // Source reads stay behind Content's public facade. getSource uses its shared Prisma client,
    // without a tx parameter; registered sources are immutable and require no uncommitted writes.
    const source = await this.content.getSource(batch.levelSourceId);
    if (!source) throw new Error('Level source not found');
    if (source.kind === 'third_party' && existingLevels.length > 0) {
      const records = await tx.batchRecord.findMany({ where: {
        batchId: batch.id, recordType: 'level', recordId: { in: existingLevels.map(({ id }) => id) },
      }, select: { recordId: true } });
      const createdHere = new Set(records.map(({ recordId }) => recordId));
      const earlierLevels = existingLevels.filter(({ id }) => !createdHere.has(id));
      if (earlierLevels.length > 0) {
        const levels = [...new Set(earlierLevels.map(({ level }) => level))].sort().join(', ');
        throw new RowRejected([{ code: 'level-differs-from-source',
          message: `Nguồn bên thứ ba đã có level ${levels} từ lần upload trước; không nhận level ${row.level}. Hãy dùng level biên tập để đổi level.`,
        }]);
      }
    }

    const { created: levelCreated, id: levelId } = await this.content.addImportedLevel(tx, {
      entryId: entry.id, sourceId: batch.levelSourceId, level: row.level, extra: row.levelExtra,
    });
    if (levelCreated) {
      await recordBatchRecord(tx, { batchId: batch.id, recordType: 'level', recordId: levelId });
    }
    changes.levelAdded = levelCreated;
    return changes;
  }
}
