import { contentHash, mergeContent, OWNER_SOURCE_ID } from '../../content/index.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { RowError } from '../upload/row-errors.js';
import { contentKey, formatInflections, levelKey, type NormalizedRow } from '../upload/row-normalizer.js';

export type ImportFileRow = { normalized: NormalizedRow; raw: string[] };
type KeyTuple = { kind: string; sourceId: string; rowKey: string; contentHash: string };
const signature = (key: KeyTuple) => JSON.stringify([key.kind, key.sourceId, key.rowKey, key.contentHash]);
const EMPTY_CONTENT = { glossVi: null, definitionEn: null, examplesEn: [], topicCodes: [], acceptedForms: [] };

/** The hash of the row's own content cells, as stored in its `content` row key (the expression of Bước 2 D13). */
export function rowContentHash(row: NormalizedRow): string {
  return contentHash(mergeContent(EMPTY_CONTENT, row.content ?? {}));
}

/** Duplicate identity wins over D13, even when the two rows have different content hashes.
 * settledContentKeys reconstructs earlier successful rows on a crash retry without processing them.
 * D13 is deliberately conservative: level keys hash identity, NOT level/variants. Require a
 * successful corresponding row from identical file bytes before bypassing the row processor.
 * Content patches needing a merge, and sense_id guards, remain the processor's responsibility.
 * contentAppliedRows (D14): a row without sense_id whose content key and hash any other non-reverted batch already
 * applied, whatever its file bytes or level source; the processor then leaves its content alone.
 */
export async function prefilterRows(
  db: Pick<Prisma.TransactionClient, 'importRowKey' | 'importRowOutcome'>,
  rows: ImportFileRow[],
  batch: { batchId: string; levelSourceId: string | null; fileSha256: string },
  settledContentKeys: ReadonlyMap<string, number> = new Map(),
): Promise<{ toProcess: ImportFileRow[]; unchangedRows: ImportFileRow[];
  duplicateRows: Array<{ row: ImportFileRow; errors: RowError[] }>; contentAppliedRows: Set<number> }> {
  const firstRows = new Map(settledContentKeys);
  const duplicateRows: Array<{ row: ImportFileRow; errors: RowError[] }> = [];
  const surviving: Array<{ row: ImportFileRow; keys: KeyTuple[] }> = [];
  // D29: the rows of one entry carry the same inflections cell or leave it empty; the first non-empty one wins.
  const firstInflections = new Map<string, { rowNumber: number; value: string }>();
  for (const row of rows) {
    const normalized = row.normalized;
    if (normalized.inflections !== null) {
      const entry = JSON.stringify([normalized.lemma, normalized.pos]);
      const value = formatInflections(normalized.inflections);
      const first = firstInflections.get(entry);
      if (first && first.rowNumber < normalized.rowNumber && first.value !== value) {
        duplicateRows.push({ row, errors: [{ code: 'inflections-differ-in-file',
          message: `Dòng ${normalized.rowNumber} ghi dạng chia ${JSON.stringify(value)} khác dòng ${first.rowNumber} (${JSON.stringify(first.value)}) của cùng entry ${JSON.stringify(normalized.lemma)} (${normalized.pos}). Để trống hoặc ghi giống nhau.`,
        }] });
        continue;
      }
      if (!first) firstInflections.set(entry, { rowNumber: normalized.rowNumber, value });
    }
    if (normalized.content !== null) {
      const { key } = contentKey(normalized);
      const earlier = firstRows.get(key);
      if (earlier !== undefined && earlier < normalized.rowNumber) {
        duplicateRows.push({ row, errors: [{ code: 'duplicate-key-in-file',
          message: `Dòng ${normalized.rowNumber} trùng khóa nội dung với dòng ${earlier} trước đó trong cùng file.`,
        }] });
        continue;
      }
      firstRows.set(key, normalized.rowNumber);
    }
    const keys: KeyTuple[] = [];
    if (normalized.level !== null && batch.levelSourceId !== null) {
      const { key, hash } = levelKey(normalized, batch.levelSourceId);
      keys.push({ kind: 'level', sourceId: batch.levelSourceId, rowKey: key, contentHash: hash });
    }
    if (normalized.content !== null) {
      keys.push({ kind: 'content', sourceId: OWNER_SOURCE_ID, rowKey: contentKey(normalized).key,
        contentHash: rowContentHash(normalized) });
    }
    surviving.push({ row, keys });
  }

  const rowKeys = [...new Set(surviving.flatMap(({ keys }) => keys.map(({ rowKey }) => rowKey)))];
  if (rowKeys.length === 0) {
    return { toProcess: surviving.map(({ row }) => row), unchangedRows: [], duplicateRows, contentAppliedRows: new Set() };
  }
  // One key lookup for the file; matching hashes in memory keeps the bind count bounded even
  // at importMaxRows. No query (and no per-row transaction) for duplicate rows rejected above.
  const existing = await db.importRowKey.findMany({ where: {
    rowKey: { in: rowKeys },
    OR: [{ kind: 'content', sourceId: OWNER_SOURCE_ID },
      ...(batch.levelSourceId !== null ? [{ kind: 'level', sourceId: batch.levelSourceId }] : [])],
    batch: { revertedAt: null },
  }, select: { kind: true, sourceId: true, rowKey: true, contentHash: true, batchId: true,
    batch: { select: { fileSha256: true, levelSourceId: true } },
  } });
  const matches = new Map<string, Set<string>>();
  const appliedContent = new Set<string>();
  for (const key of existing) {
    if (key.kind === 'content' && key.batchId !== batch.batchId) appliedContent.add(signature(key));
    if (key.batchId === batch.batchId || key.batch.fileSha256 !== batch.fileSha256
      || key.batch.levelSourceId !== batch.levelSourceId) continue;
    const tuple = signature(key);
    const batches = matches.get(tuple) ?? new Set<string>();
    batches.add(key.batchId);
    matches.set(tuple, batches);
  }
  const candidateBatches = [...new Set([...matches.values()].flatMap((ids) => [...ids]))];
  const applied = candidateBatches.length === 0 ? [] : await db.importRowOutcome.findMany({ where: {
    batchId: { in: candidateBatches }, rowNumber: { in: surviving.map(({ row }) => row.normalized.rowNumber) },
    outcome: { in: ['created', 'updated', 'unchanged'] },
  }, select: { batchId: true, rowNumber: true } });
  const appliedRows = new Set(applied.map(({ batchId, rowNumber }) => JSON.stringify([batchId, rowNumber])));
  const toProcess: ImportFileRow[] = [];
  const unchangedRows: ImportFileRow[] = [];
  const contentAppliedRows = new Set<number>();
  for (const { row, keys } of surviving) {
    const content = keys.find(({ kind }) => kind === 'content');
    if (row.normalized.senseId === null && content && appliedContent.has(signature(content))) {
      contentAppliedRows.add(row.normalized.rowNumber);
    }
    const firstMatch = keys.length > 0 ? matches.get(signature(keys[0])) : undefined;
    // H1: an inflections cell replaces the entry's whole set, and a later batch may have replaced what this same file
    // once set; so a row carrying one is always processed again (sameForms in the processor keeps that cheap).
    const unchanged = row.normalized.senseId === null && row.normalized.inflections === null
      && firstMatch !== undefined && [...firstMatch].some((id) =>
      appliedRows.has(JSON.stringify([id, row.normalized.rowNumber]))
      && keys.every((key) => matches.get(signature(key))?.has(id)));
    (unchanged ? unchangedRows : toProcess).push(row);
  }
  return { toProcess, unchangedRows, duplicateRows, contentAppliedRows };
}
