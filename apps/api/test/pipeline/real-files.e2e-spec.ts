import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

const endpoint = '/v1/admin/content/uploads';
const evidenceDirectory = new URL('../../../../docs/preparation/evidence/wordlists_2026-10-02/', import.meta.url);
const cefrFileName = 'cefrj-vocabulary-profile-1.5.csv';
const octanoveFileName = 'octanove-vocabulary-profile-c1c2-1.0.csv';
type BatchReport = { id: string; status: string; counters: Record<string, number> };

describe('real files, M2 gate (e2e, real worker and isolated database)', () => {
  let ctx: TestApp;
  let databaseName: string;
  let editorToken: string;
  let rawQueue: Queue;
  let connection: Redis;

  const committedTransactions = async () => {
    const [stats] = await ctx.prisma.$queryRaw<Array<{ xact_commit: bigint }>>`
      SELECT xact_commit FROM pg_stat_database WHERE datname = ${databaseName}
    `;
    if (!stats) throw new Error(`Missing transaction statistics for isolated database ${databaseName}`);
    return stats.xact_commit;
  };

  const importFile = async (fileName: string, sourceId: string, timeoutMs: number, measure = false) => {
    const bytes = readFileSync(new URL(fileName, evidenceDirectory));
    let peakRss = process.memoryUsage().rss;
    const sampleRss = () => { peakRss = Math.max(peakRss, process.memoryUsage().rss); };
    // Database-wide committed transactions include HTTP polling and framework overhead;
    // this is the plan's illustrative proxy, not an instrumented row-processor counter.
    const transactionsBefore = measure ? await committedTransactions() : 0n;
    const accepted = await ctx.http().post(endpoint).set('Authorization', `Bearer ${editorToken}`)
      .set('Idempotency-Key', randomUUID()).field('level_source_id', sourceId)
      .attach('file', bytes, { filename: fileName, contentType: 'text/csv' });
    // The test app uses FakeClock, so measure elapsed wall time independently of job dates.
    const acceptedAt = performance.now();
    sampleRss();
    expect(accepted.status).toBe(202);
    expect(accepted.body).toEqual({ batch_id: expect.any(String), status: 'queued' });
    const id = accepted.body.batch_id as string;
    let report!: BatchReport;
    // Each import gets its own fresh budget (not a shared running-total deadline): under full
    // e2e-suite contention, a slow first import must not starve the next import's own poll.
    await expect.poll(async () => {
      const response = await ctx.http().get(`${endpoint}/${id}`).set('Authorization', `Bearer ${editorToken}`);
      expect(response.status).toBe(200);
      report = response.body as BatchReport;
      sampleRss();
      return ['succeeded', 'partial', 'failed'].includes(report.status);
    }, { timeout: timeoutMs, interval: 250 }).toBe(true);
    const finishedAt = performance.now();
    if (measure) {
      const transactionsAfter = await committedTransactions();
      // RSS is the highest observed sample at upload and each status poll, not an exact peak.
      console.log(JSON.stringify({ durationMs: finishedAt - acceptedAt,
        rowTransactionsStarted: Number(transactionsAfter - transactionsBefore), peakRssMb: peakRss / (1024 * 1024) }));
    }
    expect(report.id).toBe(id);
    return report;
  };

  beforeAll(async () => {
    const databaseUrl = await createIsolatedDatabase();
    databaseName = new URL(databaseUrl).pathname.slice(1);
    ctx = await createTestApp({ databaseUrl, redisUrl: inject('redisUrl'), pipeline: {
      runWorkers: true, importMaxRows: 20_000, importMaxBytes: 10_000_000,
      leaseSeconds: 60, heartbeatSeconds: 20, reconcileSeconds: 60,
    } });
    const config = ctx.app.get<AppConfig>(APP_CONFIG);
    connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
    rawQueue = new Queue('content-import', { connection, prefix: config.pipeline.queuePrefix });
    const editor = await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' });
    editorToken = (await startSession(ctx, editor.userId)).accessToken;
  });

  afterAll(async () => {
    const failures: unknown[] = [];
    try { await ctx?.close(); } catch (error) { failures.push(error); }
    if (rawQueue) {
      try { await rawQueue.obliterate({ force: true }); } catch (error) { failures.push(error); }
      try { await rawQueue.close(); } catch (error) { failures.push(error); }
    }
    connection?.disconnect();
    if (failures.length) throw new AggregateError(failures, 'Real-files test cleanup failed');
  });

  it([
    'B2#70: importing the real CEFR-J 1.5 file then the real Octanove 1.0 file gives 9,776 entries, 9,894 level records (7,799 and 2,095), 279 function-word entries, 117 entries with more than one distinct level, 207 entries carrying 215 variants, and exactly 2 rejected rows with _row 606 and 2129',
    'B2#10 (real): importing the CEFR-J file again reports 7,799 unchanged and creates nothing',
    'B2#71 (measure): print { durationMs, rowTransactionsStarted, peakRssMb } for the CEFR-J import and for the re-import to stdout',
  ].join('; '), async () => {
    // Each import gets its own poll budget rather than one running-total deadline: under full
    // e2e-suite contention a slow first import must not starve a later import's own poll. 5 min
    // is measured, not guessed: a full-suite run on 13/10/2026 logged durationMs=259701 (~260s)
    // for the CEFR-J import alone (see rowTransactionsStarted/peakRssMb alongside it, printed
    // below), so 150s was not enough margin. Bumped again the same day once revert.e2e-spec.ts
    // (Task 21) added its own real CEFR-J import+revert scenario, which now runs concurrently
    // with this test in the full e2e suite and measurably timed out the Octanove import at 300s.
    const importTimeoutMs = 480_000;
    const cefrSource = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: 'CEFR-J', version: '1.5', displayPriority: 10, license: 'test license',
    } });
    const octanoveSource = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: 'Octanove', version: '1.0', displayPriority: 20, license: 'test license',
    } });

    const cefrBatch = await importFile(cefrFileName, cefrSource.id, importTimeoutMs, true);
    expect(cefrBatch.status).toBe('succeeded');
    const octanoveBatch = await importFile(octanoveFileName, octanoveSource.id, importTimeoutMs);
    expect(octanoveBatch.status).toBe('partial');

    expect(await ctx.prisma.entry.count()).toBe(9_776);
    expect(await ctx.prisma.entryLevel.count()).toBe(9_894);
    // ImportBatchHandler.saveReport derives levels_created from these same durable records.
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: cefrBatch.id, recordType: 'level' } })).toBe(7_799);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: octanoveBatch.id, recordType: 'level' } })).toBe(2_095);
    expect(await ctx.prisma.entry.count({ where: { functionWordDerived: true } })).toBe(279);

    // Count distinct CEFR values, so two sources assigning the same level would count only once.
    const [{ count: multiLevelEntries }] = await ctx.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM (
        SELECT entry_id FROM entry_levels GROUP BY entry_id HAVING COUNT(DISTINCT level) > 1
      ) AS multi_level_entries
    `;
    expect(Number(multiLevelEntries)).toBe(117);
    const variantsByEntry = await ctx.prisma.entryVariant.groupBy({ by: ['entryId'], _count: { _all: true } });
    expect(variantsByEntry).toHaveLength(207);
    expect(variantsByEntry.reduce((total, entry) => total + entry._count._all, 0)).toBe(215);
    const rejectedRows = await ctx.prisma.importRowOutcome.findMany({ where: { outcome: 'rejected' },
      select: { batchId: true, rowNumber: true }, orderBy: { rowNumber: 'asc' } });
    expect(rejectedRows).toEqual([
      { batchId: octanoveBatch.id, rowNumber: 606 },
      { batchId: octanoveBatch.id, rowNumber: 2129 },
    ]);

    const reimportBatch = await importFile(cefrFileName, cefrSource.id, importTimeoutMs, true);
    expect(reimportBatch.id).not.toBe(cefrBatch.id);
    expect(reimportBatch.status).toBe('succeeded');
    expect(reimportBatch.counters).toEqual({
      processed: 7_799, created: 0, updated: 0, unchanged: 7_799, rejected: 0,
      entries_created: 0, variants_created: 0, levels_created: 0, senses_created: 0, revisions_created: 0,
    });
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: reimportBatch.id } })).toBe(0);
    // 30 min, not the plan's 5: full-suite runs on 13/10/2026 showed the shared 290s budget
    // starving the Octanove import after a slow CEFR-J import under full e2e-suite contention
    // (43 files' worth of Testcontainers Postgres plus other local projects' own Docker stacks
    // competing for the same host, now including revert.e2e-spec.ts's own concurrent real CEFR-J
    // import+revert); importTimeoutMs is 8 min per import for that reason, so the outer ceiling
    // needs headroom for three sequential imports at that size plus setup/assertions.
  }, 1_800_000);
});
