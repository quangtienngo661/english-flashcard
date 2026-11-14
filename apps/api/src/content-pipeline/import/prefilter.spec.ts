import { describe, expect, it } from 'vitest';
import { OWNER_SOURCE_ID } from '../../content/index.js';
import { contentKey, type NormalizedRow } from '../upload/row-normalizer.js';
import { prefilterRows, rowContentHash, type ImportFileRow } from './prefilter.js';

type StoredKey = { kind: string; sourceId: string; rowKey: string; contentHash: string; batchId: string };
type StoredBatch = { id: string; fileSha256: string; levelSourceId: string | null; revertedAt: Date | null };

const row = (patch: Partial<NormalizedRow> = {}): NormalizedRow => ({
  rowNumber: 2, lemma: 'apple', variants: [], pos: 'noun', level: null, levelExtra: null,
  content: { glossVi: 'quả táo', examplesEn: ['X'] }, senseId: null, revision: null, contextLabel: null,
  replaceMeaning: false, inflections: null, formOf: null, ...patch,
});
const fileRow = (normalized: NormalizedRow): ImportFileRow => ({ normalized, raw: [] });

/** Honors the parts of the real where clause this filter depends on: row keys and the non-reverted batch. */
function fakeDb(keys: StoredKey[], batches: StoredBatch[], outcomes: Array<{ batchId: string; rowNumber: number; outcome: string }> = []) {
  const batchOf = (id: string) => batches.find((batch) => batch.id === id)!;
  return {
    importRowKey: {
      findMany: async ({ where }: { where: { rowKey: { in: string[] }; batch?: { revertedAt: null } } }) => keys
        .filter((key) => where.rowKey.in.includes(key.rowKey))
        .filter((key) => where.batch?.revertedAt !== null || batchOf(key.batchId).revertedAt === null)
        .map((key) => ({ ...key, batch: { fileSha256: batchOf(key.batchId).fileSha256, levelSourceId: batchOf(key.batchId).levelSourceId } })),
    },
    importRowOutcome: {
      findMany: async ({ where }: { where: { batchId: { in: string[] }; rowNumber: { in: number[] } } }) => outcomes
        .filter((outcome) => where.batchId.in.includes(outcome.batchId) && where.rowNumber.in.includes(outcome.rowNumber)
          && ['created', 'updated', 'unchanged'].includes(outcome.outcome)),
    },
  } as unknown as Parameters<typeof prefilterRows>[0];
}

const contentRowKey = (normalized: NormalizedRow, batchId: string): StoredKey => ({
  kind: 'content', sourceId: OWNER_SOURCE_ID, rowKey: contentKey(normalized).key,
  contentHash: rowContentHash(normalized), batchId,
});

describe('prefilterRows content-applied rows (T3, D14)', () => {
  const current = { batchId: 'batch-b', levelSourceId: null, fileSha256: 'sha-g' };

  it('FE17: a row applied by batch A is content-applied for batch B with different bytes', async () => {
    const normalized = row();
    const db = fakeDb([contentRowKey(normalized, 'batch-a')],
      [{ id: 'batch-a', fileSha256: 'sha-f', levelSourceId: 'src-1', revertedAt: null }]);

    const result = await prefilterRows(db, [fileRow(normalized)], current);

    expect(result.contentAppliedRows).toEqual(new Set([2]));
    // Different bytes: it still goes through the processor (entry, level, inflections), only content is skipped.
    expect(result.toProcess.map(({ normalized: r }) => r.rowNumber)).toEqual([2]);
    expect(result.unchangedRows).toEqual([]);
  });

  it('a reverted batch\'s key does not count', async () => {
    const normalized = row();
    const db = fakeDb([contentRowKey(normalized, 'batch-a')],
      [{ id: 'batch-a', fileSha256: 'sha-f', levelSourceId: null, revertedAt: new Date('2026-10-20T00:00:00Z') }]);

    const result = await prefilterRows(db, [fileRow(normalized)], current);

    expect(result.contentAppliedRows).toEqual(new Set());
    expect(result.toProcess).toHaveLength(1);
  });

  it('a row with sense_id is never content-applied', async () => {
    const normalized = row({ senseId: 'sense-1', revision: 3 });
    const db = fakeDb([contentRowKey(normalized, 'batch-a')],
      [{ id: 'batch-a', fileSha256: 'sha-f', levelSourceId: null, revertedAt: null }]);

    const result = await prefilterRows(db, [fileRow(normalized)], current);

    expect(result.contentAppliedRows).toEqual(new Set());
    expect(result.toProcess).toHaveLength(1);
  });

  it.each<[string, NormalizedRow['formOf']]>([
    ['relink', { lemma: 'apple', pos: 'noun', kind: 'plural' }],
    ['clear (-)', 'clear'],
  ])('a row whose key and hash match but carries a form_of cell is not content-applied (%s)', async (_label, formOf) => {
    const normalized = row({ formOf });
    const db = fakeDb([contentRowKey(normalized, 'batch-a')],
      [{ id: 'batch-a', fileSha256: 'sha-f', levelSourceId: null, revertedAt: null }]);

    const result = await prefilterRows(db, [fileRow(normalized)], current);

    expect(result.contentAppliedRows).toEqual(new Set());
    expect(result.toProcess).toHaveLength(1);
  });

  it('revert: once batch A (which wrote the content) is reverted, a row batch B only content-applied is processed again', async () => {
    const normalized = row();
    // B content-applied the row and, applying no content, wrote no content key (see row-processor.spec); A is reverted.
    const db = fakeDb([contentRowKey(normalized, 'batch-a')], [
      { id: 'batch-a', fileSha256: 'sha-f', levelSourceId: null, revertedAt: new Date('2026-10-21T00:00:00Z') },
      { id: 'batch-b', fileSha256: 'sha-g', levelSourceId: null, revertedAt: null },
    ]);

    const result = await prefilterRows(db, [fileRow(normalized)], { batchId: 'batch-c', levelSourceId: null, fileSha256: 'sha-f' });

    expect(result.contentAppliedRows).toEqual(new Set());
    expect(result.toProcess).toHaveLength(1);
  });

  it('the current batch\'s own key (crash retry) and a different content hash do not count', async () => {
    const normalized = row();
    const edited = { ...contentRowKey(normalized, 'batch-a'), contentHash: rowContentHash(row({ content: { glossVi: 'quả táo', examplesEn: ['Y'] } })) };
    const db = fakeDb([contentRowKey(normalized, 'batch-b'), edited], [
      { id: 'batch-a', fileSha256: 'sha-f', levelSourceId: null, revertedAt: null },
      { id: 'batch-b', fileSha256: 'sha-g', levelSourceId: null, revertedAt: null },
    ]);

    const result = await prefilterRows(db, [fileRow(normalized)], current);

    expect(result.contentAppliedRows).toEqual(new Set());
  });
});
