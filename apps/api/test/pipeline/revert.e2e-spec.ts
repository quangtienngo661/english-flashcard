import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
import { ContentService, OWNER_SOURCE_ID } from '../../src/content/index.js';
import { ImportBatchHandler } from '../../src/content-pipeline/import/import-batch.handler.js';
import { revertBatch } from '../../src/content-pipeline/import/revert.service.js';
import { BackgroundJobsService, makeJobContext } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { classifyColumns } from '../../src/content-pipeline/upload/columns.js';
import { parseUploadFile } from '../../src/content-pipeline/upload/csv-file.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const endpoint = '/v1/admin/content/uploads';
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const csv = (rows: string[], headers = 'headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics') =>
  Buffer.from([headers, ...rows].join('\r\n'), 'utf8');
const emptyRemoved = { entry: 0, variant: 0, level: 0, sense: 0, revision: 0 };
const draftFile = csv(['bank/banks,noun,A1,bank,A bank.,I visited the bank.,business']);

describe('batch revert (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let token: string;
  const write = <T>(lemma: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, 'noun');
      return action(tx);
    }, { timeout: 10_000, maxWait: 5_000 });
  const batch = async (bytes = draftFile, sourceId: string | null = OWNER_SOURCE_ID) => {
    const parsed = parseUploadFile(bytes, { maxRows: 100, maxBytes: 10_240 });
    return ctx.prisma.$transaction(async (tx) => {
      const id = await ctx.app.get(BackgroundJobsService).create(tx, {
        queue: 'content-import', createdBy: actorId, operationId: randomUUID(),
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
  const importFile = async (bytes = draftFile, sourceId: string | null = OWNER_SOURCE_ID) => {
    const id = await batch(bytes, sourceId);
    const jobs = ctx.app.get(BackgroundJobsService);
    const lease = await jobs.acquire(id, randomUUID());
    expect(lease).not.toBeNull();
    const context = makeJobContext(ctx.prisma, id, lease!.attempts, lease!.epoch);
    const status = await ctx.app.get(ImportBatchHandler).run(context);
    expect(status).toBe('succeeded');
    expect(await jobs.finish(id, context.epoch, status)).toBe(true);
    return id;
  };
  const revert = (id: string, key = randomUUID()) => ctx.http().post(`${endpoint}/${id}/revert`)
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send({});
  const entry = (lemma = 'bank') => ctx.prisma.entry.findUniqueOrThrow({
    where: { language_lemma_pos: { language: 'en', lemma, pos: 'noun' } },
    include: { senses: { include: { revisions: { orderBy: { revisionNo: 'asc' } } } }, levels: true, variants: true },
  });
  const records = async (id: string): Promise<Parameters<ContentService['revertRecords']>[0]> => {
    const rows = await ctx.prisma.batchRecord.findMany({ where: { batchId: id } });
    return rows.map((row) => {
      const meta = row.meta as { replacedRevisionId?: string; replacedRevisionPreviousStatus?: 'draft' | 'reviewed' } | null;
      return { type: row.recordType as Parameters<ContentService['revertRecords']>[0][number]['type'], id: row.recordId,
        ...meta };
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

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await ctx.prisma.backgroundJob.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-13T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    token = (await startSession(ctx, actorId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#40: reverting deletes the unpublished records the batch created and its row keys; entries or levels still used by another batch are kept; published records are untouched; a level that is the only level of an entry with a published sense is kept; the report lists what was skipped and why', async () => {
    const first = await importFile(csv([
      'gone/gones,noun,A1,gone,Disposable.,A sentence.,business',
      'shared,noun,A1,,,,',
      'live/lives,noun,A1,live,Published.,A sentence.,business',
    ]));
    const live = await entry('live');
    const sense = live.senses[0];
    const revision = sense.revisions[0];
    expect(await content.publishItem({ senseId: sense.id, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    const second = await importFile(csv(['shared,noun,B1,,,,', 'live,noun,A1,,,,', 'other,noun,A1,,,,']));
    const otherLevel = (await entry('shared')).levels.find(({ level }) => level === 'B1')!;
    const beforeLiveRevision = await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: revision.id } });
    const response = await revert(first);
    expect(response.status).toBe(200);
    expect(response.body.report.removed).toEqual({ entry: 1, variant: 2, level: 2, sense: 1, revision: 1 });
    expect(response.body.report.skipped).toEqual(expect.arrayContaining([
      { type: 'revision', id: revision.id, reason: 'published' },
      { type: 'sense', id: sense.id, reason: 'published' },
      { type: 'level', id: live.levels[0].id, reason: 'only-level-of-published-entry' },
    ]));
    expect(response.body.report.skipped).toHaveLength(3);
    expect(await ctx.prisma.entry.findFirst({ where: { lemma: 'gone' } })).toBeNull();
    expect(await ctx.prisma.senseRevisionText.count({ where: { revisionId: revision.id } })).toBe(2);
    expect(await ctx.prisma.senseRevisionText.count()).toBe(2);
    expect(await ctx.prisma.senseRevision.findUnique({ where: { id: revision.id } })).toEqual(beforeLiveRevision);
    expect((await entry('shared')).levels.map(({ id }) => id)).toEqual([otherLevel.id]);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: second, recordType: 'level', recordId: otherLevel.id } })).toBe(1);
    expect(await ctx.prisma.importRowKey.count({ where: { batchId: first } })).toBe(0);
    expect(await ctx.prisma.importRowKey.count({ where: { batchId: second } })).toBeGreaterThan(0);
    expect(await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id: first } })).toMatchObject({
      revertedAt: ctx.clock.now(), revertReport: response.body.report,
    });
    expect(await ctx.prisma.backgroundJob.findUniqueOrThrow({ where: { id: first } })).toMatchObject({ status: 'succeeded' });
    const read = await ctx.http().get(`${endpoint}/${first}`).set('Authorization', `Bearer ${token}`);
    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({ reverted: true, status: 'succeeded' });
  });

  it.each(['draft', 'reviewed'] as const)('B2#40a: a batch revision that replaced an open draft revision is deleted and the replaced revision returns to its earlier status (%s)', async (status) => {
    await importFile();
    const bank = await entry();
    const original = bank.senses[0].revisions[0];
    if (status === 'reviewed') await write('bank', (tx) => content.markRevisions(tx, [
      { senseId: bank.senses[0].id, revision: 1, action: 'reviewed' },
    ]));
    const second = await importFile(csv(['bank,noun,A1,updated,New definition.,Another example.,business']));
    const revisionRecord = await ctx.prisma.batchRecord.findFirstOrThrow({ where: { batchId: second, recordType: 'revision' } });
    expect(revisionRecord.meta).toEqual({ replacedRevisionId: original.id, replacedRevisionPreviousStatus: status });
    expect((await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: original.id } })).status).toBe('superseded');
    const response = await revert(second);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({ removed: { ...emptyRemoved, revision: 1 }, skipped: [] });
    expect(await ctx.prisma.senseRevision.findUnique({ where: { id: revisionRecord.recordId } })).toBeNull();
    expect(await ctx.prisma.senseRevisionText.count({ where: { revisionId: revisionRecord.recordId } })).toBe(0);
    expect((await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: original.id } })).status).toBe(status);
  });

  it('B2#41: uploading the reverted file again creates its entries and levels again', async () => {
    const first = await importFile();
    const old = await entry();
    expect((await revert(first)).status).toBe(200);
    const second = await importFile();
    const recreated = await entry();
    expect(recreated.id).not.toBe(old.id);
    expect(recreated.levels).toHaveLength(1);
    expect(recreated.levels[0].id).not.toBe(old.levels[0].id);
    expect((await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id: second } })).counters).toMatchObject({
      created: 1, unchanged: 0, entries_created: 1, levels_created: 1,
    });
  });

  it('multiple batch revisions of one sense are removed newest first and restore the original open revision', async () => {
    await importFile();
    const bank = await entry();
    const sense = bank.senses[0];
    const id = await importFile(csv([
      'bank,noun,A1,first edit,First edit.,,',
      `bank,noun,A1,second edit,Second edit.,${sense.id},2`,
    ], 'headword,pos,CEFR,gloss_vi,definition_en,sense_id,revision'));
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: id, recordType: 'revision' } })).toBe(2);
    const response = await revert(id);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({ removed: { ...emptyRemoved, revision: 2 }, skipped: [] });
    expect((await entry()).senses[0].revisions).toMatchObject([{ id: sense.revisions[0].id, status: 'draft', revisionNo: 1 }]);
  });

  it('B2#42: revert on a queued, running or already reverted batch → 409 batch-not-revertable', async () => {
    const queued = await batch();
    const running = await batch(draftFile, null);
    expect(await ctx.app.get(BackgroundJobsService).acquire(running, randomUUID())).not.toBeNull();
    const finished = await importFile();
    expect((await revert(finished)).status).toBe(200);
    const before = await snapshot();
    for (const id of [queued, running, finished]) {
      const response = await revert(id);
      expect(response.status).toBe(409);
      expect(response.body.type).toBe(problem('batch-not-revertable'));
      expect(await snapshot()).toEqual(before);
    }
  });

  it('B2E17: a batch-created sense edited through the API afterwards is kept and reported "edited after import"', async () => {
    const id = await importFile();
    const bank = await entry();
    const sense = bank.senses[0];
    const edited = await ctx.http().put(`/v1/admin/content/senses/${sense.id}/draft`)
      .set('Authorization', `Bearer ${token}`).send({ revision: 1, content: { definition_en: 'Edited afterwards.' } });
    expect(edited.status).toBe(200);
    const revisions = await ctx.prisma.senseRevision.findMany({ where: { senseId: sense.id }, orderBy: { revisionNo: 'asc' } });
    const response = await revert(id);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({ removed: { ...emptyRemoved, variant: 1, level: 1 }, skipped: [
      { type: 'revision', id: sense.revisions[0].id, reason: 'superseded-by-later-edit' },
      { type: 'sense', id: sense.id, reason: 'edited-after-import' },
    ] });
    expect(await ctx.prisma.senseRevision.findMany({ where: { senseId: sense.id }, orderBy: { revisionNo: 'asc' } })).toEqual(revisions);
    expect((await entry()).senses[0].id).toBe(sense.id);
  });

  it('B2E18: a published sense, its entry and the entry\'s only level are kept and reported', async () => {
    const id = await importFile();
    const bank = await entry();
    const sense = bank.senses[0];
    expect(await content.publishItem({ senseId: sense.id, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    const response = await revert(id);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({ removed: { ...emptyRemoved, variant: 1 }, skipped: [
      { type: 'revision', id: sense.revisions[0].id, reason: 'published' },
      { type: 'sense', id: sense.id, reason: 'published' },
      { type: 'level', id: bank.levels[0].id, reason: 'only-level-of-published-entry' },
    ] });
    expect((await entry()).id).toBe(bank.id);
    expect((await entry()).levels[0].id).toBe(bank.levels[0].id);
  });

  it('a revert run twice reports the second time with nothing left to remove', async () => {
    const id = await importFile();
    const created = await records(id);
    expect(await content.revertRecords(created)).toEqual({
      removed: { entry: 1, variant: 1, level: 1, sense: 1, revision: 1 }, skipped: [],
    });
    // The retryable Content operation differs deliberately from the already-reverted HTTP guard.
    expect(await content.revertRecords(created)).toEqual({ removed: emptyRemoved, skipped: [] });
    // Simulate interruption after the content transactions but before pipeline finalization.
    const response = await revert(id);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({ removed: emptyRemoved, skipped: [] });
    expect(await ctx.prisma.importRowKey.count({ where: { batchId: id } })).toBe(0);
  });

  it('B2#40 (unchanged re-import): batch 2 re-imports batch 1\'s level as unchanged; reverting batch 1 deletes that level, and re-uploading batch 2\'s file recreates it', async () => {
    const bytes = csv(['bank,noun,A1'], 'headword,pos,CEFR');
    const first = await importFile(bytes);
    const second = await importFile(bytes);
    expect((await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id: second } })).counters).toMatchObject({ unchanged: 1 });
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: second } })).toBe(0);
    const response = await revert(first);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({ removed: { ...emptyRemoved, entry: 1, level: 1 }, skipped: [] });
    expect(await ctx.prisma.entryLevel.count()).toBe(0);
    const third = await importFile(bytes);
    expect((await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id: third } })).counters).toMatchObject({
      created: 1, levels_created: 1, entries_created: 1, unchanged: 0,
    });
  });

  it.each(['unpublished', 'retired'] as const)('publication history protects senses and revisions, but a %s sense does not require keeping the last level', async (state) => {
    const id = await importFile();
    const bank = await entry();
    const sense = bank.senses[0];
    expect(await content.publishItem({ senseId: sense.id, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    await (state === 'unpublished' ? content.unpublish([sense.id]) : content.retire([sense.id]));
    const response = await revert(id);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({ removed: { ...emptyRemoved, level: 1, variant: 1 }, skipped: [
      { type: 'revision', id: sense.revisions[0].id, reason: 'published' },
      { type: 'sense', id: sense.id, reason: 'published' },
    ] });
    expect((await entry()).senses[0]).toMatchObject({ state, liveRevisionId: sense.revisions[0].id });
  });

  it('levels from all sources count when protecting a currently published entry', async () => {
    const id = await importFile();
    const bank = await entry();
    expect(await content.publishItem({ senseId: bank.senses[0].id, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    const source = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: 'other', version: '1', displayPriority: 10, license: 'fixture',
    } });
    await importFile(csv(['bank,noun,A2'], 'headword,pos,CEFR'), source.id);
    const response = await revert(id);
    expect(response.status).toBe(200);
    expect(response.body.report.removed.level).toBe(1);
    expect(response.body.report.skipped.some(({ type }: { type: string }) => type === 'level')).toBe(false);
    expect((await entry()).levels).toMatchObject([{ sourceId: source.id, level: 'A2' }]);
  });

  it('deleting multiple levels from one batch reevaluates the last-level guard after each removal', async () => {
    const id = await importFile(csv(['bank,noun,A1', 'bank,noun,A2'], 'headword,pos,CEFR'));
    const bank = await entry();
    expect(bank.levels).toHaveLength(2);
    const sense = await write('bank', (tx) => content.createSense(tx, {
      entryId: bank.id, contextLabel: null, source: 'ui', actorId,
      content: { glossVi: 'bank', examplesEn: ['I visited the bank.'], topicCodes: ['business'] },
    }));
    expect(await content.publishItem({ senseId: sense.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    const response = await revert(id);
    expect(response.status).toBe(200);
    const retained = (await entry()).levels;
    expect(retained).toHaveLength(1);
    expect(response.body.report).toEqual({ removed: { ...emptyRemoved, level: 1 }, skipped: [
      { type: 'level', id: retained[0].id, reason: 'only-level-of-published-entry' },
    ] });
  });

  it('a revision published before a later publish retains its publication history during revert', async () => {
    const first = await importFile();
    const bank = await entry();
    const sense = bank.senses[0];
    expect(await content.publishItem({ senseId: sense.id, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    await importFile(csv(['bank,noun,A1,bank,Updated definition.,Another example.,business']));
    expect(await content.publishItem({ senseId: sense.id, revision: 2 }, actorId)).toEqual({ outcome: 'published' });
    expect((await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: sense.revisions[0].id } })).status).toBe('superseded');
    const before = await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: sense.revisions[0].id } });
    const response = await revert(first);
    expect(response.status).toBe(200);
    expect(response.body.report.skipped).toContainEqual({ type: 'revision', id: sense.revisions[0].id, reason: 'published' });
    expect(await ctx.prisma.senseRevision.findUnique({ where: { id: sense.revisions[0].id } })).toEqual(before);
  });

  it.each(['missing', 'changed', 'unknown-status'] as const)('restoring a replaced revision skips %s history without overwriting it', async (history) => {
    await importFile();
    const bank = await entry();
    const original = bank.senses[0].revisions[0];
    const second = await importFile(csv(['bank,noun,A1,updated,New definition.,Another example.,business']));
    const record = await ctx.prisma.batchRecord.findFirstOrThrow({ where: { batchId: second, recordType: 'revision' } });
    await write('bank', async (tx) => {
      if (history === 'missing') await tx.senseRevision.delete({ where: { id: original.id } });
      if (history === 'changed') await tx.senseRevision.update({ where: { id: original.id }, data: { status: 'rejected' } });
    });
    if (history === 'unknown-status') await ctx.prisma.batchRecord.update({
      where: { batchId_recordType_recordId: { batchId: second, recordType: 'revision', recordId: record.recordId } },
      data: { meta: { replacedRevisionId: original.id } },
    });
    const response = await revert(second);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({ removed: { ...emptyRemoved, revision: 1 }, skipped: [{
      type: 'revision', id: original.id, reason: history === 'missing' ? 'replaced-revision-missing'
        : history === 'changed' ? 'replaced-revision-not-superseded' : 'replaced-revision-status-unknown',
    }] });
    const retained = await ctx.prisma.senseRevision.findUnique({ where: { id: original.id } });
    expect(retained?.status ?? null).toBe(history === 'missing' ? null : history === 'changed' ? 'rejected' : 'superseded');
  });

  it('an empty imported sense referenced by a later replacement is kept instead of violating the Restrict relation', async () => {
    const id = await importFile();
    const bank = await entry();
    const replacement = await write('bank', (tx) => content.createSense(tx, {
      entryId: bank.id, contextLabel: null, replacesSenseId: bank.senses[0].id, source: 'ui', actorId,
    }));
    const response = await revert(id);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({ removed: { ...emptyRemoved, revision: 1, level: 1, variant: 1 }, skipped: [
      { type: 'sense', id: bank.senses[0].id, reason: 'edited-after-import' },
    ] });
    expect(await ctx.prisma.sense.findUnique({ where: { id: replacement.senseId } })).toMatchObject({ replacesSenseId: bank.senses[0].id });
  });

  it('empty replacement senses in the records list are deleted before their targets', async () => {
    const first = await importFile();
    const second = await importFile(csv(['bank,noun,A1,replacement,Replacement.,true'],
      'headword,pos,CEFR,gloss_vi,definition_en,replace_meaning'));
    expect(await ctx.prisma.sense.count()).toBe(2);
    expect(await content.revertRecords([...(await records(first)), ...(await records(second))].reverse())).toEqual({
      removed: { entry: 1, variant: 1, level: 1, sense: 2, revision: 2 }, skipped: [],
    });
    expect(await ctx.prisma.sense.count()).toBe(0);
    expect(await ctx.prisma.entry.count()).toBe(0);
  });

  it('revert requires an Idempotency-Key, validates ids, reports missing batches and replays a successful key', async () => {
    const id = await importFile();
    const before = await snapshot();
    expect((await ctx.http().post(`${endpoint}/${id}/revert`).set('Authorization', `Bearer ${token}`).send({})).status).toBe(400);
    const invalid = await revert('bad');
    expect(invalid.status).toBe(400);
    expect(invalid.body.type).toBe(problem('validation-failed'));
    const missing = await revert(randomUUID());
    expect(missing.status).toBe(404);
    expect(missing.body.type).toBe(problem('not-found'));
    expect(await snapshot()).toEqual(before);
    const key = randomUUID();
    const first = await revert(id, key);
    expect(first.status).toBe(200);
    const replay = await revert(id, key);
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
  });

  it.each(['partial', 'failed'] as const)('a %s batch can be reverted without changing its job status', async (status) => {
    const id = await importFile();
    await ctx.prisma.backgroundJob.update({ where: { id }, data: { status } });
    const response = await revert(id);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({ removed: { entry: 1, variant: 1, level: 1, sense: 1, revision: 1 }, skipped: [] });
    expect((await ctx.prisma.backgroundJob.findUniqueOrThrow({ where: { id } })).status).toBe(status);
  });
});

describe('real CEFR-J batch revert (e2e, real worker and isolated database)', () => {
  let ctx: TestApp;
  let token: string;
  let rawQueue: Queue;
  let connection: Redis;
  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), redisUrl: inject('redisUrl'), pipeline: {
      runWorkers: true, importMaxRows: 20_000, importMaxBytes: 10_000_000,
      leaseSeconds: 60, heartbeatSeconds: 20, reconcileSeconds: 60,
    } });
    const config = ctx.app.get<AppConfig>(APP_CONFIG);
    connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
    rawQueue = new Queue('content-import', { connection, prefix: config.pipeline.queuePrefix });
    const editor = await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' });
    token = (await startSession(ctx, editor.userId)).accessToken;
  });
  afterAll(async () => {
    const failures: unknown[] = [];
    try { await ctx?.close(); } catch (error) { failures.push(error); }
    if (rawQueue) {
      try { await rawQueue.obliterate({ force: true }); } catch (error) { failures.push(error); }
      try { await rawQueue.close(); } catch (error) { failures.push(error); }
    }
    connection?.disconnect();
    if (failures.length) throw new AggregateError(failures, 'Real revert test cleanup failed');
  });

  it('revert of the real CEFR-J batch removes 7,799 levels and the entries it created (also timed; recorded for Task 24)', async () => {
    const fileName = 'cefrj-vocabulary-profile-1.5.csv';
    const bytes = readFileSync(new URL(`../../../../docs/preparation/evidence/wordlists_2026-10-02/${fileName}`, import.meta.url));
    const source = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: 'CEFR-J', version: '1.5', displayPriority: 10, license: 'test license',
    } });
    const accepted = await ctx.http().post(endpoint).set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID()).field('level_source_id', source.id)
      .attach('file', bytes, { filename: fileName, contentType: 'text/csv' });
    expect(accepted.status).toBe(202);
    const id = accepted.body.batch_id as string;
    // real-files.e2e-spec.ts measured ~260s for import under full-suite contention. Give import
    // a 10-minute import budget and a 25-minute outer ceiling for import, revert and assertions.
    await expect.poll(async () => (await ctx.prisma.backgroundJob.findUniqueOrThrow({ where: { id } })).status,
      { timeout: 600_000, interval: 250 }).toBe('succeeded');
    const createdEntries = await ctx.prisma.batchRecord.count({ where: { batchId: id, recordType: 'entry' } });
    const createdVariants = await ctx.prisma.batchRecord.count({ where: { batchId: id, recordType: 'variant' } });
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: id, recordType: 'level' } })).toBe(7_799);
    expect(createdEntries).toBeGreaterThan(0);
    const startedAt = performance.now();
    // Exercise the same pipeline operation directly: the route's required 120s idempotency
    // ceiling must not turn suite contention into a false failure of this bulk timing gate.
    const report = await revertBatch(ctx.prisma, ctx.app.get(ContentService), ctx.clock, id);
    // Wall time is independent of FakeClock; stdout is the Task 24 timing evidence.
    console.log(JSON.stringify({ operation: 'cefrj-batch-revert', batchId: id, durationMs: performance.now() - startedAt }));
    expect(report).toEqual({ removed: {
      entry: createdEntries, variant: createdVariants, level: 7_799, sense: 0, revision: 0,
    }, skipped: [] });
    expect(await ctx.prisma.entry.count()).toBe(0);
    expect(await ctx.prisma.entryLevel.count()).toBe(0);
    expect(await ctx.prisma.entryVariant.count()).toBe(0);
    expect(await ctx.prisma.importRowKey.count({ where: { batchId: id } })).toBe(0);
    expect((await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id } })).revertReport).toEqual(report);
  }, 1_500_000);
});
