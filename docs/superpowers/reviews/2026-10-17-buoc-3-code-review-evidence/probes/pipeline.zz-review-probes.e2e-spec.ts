import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { InflectionsBackfillHandler } from '../../src/content-pipeline/inflections/inflections-backfill.handler.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, INFLECTION_KINDS, OWNER_SOURCE_ID, type InflectionKind, type RevisionContent } from '../../src/content/index.js';
import { ImportBatchHandler } from '../../src/content-pipeline/import/import-batch.handler.js';
import { BackgroundJobsService, makeJobContext } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { classifyColumns } from '../../src/content-pipeline/upload/columns.js';
import { parseUploadFile } from '../../src/content-pipeline/upload/csv-file.js';
import { toCsv } from '../../src/content-pipeline/upload/csv-writer.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const limits = { maxRows: 20_000, maxBytes: 10_000_000 };
const full: RevisionContent = {
  glossVi: 'đi', definitionEn: 'To move.', examplesEn: ['We go home.'], topicCodes: [], acceptedForms: [],
};
const goForms: Array<{ form: string; kind: InflectionKind }> = [
  { form: 'goes', kind: 'third_person' }, { form: 'going', kind: 'present_participle' },
  { form: 'goed', kind: 'past' }, { form: 'goed', kind: 'past_participle' },
];

