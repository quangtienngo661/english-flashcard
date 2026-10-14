import { parse } from 'csv-parse/sync';
import { createHash, randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it, vi } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
import { encodeBoundToken } from '../../src/common/pagination/page-token.util.js';
import { ContentService, type Level, type RevisionContent } from '../../src/content/index.js';
import { BackgroundJobsService, makeJobContext } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { JobHandlerRegistry } from '../../src/content-pipeline/jobs/job-handler.registry.js';
import { JobQueueService } from '../../src/content-pipeline/jobs/job-queue.service.js';
import { JobReconcilerService } from '../../src/content-pipeline/jobs/job-reconciler.service.js';
import { LeaseLostError, type JobContext } from '../../src/content-pipeline/jobs/job-types.js';
import { PublishJobHandler } from '../../src/content-pipeline/publish/publish-job.handler.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const endpoint = '/v1/admin/content/senses/publish-jobs';
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const complete: RevisionContent = {
  glossVi: 'ngân hàng', definitionEn: null, examplesEn: ['I visited the bank.'],
  topicCodes: ['business'], acceptedForms: [],
};
type Filter = { senseIds?: string[]; level?: Level; topic?: string; pos?: string; batch_id?: string };

async function ready(ctx: TestApp, actorId: string, options: {
  lemma?: string; pos?: string; level?: Level | false; content?: Partial<RevisionContent>;
} = {}) {
  const content = ctx.app.get(ContentService);
  const lemma = options.lemma ?? `bank-${randomUUID()}`;
  const pos = options.pos ?? 'noun';
  return ctx.prisma.$transaction(async (tx) => {
    await content.lockEntryKey(tx, lemma, pos);
    const { entry } = await content.ensureEntry(tx, { lemma, pos, variants: [] });
    if (options.level !== false) await content.setEditorialLevel(tx, entry.id, options.level ?? 'A1');
    const sense = await content.createSense(tx, {
      entryId: entry.id, contextLabel: null, source: 'ui', actorId, content: { ...complete, ...options.content },
    });
    return { entry, ...sense };
  }, { timeout: 10_000, maxWait: 5_000 });
}

