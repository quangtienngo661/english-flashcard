import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { createHash, randomUUID } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, inject, it, vi } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
import { MaintenanceScheduler } from '../../src/common/maintenance/maintenance.scheduler.js';
import { OWNER_SOURCE_ID } from '../../src/content/index.js';
import { ImportBatchHandler } from '../../src/content-pipeline/import/import-batch.handler.js';
import { ImportFileCleanupService } from '../../src/content-pipeline/import/import-file-cleanup.service.js';
import { prefilterRows } from '../../src/content-pipeline/import/prefilter.js';
import { ImportRowProcessor } from '../../src/content-pipeline/import/row-processor.js';
import { BackgroundJobsService, makeJobContext } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { JobHandlerRegistry } from '../../src/content-pipeline/jobs/job-handler.registry.js';
import { JobQueueService } from '../../src/content-pipeline/jobs/job-queue.service.js';
import { JobReconcilerService } from '../../src/content-pipeline/jobs/job-reconciler.service.js';
import type { JobHandler } from '../../src/content-pipeline/jobs/job-types.js';
import { classifyColumns } from '../../src/content-pipeline/upload/columns.js';
import { parseUploadFile } from '../../src/content-pipeline/upload/csv-file.js';
import { normalizeRow } from '../../src/content-pipeline/upload/row-normalizer.js';
import { UploadsService } from '../../src/content-pipeline/upload/uploads.service.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';

const csv = (rows: string[], headers = 'headword,pos,CEFR,gloss_vi,definition_en') =>
  Buffer.from([headers, ...rows].join('\r\n'), 'utf8');
const valid = csv(['bank,noun,A1,ngân hàng,A financial institution.', 'walk,verb,A1,đi bộ,Move on foot.']);
const polling = { timeout: 15_000, interval: 20 };
function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}

