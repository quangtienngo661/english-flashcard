import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, contentHash, splitHeadword, type RevisionContent } from '../../src/content/index.js';
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

const endpoint = '/v1/admin/content/senses/export';
const headers = [
  'headword', 'pos', 'gloss_vi', 'definition_en', 'example_en_1', 'example_en_2', 'example_en_3',
  'topics', 'accepted_forms', 'context_label', 'sense_id', 'revision', '_status', '_level',
];
const full: RevisionContent = {
  glossVi: 'phân tích', definitionEn: 'Study something in detail.',
  examplesEn: ['We analyze the data.', 'Analyze this.', 'They analyze results.'],
  topicCodes: ['business', 'technology'], acceptedForms: ['analyzes', 'analyzed'],
};
const empty: RevisionContent = { glossVi: null, definitionEn: null, examplesEn: [], topicCodes: [], acceptedForms: [] };
const limits = { maxRows: 20_000, maxBytes: 10_000_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;

describe('sense export and batch scope (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let token: string;
  const write = <T>(lemma: string, pos: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, pos);
      return action(tx);
    }, { timeout: 30_000, maxWait: 5_000 });
  const create = async (headword: string, patch: Partial<RevisionContent> = full, options: {
    pos?: string; level?: 'A1' | 'B1'; contextLabel?: string;
  } = {}) => {
    const input = { ...splitHeadword(headword), pos: options.pos ?? 'verb' };
    return write(input.lemma, input.pos, async (tx) => {
      const { entry } = await content.ensureEntry(tx, input);
      if (options.level) await content.setEditorialLevel(tx, entry.id, options.level);
      const sense = await content.createSense(tx, { entryId: entry.id, contextLabel: options.contextLabel ?? null,
        content: patch, source: 'ui', actorId });
      return { entry, ...sense };
    });
  };
  const snapshot = () => Promise.all([
    ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.entryVariant.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.entryLevel.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.sense.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.senseRevision.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.senseRevisionText.findMany({ orderBy: [{ revisionId: 'asc' }, { language: 'asc' }, { kind: 'asc' }] }),
  ]);
  const readSense = (id: string) => ctx.prisma.sense.findUniqueOrThrow({ where: { id }, include: {
    revisions: { orderBy: { revisionNo: 'asc' }, include: { texts: true } },
  } });
  const get = (path: string, query: object = {}) => ctx.http().get(path)
    .set('Authorization', `Bearer ${token}`).query(query);
  const exportFile = async (query: object = {}) => {
    const response = await get(endpoint, query).buffer(true).parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => done(null, Buffer.concat(chunks)));
      res.on('error', done);
    });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    const bytes = response.body as Buffer;
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(bytes.toString('utf8').endsWith('\r\n')).toBe(true);
    return bytes;
  };
  const rowsOf = (bytes: Buffer) => {
    const parsed = parseUploadFile(bytes, limits);
    return { parsed, rows: parsed.rows.map((row) => Object.fromEntries(
      parsed.headers.map((header, index) => [header, row.cells[index]]))) };
  };
  // Same real handler/lease flow as revert.e2e-spec.ts; only queue scheduling is bypassed.
  const importFile = async (bytes: Buffer, sourceId: string | null = null, expectedStatus = 'succeeded') => {
    const parsed = parseUploadFile(bytes, limits);
    const jobs = ctx.app.get(BackgroundJobsService);
    const id = await ctx.prisma.$transaction(async (tx) => {
      const batchId = await jobs.create(tx, { queue: 'content-import', createdBy: actorId, operationId: randomUUID(),
        ...(sourceId ? { exclusiveKey: `content-import:${sourceId}` } : {}) });
      await tx.importBatch.create({ data: {
        id: batchId, levelSourceId: sourceId, fileName: 'export.csv', fileSha256: createHash('sha256').update(bytes).digest('hex'),
        fileSize: bytes.length, rowCount: parsed.rows.length, rawHeaders: parsed.rawHeaders,
        warnings: classifyColumns(parsed.headers).problems, counters: {},
      } });
      await tx.importBatchFile.create({ data: { batchId, content: Buffer.from(bytes) } });
      return batchId;
    });
    const lease = await jobs.acquire(id, randomUUID());
    expect(lease).not.toBeNull();
    const job = makeJobContext(ctx.prisma, id, lease!.attempts, lease!.epoch);
    const status = await ctx.app.get(ImportBatchHandler).run(job);
    expect(status).toBe(expectedStatus);
    expect(await jobs.finish(id, job.epoch, status)).toBe(true);
    return id;
  };
  const unchanged = async (bytes: Buffer) => {
    const before = await snapshot();
    const count = rowsOf(bytes).rows.length;
    const id = await importFile(bytes);
    expect(await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id } })).toMatchObject({ levelSourceId: null,
      counters: { processed: count, unchanged: count, created: 0, updated: 0, rejected: 0, revisions_created: 0 } });
    expect(await ctx.prisma.importRowOutcome.findMany({ where: { batchId: id } }))
      .toEqual(Array.from({ length: count }, () => expect.objectContaining({ outcome: 'unchanged', errorCodes: [] })));
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: id } })).toBe(0);
    // Includes contentHash, texts, revision count, variants, levels and live pointers.
    expect(await snapshot()).toEqual(before);
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
    ctx.clock.set(new Date('2026-10-13T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    token = (await startSession(ctx, actorId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#53: exporting selected senses, including published ones, then uploading the file unchanged needs no level source and every row is unchanged', async () => {
    const published = await create('analyze/analyse/Analyze', full, { level: 'B1', contextLabel: 'data' });
    expect(await content.publishItem({ senseId: published.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    const draft = await create("'m", { ...full, acceptedForms: ['am'] }, { pos: 'be-verb' });
    const excluded = await create('excluded');
    // Plain literal GET, with no trailing segment: proves it reaches CSV rather than senseParams/getSense('export').
    const all = await exportFile();
    expect(rowsOf(all).rows.map((row) => row.sense_id).sort()).toEqual([published.senseId, draft.senseId, excluded.senseId].sort());
    const bytes = await exportFile({ sense_id: [published.senseId, draft.senseId] });
    const { parsed, rows } = rowsOf(bytes);
    expect(parsed.headers).toEqual(headers);
    expect(classifyColumns(parsed.headers).hasLevelColumn).toBe(false);
    expect(rows).toHaveLength(2);
    const variants = await ctx.prisma.entryVariant.findMany({ where: { entryId: published.entry.id }, orderBy: [{ text: 'asc' }, { id: 'asc' }] });
    expect(new Set(variants.map(({ text }) => text))).toEqual(new Set(['analyse', 'Analyze']));
    expect(rows.find((row) => row.sense_id === published.senseId)).toMatchObject({ headword: ['analyze', ...variants.map(({ text }) => text)].join('/'),
      revision: '1', _status: 'published', _level: 'B1', context_label: 'data',
      example_en_3: full.examplesEn[2], topics: 'business;technology', accepted_forms: 'analyzes;analyzed' });
    expect(rows.find((row) => row.sense_id === draft.senseId)).toMatchObject({ headword: "'m", _status: 'draft', _level: '' });
    const detail = await get(`/v1/admin/content/senses/${published.senseId.toUpperCase()}`);
    expect(detail.status).toBe(200);
    expect(detail.body.sense_id).toBe(published.senseId);
    await unchanged(bytes);
    const latest = await write(published.entry.lemma, published.entry.pos, (tx) => content.saveDraft(tx, {
      senseId: published.senseId, baseRevision: 1, source: 'ui', actorId, content: { definitionEn: 'Latest published-sense draft.' },
    }));
    const newest = await exportFile({ status: 'published', sense_id: published.senseId });
    expect(rowsOf(newest).rows).toMatchObject([{ sense_id: published.senseId, revision: String(latest.revisionNo),
      _status: 'draft', definition_en: 'Latest published-sense draft.' }]);
    await unchanged(newest);
  });

  it('B2#54: an exported cell starting with = + - @ is prefixed with \', and uploading the file back changes no content (hash equal)', async () => {
    for (const [index, prefix] of ['=', '+', '-', '@'].entries()) {
      await create(`formula-${index}`, { ...full, glossVi: `${prefix}gloss`, definitionEn: `${prefix}definition`,
        examplesEn: [`${prefix}example`], acceptedForms: [`${prefix}form`] });
    }
    const bytes = await exportFile();
    const { rows } = rowsOf(bytes);
    expect(rows).toHaveLength(4);
    for (const [index, prefix] of ['=', '+', '-', '@'].entries()) {
      expect(rows.find((row) => row.headword === `formula-${index}`)).toMatchObject({
        gloss_vi: `'${prefix}gloss`, definition_en: `'${prefix}definition`,
        example_en_1: `'${prefix}example`, accepted_forms: `'${prefix}form`,
      });
    }
    await unchanged(bytes);
  });

  it('Review Focus 2: a gloss typed as =HYPERLINK("x") survives export → upload → export byte for byte', async () => {
    const sense = await create('hyperlink', { ...full, glossVi: '=HYPERLINK("x")' });
    const bytes = await exportFile({ sense_id: sense.senseId });
    expect(rowsOf(bytes).rows[0].gloss_vi).toBe("'=HYPERLINK(\"x\")");
    expect(bytes.toString('utf8')).toContain('"\'=HYPERLINK(""x"")"');
    await unchanged(bytes);
    expect(await exportFile({ sense_id: sense.senseId })).toEqual(bytes);
  });

  it('B2#55: a row exported at revision N and uploaded after revision N+1 exists is rejected stale-revision; 5,001 rows → 400 export-too-large and nothing streamed', async () => {
    const first = await create('stale');
    const bytes = await exportFile({ sense_id: first.senseId });
    await write(first.entry.lemma, first.entry.pos, (tx) => content.saveDraft(tx, {
      senseId: first.senseId, baseRevision: 1, content: { definitionEn: 'Edited after export.' }, source: 'ui', actorId,
    }));
    const before = await snapshot();
    const id = await importFile(bytes, null, 'partial');
    expect(await ctx.prisma.importRowOutcome.findMany({ where: { batchId: id } })).toMatchObject([
      { outcome: 'rejected', errorCodes: ['stale-revision'] },
    ]);
    expect(await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id } })).toMatchObject({
      counters: { processed: 1, rejected: 1, created: 0, updated: 0, unchanged: 0 },
    });
    expect(await snapshot()).toEqual(before);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: id } })).toBe(0);
    // Real database rows, under one entry lock; bulk fixture construction keeps the size test bounded.
    await write('oversize', 'noun', async (tx) => {
      const { entry } = await content.ensureEntry(tx, { lemma: 'oversize', pos: 'noun', variants: [] });
      const senses = Array.from({ length: 5_001 }, (_, index) => ({ id: randomUUID(), entryId: entry.id, contextLabel: String(index) }));
      await tx.sense.createMany({ data: senses });
      await tx.senseRevision.createMany({ data: senses.map(({ id: senseId }) => ({
        senseId, revisionNo: 1, draftSource: 'ui', createdBy: actorId, contentHash: contentHash(empty),
      })) });
    });
    const oversized = await get(endpoint, { pos: 'noun' });
    expect(oversized.status).toBe(400);
    expect(oversized.headers['content-type']).toContain('application/problem+json');
    expect(oversized.headers['content-disposition']).toBeUndefined();
    expect(oversized.body).toMatchObject({ status: 400, type: problem('export-too-large'), detail: expect.any(String) });
    // An intact JSON document proves no BOM/header/data bytes preceded the error.
    expect(JSON.parse(oversized.text)).toEqual(oversized.body);
    expect(oversized.text).not.toContain('\uFEFF');
    const victim = await ctx.prisma.sense.findFirstOrThrow({ where: { entry: { lemma: 'oversize' } } });
    await write('oversize', 'noun', (tx) => tx.sense.delete({ where: { id: victim.id } }));
    const atLimit = await exportFile({ pos: 'noun' });
    expect(rowsOf(atLimit).rows).toHaveLength(5_000);
    expect(atLimit.toString('utf8').split('\uFEFF')).toHaveLength(2);
    expect(atLimit.toString('utf8').split(headers.join(','))).toHaveLength(2);
  });

  it('B2#56 (D7: unpublishable export rows no longer name topic in _missing): status=unpublishable rows carry _missing naming the missing items with sense_id and revision, and uploading the filled file creates draft revisions', async () => {
    const missing = await create('missing', {});
    const ready = await create('ready', full, { level: 'A1' });
    const partial = await create('partial', { glossVi: 'chưa đủ' }, { level: 'A1' });
    const bytes = await exportFile({ status: 'unpublishable' });
    const { parsed, rows } = rowsOf(bytes);
    expect(parsed.headers).toEqual([...headers, '_missing']);
    expect(rows.map((row) => row.sense_id).sort()).toEqual([missing.senseId, partial.senseId].sort());
    expect(rows.find((row) => row.sense_id === missing.senseId)).toMatchObject({ revision: '1', _level: '',
      _missing: 'gloss-missing;example-missing;level-missing' });
    expect(rows.find((row) => row.sense_id === partial.senseId)).toMatchObject({ revision: '1',
      _missing: 'example-missing' });
    // Informational _level cannot fix a real missing level. Use the established editorial API/service.
    await write(missing.entry.lemma, missing.entry.pos, (tx) => content.setEditorialLevel(tx, missing.entry.id, 'A1'));
    const filled = Buffer.from(toCsv(parsed.headers, parsed.rows.map(({ cells }) => {
      const updated = [...cells];
      for (const [column, value] of Object.entries({ gloss_vi: 'đã đủ', example_en_1: 'A complete example.', topics: 'business' })) {
        updated[parsed.headers.indexOf(column)] = value;
      }
      return updated;
    })), 'utf8');
    const batchId = await importFile(filled);
    expect(await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id: batchId } })).toMatchObject({
      counters: { processed: 2, updated: 2, revisions_created: 2, rejected: 0 }, levelSourceId: null,
    });
    for (const sense of [missing, partial]) {
      expect((await readSense(sense.senseId)).revisions).toMatchObject([
        { revisionNo: 1, status: 'superseded' }, { revisionNo: 2, status: 'draft', draftSource: 'csv' },
      ]);
    }
    expect((await readSense(ready.senseId)).revisions).toHaveLength(1);
    expect((await get('/v1/admin/content/senses', { status: 'unpublishable' })).body.items).toEqual([]);
  });

  it('B2#56a / B2#52a (batch_id): lists and export with batch_id return exactly the senses/entries that upload created or gave a new revision, each with its latest revision, so they can be published in one request', async () => {
    const existing = await create('existing', full, { level: 'A1' });
    const unrelated = await create('unrelated', full, { level: 'A1' });
    const sourceResponse = await ctx.http().post('/v1/admin/content/sources').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Export scope fixture', version: '1', license: 'fixture', display_priority: 10 });
    expect(sourceResponse.status).toBe(201);
    const sourceId = sourceResponse.body.id as string;
    const uploadHeaders = ['headword', 'pos', 'cefr', 'gloss_vi', 'example_en_1', 'topics', 'sense_id', 'revision'];
    const batchId = await importFile(Buffer.from(toCsv(uploadHeaders, [
      ['created/created-variant', 'noun', 'A1', 'mới', 'A new example.', 'business', '', ''],
      ['existing/existing-variant', 'verb', 'B1', 'đã sửa', 'A revised example.', 'business', existing.senseId, '1'],
    ])), sourceId);
    const created = await ctx.prisma.sense.findFirstOrThrow({ where: { entry: { lemma: 'created' } } });
    expect(await ctx.prisma.batchRecord.count({ where: { batchId, recordType: 'sense', recordId: existing.senseId } })).toBe(0);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId, recordType: 'revision' } })).toBe(2);
    const entryList = await get('/v1/admin/content/entries', { batch_id: batchId });
    expect(entryList.status).toBe(200);
    expect(entryList.body.items.map((row: { id: string }) => row.id).sort()).toEqual([existing.entry.id, created.entryId].sort());
    const senseList = await get('/v1/admin/content/senses', { batch_id: batchId });
    expect(senseList.status).toBe(200);
    expect(senseList.body.items.map((row: { sense_id: string }) => row.sense_id).sort()).toEqual([existing.senseId, created.id].sort());
    expect(senseList.body.items).toContainEqual(expect.objectContaining({ sense_id: existing.senseId, revision: 2,
      content: expect.objectContaining({ gloss_vi: 'đã sửa' }) }));
    const bytes = await exportFile({ batch_id: batchId });
    expect(rowsOf(bytes).rows.map((row) => row.sense_id).sort()).toEqual([existing.senseId, created.id].sort());
    expect(rowsOf(bytes).rows).toContainEqual(expect.objectContaining({ sense_id: existing.senseId, revision: '2', gloss_vi: 'đã sửa', _level: 'A1' }));
    await unchanged(bytes);
    const selected = await exportFile({ batch_id: batchId, sense_id: [existing.senseId, unrelated.senseId],
      status: 'open_draft', pos: 'verb', level: 'A1', topic: 'business' });
    expect(rowsOf(selected).rows.map((row) => row.sense_id)).toEqual([existing.senseId]);
    const published = await ctx.http().post('/v1/admin/content/senses/publish').set('Authorization', `Bearer ${token}`)
      .send({ items: senseList.body.items.map(({ sense_id, revision }: { sense_id: string; revision: number }) => ({ sense_id, revision })) });
    expect(published.status).toBe(200);
    expect(published.body.results).toEqual(expect.arrayContaining([
      { sense_id: existing.senseId, outcome: 'published' }, { sense_id: created.id, outcome: 'published' },
    ]));
    expect(published.body.results).toHaveLength(2);
    expect((await readSense(unrelated.senseId)).liveRevisionId).toBeNull();

    // A revision-only batch must scope the existing sense even without a 'sense' record.
    const revisionOnly = await importFile(Buffer.from(toCsv(['headword', 'pos', 'gloss_vi', 'sense_id', 'revision'], [
      ['existing', 'verb', 'revision only', existing.senseId, '2'],
    ])));
    expect(await ctx.prisma.batchRecord.findMany({ where: { batchId: revisionOnly } }))
      .toMatchObject([{ recordType: 'revision' }]);
    expect((await get('/v1/admin/content/entries', { batch_id: revisionOnly })).body.items).toEqual([]);
    expect((await get('/v1/admin/content/senses', { batch_id: revisionOnly })).body.items)
      .toMatchObject([{ sense_id: existing.senseId, revision: 3 }]);
    expect(rowsOf(await exportFile({ batch_id: revisionOnly })).rows).toMatchObject([{ sense_id: existing.senseId, revision: '3' }]);
    // An older batch selects ownership, not the content/revision it originally wrote.
    const originalScope = await get('/v1/admin/content/senses', { batch_id: batchId });
    expect(originalScope.status).toBe(200);
    expect(originalScope.body.items).toContainEqual(expect.objectContaining({ sense_id: existing.senseId, revision: 3 }));
    expect(rowsOf(await exportFile({ batch_id: batchId })).rows).toContainEqual(expect.objectContaining({
      sense_id: existing.senseId, revision: '3', gloss_vi: 'revision only', _status: 'draft',
    }));

    // Level and variant ownership are resolved independently, including entries never created by this batch.
    const levelOnly = await importFile(Buffer.from(toCsv(['headword', 'pos', 'cefr'], [['unrelated', 'verb', 'B1']])), sourceId);
    const variantOnly = await importFile(Buffer.from(toCsv(['headword', 'pos'], [['existing/extra-variant', 'verb']])));
    for (const [id, entryId, type] of [[levelOnly, unrelated.entry.id, 'level'], [variantOnly, existing.entry.id, 'variant']]) {
      expect(await ctx.prisma.batchRecord.findMany({ where: { batchId: id } })).toMatchObject([{ recordType: type }]);
      const entries = await get('/v1/admin/content/entries', { batch_id: id });
      expect(entries.status).toBe(200);
      expect(entries.body.items.map((row: { id: string }) => row.id)).toEqual([entryId]);
      const senses = await get('/v1/admin/content/senses', { batch_id: id });
      expect(senses.status).toBe(200);
      expect(senses.body.items).toEqual([]);
      expect((await exportFile({ batch_id: id })).toString('utf8')).toBe(toCsv(headers, []));
    }
  });

  it('B2E6: uploading the same unchanged file after the sense was edited through the API reports unchanged and leaves the live content alone', async () => {
    // This original upload has no sense_id/revision; a stale exported selector is tested separately in B2#55.
    const original = Buffer.from(toCsv(['headword', 'pos', 'gloss_vi', 'example_en_1', 'topics'], [
      ['edited', 'noun', 'gốc', 'Original example.', 'business'],
    ]));
    await importFile(original);
    const sense = await ctx.prisma.sense.findFirstOrThrow();
    await write('edited', 'noun', (tx) => content.setEditorialLevel(tx, sense.entryId, 'A1'));
    expect(await content.publishItem({ senseId: sense.id, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    const edited = await ctx.http().put(`/v1/admin/content/senses/${sense.id}/draft`).set('Authorization', `Bearer ${token}`)
      .send({ revision: 1, content: { definition_en: 'Edited in the API.' } });
    expect(edited.status).toBe(200);
    const before = await readSense(sense.id);
    expect(before.revisions).toHaveLength(2);
    expect(before.liveRevisionId).toBe(before.revisions[0].id);
    await unchanged(original);
    expect(await readSense(sense.id)).toEqual(before);
  });

  it('an export of a sense with a multi-line gloss and commas round-trips unchanged', async () => {
    const gloss = 'dòng một, có dấu phẩy\r\ndòng hai, "trích dẫn"';
    const first = await create('multiline', { ...full, glossVi: gloss });
    // The service normalizes whitespace before hashing. Preserve a legacy multi-line display text
    // with that canonical hash to exercise actual RFC 4180 bytes without changing upload normalization.
    await write(first.entry.lemma, first.entry.pos, (tx) => tx.senseRevisionText.update({
      where: { revisionId_language_kind: { revisionId: first.revisionId, language: 'vi', kind: 'gloss' } }, data: { text: gloss },
    }));
    const bytes = await exportFile({ sense_id: first.senseId });
    expect(rowsOf(bytes).rows[0].gloss_vi).toBe(gloss);
    expect(bytes.toString('utf8')).toContain('"dòng một, có dấu phẩy\r\ndòng hai, ""trích dẫn"""');
    await unchanged(bytes);
    expect(await exportFile({ sense_id: first.senseId })).toEqual(bytes);
  });
});
