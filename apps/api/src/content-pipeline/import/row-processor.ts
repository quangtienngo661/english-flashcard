import { Inject, Injectable } from '@nestjs/common';
import { ContentService, MAX_EXAMPLES, normalizeContent } from '../../content/index.js';
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
  | { outcome: 'created' | 'updated' | 'unchanged'; warnings?: string[] }
  | { outcome: 'rejected'; errors: RowError[] };

type RowBatch = { id: string; levelSourceId: string | null };
type EntryLevelChanges = { entryId: string; entryCreated: boolean; variantsAdded: boolean; levelAdded: boolean };
type ContentRejectionCode = Extract<Awaited<ReturnType<ContentService['importContent']>>, { kind: 'rejected' }>['codes'][number];

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
        let outcome: 'created' | 'updated' | 'unchanged' = changes.entryCreated ? 'created'
          : changes.variantsAdded || changes.levelAdded ? 'updated' : 'unchanged';
        const warnings: string[] = [];
        if (row.content !== null) {
          // JobContext carries lease metadata only. The batch id is its owning job's id.
          const actor = await tx.backgroundJob.findUniqueOrThrow({ where: { id: batch.id }, select: { createdBy: true } });
          const result = await this.content.importContent(tx, {
            entryId: changes.entryId, lemma: row.lemma, content: row.content, senseId: row.senseId,
            revision: row.revision, contextLabel: row.contextLabel, replaceMeaning: row.replaceMeaning, actorId: actor.createdBy,
          });
          if (result.kind === 'rejected') throw new RowRejected(await this.contentErrors(tx, row, result.codes));
          if (result.kind === 'created_sense' || result.kind === 'new_revision') {
            if (result.kind === 'created_sense') {
              outcome = 'created';
              await recordBatchRecord(tx, { batchId: batch.id, recordType: 'sense', recordId: result.senseId });
            } else {
              if (outcome !== 'created') outcome = 'updated';
              if (result.droppedReviewedMark) warnings.push(`Dòng ${row.rowNumber}: bỏ dấu đã rà của revision ${result.supersededRevisionId} khi ghi nháp CSV mới.`);
              for (const topic of result.droppedTopics) {
                warnings.push(`Dòng ${row.rowNumber}: bỏ chủ đề đã ẩn ${JSON.stringify(topic)} được kế thừa từ revision trước.`);
              }
            }
            // Include revision 1 too: revert removes revisions before deleting an empty sense.
            await recordBatchRecord(tx, { batchId: batch.id, recordType: 'revision', recordId: result.revisionId,
              ...(result.kind === 'new_revision' && result.supersededRevisionId !== null
                ? { meta: { replacedRevisionId: result.supersededRevisionId } } : {}),
            });
          }
        }

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
        return { outcome, ...(warnings.length > 0 ? { warnings } : {}) };
      });
    } catch (error) {
      if (error instanceof RowRejected) return { outcome: 'rejected', errors: error.errors };
      // In particular, LeaseLostError must reach the existing job runner unchanged.
      throw error;
    }
  }

  private async contentErrors(tx: Prisma.TransactionClient, row: NormalizedRow, codes: ContentRejectionCode[]): Promise<RowError[]> {
    const givenTopics = codes.some((code) => code === 'unknown-topic' || code === 'topic-archived')
      ? normalizeContent({ topicCodes: row.content?.topicCodes }, row.lemma).topicCodes ?? [] : [];
    const topics = new Map((givenTopics.length > 0 ? await this.content.getTopics(tx, givenTopics) : []).map((topic) => [topic.code, topic]));
    const messages: Record<ContentRejectionCode, string> = {
      'revision-required': `Sense_id ${JSON.stringify(row.senseId)} cần revision hiện tại; ô revision đang trống.`,
      'stale-revision': `Revision ${row.revision} của sense ${JSON.stringify(row.senseId)} không phải revision mới nhất. Hãy xuất lại sense trước khi sửa.`,
      'sense-not-found': `Không tìm thấy sense ${JSON.stringify(row.senseId)}.`,
      'sense-retired': `Sense ${JSON.stringify(row.senseId)} đã retire, không thể nhập nội dung.`,
      'sense-entry-mismatch': `Sense ${JSON.stringify(row.senseId)} không thuộc entry ${JSON.stringify(row.lemma)} (${row.pos}) của dòng này.`,
      'open-draft-conflict': `Sense của ${JSON.stringify(row.lemma)} (${row.pos}), nhãn ${JSON.stringify(row.contextLabel)}, có nháp sửa tay chứa nội dung; dùng sense_id và revision mới nhất để sửa.`,
      'gloss-changed': `Gloss_vi của ${JSON.stringify(row.lemma)} (${row.pos}), nhãn ${JSON.stringify(row.contextLabel)}, khác nghĩa đã publish; dùng replace_meaning hoặc sense_id và revision mới nhất.`,
      'unknown-topic': `Mã chủ đề không tồn tại: ${givenTopics.filter((code) => !topics.has(code)).map((code) => JSON.stringify(code)).join(', ')}.`,
      'topic-archived': `Mã chủ đề đã ẩn: ${givenTopics.filter((code) => topics.get(code)?.archivedAt).map((code) => JSON.stringify(code)).join(', ')}.`,
      'too-many-examples': `Dòng có ${row.content?.examplesEn?.filter((example) => example.trim()).length ?? 0} câu ví dụ không trống; chỉ nhận tối đa ${MAX_EXAMPLES} câu.`,
    };
    return codes.map((code) => ({ code, message: messages[code] }));
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
