import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, OWNER_SOURCE_ID } from '../../src/content/index.js';
import { recordBatchRecord } from '../../src/content-pipeline/import/batch-records.js';
import { ImportRowProcessor, recordRejected, RowRejected } from '../../src/content-pipeline/import/row-processor.js';
import { BackgroundJobsService } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { LeaseLostError, type JobContext } from '../../src/content-pipeline/jobs/job-types.js';
import type { RowError } from '../../src/content-pipeline/upload/row-errors.js';
import { levelKey, type NormalizedRow } from '../../src/content-pipeline/upload/row-normalizer.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { makeFakeJobContext } from '../support/fake-job-context.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';

function row(input: Partial<NormalizedRow> = {}): NormalizedRow {
  return {
    rowNumber: 2, lemma: 'analyze', variants: ['analyse'], pos: 'verb', level: 'B1',
    levelExtra: null, content: null, senseId: null, revision: null, contextLabel: null,
    replaceMeaning: false, inflections: null, formOf: null, ...input,
  };
}

describe('import row processor, entry and level part (e2e, isolated database)', () => {
  let ctx: TestApp;
  let jobs: BackgroundJobsService;
  let content: ContentService;
  let processor: ImportRowProcessor;
  let job: JobContext;

  const source = (name = 'CEFR-J', version = '1.5', displayPriority = 10) => ctx.prisma.dataSource.create({ data: {
    kind: 'third_party', name, version, displayPriority, license: 'test license', attribution: 'test authors',
  } });
  const batch = async (levelSourceId: string | null) => {
    const id = await ctx.prisma.$transaction((tx) => jobs.create(tx, {
      queue: 'content-import', createdBy: randomUUID(), operationId: randomUUID(),
    }));
    return ctx.prisma.importBatch.create({ data: {
      id, levelSourceId, fileName: 'rows.csv', fileSha256: 'a'.repeat(64), fileSize: 1, rowCount: 10,
      rawHeaders: ['headword', 'pos', 'cefr'], warnings: [], counters: { processed: 0 },
    } });
  };
  const snapshot = async () => ({
    entries: await ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } }),
    variants: await ctx.prisma.entryVariant.findMany({ orderBy: { id: 'asc' } }),
    levels: await ctx.prisma.entryLevel.findMany({ orderBy: { id: 'asc' } }),
    records: await ctx.prisma.batchRecord.findMany({ orderBy: [{ batchId: 'asc' }, { recordType: 'asc' }, { recordId: 'asc' }] }),
    keys: await ctx.prisma.importRowKey.findMany({ orderBy: [{ batchId: 'asc' }, { rowKey: 'asc' }] }),
    outcomes: await ctx.prisma.importRowOutcome.findMany({ orderBy: [{ batchId: 'asc' }, { rowNumber: 'asc' }] }),
  });

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), pipeline: { runWorkers: false } });
    jobs = ctx.app.get(BackgroundJobsService);
    content = ctx.app.get(ContentService);
    // Registration belongs to the later batch-handler task; exercise the same injectable class directly.
    processor = new ImportRowProcessor(content);
  });
  beforeEach(async () => {
    await ctx.prisma.backgroundJob.deleteMany();
    await resetCatalog(ctx.prisma);
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
    job = makeFakeJobContext(ctx.prisma);
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#7: analyze/analyse verb B1 creates an entry, spelling variant and imported CEFR-J 1.5 level without a sense', async () => {
    const cefr = await source();
    const upload = await batch(cefr.id);
    const input = row();
    expect(await processor.process(job, upload, input)).toEqual({ outcome: 'created' });
    const entries = await ctx.prisma.entry.findMany();
    expect(entries).toEqual([expect.objectContaining({
      lemma: 'analyze', pos: 'verb', language: 'en', entryType: 'word', functionWordDerived: false,
    })]);
    const entry = entries[0];
    const variants = await ctx.prisma.entryVariant.findMany();
    expect(variants).toEqual([expect.objectContaining({
      entryId: entry.id, text: 'analyse', kind: 'spelling', acceptedAsAnswer: true,
    })]);
    const levels = await ctx.prisma.entryLevel.findMany({ include: { source: true } });
    expect(levels).toEqual([expect.objectContaining({
      entryId: entry.id, level: 'B1', sourceId: cefr.id, basis: 'imported',
      source: expect.objectContaining({ name: 'CEFR-J', version: '1.5' }),
    })]);
    expect(await ctx.prisma.sense.count({ where: { entryId: entry.id } })).toBe(0);
    expect(await ctx.prisma.sense.count({ where: {
      entry: { lemma: 'analyze' }, state: 'open', liveRevisionId: { not: null },
    } })).toBe(0);
    expect(await ctx.prisma.senseRevision.count()).toBe(0);
    expect(await ctx.prisma.batchRecord.findMany({ where: { batchId: upload.id } })).toEqual(expect.arrayContaining([
      { batchId: upload.id, recordType: 'entry', recordId: entry.id, meta: null },
      { batchId: upload.id, recordType: 'variant', recordId: variants[0].id, meta: null },
      { batchId: upload.id, recordType: 'level', recordId: levels[0].id, meta: null },
    ]));
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: upload.id } })).toBe(3);
    const key = levelKey(input, cefr.id);
    expect(await ctx.prisma.importRowKey.findMany()).toEqual([{
      kind: 'level', sourceId: cefr.id, rowKey: key.key, contentHash: key.hash, batchId: upload.id,
    }]);
    expect(await ctx.prisma.importRowOutcome.findMany()).toEqual([{
      batchId: upload.id, rowNumber: 2, outcome: 'created', errorCodes: [], errorMessages: [], raw: null,
    }]);
  });

  it('B2#8: March and march nouns remain distinct case-sensitive entries', async () => {
    const upload = await batch((await source()).id);
    expect(await processor.process(job, upload, row({ lemma: 'March', variants: [], pos: 'noun', level: 'A1' })))
      .toEqual({ outcome: 'created' });
    expect(await processor.process(job, upload, row({ rowNumber: 3, lemma: 'march', variants: [], pos: 'noun' })))
      .toEqual({ outcome: 'created' });
    const entries = await ctx.prisma.entry.findMany();
    expect(entries).toHaveLength(2);
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ lemma: 'March', pos: 'noun' }), expect.objectContaining({ lemma: 'march', pos: 'noun' }),
    ]));
    const upper = entries.find((entry) => entry.lemma === 'March')!;
    const lower = entries.find((entry) => entry.lemma === 'march')!;
    expect(upper.id).not.toBe(lower.id);
    expect(await ctx.prisma.entryLevel.findMany({ orderBy: { level: 'asc' } }))
      .toMatchObject([{ entryId: upper.id, level: 'A1' }, { entryId: lower.id, level: 'B1' }]);
    expect(await ctx.prisma.importRowKey.count()).toBe(2);
  });

  it('B2#14: duplicate levels add nothing, while different levels in the same batch are both kept', async () => {
    const upload = await batch((await source('Octanove', '1.0', 20)).id);
    const input = row({ level: 'C1' });
    expect(await processor.process(job, upload, input)).toEqual({ outcome: 'created' });
    expect(await processor.process(job, upload, { ...input, rowNumber: 3 })).toEqual({ outcome: 'unchanged' });
    expect(await ctx.prisma.entryLevel.count()).toBe(1);
    expect(await processor.process(job, upload, { ...input, rowNumber: 4, level: 'C2' })).toEqual({ outcome: 'updated' });
    expect(await ctx.prisma.entryLevel.findMany({ orderBy: { level: 'asc' } })).toMatchObject([
      { level: 'C1', sourceId: upload.levelSourceId, basis: 'imported' },
      { level: 'C2', sourceId: upload.levelSourceId, basis: 'imported' },
    ]);
    // Two distinct imported levels without editorial records are the catalog's conflict criterion.
    expect(await ctx.prisma.entry.count()).toBe(1);
    expect(await ctx.prisma.batchRecord.count({ where: { recordType: 'level' } })).toBe(2);
    expect(await ctx.prisma.importRowOutcome.findMany({ orderBy: { rowNumber: 'asc' } }))
      .toMatchObject([{ outcome: 'created' }, { outcome: 'unchanged' }, { outcome: 'updated' }]);
  });

  it('B2#14a: only new third-party levels from earlier batches conflict; same-batch additions and exact later repeats succeed', async () => {
    const s = await source('Source S', '1');
    await source('Source T', '1', 20);
    const first = await batch(s.id);
    const second = await batch(s.id);
    const input = row({ levelExtra: { notes: 'original' } });
    expect(await processor.process(job, first, input)).toEqual({ outcome: 'created' });
    const before = await snapshot();
    const rejected = await processor.process(job, second, { ...input, variants: ['analyse', 'new-variant'], level: 'C1' });
    expect(rejected).toEqual({ outcome: 'rejected', errors: [{
      code: 'level-differs-from-source', message: expect.stringContaining('B1'),
    }] });
    if (rejected.outcome !== 'rejected') throw new Error('Expected rejection');
    expect(rejected.errors[0].message).toContain('C1');
    expect(await snapshot()).toEqual(before);
    expect(await ctx.prisma.entryVariant.count({ where: { text: 'new-variant' } })).toBe(0);
    expect(await ctx.prisma.importRowOutcome.count({ where: { batchId: second.id } })).toBe(0);
    // The caller still has the raw CSV cells; rejection recording uses its own transaction.
    const raw = ['analyze/analyse/new-variant', 'verb', 'C1'];
    await recordRejected(job, second.id, { rowNumber: 2, raw }, rejected.errors);
    const recorded = await ctx.prisma.importRowOutcome.findMany({ where: { batchId: second.id } });
    expect(recorded).toEqual([{
      batchId: second.id, rowNumber: 2, outcome: 'rejected', errorCodes: ['level-differs-from-source'],
      errorMessages: [rejected.errors[0].message], raw,
    }]);
    await recordRejected(job, second.id, { rowNumber: 2, raw }, rejected.errors);
    expect(await ctx.prisma.importRowOutcome.findMany({ where: { batchId: second.id } })).toEqual(recorded);
    expect(await processor.process(job, first, { ...input, rowNumber: 3, level: 'C2' })).toEqual({ outcome: 'updated' });
    const levels = await ctx.prisma.entryLevel.findMany({ orderBy: { level: 'asc' } });
    expect(levels).toMatchObject([{ level: 'B1', sourceId: s.id }, { level: 'C2', sourceId: s.id }]);
    expect(levels[0]).toEqual(before.levels[0]);
    const third = await batch(s.id);
    for (const [index, level] of (['B1', 'C2'] as const).entries()) {
      expect(await processor.process(job, third, { ...input, rowNumber: index + 2, level }))
        .toEqual({ outcome: 'unchanged' });
    }
    expect(await ctx.prisma.entryLevel.findMany({ orderBy: { level: 'asc' } })).toEqual(levels);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: third.id } })).toBe(0);
    expect(await ctx.prisma.importRowOutcome.findMany({ where: { batchId: third.id } }))
      .toMatchObject([{ outcome: 'unchanged' }, { outcome: 'unchanged' }]);
  });

  it('B2#14a: any earlier-batch level blocks a new level even when this batch created another existing level', async () => {
    const s = await source('Source S', '1');
    const earlier = await batch(s.id);
    const current = await batch(s.id);
    expect(await processor.process(job, earlier, row())).toEqual({ outcome: 'created' });
    const entry = await ctx.prisma.entry.findFirstOrThrow();
    // Simulate an entry that has both an earlier-batch record and a current-batch record.
    await job.tx(async (tx) => {
      await content.lockEntryKey(tx, entry.lemma, entry.pos);
      const level = await content.addImportedLevel(tx, { entryId: entry.id, sourceId: s.id, level: 'C1', extra: null });
      await recordBatchRecord(tx, { batchId: current.id, recordType: 'level', recordId: level.id });
    });
    const before = await snapshot();
    expect(await processor.process(job, current, row({ level: 'C2' }))).toMatchObject({
      outcome: 'rejected', errors: [{ code: 'level-differs-from-source' }],
    });
    expect(await snapshot()).toEqual(before);
  });

  it('B2#15: different third-party sources on the same entry keep both levels without rejection', async () => {
    const cefr = await source();
    const octanove = await source('Octanove', '1.0', 20);
    const first = await batch(cefr.id);
    const second = await batch(octanove.id);
    expect(await processor.process(job, first, row())).toEqual({ outcome: 'created' });
    expect(await processor.process(job, second, row({ level: 'C1' }))).toEqual({ outcome: 'updated' });
    expect(await ctx.prisma.entry.count()).toBe(1);
    const entry = await ctx.prisma.entry.findFirstOrThrow();
    expect(await ctx.prisma.entryLevel.findMany({ orderBy: { level: 'asc' } })).toMatchObject([
      { entryId: entry.id, sourceId: cefr.id, level: 'B1' }, { entryId: entry.id, sourceId: octanove.id, level: 'C1' },
    ]);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: second.id, recordType: 'entry' } })).toBe(0);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: second.id, recordType: 'level' } })).toBe(1);
  });

  it.each([
    { hasSource: false, level: null }, { hasSource: true, level: null }, { hasSource: false, level: 'B1' },
  ] as const)('B2#16: level=$level and hasSource=$hasSource skip levels and keys without rejecting', async ({ hasSource, level }) => {
    const upload = await batch(hasSource ? (await source()).id : null);
    const input = row({ level, levelExtra: { notes: 'no level write' } });
    expect(await processor.process(job, upload, input)).toEqual({ outcome: 'created' });
    const entry = await ctx.prisma.entry.findFirstOrThrow();
    expect(entry).toMatchObject({ lemma: input.lemma, pos: input.pos });
    expect(await ctx.prisma.entryVariant.count({ where: { entryId: entry.id } })).toBe(1);
    expect(await ctx.prisma.entryLevel.count({ where: { entryId: entry.id } })).toBe(0);
    expect(await ctx.prisma.importRowKey.count({ where: { batchId: upload.id } })).toBe(0);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: upload.id, recordType: 'level' } })).toBe(0);
    expect(await processor.process(job, upload, { ...input, rowNumber: 3 })).toEqual({ outcome: 'unchanged' });
    expect(await processor.process(job, upload, { ...input, rowNumber: 4, variants: ['analyse', 'additional'] }))
      .toEqual({ outcome: 'updated' });
    expect(await ctx.prisma.entryVariant.count({ where: { entryId: entry.id } })).toBe(2);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: upload.id, recordType: 'variant' } })).toBe(2);
    expect(await ctx.prisma.entryLevel.count({ where: { entryId: entry.id } })).toBe(0);
  });

  it('B2#31: RowRejected inside a real row transaction rolls back a novel entry, variants, levels, batch records and keys', async () => {
    const s = await source('Source S', '1');
    const first = await batch(s.id);
    const second = await batch(s.id);
    expect(await processor.process(job, first, row())).toEqual({ outcome: 'created' });
    const before = await snapshot();
    const errors: RowError[] = [{ code: 'level-differs-from-source', message: 'Nguồn đã có level B1; không nhận level C1.' }];
    // A genuinely new entry cannot already have a conflicting level. Inject the same rejection
    // after the real callback's writes to prove rollback of ALL writes, including a new entry.
    const rejectingContext: JobContext = {
      ...job,
      tx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return job.tx(async (tx) => {
          await fn(tx);
          throw new RowRejected(errors);
        });
      },
    };
    const input = row({ lemma: 'novel', variants: ['novel-variant'], level: 'C1' });
    expect(await processor.process(rejectingContext, second, input)).toEqual({ outcome: 'rejected', errors });
    expect(await ctx.prisma.entry.count({ where: { lemma: 'novel', pos: 'verb' } })).toBe(0);
    expect(await ctx.prisma.entryVariant.count({ where: { text: 'novel-variant' } })).toBe(0);
    expect(await ctx.prisma.entryLevel.count({ where: { entry: { lemma: 'novel', pos: 'verb' } } })).toBe(0);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: second.id } })).toBe(0);
    expect(await ctx.prisma.importRowKey.count({ where: { batchId: second.id } })).toBe(0);
    expect(await ctx.prisma.importRowOutcome.count({ where: { batchId: second.id } })).toBe(0);
    expect(await snapshot()).toEqual(before);
    await recordRejected(job, second.id, { rowNumber: input.rowNumber, raw: ['novel/novel-variant', 'verb', 'C1'] }, errors);
    expect(await ctx.prisma.importRowOutcome.findUniqueOrThrow({
      where: { batchId_rowNumber: { batchId: second.id, rowNumber: input.rowNumber } },
    })).toMatchObject({ outcome: 'rejected', errorCodes: ['level-differs-from-source'], raw: ['novel/novel-variant', 'verb', 'C1'] });
  });

  it('B2#30/B2E8: source extras persist verbatim and duplicate Octanove notes never overwrite the first row', async () => {
    const upload = await batch((await source('Octanove', '1.0', 20)).id);
    const input = row({ levelExtra: { 'coreinventory 1': 'xyz', 'coreinventory 2': 'two', threshold: 'yes', notes: 'first' } });
    expect(await processor.process(job, upload, input)).toEqual({ outcome: 'created' });
    const first = await ctx.prisma.entryLevel.findFirstOrThrow();
    expect(first.sourceExtra).toEqual(input.levelExtra);
    ctx.clock.advance(1_000);
    expect(await processor.process(job, upload, { ...input, rowNumber: 3, levelExtra: { 'coreinventory 1': 'different', notes: 'second' } }))
      .toEqual({ outcome: 'unchanged' });
    expect(await ctx.prisma.entryLevel.findMany()).toEqual([first]);
    expect(await ctx.prisma.batchRecord.count({ where: { recordType: 'level' } })).toBe(1);
  });

  it('B2E27: owner source requires no version or license and accepts multiple editorial levels even across batches', async () => {
    const owner = await ctx.prisma.dataSource.findUniqueOrThrow({ where: { id: OWNER_SOURCE_ID } });
    expect(owner).toMatchObject({ kind: 'owner', version: '', license: '' });
    const first = await batch(OWNER_SOURCE_ID);
    const second = await batch(OWNER_SOURCE_ID);
    expect(await processor.process(job, first, row())).toEqual({ outcome: 'created' });
    expect(await processor.process(job, second, row({ level: 'C1' }))).toEqual({ outcome: 'updated' });
    expect(await ctx.prisma.entryLevel.findMany({ orderBy: { level: 'asc' } })).toMatchObject([
      { sourceId: OWNER_SOURCE_ID, level: 'B1', basis: 'editorial' },
      { sourceId: OWNER_SOURCE_ID, level: 'C1', basis: 'editorial' },
    ]);
    expect(await ctx.prisma.entry.count()).toBe(1);
  });

  it('B2#35 (unit-level with FakeJobContext): retrying the exact row creates no records and returns unchanged', async () => {
    const upload = await batch((await source()).id);
    const input = row({ levelExtra: { notes: 'first' } });
    expect(await processor.process(job, upload, input)).toEqual({ outcome: 'created' });
    const first = await snapshot();
    expect(first.entries).toHaveLength(1);
    expect(first.variants).toHaveLength(1);
    expect(first.levels).toHaveLength(1);
    expect(first.records).toHaveLength(3);
    expect(first.keys).toHaveLength(1);
    expect(first.outcomes).toHaveLength(1);
    ctx.clock.advance(1_000);
    expect(await processor.process(job, upload, input)).toEqual({ outcome: 'unchanged' });
    expect(await snapshot()).toEqual(first);
    // The persisted first outcome remains created, so retrying never changes batch counters.
    expect(first.outcomes[0].outcome).toBe('created');
    expect(await ctx.prisma.sense.count()).toBe(0);
    // Explicitly prove the helper tolerates a repeated record tuple and preserves its first metadata.
    const levelRecord = first.records.find((record) => record.recordType === 'level')!;
    await job.tx((tx) => recordBatchRecord(tx, {
      batchId: levelRecord.batchId, recordType: 'level', recordId: levelRecord.recordId,
      meta: { notes: 'must not replace first metadata' },
    }));
    expect(await snapshot()).toEqual(first);
  });

  it.each(['lease', 'ordinary'] as const)('B2#37: process propagates the identical %s exception instead of recording a rejection', async (kind) => {
    const upload = await batch((await source()).id);
    const failure = kind === 'lease' ? new LeaseLostError(job.jobId) : new TypeError('Expected transaction failure');
    const failingContext: JobContext = {
      ...job,
      tx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return job.tx(async (tx) => {
          await fn(tx);
          throw failure;
        });
      },
    };
    await expect(processor.process(failingContext, upload, row())).rejects.toBe(failure);
    expect(await ctx.prisma.entry.count()).toBe(0);
    expect(await ctx.prisma.entryVariant.count()).toBe(0);
    expect(await ctx.prisma.entryLevel.count()).toBe(0);
    expect(await ctx.prisma.batchRecord.count()).toBe(0);
    expect(await ctx.prisma.importRowKey.count()).toBe(0);
    expect(await ctx.prisma.importRowOutcome.count()).toBe(0);
  });
});