describe('import batch handler (e2e, real workers and isolated database)', () => {
  let databaseUrl: string;
  const apps: TestApp[] = [];
  const queues: Queue[] = [];
  const connections: Redis[] = [];
  const start = async (pipeline: Partial<AppConfig['pipeline']> = {}, jobHandlers: JobHandler[] = []) => {
    const ctx = await createTestApp({ databaseUrl, redisUrl: inject('redisUrl'), jobHandlers, pipeline: {
      runWorkers: true, reconcileSeconds: 60, rowRetryBaseMs: 1, jobBackoffMs: 1, ...pipeline,
    } });
    apps.push(ctx);
    // Finish the bootstrap scan before constructing deliberately queued/purged fixtures.
    await ctx.app.get(JobReconcilerService).runOnce();
    const config = ctx.app.get<AppConfig>(APP_CONFIG);
    const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
    connections.push(connection);
    queues.push(new Queue('content-import', { connection, prefix: config.pipeline.queuePrefix }));
    return ctx;
  };
  const rawQueue = (ctx: TestApp) => queues[apps.indexOf(ctx)];
  const job = (ctx: TestApp, id: string) => ctx.app.get(BackgroundJobsService).get(id);
  const stored = (ctx: TestApp, id: string) => ctx.prisma.importBatch.findUniqueOrThrow({ where: { id } });
  const outcomes = (ctx: TestApp, id: string) => ctx.prisma.importRowOutcome.findMany({
    where: { batchId: id }, orderBy: { rowNumber: 'asc' },
  });
  const enqueue = (ctx: TestApp, id: string) => ctx.app.get(JobQueueService).enqueue('content-import', id);
  const finish = async (ctx: TestApp, id: string, status = 'succeeded') => {
    await expect.poll(async () => (await job(ctx, id))?.status, polling).toBe(status);
    await expect.poll(() => rawQueue(ctx).getJob(id), polling).toBeUndefined();
    return stored(ctx, id);
  };
  const batch = async (ctx: TestApp, bytes = valid, opts: {
    sourceId?: string | null; actorId?: string; operationId?: string;
  } = {}) => {
    const config = ctx.app.get<AppConfig>(APP_CONFIG);
    const parsed = parseUploadFile(bytes, { maxRows: config.pipeline.importMaxRows, maxBytes: config.pipeline.importMaxBytes });
    const sourceId = opts.sourceId === undefined ? OWNER_SOURCE_ID : opts.sourceId;
    return ctx.prisma.$transaction(async (tx) => {
      const id = await ctx.app.get(BackgroundJobsService).create(tx, {
        queue: 'content-import', createdBy: opts.actorId ?? randomUUID(), operationId: opts.operationId ?? randomUUID(),
        ...(sourceId ? { exclusiveKey: `content-import:${sourceId}` } : {}),
      });
      await tx.importBatch.create({ data: {
        id, levelSourceId: sourceId, fileName: 'fixture.csv', fileSha256: createHash('sha256').update(bytes).digest('hex'),
        fileSize: bytes.length, rowCount: parsed.rows.length, rawHeaders: parsed.rawHeaders,
        warnings: classifyColumns(parsed.headers).problems, counters: {},
      } });
      await tx.importBatchFile.create({ data: { batchId: id, content: Buffer.from(bytes) } });
      return id;
    });
  };
  const acquire = async (ctx: TestApp, id: string) => {
    const lease = await ctx.app.get(BackgroundJobsService).acquire(id, randomUUID());
    expect(lease).not.toBeNull();
    return makeJobContext(ctx.prisma, id, lease!.attempts, lease!.epoch);
  };
  const snapshot = async (ctx: TestApp) => ({
    entries: await ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } }),
    levels: await ctx.prisma.entryLevel.findMany({ orderBy: { id: 'asc' } }),
    variants: await ctx.prisma.entryVariant.findMany({ orderBy: { id: 'asc' } }),
    senses: await ctx.prisma.sense.findMany({ orderBy: { id: 'asc' } }),
    revisions: await ctx.prisma.senseRevision.findMany({ orderBy: { id: 'asc' } }),
    records: await ctx.prisma.batchRecord.findMany({ orderBy: [{ batchId: 'asc' }, { recordType: 'asc' }, { recordId: 'asc' }] }),
  });

  beforeAll(async () => { databaseUrl = await createIsolatedDatabase(); });
  beforeEach(async () => {
    const ctx = await start({ runWorkers: false });
    await ctx.prisma.backgroundJob.deleteMany();
    await resetCatalog(ctx.prisma);
  });
  afterEach(async () => {
    const failures: unknown[] = [];
    for (const ctx of apps.splice(0)) {
      try { await ctx.close(); } catch (error) { failures.push(error); }
    }
    vi.restoreAllMocks();
    for (const queue of queues.splice(0)) {
      try { await queue.obliterate({ force: true }); } catch (error) { failures.push(error); }
      try { await queue.close(); } catch (error) { failures.push(error); }
    }
    for (const connection of connections.splice(0)) connection.disconnect();
    if (failures.length) throw new AggregateError(failures, 'Import batch test cleanup failed');
  });

  it('B2#10/B2#32: normal registration runs an upload; identical bytes with open CSV drafts report only unchanged', async () => {
    const ctx = await start();
    expect(ctx.app.get(JobHandlerRegistry).get('content-import')).toBe(ctx.app.get(ImportBatchHandler));
    const upload = () => ctx.app.get(UploadsService).accept({ userId: randomUUID() }, {
      originalname: 'fixture.csv', buffer: valid, size: valid.length,
    } as Express.Multer.File, OWNER_SOURCE_ID, randomUUID());
    const first = (await upload()).batchId;
    expect((await finish(ctx, first)).counters).toEqual({
      processed: 2, created: 2, updated: 0, unchanged: 0, rejected: 0,
      entries_created: 2, variants_created: 0, levels_created: 2, senses_created: 2, revisions_created: 2,
    });
    expect(await ctx.prisma.senseRevision.findMany()).toEqual([
      expect.objectContaining({ status: 'draft', draftSource: 'csv', publishedAt: null }),
      expect.objectContaining({ status: 'draft', draftSource: 'csv', publishedAt: null }),
    ]);
    const before = await snapshot(ctx);
    const second = (await upload()).batchId;
    expect((await finish(ctx, second)).counters).toMatchObject({ processed: 2, created: 0, updated: 0, unchanged: 2, rejected: 0,
      entries_created: 0, levels_created: 0, senses_created: 0, revisions_created: 0 });
    expect(await outcomes(ctx, second)).toMatchObject([{ outcome: 'unchanged' }, { outcome: 'unchanged' }]);
    expect(await snapshot(ctx)).toEqual(before);
  });

  it('B2#10/D13: a real CEFR-J shaped file is prefiltered in bulk on exact re-upload without row-processor calls', async () => {
    const ctx = await start();
    const source = await ctx.prisma.dataSource.create({ data: {
      name: 'CEFR-J', version: '1.5', kind: 'third_party', license: 'fixture', attribution: 'fixture', displayPriority: 10,
    } });
    const bytes = csv(['a,determiner,A1,,,', 'a.m./A.M./am/AM,adverb,A1,,,', 'abandon,verb,B1,,,'],
      'headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold');
    const first = await batch(ctx, bytes, { sourceId: source.id });
    await enqueue(ctx, first);
    await finish(ctx, first);
    const before = await snapshot(ctx);
    const process = vi.spyOn(ctx.app.get(ImportRowProcessor), 'process');
    const second = await batch(ctx, bytes, { sourceId: source.id });
    await enqueue(ctx, second);
    expect((await finish(ctx, second)).counters).toMatchObject({ processed: 3, unchanged: 3, rejected: 0 });
    expect(process).not.toHaveBeenCalled();
    expect(await snapshot(ctx)).toEqual(before);
  });

  it('B2#4 (test seam): explicit fake handlers still override production registration before worker bootstrap', async () => {
    const runs: string[] = [];
    const fake: JobHandler = { queue: 'content-import', run: async (context) => {
      runs.push(context.jobId);
      return 'succeeded';
    } };
    const ctx = await start({}, [fake]);
    expect(ctx.app.get(JobHandlerRegistry).get('content-import')).toBe(fake);
    const id = await batch(ctx);
    await enqueue(ctx, id);
    await finish(ctx, id);
    expect(runs).toEqual([id]);
    expect(await ctx.prisma.entry.count()).toBe(0);
  });

  it('B2#10/D13: matching identity keys never skip changed levels, variants or content in a different file', async () => {
    const ctx = await start();
    const first = await batch(ctx, csv(['bank,noun,A1,first,One.']));
    await enqueue(ctx, first);
    await finish(ctx, first);
    const second = await batch(ctx, csv(['bank/banks,noun,B1,second,Two.']));
    const process = vi.spyOn(ctx.app.get(ImportRowProcessor), 'process');
    await enqueue(ctx, second);
    expect((await finish(ctx, second)).counters).toMatchObject({ processed: 1, created: 0, updated: 1, unchanged: 0, rejected: 0,
      entries_created: 0, variants_created: 1, levels_created: 1, senses_created: 0, revisions_created: 1 });
    expect(process).toHaveBeenCalledOnce();
    expect(await ctx.prisma.entryLevel.findMany({ orderBy: { level: 'asc' } })).toMatchObject([{ level: 'A1' }, { level: 'B1' }]);
    expect(await ctx.prisma.entryVariant.findMany()).toMatchObject([{ text: 'banks' }]);
    expect(await ctx.prisma.senseRevision.findMany({ orderBy: { revisionNo: 'asc' } }))
      .toMatchObject([{ status: 'superseded' }, { status: 'draft', revisionNo: 2 }]);
  });

  it('B2#24a/B2#28: row warnings append to upload-time unknown-column warnings and persist across retries', async () => {
    const ctx = apps[0];
    const first = await batch(ctx, csv(['bank,noun,A1,first,One.']));
    const handler = ctx.app.get(ImportBatchHandler);
    const firstContext = await acquire(ctx, first);
    expect(await handler.run(firstContext)).toBe('succeeded');
    await ctx.app.get(BackgroundJobsService).finish(first, firstContext.epoch, 'succeeded');
    const revision = await ctx.prisma.senseRevision.findFirstOrThrow();
    await ctx.prisma.senseRevision.update({ where: { id: revision.id }, data: { status: 'reviewed' } });
    const bytes = csv(['bank,noun,A1,second,Two.,ignored', 'walk,verb,A1,walk,Three.,ignored'],
      'headword,pos,CEFR,gloss_vi,definition_en,mystery');
    const second = await batch(ctx, bytes);
    const uploadWarnings = (await stored(ctx, second)).warnings;
    const processor = ctx.app.get(ImportRowProcessor);
    const original = processor.process.bind(processor);
    const spy = vi.spyOn(processor, 'process').mockImplementation(async (context, upload, row) => {
      if (row.rowNumber === 3) throw new Error('Crash after warning row');
      return original(context, upload, row);
    });
    const secondContext = await acquire(ctx, second);
    await expect(handler.run(secondContext)).rejects.toThrow('Crash after warning row');
    expect((await stored(ctx, second)).warnings).toEqual([
      ...(uploadWarnings as string[]), expect.stringContaining('đã rà'),
    ]);
    await ctx.app.get(BackgroundJobsService).release(second, secondContext.epoch);
    spy.mockImplementation(original);
    const warningsBeforeRetry = (await stored(ctx, second)).warnings;
    expect(await handler.run(await acquire(ctx, second))).toBe('succeeded');
    expect((await stored(ctx, second)).warnings).toEqual(warningsBeforeRetry);
    expect((await stored(ctx, second)).counters).toMatchObject({ processed: 2, created: 1, updated: 1, rejected: 0 });
  });

  it('B2#32: validation and processor rejections persist original cells, partial counters derive from outcomes', async () => {
    const ctx = await start();
    const id = await batch(ctx, csv(['bank,noun,A1,ngân hàng,Valid.', 'bad,nuon,A1,no,Invalid.',
      'topic,noun,A1,no,Invalid topic.'], 'headword,pos,CEFR,gloss_vi,definition_en'));
    // A processor rejection exercises the separate recordRejected path too.
    const processor = ctx.app.get(ImportRowProcessor);
    const original = processor.process.bind(processor);
    vi.spyOn(processor, 'process').mockImplementation((context, upload, row) => row.rowNumber === 4
      ? original(context, upload, { ...row, content: { topicCodes: ['missing-fixture-topic'] } })
      : original(context, upload, row));
    await enqueue(ctx, id);
    const counters = (await finish(ctx, id, 'partial')).counters as Record<string, number>;
    expect(counters).toMatchObject({ processed: 3, created: 1, updated: 0, unchanged: 0, rejected: 2 });
    expect(counters.processed).toBe(counters.created + counters.updated + counters.unchanged + counters.rejected);
    expect(await outcomes(ctx, id)).toMatchObject([
      { outcome: 'created' }, { outcome: 'rejected', errorCodes: ['invalid-pos'], raw: ['bad', 'nuon', 'A1', 'no', 'Invalid.'] },
      { outcome: 'rejected', errorCodes: ['unknown-topic'], raw: ['topic', 'noun', 'A1', 'no', 'Invalid topic.'] },
    ]);
    expect(await ctx.prisma.entry.count()).toBe(1);
    expect(ctx.logs).toContainEqual(expect.objectContaining({ level: 'warn', event: 'import_batch_partial', batch_id: id }));
  });

  it('B2#34: a specific row retries two transient failures then succeeds on its third call', async () => {
    const ctx = await start();
    const processor = ctx.app.get(ImportRowProcessor);
    const original = processor.process.bind(processor);
    let calls = 0;
    vi.spyOn(processor, 'process').mockImplementation(async (context, upload, row) => {
      if (row.rowNumber === 3 && ++calls <= 2) throw Object.assign(new Error('Injected serialization failure'), { code: '40001' });
      return original(context, upload, row);
    });
    const id = await batch(ctx);
    await enqueue(ctx, id);
    expect((await finish(ctx, id)).counters).toMatchObject({ processed: 2, created: 2 });
    expect(calls).toBe(3);
    expect((await job(ctx, id))?.attempts).toBe(1);
  });

  it('B2#34: exhausted row retries fail all three job attempts, retaining settled rows and derived counts so far', async () => {
    const ctx = await start({ jobAttempts: 3, rowRetries: 3 });
    const processor = ctx.app.get(ImportRowProcessor);
    const original = processor.process.bind(processor);
    const calls: number[] = [];
    vi.spyOn(processor, 'process').mockImplementation(async (context, upload, row) => {
      calls.push(row.rowNumber);
      if (row.rowNumber === 3) throw Object.assign(new Error('Injected serialization failure'), { code: '40001' });
      return original(context, upload, row);
    });
    const id = await batch(ctx);
    await enqueue(ctx, id);
    expect((await finish(ctx, id, 'failed')).counters).toMatchObject({ processed: 1, created: 1, rejected: 0,
      entries_created: 1, levels_created: 1, senses_created: 1, revisions_created: 1 });
    expect(await job(ctx, id)).toMatchObject({ attempts: 3, status: 'failed' });
    expect(calls.filter((number) => number === 2)).toHaveLength(1);
    // withTransientRetry's retries are ADDITIONAL to the initial attempt.
    expect(calls.filter((number) => number === 3)).toHaveLength(3 * (3 + 1));
    expect(await outcomes(ctx, id)).toMatchObject([{ rowNumber: 2, outcome: 'created' }]);
    expect(await ctx.prisma.entry.count()).toBe(1);
    expect(ctx.logs).toContainEqual(expect.objectContaining({ level: 'warn', event: 'import_batch_attempt_failed', batch_id: id }));
  });

  it('B2#35/B2E12: a crash after K rows propagates; a fresh lease skips them and matches an uninterrupted run', async () => {
    const ctx = apps[0];
    const bytes = csv(['bank/banks,noun,A1,ngân hàng,One.', 'walk,verb,A1,đi bộ,Two.', 'eat,verb,A1,ăn,Three.']);
    const id = await batch(ctx, bytes);
    const handler = ctx.app.get(ImportBatchHandler);
    const processor = ctx.app.get(ImportRowProcessor);
    const original = processor.process.bind(processor);
    const crash = new Error('Injected crash after K=1');
    const spy = vi.spyOn(processor, 'process').mockImplementation(async (context, upload, row) => {
      if (row.rowNumber === 3) throw crash;
      return original(context, upload, row);
    });
    const first = await acquire(ctx, id);
    await expect(handler.run(first)).rejects.toBe(crash);
    expect(await outcomes(ctx, id)).toMatchObject([{ rowNumber: 2, outcome: 'created' }]);
    const settled = await snapshot(ctx);
    expect(await ctx.app.get(BackgroundJobsService).release(id, first.epoch)).toBe(true);
    spy.mockImplementation(original);
    spy.mockClear();
    const second = await acquire(ctx, id);
    expect(second.epoch).toBeGreaterThan(first.epoch);
    expect(await handler.run(second)).toBe('succeeded');
    expect(spy.mock.calls.map((call) => call[2].rowNumber)).toEqual([3, 4]);
    const resumed = await snapshot(ctx);
    expect(resumed.entries).toEqual(expect.arrayContaining(settled.entries));
    expect(resumed.records).toEqual(expect.arrayContaining(settled.records));
    const counts = (await stored(ctx, id)).counters;
    const referenceSizes = Object.fromEntries(Object.entries(resumed).map(([key, values]) => [key, values.length]));
    await ctx.prisma.backgroundJob.deleteMany();
    await resetCatalog(ctx.prisma);
    const uninterrupted = await batch(ctx, bytes);
    expect(await handler.run(await acquire(ctx, uninterrupted))).toBe('succeeded');
    expect((await stored(ctx, uninterrupted)).counters).toEqual(counts);
    expect(Object.fromEntries(Object.entries(await snapshot(ctx)).map(([key, values]) => [key, values.length])))
      .toEqual(referenceSizes);
  });

  it('B2#35/B2#25: retry duplicate detection still sees an earlier finished row', async () => {
    const ctx = apps[0];
    const id = await batch(ctx, csv(['bank,noun,A1,first,One.', 'bank,noun,A1,second,Two.']));
    const context = await acquire(ctx, id);
    const normalized = normalizeRow(2, { headword: 'bank', pos: 'noun', cefr: 'A1', gloss_vi: 'first', definition_en: 'One.' },
      { hasLevelColumn: true });
    if (!normalized.ok) throw new Error('Invalid fixture');
    await ctx.app.get(ImportRowProcessor).process(context, { id, levelSourceId: OWNER_SOURCE_ID }, normalized.row);
    await ctx.app.get(BackgroundJobsService).release(id, context.epoch);
    expect(await ctx.app.get(ImportBatchHandler).run(await acquire(ctx, id))).toBe('partial');
    expect(await outcomes(ctx, id)).toMatchObject([
      { rowNumber: 2, outcome: 'created' }, { rowNumber: 3, outcome: 'rejected', errorCodes: ['duplicate-key-in-file'] },
    ]);
    expect(await ctx.prisma.senseRevision.count()).toBe(1);
  });

  it('B2#39/Review Focus 3: two real workers serialize same-source uploads and create only one record per key', async () => {
    const queuePrefix = `import-two-workers-${randomUUID()}`;
    const firstApp = await start({ queuePrefix });
    const secondApp = await start({ queuePrefix });
    const held = barrier();
    let reached = false;
    let secondSawStatus: string | undefined;
    let secondSawFirstOutcomes = 0;
    const first = await batch(firstApp);
    const second = await batch(firstApp); // Same bytes, distinct batch/idempotency identities.
    for (const ctx of [firstApp, secondApp]) {
      const processor = ctx.app.get(ImportRowProcessor);
      const original = processor.process.bind(processor);
      vi.spyOn(processor, 'process').mockImplementation(async (context, upload, row) => {
        if (upload.id === first && row.rowNumber === 3) { reached = true; await held.promise; }
        if (upload.id === second && secondSawStatus === undefined) {
          secondSawStatus = (await job(ctx, first))?.status;
          secondSawFirstOutcomes = await ctx.prisma.importRowOutcome.count({ where: { batchId: first } });
        }
        return original(context, upload, row);
      });
    }
    try {
      await enqueue(firstApp, first);
      await expect.poll(() => reached, polling).toBe(true);
      await enqueue(secondApp, second);
      await expect.poll(() => rawQueue(secondApp).getJob(second), polling).toBeUndefined();
      expect(await job(firstApp, second)).toMatchObject({ status: 'queued', attempts: 0 });
      expect(await outcomes(firstApp, second)).toEqual([]);
      expect(await job(firstApp, first)).toMatchObject({ status: 'running' });
      held.release();
      await finish(firstApp, first);
      await firstApp.app.get(JobReconcilerService).runOnce();
      await finish(secondApp, second);
      expect(secondSawStatus).toBe('succeeded');
      expect(secondSawFirstOutcomes).toBe(2);
      expect(await ctxCounts(firstApp)).toEqual({ entries: 2, levels: 2, senses: 2, revisions: 2 });
      expect(await outcomes(firstApp, second)).toMatchObject([{ outcome: 'unchanged' }, { outcome: 'unchanged' }]);
    } finally { held.release(); }
  });

  it.each([false, true])('B2#25/B2#10 (duplicates): the second identical key is rejected even when content differs, identical=%s', async (identical) => {
    const ctx = await start();
    const bytes = csv(['bank,noun,A1,first,One.', identical ? 'bank,noun,A1,first,One.' : 'bank,noun,A1,second,Two.']);
    const parsed = parseUploadFile(bytes, { maxRows: 100, maxBytes: 10_240 });
    const rows = parsed.rows.map((row) => {
      const cells = Object.fromEntries(parsed.headers.map((header, index) => [header, row.cells[index]]));
      const normalized = normalizeRow(row.rowNumber, cells, { hasLevelColumn: true });
      if (!normalized.ok) throw new Error('Invalid fixture');
      return { normalized: normalized.row, raw: row.cells };
    });
    for (const run of [1, 2]) {
      const id = await batch(ctx, bytes);
      const filtered = await prefilterRows(ctx.prisma, rows, { batchId: id, levelSourceId: OWNER_SOURCE_ID,
        fileSha256: createHash('sha256').update(bytes).digest('hex') });
      expect(filtered.duplicateRows).toMatchObject([{ row: { normalized: { rowNumber: 3 } },
        errors: [{ code: 'duplicate-key-in-file', message: expect.stringContaining('2') }] }]);
      await enqueue(ctx, id);
      expect((await finish(ctx, id, 'partial')).counters).toMatchObject({ processed: 2, rejected: 1,
        created: run === 1 ? 1 : 0, unchanged: run === 1 ? 0 : 1 });
      expect(await outcomes(ctx, id)).toMatchObject([{ outcome: run === 1 ? 'created' : 'unchanged' },
        { outcome: 'rejected', errorCodes: ['duplicate-key-in-file'], raw: parsed.rows[1].cells }]);
      expect(await ctxCounts(ctx)).toEqual({ entries: 1, levels: 1, senses: 1, revisions: 1 });
    }
  });

  it('B2#68: captured completion logs carry the job operation id, counts and duration without any sentinel cell', async () => {
    const ctx = await start();
    const sentinel = `private-cell-${randomUUID()}`;
    const operationId = randomUUID();
    const id = await batch(ctx, csv([`bank,noun,A1,${sentinel},Definition.`, `bad,${sentinel},A1,gloss,Definition.`]), { operationId });
    await enqueue(ctx, id);
    await finish(ctx, id, 'partial');
    expect(ctx.logs).toContainEqual(expect.objectContaining({ level: 'info', event: 'import_batch_finished',
      operation_id: operationId, batch_id: id, counts: expect.objectContaining({ processed: 2, rejected: 1 }),
      duration_ms: expect.any(Number) }));
    expect(JSON.stringify(ctx.logs)).not.toContain(sentinel);
  });

  it('B2E24: every row rejected finishes partial with all processed rows counted and no created records', async () => {
    const ctx = await start();
    const id = await batch(ctx, csv(['bank,nuon,A1,one,One.', 'walk,vern,A1,two,Two.']));
    await enqueue(ctx, id);
    expect((await finish(ctx, id, 'partial')).counters).toEqual({ processed: 2, created: 0, updated: 0, unchanged: 0, rejected: 2,
      entries_created: 0, variants_created: 0, levels_created: 0, senses_created: 0, revisions_created: 0 });
    expect(await ctxCounts(ctx)).toEqual({ entries: 0, levels: 0, senses: 0, revisions: 0 });
  });

  it('B2E29/B2E25: in-flight drafts stay invisible and demoting/revoking the uploader does not stop processing', async () => {
    const ctx = await start();
    const published = await batch(ctx, csv(['visible,noun,A1,live,A live sense.']));
    await enqueue(ctx, published);
    await finish(ctx, published);
    const liveRevision = await ctx.prisma.senseRevision.findFirstOrThrow();
    await ctx.prisma.senseRevision.update({ where: { id: liveRevision.id }, data: { status: 'published', publishedAt: ctx.clock.now() } });
    await ctx.prisma.sense.update({ where: { id: liveRevision.senseId }, data: { liveRevisionId: liveRevision.id } });
    const publishedBefore = await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: liveRevision.id } });
    const actor = await ctx.prisma.user.create({ data: { email: `${randomUUID()}@example.test`, timezone: 'Asia/Saigon', staffRole: 'editor' } });
    const session = await ctx.prisma.sessionChain.create({ data: { userId: actor.id, clientType: 'web', lastUsedAt: ctx.clock.now() } });
    const held = barrier();
    let reached = false;
    const processor = ctx.app.get(ImportRowProcessor);
    const original = processor.process.bind(processor);
    vi.spyOn(processor, 'process').mockImplementation(async (context, upload, row) => {
      if (row.rowNumber === 3) { reached = true; await held.promise; }
      return original(context, upload, row);
    });
    const id = await batch(ctx, valid, { actorId: actor.id });
    try {
      await enqueue(ctx, id);
      await expect.poll(() => reached, polling).toBe(true);
      expect(await job(ctx, id)).toMatchObject({ status: 'running', createdBy: actor.id });
      expect(await ctx.prisma.senseRevision.count({ where: { status: 'draft', draftSource: 'csv' } })).toBe(1);
      // The exact learner visibility predicate, queried while row 2 is committed and row 3 is held.
      expect(await ctx.prisma.sense.findMany({ where: { state: 'open', liveRevisionId: { not: null } }, select: { id: true } }))
        .toEqual([{ id: liveRevision.senseId }]);
      await ctx.prisma.user.update({ where: { id: actor.id }, data: { staffRole: null } });
      await ctx.prisma.sessionChain.update({ where: { id: session.id }, data: { revokedAt: ctx.clock.now(), revokeReason: 'test' } });
      held.release();
      await finish(ctx, id);
      expect(await ctx.prisma.senseRevision.findMany({ where: { createdBy: actor.id } })).toEqual([
        expect.objectContaining({ createdBy: actor.id }), expect.objectContaining({ createdBy: actor.id }),
      ]);
      expect(await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: liveRevision.id } })).toEqual(publishedBefore);
    } finally { held.release(); }
  });

  it('B2E16: purged queued file finishes failed immediately; BullMQ drains and reconciliation never re-enqueues it', async () => {
    const ctx = await start({ jobAttempts: 3 });
    const id = await batch(ctx);
    await ctx.prisma.importBatchFile.delete({ where: { batchId: id } });
    await enqueue(ctx, id);
    await finish(ctx, id, 'failed');
    expect(await job(ctx, id)).toMatchObject({ status: 'failed', attempts: 1, errorSummary: expect.stringContaining('file-purged') });
    const before = await job(ctx, id);
    ctx.clock.advance(60_000);
    for (const _ of [1, 2]) {
      expect(await ctx.app.get(JobReconcilerService).runOnce()).toEqual({ requeued: 0, failed: 0 });
      expect(await job(ctx, id)).toEqual(before);
      expect(await rawQueue(ctx).getJob(id)).toBeUndefined();
    }
    expect(await outcomes(ctx, id)).toEqual([]);
  });

  it('B2E16 (retention): cleanup uses upload age and removes only old bytes, retaining batch counters and reports', async () => {
    const ctx = apps[0];
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
    expect(ctx.app.get(MaintenanceScheduler).jobNames()).toContain('import-file-cleanup');
    const old = await batch(ctx);
    await ctx.prisma.importBatch.update({ where: { id: old }, data: { counters: { processed: 1, rejected: 1 } } });
    await ctx.prisma.importRowOutcome.create({ data: { batchId: old, rowNumber: 2, outcome: 'rejected', errorCodes: ['invalid-pos'], raw: ['bank', 'nuon'] } });
    // A recent finish must not extend the lifetime of old uploaded bytes.
    ctx.clock.advance(30 * 86_400_000);
    await ctx.prisma.backgroundJob.update({ where: { id: old }, data: { status: 'failed', finishedAt: ctx.clock.now() } });
    const young = await batch(ctx);
    const oldBefore = await stored(ctx, old);
    const reportBefore = await outcomes(ctx, old);
    const youngBefore = await ctx.prisma.importBatchFile.findUniqueOrThrow({ where: { batchId: young } });
    const config = ctx.app.get<AppConfig>(APP_CONFIG);
    const cleanup = new ImportFileCleanupService(ctx.prisma, { ...config, pipeline: { ...config.pipeline, fileRetentionDays: 30 } },
      ctx.clock, ctx.app.get(MaintenanceScheduler));
    expect(await cleanup.runOnce()).toEqual({ files: 0 }); // Strictly older than the window.
    ctx.clock.advance(1);
    expect(await cleanup.runOnce()).toEqual({ files: 1 });
    expect(await ctx.prisma.importBatchFile.findUnique({ where: { batchId: old } })).toBeNull();
    expect(await stored(ctx, old)).toEqual(oldBefore);
    expect(await outcomes(ctx, old)).toEqual(reportBefore);
    expect(await ctx.prisma.importBatchFile.findUnique({ where: { batchId: young } })).toEqual(youngBefore);
  });
});

async function ctxCounts(ctx: TestApp) {
  return { entries: await ctx.prisma.entry.count(), levels: await ctx.prisma.entryLevel.count(),
    senses: await ctx.prisma.sense.count(), revisions: await ctx.prisma.senseRevision.count() };
}