describe('review probes (pipeline)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let token: string;

  const write = <T>(lemma: string, pos: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, pos);
      return action(tx);
    }, { timeout: 30_000, maxWait: 5_000 });
  const catalogWord = (lemma: string, pos: string, options: { level?: 'A1' | 'B1'; sense?: Partial<RevisionContent> } = {}) =>
    write(lemma, pos, async (tx) => {
      const { entry } = await content.ensureEntry(tx, { lemma, pos, variants: [] });
      if (options.level) await content.setEditorialLevel(tx, entry.id, options.level);
      const sense = options.sense
        ? await content.createSense(tx, { entryId: entry.id, contextLabel: null, content: options.sense, source: 'ui', actorId })
        : null;
      return { entryId: entry.id, senseId: sense?.senseId ?? null };
    });
  const forms = (entryId: string) => ctx.prisma.entryInflection.findMany({
    where: { entryId }, orderBy: [{ kind: 'asc' }, { form: 'asc' }], select: { form: true, kind: true, source: true } });
  const csv = (headers: string[], rows: string[][]) => Buffer.from(toCsv(headers, rows));
  const importFile = async (bytes: Buffer, levelSourceId: string | null = null) => {
    const parsed = parseUploadFile(bytes, limits);
    const jobs = ctx.app.get(BackgroundJobsService);
    const id = await ctx.prisma.$transaction(async (tx) => {
      const batchId = await jobs.create(tx, { queue: 'content-import', createdBy: actorId, operationId: randomUUID(),
        ...(levelSourceId ? { exclusiveKey: `content-import:${levelSourceId}` } : {}) });
      await tx.importBatch.create({ data: {
        id: batchId, levelSourceId, fileName: 'inflections.csv', fileSha256: createHash('sha256').update(bytes).digest('hex'),
        fileSize: bytes.length, rowCount: parsed.rows.length, rawHeaders: parsed.rawHeaders,
        warnings: classifyColumns(parsed.headers).problems, counters: {},
      } });
      await tx.importBatchFile.create({ data: { batchId, content: Buffer.from(bytes) } });
      return batchId;
    });
    const lease = await jobs.acquire(id, randomUUID());
    const job = makeJobContext(ctx.prisma, id, lease!.attempts, lease!.epoch);
    const status = await ctx.app.get(ImportBatchHandler).run(job);
    expect(await jobs.finish(id, job.epoch, status)).toBe(true);
    return { id, status, outcomes: await ctx.prisma.importRowOutcome.findMany({ where: { batchId: id }, orderBy: { rowNumber: 'asc' } }) };
  };
  const exportFile = async (path: string, query: object) => {
    const response = await ctx.http().get(path).set('Authorization', `Bearer ${token}`).query(query).buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(response.status).toBe(200);
    const bytes = response.body as Buffer;
    const parsed = parseUploadFile(bytes, limits);
    return { bytes, headers: parsed.headers,
      rows: parsed.rows.map((row) => Object.fromEntries(parsed.headers.map((header, index) => [header, row.cells[index]]))) };
  };

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config,
      pipeline: { runWorkers: false, exportMaxRows: 5_000, importMaxRows: limits.maxRows, importMaxBytes: limits.maxBytes } });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await ctx.prisma.backgroundJob.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-17T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    token = (await startSession(ctx, actorId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  const out = (...a: unknown[]) => appendFileSync(process.env.PROBE_OUT ?? 'probe.out', a.join(' ') + '\n');
  const backfill = async () => {
    const jobs = ctx.app.get(BackgroundJobsService);
    const id = await ctx.prisma.$transaction((tx) => jobs.create(tx, {
      queue: 'content-inflections', createdBy: actorId, operationId: randomUUID(), exclusiveKey: 'content-inflections' }));
    const lease = await jobs.acquire(id, randomUUID());
    const job = makeJobContext(ctx.prisma, id, lease!.attempts, lease!.epoch);
    const status = await ctx.app.get(InflectionsBackfillHandler).run(job);
    await jobs.finish(id, job.epoch, status);
    return status;
  };

  it('F1: re-uploading an earlier identical file after a later one changed the reviewed forms', async () => {
    const go = await catalogWord('go', 'verb');
    const fa = csv(['headword', 'pos', 'inflections'], [['go', 'verb', 'past:went']]);
    const a1 = await importFile(fa);
    const b = await importFile(csv(['headword', 'pos', 'inflections'], [['go', 'verb', 'past:goed']]));
    const afterB = await forms(go.entryId);
    const a2 = await importFile(fa);
    out('F1 outcomes', a1.outcomes.map((o) => o.outcome).join(), b.outcomes.map((o) => o.outcome).join(), a2.outcomes.map((o) => o.outcome).join(),
      '| after B', JSON.stringify(afterB), '| after A again', JSON.stringify(await forms(go.entryId)));
  });

  it('F2: "-" for no forms, ";" clears, then backfill', async () => {
    const pork = await catalogWord('pork', 'noun');
    await backfill();
    const lib = await forms(pork.entryId);
    const dash = await importFile(csv(['headword', 'pos', 'inflections'], [['pork', 'noun', '-']]));
    const semi = await importFile(csv(['headword', 'pos', 'inflections'], [['pork', 'noun', ';']]));
    const cleared = await forms(pork.entryId);
    await backfill();
    out('F2 library', JSON.stringify(lib), '| "-" outcome', dash.outcomes[0]?.outcome, JSON.stringify(dash.outcomes[0]?.messages ?? dash.outcomes[0]),
      '| ";" outcome', semi.outcomes[0]?.outcome, 'forms', JSON.stringify(cleared), '| after backfill', JSON.stringify(await forms(pork.entryId)));
  });

  it('F3: confirming a derived level as editorial keeps basis derived', async () => {
    await catalogWord('go', 'verb', { level: 'A1' });
    await importFile(csv(['headword', 'pos', 'gloss_vi', 'example_en_1', 'form_of'], [['went', 'verb', 'đã đi', 'We went home.', 'go/verb:past']]));
    const went = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'went', scope: 'catalog' } });
    const before = await ctx.prisma.entryLevel.findMany({ where: { entryId: went.id }, select: { level: true, basis: true } });
    await ctx.prisma.$transaction((tx) => content.setEditorialLevel(tx, went.id, 'A1'));
    const after = await ctx.prisma.entryLevel.findMany({ where: { entryId: went.id }, select: { level: true, basis: true } });
    out('F3 before', JSON.stringify(before), 'after editorial A1', JSON.stringify(after));
  });

  it('F4: form_of "-" on an entry without a sense', async () => {
    await catalogWord('quiet', 'adjective', { level: 'A1' });
    const r = await importFile(csv(['headword', 'pos', 'gloss_vi', 'form_of'], [['quiet', 'adjective', '', '-']]));
    out('F4 outcome', r.outcomes[0]?.outcome, 'senses', await ctx.prisma.sense.count(), 'revisions', await ctx.prisma.senseRevision.count());
  });
});