describe('publish jobs (e2e, isolated database, direct lease contexts)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let token: string;
  const create = (filter: Filter = {}, key = randomUUID()) => ctx.http().post(endpoint)
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send({ filter });
  const items = (id: string) => ctx.prisma.publishJobItem.findMany({ where: { jobId: id }, orderBy: { senseId: 'asc' } });
  const read = (id: string) => ctx.http().get(`${endpoint}/${id}`).set('Authorization', `Bearer ${token}`);
  const acquire = async (id: string) => {
    const lease = await ctx.app.get(BackgroundJobsService).acquire(id, randomUUID());
    expect(lease).not.toBeNull();
    return makeJobContext(ctx.prisma, id, lease!.attempts, lease!.epoch);
  };
  const finish = async (id: string, context?: JobContext) => {
    const lease = context ?? await acquire(id);
    const status = await ctx.app.get(PublishJobHandler).run(lease);
    expect(await ctx.app.get(BackgroundJobsService).finish(id, lease.epoch, status)).toBe(true);
    return status;
  };
  const edit = async (sense: Awaited<ReturnType<typeof ready>>, patch: Partial<RevisionContent>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, sense.entry.lemma, sense.entry.pos);
      return content.saveDraft(tx, { senseId: sense.senseId, baseRevision: 1, content: patch, source: 'ui', actorId });
    });

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), redisUrl: inject('redisUrl'), config });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await (await ctx.app.get(JobQueueService).getQueue('content-publish')).obliterate({ force: true });
    await ctx.prisma.backgroundJob.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-13T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    token = (await startSession(ctx, actorId)).accessToken;
  });
  afterEach(() => { vi.restoreAllMocks(); });
  afterAll(async () => {
    try {
      if (ctx) await (await ctx.app.get(JobQueueService).getQueue('content-publish')).obliterate({ force: true });
    } finally { await ctx?.close(); }
  });

  it('B2#45b: creating a job with a filter snapshots the publishable {sense_id, revision} pairs, publishes each in its own transaction, a refused item (revision changed after the snapshot) does not stop the job, the report lists every item, and the final status is succeeded or partial', async () => {
    const senses: Array<Awaited<ReturnType<typeof ready>>> = [];
    for (let index = 0; index < 4; index++) senses.push(await ready(ctx, actorId));
    senses.sort((left, right) => left.senseId.localeCompare(right.senseId));
    await ready(ctx, actorId, { level: 'B1' });
    const filter = { level: 'A1', topic: 'business', pos: 'noun' } as const;
    const accepted = await create(filter);
    expect(accepted.status).toBe(202);
    expect(Object.keys(accepted.body)).toEqual(['job_id']);
    const id = accepted.body.job_id as string;
    expect(await ctx.prisma.publishJob.findUniqueOrThrow({ where: { id } })).toMatchObject({
      filter, snapshotCount: 4, notReadyCount: 0,
    });
    expect(await items(id)).toEqual(senses.map(({ senseId }) => ({
      jobId: id, senseId, revisionNo: 1, outcome: 'pending', reason: null,
    })));
    expect((await read(id)).body).toMatchObject({ status: 'queued', snapshot_count: 4, not_ready_count: 0,
      counters: { processed: 0, pending: 4, published: 0, already_published: 0, refused: 0 } });
    // The FIRST deterministic item is stale: later successful commits prove refusal does not stop the loop.
    await edit(senses[0], { definitionEn: 'Changed after the snapshot.' });
    expect(await content.publishItem({ senseId: senses[1].senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    const context = await acquire(id);
    const transactionIds: string[] = [];
    const tracked: JobContext = { ...context, tx: (fn) => context.tx(async (tx) => {
      const [row] = await tx.$queryRaw<{ id: string }[]>`SELECT txid_current()::text AS id`;
      transactionIds.push(row.id);
      return fn(tx);
    }) };
    expect(await finish(id, tracked)).toBe('partial');
    expect(transactionIds.length).toBeGreaterThanOrEqual(5); // Four item fences and final report.
    expect(new Set(transactionIds).size).toBe(transactionIds.length);
    expect(await items(id)).toEqual(senses.map(({ senseId }, index) => ({ jobId: id, senseId, revisionNo: 1,
      outcome: index === 0 ? 'refused' : index === 1 ? 'already_published' : 'published',
      reason: index === 0 ? 'stale-revision' : null,
    })));
    expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: senses[0].senseId } })).toMatchObject({ liveRevisionId: null });
    for (const sense of senses.slice(1)) {
      expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: sense.senseId } })).toMatchObject({ liveRevisionId: sense.revisionId });
    }
    const status = await read(id);
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({ id, status: 'partial', snapshot_count: 4, not_ready_count: 0,
      counters: { processed: 4, pending: 0, published: 2, already_published: 1, refused: 1 },
      created_at: ctx.clock.now().toISOString(), started_at: ctx.clock.now().toISOString(), finished_at: ctx.clock.now().toISOString() });
    const report = await ctx.http().get(`${endpoint}/${id}/report.csv`).set('Authorization', `Bearer ${token}`);
    expect(report.status).toBe(200);
    expect(report.headers['content-type']).toContain('text/csv');
    expect(report.headers['content-disposition']).toContain('attachment;');
    expect(report.text.startsWith('\ufeff')).toBe(true);
    const parsed = parse(report.text, { bom: true });
    expect(parsed[0]).toEqual(['sense_id', 'revision_no', 'outcome', 'reason']);
    expect(parsed.slice(1)).toEqual(senses.map(({ senseId }, index) => [senseId, '1',
      index === 0 ? 'refused' : index === 1 ? 'already_published' : 'published', index === 0 ? 'stale-revision' : '',
    ]));
  });

  it('B2#45c: nothing publishable → 400 nothing-to-publish; the same Idempotency-Key returns the first job; a worker dying mid-job and a re-run skips published items and processes none twice', async () => {
    const empty = await create();
    expect(empty.status).toBe(400);
    expect(empty.body.type).toBe(problem('nothing-to-publish'));
    expect(await ctx.prisma.backgroundJob.count()).toBe(0);
    expect(await ctx.prisma.publishJob.count()).toBe(0);
    expect(await ctx.prisma.publishJobItem.count()).toBe(0);
    const incomplete = await ready(ctx, actorId, { content: { examplesEn: [] } });
    const notReadyOnly = await create({ senseIds: [incomplete.senseId] });
    expect(notReadyOnly.status).toBe(400);
    expect(notReadyOnly.body.type).toBe(problem('nothing-to-publish'));
    expect(await ctx.prisma.backgroundJob.count()).toBe(0);
    expect(await ctx.prisma.publishJob.count()).toBe(0);
    const senses: Array<Awaited<ReturnType<typeof ready>>> = [];
    for (let index = 0; index < 3; index++) senses.push(await ready(ctx, actorId));
    senses.sort((left, right) => left.senseId.localeCompare(right.senseId));
    const key = randomUUID();
    const accepted = await create({}, key);
    expect(accepted.status).toBe(202);
    const id = accepted.body.job_id as string;
    expect((await create({}, key)).body).toEqual(accepted.body);
    expect(await ctx.prisma.backgroundJob.count()).toBe(1);
    const publish = content.publishItem.bind(content);
    const spy = vi.spyOn(content, 'publishItem').mockImplementation(async (item, actor) => {
      if (item.senseId === senses[1].senseId) throw new Error('Injected crash after first committed item');
      return publish(item, actor);
    });
    const first = await acquire(id);
    await expect(ctx.app.get(PublishJobHandler).run(first)).rejects.toThrow('Injected crash');
    expect((await items(id)).map(({ outcome }) => outcome)).toEqual(['published', 'pending', 'pending']);
    expect((await read(id)).body.counters).toEqual({ processed: 1, pending: 2, published: 1, already_published: 0, refused: 0 });
    const publishedBefore = await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: senses[0].revisionId } });
    ctx.clock.advance(61_000);
    // create()'s own enqueue() already added this job to BullMQ; running the handler directly
    // (bypassing the real Worker) never removes it, so the reconciler's own duplicate-processing
    // guard (skip requeue while a non-terminal Redis-side job still exists) would otherwise block
    // this. A real crashed worker process would eventually be cleared by BullMQ's own stalled-job
    // detection; remove the stale entry here to represent that outcome.
    await (await ctx.app.get(JobQueueService).getQueue('content-publish')).getJob(id).then((job) => job?.remove());
    expect(await ctx.app.get(JobReconcilerService).runOnce()).toEqual({ requeued: 1, failed: 0 });
    const second = await acquire(id);
    expect(second.epoch).toBeGreaterThan(first.epoch);
    await expect(ctx.app.get(PublishJobHandler).run(first)).rejects.toBeInstanceOf(LeaseLostError);
    spy.mockImplementation(publish);
    spy.mockClear();
    expect(await finish(id, second)).toBe('succeeded');
    expect(spy.mock.calls.map(([item, actor]) => ({ ...item, actor }))).toEqual(senses.slice(1).map(({ senseId }) => ({
      senseId, revision: 1, actor: actorId,
    })));
    expect(await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: senses[0].revisionId } })).toEqual(publishedBefore);
    expect((await read(id)).body.counters).toEqual({ processed: 3, pending: 0, published: 3, already_published: 0, refused: 0 });
    // Replay still returns the original job after its snapshot has become entirely published.
    const replay = await create({}, key);
    expect(replay.status).toBe(202);
    expect(replay.body).toEqual(accepted.body);
    expect(await ctx.prisma.publishJob.count()).toBe(1);
  });

  it('a job over 1,200 ready senses publishes all of them (more than PUBLISH_MAX_ITEMS)', async () => {
    expect(ctx.app.get<AppConfig>(APP_CONFIG).content.publishMaxItems).toBe(500);
    for (let index = 0; index < 1_201; index++) await ready(ctx, actorId, { lemma: `bulk-${String(index).padStart(4, '0')}` });
    const accepted = await create({ level: 'A1' });
    expect(accepted.status).toBe(202);
    const id = accepted.body.job_id as string;
    expect(await ctx.prisma.publishJobItem.count({ where: { jobId: id } })).toBe(1_201);
    expect(await finish(id)).toBe('succeeded');
    expect((await read(id)).body).toMatchObject({ status: 'succeeded', snapshot_count: 1_201,
      counters: { processed: 1_201, pending: 0, published: 1_201, already_published: 0, refused: 0 } });
    expect(await ctx.prisma.sense.count({ where: { liveRevisionId: { not: null } } })).toBe(1_201);
    expect(await ctx.prisma.senseRevision.count({ where: { status: 'published' } })).toBe(1_201);
  }, 300_000);

  it('senses not ready at snapshot time are counted notReady and never published', async () => {
    const good = await ready(ctx, actorId);
    const missing = [
      await ready(ctx, actorId, { content: { glossVi: null } }),
      await ready(ctx, actorId, { content: { examplesEn: [] } }),
      await ready(ctx, actorId, { level: false }),
      await ready(ctx, actorId, { content: { topicCodes: [] } }),
      await ready(ctx, actorId, { content: { topicCodes: ['technology'] } }),
    ];
    await ctx.prisma.topic.update({ where: { code: 'technology' }, data: { archivedAt: ctx.clock.now() } });
    const published = await ready(ctx, actorId);
    await content.publishItem({ senseId: published.senseId, revision: 1 }, actorId);
    const retired = await ready(ctx, actorId);
    await content.retire([retired.senseId]);
    const accepted = await create();
    expect(accepted.status).toBe(202);
    const id = accepted.body.job_id as string;
    expect((await read(id)).body).toMatchObject({ snapshot_count: 1, not_ready_count: 5 });
    expect((await items(id)).map(({ senseId }) => senseId)).toEqual([good.senseId]);
    // Becoming ready later does not add an item to the immutable snapshot.
    await edit(missing[0], { glossVi: 'Filled after snapshot.' });
    expect(await finish(id)).toBe('succeeded');
    for (const sense of missing) expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: sense.senseId } })).toMatchObject({ liveRevisionId: null });
    expect((await read(id)).body).toMatchObject({ not_ready_count: 5, counters: { refused: 0, published: 1 } });
  });

  it('route order: GET senses/publish-jobs/:id is not captured by senses/:id', async () => {
    const sense = await ready(ctx, actorId);
    const accepted = await create({ senseIds: [sense.senseId] });
    expect(accepted.status).toBe(202);
    const response = await read(accepted.body.job_id as string);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: accepted.body.job_id, status: 'queued', snapshot_count: 1 });
    const detail = await ctx.http().get(`/v1/admin/content/senses/${sense.senseId}`).set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.sense_id).toBe(sense.senseId);
  });

  it('snapshot filters use latest topics, displayed level, senseIds intersection and reviewed drafts', async () => {
    const included = await ready(ctx, actorId);
    const reviewed = await ready(ctx, actorId);
    await ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, reviewed.entry.lemma, 'noun');
      await content.markRevisions(tx, [{ senseId: reviewed.senseId, revision: 1, action: 'reviewed' }]);
    });
    const changedTopic = await ready(ctx, actorId);
    await edit(changedTopic, { topicCodes: ['food'] });
    const changedLevel = await ready(ctx, actorId);
    // setEditorialLevel's own unique key includes the level value, so re-selecting a different
    // level inserts a second editorial row rather than replacing the first; levelState()'s own
    // "newest editorial row wins" tie-break then needs a real createdAt difference to be
    // deterministic -- advance the clock so this isn't a same-instant coin flip on row id.
    ctx.clock.advance(1_000);
    await ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, changedLevel.entry.lemma, 'noun');
      await content.setEditorialLevel(tx, changedLevel.entry.id, 'B1');
    });
    const verb = await ready(ctx, actorId, { pos: 'verb' });
    await ready(ctx, actorId); // Filtered out by the explicit id list.
    const snapshot = await content.snapshotPublishable({ senseIds: [included, reviewed, changedTopic, changedLevel, verb].map(({ senseId }) => senseId),
      level: 'A1', topic: 'business', pos: 'noun' });
    expect(snapshot).toEqual({
      items: expect.arrayContaining([{ senseId: included.senseId, revisionNo: 1 }, { senseId: reviewed.senseId, revisionNo: 1 }]), notReady: 0,
    });
    expect(snapshot.items).toHaveLength(2);
    const accepted = await create({ senseIds: [included.senseId, reviewed.senseId], level: 'A1', topic: 'business', pos: 'noun' });
    expect(accepted.status).toBe(202);
    expect(await items(accepted.body.job_id as string)).toHaveLength(2);
  });

  it('batch_id is resolved by Pipeline and intersected with explicit senseIds before snapshotting', async () => {
    const first = await ready(ctx, actorId);
    const second = await ready(ctx, actorId);
    const outside = await ready(ctx, actorId);
    const batchId = await ctx.prisma.$transaction(async (tx) => {
      const id = await ctx.app.get(BackgroundJobsService).create(tx, { queue: 'content-import', createdBy: actorId, operationId: randomUUID() });
      await tx.importBatch.create({ data: { id, fileName: 'fixture.csv', fileSha256: 'fixture', fileSize: 0, rowCount: 2,
        rawHeaders: [], warnings: [], counters: {} } });
      await tx.batchRecord.createMany({ data: [
        { batchId: id, recordType: 'sense', recordId: first.senseId },
        { batchId: id, recordType: 'revision', recordId: second.revisionId },
      ] });
      return id;
    });
    const scoped = await create({ batch_id: batchId });
    expect(scoped.status).toBe(202);
    expect((await items(scoped.body.job_id as string)).map(({ senseId }) => senseId).sort()).toEqual([first.senseId, second.senseId].sort());
    const intersection = await create({ batch_id: batchId, senseIds: [second.senseId, outside.senseId] });
    expect(intersection.status).toBe(202);
    expect((await items(intersection.body.job_id as string)).map(({ senseId }) => senseId)).toEqual([second.senseId]);
    const empty = await create({ batch_id: randomUUID() });
    expect(empty.status).toBe(400);
    expect(empty.body.type).toBe(problem('nothing-to-publish'));
  });

  it('a re-run skips already_published and refused outcomes as well as published, preserving partial', async () => {
    const senses = [await ready(ctx, actorId), await ready(ctx, actorId), await ready(ctx, actorId)];
    senses.sort((left, right) => left.senseId.localeCompare(right.senseId));
    const accepted = await create();
    expect(accepted.status).toBe(202);
    const id = accepted.body.job_id as string;
    await content.publishItem({ senseId: senses[0].senseId, revision: 1 }, actorId);
    await edit(senses[1], { definitionEn: 'Stale.' });
    const publish = content.publishItem.bind(content);
    const spy = vi.spyOn(content, 'publishItem').mockImplementation(async (item, actor) => {
      if (item.senseId === senses[2].senseId) throw new Error('Crash after two settled outcomes');
      return publish(item, actor);
    });
    const first = await acquire(id);
    await expect(ctx.app.get(PublishJobHandler).run(first)).rejects.toThrow('Crash');
    expect((await items(id)).map(({ outcome }) => outcome)).toEqual(['already_published', 'refused', 'pending']);
    await ctx.app.get(BackgroundJobsService).release(id, first.epoch);
    spy.mockImplementation(publish);
    spy.mockClear();
    expect(await finish(id)).toBe('partial');
    expect(spy.mock.calls.map(([item]) => item.senseId)).toEqual([senses[2].senseId]);
    expect((await read(id)).body.counters).toEqual({ processed: 3, pending: 0, published: 1, already_published: 1, refused: 1 });
  });

  it('strict request validation and a required Idempotency-Key reject before creating jobs; missing reads are 404', async () => {
    await ready(ctx, actorId);
    const noKey = await ctx.http().post(endpoint).set('Authorization', `Bearer ${token}`).send({ filter: {} });
    expect(noKey.status).toBe(400);
    for (const body of [{}, { filter: { status: 'published' } }, { filter: { senseIds: ['bad'] } },
      { filter: { level: 'A3' } }, { filter: { pos: 'nuon' } }, { filter: { batch_id: 'bad' } }]) {
      const rejected = await ctx.http().post(endpoint).set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID()).send(body);
      expect(rejected.status).toBe(400);
      expect(rejected.body.type).toBe(problem('validation-failed'));
    }
    expect(await ctx.prisma.backgroundJob.count()).toBe(0);
    expect(await ctx.prisma.publishJob.count()).toBe(0);
    for (const suffix of ['', '/report.csv']) {
      const missing = await ctx.http().get(`${endpoint}/${randomUUID()}${suffix}`).set('Authorization', `Bearer ${token}`);
      expect(missing.status).toBe(404);
      expect(missing.body.type).toBe(problem('not-found'));
    }
  });

  it('a crash between Content publication and item persistence recovers as already_published without republishing', async () => {
    const sense = await ready(ctx, actorId);
    const accepted = await create();
    expect(accepted.status).toBe(202);
    const id = accepted.body.job_id as string;
    const publish = content.publishItem.bind(content);
    const spy = vi.spyOn(content, 'publishItem').mockImplementationOnce(async (item, actor) => {
      await publish(item, actor);
      throw new Error('Crash after catalog commit');
    });
    const first = await acquire(id);
    await expect(ctx.app.get(PublishJobHandler).run(first)).rejects.toThrow('Crash after catalog commit');
    expect(await items(id)).toMatchObject([{ outcome: 'pending' }]);
    const publishedBefore = await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: sense.revisionId } });
    expect(publishedBefore).toMatchObject({ status: 'published', publishedAt: ctx.clock.now() });
    await ctx.app.get(BackgroundJobsService).release(id, first.epoch);
    spy.mockImplementation(publish);
    ctx.clock.advance(1_000);
    expect(await finish(id)).toBe('succeeded');
    expect(await items(id)).toMatchObject([{ outcome: 'already_published', reason: null }]);
    expect(await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: sense.revisionId } })).toEqual(publishedBefore);
    expect((await read(id)).body.counters).toEqual({ processed: 1, pending: 0, published: 0, already_published: 1, refused: 0 });
  });

  describe('list', () => {
    const list = (query: Record<string, string | number> = {}, auth = token) => ctx.http().get(endpoint)
      .set('Authorization', `Bearer ${auth}`).query(query);
    const ids = (body: { items: Array<{ id: string }> }) => body.items.map((item) => item.id);
    // One sense per job so every snapshot is non-empty; jobs are created one minute apart.
    const createJobs = async (count: number) => {
      const created: string[] = [];
      for (let index = 0; index < count; index++) {
        const sense = await ready(ctx, actorId);
        const filter = { senseIds: [sense.senseId] };
        const accepted = await create(filter);
        expect(accepted.status).toBe(202);
        created.push(accepted.body.job_id as string);
        ctx.clock.advance(60_000);
      }
      return created;
    };

    it('B25#15: three jobs, page_size=2 → newest two + token, then the oldest + null, no repeats', async () => {
      const [oldest, middle, newest] = await createJobs(3);
      const first = await list({ page_size: 2 });
      expect(first.status).toBe(200);
      expect(ids(first.body)).toEqual([newest, middle]);
      expect(first.body.next_page_token).toEqual(expect.any(String));
      const second = await list({ page_size: 2, page_token: first.body.next_page_token });
      expect(second.status).toBe(200);
      expect(ids(second.body)).toEqual([oldest]);
      expect(second.body.next_page_token).toBeNull();
      const detail = (await read(newest)).body;
      expect(first.body.items[0]).toEqual({
        ...detail, filter: (await ctx.prisma.publishJob.findUniqueOrThrow({ where: { id: newest } })).filter,
      });
      expect(Object.keys(first.body.items[0]).sort()).toEqual(['counters', 'created_at', 'filter', 'finished_at',
        'id', 'not_ready_count', 'snapshot_count', 'started_at', 'status']);
    });

    it('B25E17: two jobs with the same created_at are ordered by id and split across pages without repeats', async () => {
      const [first, second] = await createJobs(2);
      const tied = ctx.clock.now();
      await ctx.prisma.backgroundJob.updateMany({ where: { id: { in: [first, second] } }, data: { createdAt: tied } });
      const expected = [first, second].sort();
      const page1 = await list({ page_size: 1 });
      expect(ids(page1.body)).toEqual([expected[0]]);
      const page2 = await list({ page_size: 1, page_token: page1.body.next_page_token });
      expect(ids(page2.body)).toEqual([expected[1]]);
      expect(page2.body.next_page_token).toBeNull();
    });

    it('B25E18: a job created between page 1 and page 2 appears on neither page 2 nor twice', async () => {
      const [oldest, middle, newest] = await createJobs(3);
      const page1 = await list({ page_size: 2 });
      expect(ids(page1.body)).toEqual([newest, middle]);
      const [late] = await createJobs(1);
      const page2 = await list({ page_size: 2, page_token: page1.body.next_page_token });
      expect(ids(page2.body)).toEqual([oldest]);
      expect(ids(page2.body)).not.toContain(late);
    });

    it('B25#16: a token minted by GET /v1/admin/content/uploads, a non-base64url string, page_size=0 and 101 → 400 validation-failed', async () => {
      const [only] = await createJobs(1);
      const uploadsBinding = createHash('sha256').update(JSON.stringify({ route: 'uploads', filters: {} })).digest('hex');
      const fromUploads = encodeBoundToken({ created_at: ctx.clock.now().toISOString(), id: only }, uploadsBinding);
      const invalidQueries: Array<Record<string, string | number>> = [
        { page_token: fromUploads }, { page_token: 'not base64url!' }, { page_size: 0 }, { page_size: 101 },
      ];
      for (const query of invalidQueries) {
        const invalid = await list(query);
        expect(invalid.status).toBe(400);
        expect(invalid.body.type).toBe(problem('validation-failed'));
      }
    });

    it('route: GET .../publish-jobs returns the list (200 with items), not the senses/:id handler, and a learner gets 403 forbidden', async () => {
      const response = await list();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [], next_page_token: null });
      const learner = await seedUser(ctx.prisma, { verified: true });
      const denied = await list({}, (await startSession(ctx, learner.userId)).accessToken);
      expect(denied.status).toBe(403);
      expect(denied.body.type).toBe(problem('forbidden'));
    });
  });
});

