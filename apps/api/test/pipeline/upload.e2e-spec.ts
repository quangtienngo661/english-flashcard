import { createHash, randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { Response } from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
import { OWNER_SOURCE_ID } from '../../src/content/index.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';

const endpoint = '/v1/admin/content/uploads';
const csv = Buffer.from('headword,pos\r\nbank,noun\r\nrun,verb\r\n');
const levelCsv = Buffer.from('headword,pos,cefr\r\nbank,noun,B1\r\n');
const invalidUtf8 = Buffer.from([0xc3, 0x28]);

describe('uploads (e2e, isolated database, no workers)', () => {
  let databaseUrl: string;
  let ctx: TestApp;
  let editor: { userId: string; accessToken: string };
  const apps: TestApp[] = [];
  const queues: Queue[] = [];
  const connections: Redis[] = [];

  const rawQueue = (app: TestApp) => {
    const config = app.app.get<AppConfig>(APP_CONFIG);
    const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
    connections.push(connection);
    const queue = new Queue('content-import', { connection, prefix: config.pipeline.queuePrefix });
    queues.push(queue);
    return queue;
  };
  const upload = (bytes: Buffer | undefined, opts: {
    key?: string; sourceId?: string; fileName?: string; app?: TestApp; token?: string;
  } = {}) => {
    const req = (opts.app ?? ctx).http().post(endpoint)
      .set('Authorization', `Bearer ${opts.token ?? editor.accessToken}`)
      .set('Idempotency-Key', opts.key ?? randomUUID());
    if (opts.sourceId !== undefined) req.field('level_source_id', opts.sourceId);
    if (bytes !== undefined) req.attach('file', bytes, {
      filename: opts.fileName ?? 'vocabulary.csv', contentType: 'text/csv',
    });
    return req;
  };
  const registerSource = async (metadata: { version?: string; license?: string } = {}) => {
    const res = await ctx.http().post('/v1/admin/content/sources')
      .set('Authorization', `Bearer ${editor.accessToken}`)
      .send({ name: `upload-${randomUUID()}`, version: '1.5', license: 'test license',
        display_priority: 10, ...metadata });
    expect(res.status).toBe(201);
    return res.body.id as string;
  };
  const snapshot = async (app = ctx) => ({
    jobs: await app.prisma.backgroundJob.findMany({ orderBy: { id: 'asc' } }),
    batches: await app.prisma.importBatch.findMany({ orderBy: { id: 'asc' } }),
    files: await app.prisma.importBatchFile.findMany({ orderBy: { batchId: 'asc' } }),
  });
  const expectEmpty = async (app = ctx) => {
    expect(await snapshot(app)).toEqual({ jobs: [], batches: [], files: [] });
  };
  const expectProblem = (res: Response, status: number, slug: string, app = ctx) => {
    const config = app.app.get<AppConfig>(APP_CONFIG);
    expect(res.status).toBe(status);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({
      type: `${config.problemTypeBase}${slug}`, status, title: expect.any(String),
      instance: endpoint, operation_id: expect.stringMatching(/^[0-9a-f-]{36}$/u),
    });
  };
  const expectAccepted = (res: Response) => {
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ batch_id: expect.stringMatching(/^[0-9a-f-]{36}$/u), status: 'queued' });
  };

  beforeAll(async () => { databaseUrl = await createIsolatedDatabase(); });
  beforeEach(async () => {
    ctx = await createTestApp({ databaseUrl, redisUrl: inject('redisUrl'), pipeline: { runWorkers: false } });
    apps.push(ctx);
    rawQueue(ctx); // Track this random namespace for cleanup, including jobs created by later requests.
    await ctx.prisma.backgroundJob.deleteMany();
    await ctx.prisma.idempotencyKey.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    const user = await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' });
    editor = { ...user, ...(await startSession(ctx, user.userId)) };
  });
  afterEach(async () => {
    const failures: unknown[] = [];
    for (const app of apps.splice(0)) {
      try { await app.close(); } catch (error) { failures.push(error); }
    }
    for (const queue of queues.splice(0)) {
      try { await queue.obliterate({ force: true }); } catch (error) { failures.push(error); }
      try { await queue.close(); } catch (error) { failures.push(error); }
    }
    for (const connection of connections.splice(0)) connection.disconnect();
    if (failures.length) throw new AggregateError(failures, 'Upload test cleanup failed');
  });

  it.each(['version', 'license'] as const)(
    'B2#1: an incomplete third-party source with empty %s rejects before valid, broken or missing files and stores nothing',
    async (field) => {
      const sourceId = await registerSource({ [field]: '' });
      for (const bytes of [levelCsv, invalidUtf8, undefined]) {
        const res = await upload(bytes, { sourceId });
        expectProblem(res, 400, 'source-incomplete');
        await expectEmpty();
      }
    },
  );

  it('B2#1: an unknown level source returns 404 before parsing a broken file and stores nothing', async () => {
    const res = await upload(invalidUtf8, { sourceId: randomUUID() });
    expectProblem(res, 404, 'not-found');
    await expectEmpty();
  });

  it('B2#2: a CEFR column without level_source_id returns level-source-required and stores nothing', async () => {
    const res = await upload(levelCsv);
    expectProblem(res, 400, 'level-source-required');
    await expectEmpty();
  });

  it('B2#3 (http): one byte over the configured limit returns the complete file-too-large Problem Details response', async () => {
    const config = ctx.app.get<AppConfig>(APP_CONFIG);
    const bytes = Buffer.alloc(config.pipeline.importMaxBytes + 1, 'x');
    const res = await upload(bytes);
    expectProblem(res, 413, 'file-too-large');
    expect(res.body.type).not.toBe('about:blank');
    expect(res.body).toEqual({
      type: `${config.problemTypeBase}file-too-large`, status: 413,
      title: expect.any(String), detail: expect.any(String), instance: endpoint,
      operation_id: expect.stringMatching(/^[0-9a-f-]{36}$/u),
    });
    expect(res.body.title.length).toBeGreaterThan(0);
    expect(res.body.detail.length).toBeGreaterThan(0);
    await expectEmpty();
  });

  it.each([
    ['invalid UTF-8', invalidUtf8, /CSV UTF-8/u],
    ['no header row', Buffer.from('\r\n'), /no header row/u],
    ['zero data rows', Buffer.from('headword,pos\r\n'), /no data rows/u],
  ] as const)('B2#3 (http): %s returns file-invalid and stores nothing', async (_, bytes, detail) => {
    const res = await upload(bytes);
    expectProblem(res, 400, 'file-invalid');
    expect(res.body.detail).toMatch(detail);
    await expectEmpty();
  });

  it('B2#3 (http): a multipart form with no file part returns file-invalid and stores nothing', async () => {
    const res = await upload(undefined, { sourceId: OWNER_SOURCE_ID });
    expectProblem(res, 400, 'file-invalid');
    expect(res.body.detail).toMatch(/no file.*uploaded/iu);
    await expectEmpty();
  });

  it('B2#3 (http): too many rows maps the parser file-too-large error and stores nothing', async () => {
    const config = ctx.app.get<AppConfig>(APP_CONFIG);
    const bytes = Buffer.from(`headword,pos\n${'bank,noun\n'.repeat(config.pipeline.importMaxRows + 1)}`);
    expect(bytes.length).toBeLessThan(config.pipeline.importMaxBytes);
    const res = await upload(bytes);
    expectProblem(res, 413, 'file-too-large');
    expect(res.body.detail).toContain('data rows');
    await expectEmpty();
  });

  it('B2#3 (http): malformed multipart source fields return validation-failed and store nothing', async () => {
    for (const sourceId of ['', 'not-a-uuid']) {
      const res = await upload(csv, { sourceId });
      expectProblem(res, 400, 'validation-failed');
      await expectEmpty();
    }
  });

  it('B2#4: a valid upload stores one queued job, batch, exact bytes and SHA-256, and enqueues the batch id', async () => {
    const fileName = 'two-words.csv';
    const res = await upload(csv, { fileName });
    expectAccepted(res);
    const batchId = res.body.batch_id as string;
    const stored = await snapshot();
    expect(stored.jobs).toHaveLength(1);
    expect(stored.jobs[0]).toMatchObject({
      id: batchId, queue: 'content-import', status: 'queued', createdBy: editor.userId,
      exclusiveKey: null, attempts: 0, leaseEpoch: 0, operationId: expect.stringMatching(/^[0-9a-f-]{36}$/u),
    });
    expect(stored.batches).toHaveLength(1);
    expect(stored.batches[0]).toMatchObject({
      id: batchId, levelSourceId: null, fileName,
      fileSha256: createHash('sha256').update(csv).digest('hex'), fileSize: csv.length,
      rowCount: 2, rawHeaders: ['headword', 'pos'], warnings: [], counters: {},
    });
    expect(stored.files).toHaveLength(1);
    expect(stored.files[0].batchId).toBe(batchId);
    expect(Buffer.from(stored.files[0].content)).toEqual(csv);
    const job = await queues[0].getJob(batchId);
    expect(job?.id).toBe(batchId);
    expect(job?.name).toBe('content-import');
    expect(await job?.getState()).toBe('waiting');

    const offline = await createTestApp({
      databaseUrl, redisUrl: 'redis://127.0.0.1:1', pipeline: { runWorkers: false },
    });
    apps.push(offline);
    const session = await startSession(offline, editor.userId);
    const offlineRes = await upload(csv, { app: offline, token: session.accessToken });
    expectAccepted(offlineRes);
    expect(offlineRes.body.batch_id).not.toBe(batchId);
    expect(await offline.prisma.backgroundJob.findUniqueOrThrow({ where: { id: offlineRes.body.batch_id } }))
      .toMatchObject({ status: 'queued', attempts: 0 });
    expect(await offline.prisma.importBatch.findUniqueOrThrow({ where: { id: offlineRes.body.batch_id } }))
      .toMatchObject({ fileSha256: createHash('sha256').update(csv).digest('hex'), rowCount: 2 });
    expect(Buffer.from((await offline.prisma.importBatchFile.findUniqueOrThrow({
      where: { batchId: offlineRes.body.batch_id },
    })).content)).toEqual(csv);
    expect(offline.logs).toContainEqual(expect.objectContaining({ level: 'warn', event: 'job_enqueue_failed' }));
    expect(await offline.prisma.backgroundJob.count()).toBe(2);
    expect(await offline.prisma.importBatch.count()).toBe(2);
    expect(await offline.prisma.importBatchFile.count()).toBe(2);
  }, 15_000);

  it('B2#5: the same key, file and source replay; changed file bytes or source reject without another batch', async () => {
    const sourceId = await registerSource();
    const otherSourceId = await registerSource();
    const key = randomUUID();
    const first = await upload(levelCsv, { key, sourceId });
    expectAccepted(first);
    const before = await snapshot();
    expect(before.jobs).toHaveLength(1);
    expect(before.batches).toHaveLength(1);
    expect(before.files).toHaveLength(1);
    expect(before.jobs[0].exclusiveKey).toBe(`content-import:${sourceId}`);
    expect(before.batches[0].levelSourceId).toBe(sourceId);
    const replay = await upload(levelCsv, { key, sourceId });
    expectAccepted(replay);
    expect(replay.body).toEqual(first.body);
    expect(await snapshot()).toEqual(before);
    const changedFile = await upload(Buffer.from('headword,pos,cefr\r\nbank,noun,B2\r\n'), { key, sourceId });
    expect(changedFile.status).toBe(400);
    expect(changedFile.headers['content-type']).toContain('application/problem+json');
    expect(changedFile.body.title).toBe('Idempotency-Key reused with a different payload');
    expect(await snapshot()).toEqual(before);
    const changedSource = await upload(levelCsv, { key, sourceId: otherSourceId });
    expect(changedSource.status).toBe(400);
    expect(changedSource.body.title).toBe('Idempotency-Key reused with a different payload');
    expect(await snapshot()).toEqual(before);
    expect(await queues[0].getWaitingCount()).toBe(1);
  });

  it('B2E28: identical file bytes with different keys create two separate batches', async () => {
    const first = await upload(csv, { key: randomUUID() });
    const second = await upload(csv, { key: randomUUID() });
    expectAccepted(first);
    expectAccepted(second);
    expect(second.body.batch_id).not.toBe(first.body.batch_id);
    const stored = await snapshot();
    expect(stored.jobs).toHaveLength(2);
    expect(stored.batches).toHaveLength(2);
    expect(stored.files).toHaveLength(2);
    expect(stored.batches.map(({ id }) => id).sort()).toEqual([first.body.batch_id, second.body.batch_id].sort());
    for (const file of stored.files) expect(Buffer.from(file.content)).toEqual(csv);
  });

  it('B2E31: an orphaned in_progress key returns idempotency-key-abandoned and creates no batch', async () => {
    const key = randomUUID();
    const fileHash = createHash('sha256').update(csv).digest('hex');
    const payloadHash = createHash('sha256').update(JSON.stringify({}))
      .update(JSON.stringify([fileHash, 'file'])).digest('hex');
    // Like B0E1 in idempotency.service.e2e-spec.ts: a committed row with nobody holding its lock.
    await ctx.prisma.idempotencyKey.create({ data: {
      key, userId: editor.userId, endpoint, status: 'in_progress', payloadHash,
    } });
    const before = await ctx.prisma.idempotencyKey.findUniqueOrThrow({
      where: { key_userId_endpoint: { key, userId: editor.userId, endpoint } },
    });
    const res = await upload(csv, { key });
    expectProblem(res, 409, 'idempotency-key-abandoned');
    await expectEmpty();
    expect(await ctx.prisma.idempotencyKey.findUniqueOrThrow({
      where: { key_userId_endpoint: { key, userId: editor.userId, endpoint } },
    })).toEqual(before);
  });

  it('B2E27: the seeded owner source needs neither version nor license and accepts a level upload', async () => {
    expect(await ctx.prisma.dataSource.findUniqueOrThrow({ where: { id: OWNER_SOURCE_ID } }))
      .toMatchObject({ kind: 'owner', version: '', license: '' });
    const res = await upload(levelCsv, { sourceId: OWNER_SOURCE_ID });
    expectAccepted(res);
    expect(await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id: res.body.batch_id } }))
      .toMatchObject({ levelSourceId: OWNER_SOURCE_ID, rowCount: 1 });
    expect(await ctx.prisma.backgroundJob.findUniqueOrThrow({ where: { id: res.body.batch_id } }))
      .toMatchObject({ status: 'queued', exclusiveKey: `content-import:${OWNER_SOURCE_ID}` });
    expect(await ctx.prisma.importBatchFile.count()).toBe(1);
  });

  it('B2#28: unknown columns become human-readable batch warnings and raw headers retain their original spelling', async () => {
    const bytes = Buffer.from(' Headword ,POS,glos_vi,unsupported,_error\r\nbank,noun,ignored,ignored,ignored\r\n');
    const res = await upload(bytes);
    expectAccepted(res);
    const batch = await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id: res.body.batch_id } });
    expect(batch.rawHeaders).toEqual([' Headword ', 'POS', 'glos_vi', 'unsupported', '_error']);
    expect(batch.warnings).toEqual([
      'Unknown column "glos_vi" is ignored. Check its spelling if you intended a supported column.',
      'Unknown column "unsupported" is ignored. Check its spelling if you intended a supported column.',
    ]);
  });
});
