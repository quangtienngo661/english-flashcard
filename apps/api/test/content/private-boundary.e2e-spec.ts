import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, OWNER_SOURCE_ID, type RevisionContent } from '../../src/content/index.js';
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

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const limits = { maxRows: 20_000, maxBytes: 10_000_000 };
const complete: RevisionContent = {
  glossVi: 'triển khai', definitionEn: 'To put into use.', examplesEn: ['We deploy on Friday.'],
  topicCodes: ['business'], acceptedForms: [],
};
type Ids = { entryId: string; senseId: string };

describe('private entries stay outside catalog reads (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let staffToken: string;
  let ownerId: string;
  let ownerToken: string;
  let catalog: Ids;
  let mine: Ids;
  let theirs: Ids;

  const write = <T>(lemma: string, pos: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, pos);
      return action(tx);
    }, transactionOptions);
  const catalogSense = async (lemma: string, pos: string): Promise<Ids> => {
    const ids = await write(lemma, pos, async (tx) => {
      const { entry } = await content.ensureEntry(tx, { lemma, pos, variants: [] });
      await content.setEditorialLevel(tx, entry.id, 'A1');
      const sense = await content.createSense(tx, { entryId: entry.id, contextLabel: null, content: complete, source: 'ui', actorId });
      return { entryId: entry.id, senseId: sense.senseId };
    });
    expect(await content.publishItem({ senseId: ids.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    return ids;
  };
  // Seeded by SQL: Task 3 owns only the boundary, the private write path arrives in Task 5.
  const privateSense = async (owner: string, lemma: string, pos: string): Promise<Ids> => {
    const [{ id: entryId }] = await ctx.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO entries (language, lemma, pos, scope, owner_user_id)
      VALUES ('en', ${lemma}, ${pos}, 'private', ${owner}::uuid) RETURNING id`;
    const [{ id: senseId }] = await ctx.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO senses (entry_id, context_label, state) VALUES (${entryId}::uuid, NULL, 'unpublished') RETURNING id`;
    const [{ id: revisionId }] = await ctx.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO sense_revisions (sense_id, revision_no, status, draft_source, content_hash, created_by, published_at,
        examples, topic_codes, accepted_forms)
      VALUES (${senseId}::uuid, 1, 'published', 'ui', 'private-hash', ${owner}::uuid, now(),
        ARRAY['A private example.'], ARRAY['business'], ARRAY[]::text[]) RETURNING id`;
    await ctx.prisma.$executeRaw`
      INSERT INTO sense_revision_texts (revision_id, language, kind, text) VALUES (${revisionId}::uuid, 'vi', 'gloss', 'nghĩa riêng')`;
    await ctx.prisma.$executeRaw`UPDATE senses SET state = 'open', live_revision_id = ${revisionId}::uuid WHERE id = ${senseId}::uuid`;
    await ctx.prisma.$executeRaw`
      INSERT INTO entry_levels (entry_id, level, source_id, basis) VALUES (${entryId}::uuid, 'A1', ${OWNER_SOURCE_ID}::uuid, 'editorial')`;
    return { entryId, senseId };
  };
  const staffGet = (path: string, query: object = {}) =>
    ctx.http().get(path).set('Authorization', `Bearer ${staffToken}`).query(query);
  const learnerGet = (path: string, query: object = {}) =>
    ctx.http().get(path).set('Authorization', `Bearer ${ownerToken}`).query(query);
  const csvRows = (text: string) => {
    const parsed = parseUploadFile(Buffer.from(text), limits);
    return parsed.rows.map((row) => Object.fromEntries(parsed.headers.map((header, index) => [header, row.cells[index]])));
  };
  const importFile = async (bytes: Buffer) => {
    const parsed = parseUploadFile(bytes, limits);
    const jobs = ctx.app.get(BackgroundJobsService);
    const id = await ctx.prisma.$transaction(async (tx) => {
      const batchId = await jobs.create(tx, { queue: 'content-import', createdBy: actorId, operationId: randomUUID() });
      await tx.importBatch.create({ data: {
        id: batchId, levelSourceId: null, fileName: 'private.csv', fileSha256: createHash('sha256').update(bytes).digest('hex'),
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
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'admin' })).userId;
    staffToken = (await startSession(ctx, actorId)).accessToken;
    ownerId = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    ownerToken = (await startSession(ctx, ownerId)).accessToken;
    const other = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    catalog = await catalogSense('deploy', 'verb');
    mine = await privateSense(ownerId, 'deploy', 'verb');
    theirs = await privateSense(other, 'deploy', 'verb');
  });
  afterAll(async () => { await ctx?.close(); });

  it('schema: two learners each own deploy/verb next to the catalog deploy/verb', async () => {
    const rows = await ctx.prisma.$queryRaw<Array<{ scope: string; owner_user_id: string | null }>>`
      SELECT scope, owner_user_id::text FROM entries WHERE lemma = 'deploy' AND pos = 'verb' ORDER BY scope, owner_user_id`;
    expect(rows.map(({ scope }) => scope).sort()).toEqual(['catalog', 'private', 'private']);
    await expect(privateSense(ownerId, 'deploy', 'verb')).rejects.toThrow();
  });

  it('B2#69 (scope): with private rows seeded by SQL, the entries list, senses list, sense detail, both exports and a publish-job snapshot return catalog rows only', async () => {
    const entries = await staffGet('/v1/admin/content/entries', { q: 'deploy' });
    expect(entries.status).toBe(200);
    expect(entries.body.items.map((item: { id: string }) => item.id)).toEqual([catalog.entryId]);
    const senses = await staffGet('/v1/admin/content/senses');
    expect(senses.status).toBe(200);
    expect(senses.body.items.map((item: { sense_id: string }) => item.sense_id)).toEqual([catalog.senseId]);
    for (const { senseId } of [mine, theirs]) {
      const detail = await staffGet(`/v1/admin/content/senses/${senseId}`);
      expect(detail.status).toBe(404);
    }
    const senseExport = await staffGet('/v1/admin/content/senses/export');
    expect(senseExport.status).toBe(200);
    expect(csvRows(senseExport.text).map((row) => row.sense_id)).toEqual([catalog.senseId]);
    // Private entries have senses here; a private entry without any sense must not appear either.
    await ctx.prisma.$executeRaw`
      INSERT INTO entries (language, lemma, pos, scope, owner_user_id) VALUES ('en', 'lonely', 'noun', 'private', ${ownerId}::uuid)`;
    const entryExport = await staffGet('/v1/admin/content/entries/export', { has_sense: 'false' });
    expect(entryExport.status).toBe(200);
    // Header only: the parser refuses a file without data rows, so count the CRLF-terminated lines.
    expect(entryExport.text.split('\r\n')).toEqual([expect.stringContaining('headword,pos,'), '']);
    // Private senses are published already; reopen one as a draft so the snapshot would see it if it leaked.
    await ctx.prisma.senseRevision.updateMany({ where: { senseId: mine.senseId }, data: { status: 'draft' } });
    await ctx.prisma.sense.update({ where: { id: mine.senseId }, data: { liveRevisionId: null, state: 'unpublished' } });
    expect(await content.snapshotPublishable({})).toEqual({ items: [], notReady: 0 });
  });

  it('staff writes by id treat private rows as missing', async () => {
    expect(await content.publishItem({ senseId: mine.senseId, revision: 1 }, actorId))
      .toEqual({ outcome: 'refused', reason: 'sense-not-found' });
    const unpublish = await ctx.http().post('/v1/admin/content/senses/unpublish').set('Authorization', `Bearer ${staffToken}`)
      .send({ sense_ids: [mine.senseId] });
    expect(unpublish.body.results).toEqual([{ sense_id: mine.senseId, ok: false, reason: 'sense-not-found' }]);
    const level = await ctx.http().put(`/v1/admin/content/entries/${mine.entryId}/levels/editorial`)
      .set('Authorization', `Bearer ${staffToken}`).send({ level: 'B2' });
    expect(level.status).toBe(404);
    expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: mine.senseId } })).toMatchObject({ state: 'open' });
    expect(await ctx.prisma.entryLevel.findMany({ where: { entryId: mine.entryId } })).toEqual([
      expect.objectContaining({ level: 'A1' })]);
  });

  it('B3#12 (Bước 2 learner routes): /v1/senses/search, /v1/senses and /v1/senses/:id never return private senses, the caller\'s own included', async () => {
    const search = await learnerGet('/v1/senses/search', { q: 'deploy' });
    expect(search.status).toBe(200);
    expect(search.body.items.map((item: { sense_id: string }) => item.sense_id)).toEqual([catalog.senseId]);
    const browse = await learnerGet('/v1/senses', { topic: 'business' });
    expect(browse.status).toBe(200);
    expect(browse.body.items.map((item: { sense_id: string }) => item.sense_id)).toEqual([catalog.senseId]);
    for (const { senseId } of [mine, theirs]) {
      const detail = await learnerGet(`/v1/senses/${senseId}`);
      expect(detail.status).toBe(404);
      expect(detail.body.type).toBe('https://api.example.com/problems/not-found');
    }
  });

  it('import: a CSV row deploy,verb attaches to the catalog entry when private deploy/verb entries exist', async () => {
    const before = await ctx.prisma.sense.findMany({ where: { entryId: { in: [mine.entryId, theirs.entryId] } }, orderBy: { id: 'asc' } });
    await importFile(Buffer.from(toCsv(['headword', 'pos', 'gloss_vi', 'example_en_1', 'context_label'],
      [['deploy', 'verb', 'triển khai phần mềm', 'They deploy the app.', 'software']])));
    const created = await ctx.prisma.sense.findFirstOrThrow({ where: { contextLabel: 'software' } });
    expect(created.entryId).toBe(catalog.entryId);
    expect(await ctx.prisma.entry.count({ where: { lemma: 'deploy', pos: 'verb' } })).toBe(3);
    expect(await ctx.prisma.sense.findMany({ where: { entryId: { in: [mine.entryId, theirs.entryId] } }, orderBy: { id: 'asc' } })).toEqual(before);
  });

  it('B2E9 (after the index change): ten concurrent ensureEntry calls for one new catalog key still leave exactly one entry and none fails', async () => {
    await privateSense(ownerId, 'race', 'noun');
    const results = await Promise.all(Array.from({ length: 10 }, () =>
      write('race', 'noun', (tx) => content.ensureEntry(tx, { lemma: 'race', pos: 'noun', variants: [] }))));
    expect(new Set(results.map(({ entry }) => entry.id)).size).toBe(1);
    expect(results.filter(({ created }) => created)).toHaveLength(1);
    const rows = await ctx.prisma.$queryRaw<Array<{ id: string; scope: string }>>`
      SELECT id::text, scope FROM entries WHERE lemma = 'race' AND pos = 'noun' ORDER BY scope`;
    expect(rows.map(({ scope }) => scope)).toEqual(['catalog', 'private']);
    expect(rows[0].id).toBe(results[0].entry.id);
    // Also without the advisory lock: the ON CONFLICT predicate alone must absorb the race.
    const racing = await Promise.all(Array.from({ length: 10 }, () => ctx.prisma.$transaction((tx) =>
      content.ensureEntry(tx, { lemma: 'sprint', pos: 'noun', variants: [] }))));
    expect(new Set(racing.map(({ entry }) => entry.id)).size).toBe(1);
  });
});