describe('publish jobs (e2e, real shared worker)', () => {
  let ctx: TestApp;
  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), redisUrl: inject('redisUrl'),
      pipeline: { runWorkers: true, reconcileSeconds: 60 } });
    await ctx.app.get(JobReconcilerService).runOnce();
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#45b (worker): HTTP producer registers the real handler and the shared runner finishes succeeded', async () => {
    const actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    const token = (await startSession(ctx, actorId)).accessToken;
    const sense = await ready(ctx, actorId);
    expect(ctx.app.get(JobHandlerRegistry).get('content-publish')).toBe(ctx.app.get(PublishJobHandler));
    const accepted = await ctx.http().post(endpoint).set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID()).send({ filter: { senseIds: [sense.senseId] } });
    expect(accepted.status).toBe(202);
    const id = accepted.body.job_id as string;
    await expect.poll(async () => (await ctx.prisma.backgroundJob.findUniqueOrThrow({ where: { id } })).status,
      { timeout: 30_000, interval: 20 }).toBe('succeeded');
    expect(await ctx.prisma.publishJob.findUniqueOrThrow({ where: { id } })).toMatchObject({
      snapshotCount: 1, notReadyCount: 0, counters: { processed: 1, pending: 0, published: 1, already_published: 0, refused: 0 },
    });
    expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: sense.senseId } })).toMatchObject({ liveRevisionId: sense.revisionId });
    const queue = await ctx.app.get(JobQueueService).getQueue('content-publish');
    await expect.poll(() => queue.getJob(id), { timeout: 5_000 }).toBeUndefined();
  }, 60_000);
});
