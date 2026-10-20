import { describe, expect, it, vi } from 'vitest';
import { OWNER_SOURCE_ID, type ContentService } from '../../content/index.js';
import type { JobContext } from '../jobs/job-types.js';
import { contentKey, type NormalizedRow } from '../upload/row-normalizer.js';
import { rowContentHash } from './prefilter.js';
import { ImportRowProcessor } from './row-processor.js';

const row = (patch: Partial<NormalizedRow> = {}): NormalizedRow => ({
  rowNumber: 2, lemma: 'go', variants: [], pos: 'verb', level: 'A1', levelExtra: null,
  content: { glossVi: 'đi', examplesEn: ['X'] }, senseId: null, revision: null, contextLabel: null,
  replaceMeaning: false, inflections: null, formOf: null, ...patch,
});

type ImportResult = Awaited<ReturnType<ContentService['importContent']>>;

function setup(opts: { importResult?: ImportResult; reviewedForms?: Array<{ form: string; kind: string }> } = {}) {
  const tx = {
    backgroundJob: { findUniqueOrThrow: vi.fn(async () => ({ createdBy: 'staff-1' })) },
    batchRecord: { createMany: vi.fn(async () => ({ count: 1 })), findMany: vi.fn(async () => []) },
    importRowKey: { createMany: vi.fn(async () => ({ count: 1 })) },
    importRowOutcome: { createMany: vi.fn(async () => ({ count: 1 })) },
    entry: { findUniqueOrThrow: vi.fn(async () => ({ inflectionsReviewedAt: new Date('2026-10-01T00:00:00Z') })) },
    entryInflection: { findMany: vi.fn(async () => (opts.reviewedForms ?? []).map((form) => ({ ...form, source: 'reviewed' }))) },
  };
  const content = {
    lockEntryKey: vi.fn(async () => undefined),
    ensureEntry: vi.fn(async () => ({ entry: { id: 'entry-1' }, created: false, addedVariantIds: [] })),
    listLevels: vi.fn(async () => []),
    getSource: vi.fn(async () => ({ id: 'src-1', kind: 'owner' })),
    addImportedLevel: vi.fn(async () => ({ created: true, id: 'level-1' })),
    importContent: vi.fn(async () => opts.importResult ?? { kind: 'unchanged', senseId: 'sense-1' }),
    replaceInflections: vi.fn(async () => undefined),
    addDerivedLevel: vi.fn(async () => null),
  };
  const ctx = { tx: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as JobContext;
  const processor = new ImportRowProcessor(content as unknown as ContentService);
  return { tx, content, ctx, processor, batch: { id: 'batch-b', levelSourceId: 'src-1' } };
}

const contentKeyWrite = (normalized: NormalizedRow, batchId: string) => ({
  data: [{ kind: 'content', sourceId: OWNER_SOURCE_ID, rowKey: contentKey(normalized).key,
    contentHash: rowContentHash(normalized), batchId }], skipDuplicates: true,
});

describe('ImportRowProcessor content-applied rows (T3, D14)', () => {
  it('Review Focus 2 / FE17 through the processor: contentApplied skips importContent but still adds the level', async () => {
    const { tx, content, ctx, processor, batch } = setup();
    const normalized = row();

    const result = await processor.process(ctx, batch, normalized, { contentApplied: true });

    expect(content.importContent).not.toHaveBeenCalled();
    expect(content.addImportedLevel).toHaveBeenCalledWith(tx, expect.objectContaining({ entryId: 'entry-1', level: 'A1' }));
    expect(result).toEqual({ outcome: 'updated' });
    expect(tx.importRowKey.createMany).toHaveBeenCalledWith(contentKeyWrite(normalized, 'batch-b'));
  });

  it('FE18: contentApplied with an inflections cell still restores the reviewed set', async () => {
    const { tx, content, ctx, processor, batch } = setup({ reviewedForms: [{ form: 'goed', kind: 'past' }] });
    const normalized = row({ level: null, inflections: [{ form: 'went', kind: 'past' }] });

    const result = await processor.process(ctx, batch, normalized, { contentApplied: true });

    expect(content.importContent).not.toHaveBeenCalled();
    expect(content.replaceInflections).toHaveBeenCalledWith(tx, 'entry-1', 'reviewed', [{ form: 'went', kind: 'past' }]);
    expect(result).toEqual({ outcome: 'updated' });
  });

  it('a contentApplied row with nothing else to change is unchanged', async () => {
    const { ctx, processor, batch } = setup();

    const result = await processor.process(ctx, batch, row({ level: null }), { contentApplied: true });

    expect(result).toEqual({ outcome: 'unchanged' });
  });

  it.each<[string, ImportResult]>([
    ['created', { kind: 'created_sense', senseId: 'sense-1', revisionId: 'rev-1' }],
    ['new_revision', { kind: 'new_revision', senseId: 'sense-1', revisionId: 'rev-2', supersededRevisionId: 'rev-1',
      droppedReviewedMark: false, droppedTopics: [] }],
    ['unchanged', { kind: 'unchanged', senseId: 'sense-1' }],
  ])('the processor writes the content key after created, new_revision and unchanged outcomes (%s)', async (_label, importResult) => {
    const { tx, content, ctx, processor, batch } = setup({ importResult });
    const normalized = row();

    await processor.process(ctx, batch, normalized, { contentApplied: false });

    expect(content.importContent).toHaveBeenCalledOnce();
    expect(tx.importRowKey.createMany).toHaveBeenCalledWith(contentKeyWrite(normalized, 'batch-b'));
  });

  it('a rejected content step writes no content key', async () => {
    const { tx, ctx, processor, batch } = setup({ importResult: { kind: 'rejected', codes: ['open-draft-conflict'] } });

    const result = await processor.process(ctx, batch, row(), { contentApplied: false });

    expect(result.outcome).toBe('rejected');
    expect(tx.importRowKey.createMany).not.toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ kind: 'content' })] }));
  });
});
