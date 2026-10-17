import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, type RevisionContent } from '../../src/content/index.js';
import { ImportBatchHandler } from '../../src/content-pipeline/import/import-batch.handler.js';
import { BackgroundJobsService, makeJobContext } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { classifyColumns } from '../../src/content-pipeline/upload/columns.js';
import { parseUploadFile } from '../../src/content-pipeline/upload/csv-file.js';
import { toCsv } from '../../src/content-pipeline/upload/csv-writer.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const endpoint = '/v1/admin/content/entries/export';
const headers = [
  'headword', 'pos', 'gloss_vi', 'definition_en', 'example_en_1', 'example_en_2', 'example_en_3',
  'topics', 'accepted_forms', 'context_label', '_level',
];
const full: RevisionContent = {
  glossVi: 'ngân hàng', definitionEn: null, examplesEn: ['I visited the bank.'], topicCodes: [], acceptedForms: [],
};
const limits = { maxRows: 20_000, maxBytes: 10_000_000 };
const exportMaxRows = 6;
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;

describe('export of entries without a sense (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let token: string;
  let sourceId: string;
  const get = (query: object) => ctx.http().get(endpoint).set('Authorization', `Bearer ${token}`).query(query);
  const exportFile = async (query: object) => {
    const response = await get(query).buffer(true).parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => done(null, Buffer.concat(chunks)));
      res.on('error', done);
    });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toBe('attachment; filename="entries-without-sense.csv"');
    const bytes = response.body as Buffer;
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    return bytes;
  };
  const rowsOf = (bytes: Buffer) => {
    const parsed = parseUploadFile(bytes, limits);
    return { parsed, rows: parsed.rows.map((row) => Object.fromEntries(
      parsed.headers.map((header, index) => [header, row.cells[index]]))) };
  };
  // Same real handler/lease flow as export.e2e-spec.ts; only queue scheduling is bypassed.
  const importFile = async (bytes: Buffer, levelSourceId: string | null) => {
    const parsed = parseUploadFile(bytes, limits);
    const jobs = ctx.app.get(BackgroundJobsService);
    const id = await ctx.prisma.$transaction(async (tx) => {
      const batchId = await jobs.create(tx, { queue: 'content-import', createdBy: actorId, operationId: randomUUID(),
        ...(levelSourceId ? { exclusiveKey: `content-import:${levelSourceId}` } : {}) });
      await tx.importBatch.create({ data: {
        id: batchId, levelSourceId, fileName: 'entries.csv', fileSha256: createHash('sha256').update(bytes).digest('hex'),
        fileSize: bytes.length, rowCount: parsed.rows.length, rawHeaders: parsed.rawHeaders,
        warnings: classifyColumns(parsed.headers).problems, counters: {},
      } });
      await tx.importBatchFile.create({ data: { batchId, content: Buffer.from(bytes) } });
      return batchId;
    });
    const lease = await jobs.acquire(id, randomUUID());
    const job = makeJobContext(ctx.prisma, id, lease!.attempts, lease!.epoch);
    const status = await ctx.app.get(ImportBatchHandler).run(job);
    expect(status).toBe('succeeded');
    expect(await jobs.finish(id, job.epoch, status)).toBe(true);
    return id;
  };
  // A CEFR-J shaped, level-only sample: entries and levels, no senses.
  const importLevels = (rows: string[]) =>
    importFile(Buffer.from(toCsv(['headword', 'pos', 'CEFR'], rows.map((row) => row.split(',')))), sourceId);
  const addSense = async (lemma: string, pos: string) => {
    const entry = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma, pos } });
    return ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, pos);
      return content.createSense(tx, { entryId: entry.id, contextLabel: null, content: full, source: 'ui', actorId });
    });
  };

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config,
      pipeline: { runWorkers: false, exportMaxRows, importMaxRows: limits.maxRows, importMaxBytes: limits.maxBytes } });
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
    sourceId = (await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: `CEFR-J ${randomUUID()}`, version: '1.5', displayPriority: 10, license: 'fixture', attribution: 'fixture',
    } })).id;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B3#15: after importing a level-only CEFR-J sample, the export lists exactly the entries without a sense, one row each with _level and empty content cells', async () => {
    await importLevels(['bank,noun,A1', 'deploy,verb,B1', 'happy,adjective,A1', 'retired,adjective,B2']);
    await addSense('bank', 'noun');
    const retired = await addSense('retired', 'adjective');
    await content.retire([retired.senseId]);
    const { parsed, rows } = rowsOf(await exportFile({ has_sense: 'false' }));
    expect(parsed.headers).toEqual(headers);
    expect(rows).toEqual([
      { headword: 'deploy', pos: 'verb', gloss_vi: '', definition_en: '', example_en_1: '', example_en_2: '', example_en_3: '',
        topics: '', accepted_forms: '', context_label: '', _level: 'B1' },
      { headword: 'happy', pos: 'adjective', gloss_vi: '', definition_en: '', example_en_1: '', example_en_2: '', example_en_3: '',
        topics: '', accepted_forms: '', context_label: '', _level: 'A1' },
      { headword: 'retired', pos: 'adjective', gloss_vi: '', definition_en: '', example_en_1: '', example_en_2: '', example_en_3: '',
        topics: '', accepted_forms: '', context_label: '', _level: 'B2' },
    ]);
  });

  it('B3#15 (round trip): filling gloss_vi and example_en_1 in that file and uploading it without a level source creates one draft sense per filled row and leaves empty rows unchanged', async () => {
    await importLevels(['deploy,verb,B1', 'happy,adjective,A1', 'quiet,adjective,A2']);
    const { parsed } = rowsOf(await exportFile({ has_sense: 'false' }));
    const filled = parsed.rows.map(({ cells }) => {
      const row = Object.fromEntries(parsed.headers.map((header, index) => [header, cells[index]]));
      if (row.headword === 'quiet') return cells;
      return parsed.headers.map((header) => header === 'gloss_vi' ? `nghĩa ${row.headword}`
        : header === 'example_en_1' ? `An example of ${row.headword}.` : row[header]);
    });
    const id = await importFile(Buffer.from(toCsv(parsed.headers, filled)), null);
    expect(await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id } })).toMatchObject({
      counters: expect.objectContaining({ processed: 3, rejected: 0, revisions_created: 2 }) });
    const senses = await ctx.prisma.sense.findMany({ include: { entry: true, revisions: { include: { texts: true } } } });
    expect(senses.map(({ entry }) => entry.lemma).sort()).toEqual(['deploy', 'happy']);
    for (const sense of senses) {
      expect(sense.liveRevisionId).toBeNull();
      expect(sense.revisions).toEqual([expect.objectContaining({ revisionNo: 1, status: 'draft',
        examples: [`An example of ${sense.entry.lemma}.`],
        texts: [expect.objectContaining({ language: 'vi', kind: 'gloss', text: `nghĩa ${sense.entry.lemma}` })] })]);
    }
    expect(await ctx.prisma.entryLevel.count({ where: { sourceId } })).toBe(3);
    expect(rowsOf(await exportFile({ has_sense: 'false' })).rows.map((row) => row.headword)).toEqual(['quiet']);
  });

  it('level=A1 limits the rows', async () => {
    await importLevels(['deploy,verb,B1', 'happy,adjective,A1', 'apple,noun,A1']);
    expect(rowsOf(await exportFile({ has_sense: 'false', level: 'A1' })).rows.map((row) => row.headword)).toEqual(['apple', 'happy']);
  });

  it('more rows than exportMaxRows → 400 export-too-large and nothing streamed', async () => {
    await importLevels(Array.from({ length: exportMaxRows + 1 }, (_, index) => `word${index},noun,A1`));
    const res = await get({ has_sense: 'false' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.headers['content-disposition']).toBeUndefined();
    expect(res.body).toMatchObject({ status: 400, type: problem('export-too-large') });
    expect(JSON.parse(res.text)).toEqual(res.body);
    await ctx.prisma.entry.delete({ where: { id: (await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'word0' } })).id } });
    expect(rowsOf(await exportFile({ has_sense: 'false' })).rows).toHaveLength(exportMaxRows);
  });

  it('has_sense=true or missing → 400 validation-failed', async () => {
    for (const query of [{ has_sense: 'true' }, {}, { has_sense: 'false', extra: '1' }]) {
      const res = await get(query);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('validation-failed'));
    }
  });

  it('requires content.edit', async () => {
    const learner = (await seedUser(ctx.prisma, { nativeLanguage: 'vi', verified: true })).userId;
    const res = await ctx.http().get(endpoint).set('Authorization', `Bearer ${(await startSession(ctx, learner)).accessToken}`)
      .query({ has_sense: 'false' });
    expect(res.status).toBe(403);
  });
});
