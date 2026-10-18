import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import { afterEach, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
import { BackgroundJobsService, makeJobContext } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { JobQueueService } from '../../src/content-pipeline/jobs/job-queue.service.js';
import { JobReconcilerService } from '../../src/content-pipeline/jobs/job-reconciler.service.js';
import { LeaseLostError, type JobHandler } from '../../src/content-pipeline/jobs/job-types.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

describe('queue, runner and reconciler (e2e, isolated database)', () => {
  let databaseUrl: string;
  const apps: TestApp[] = [];
  const queues: Queue[] = [];
  const connections: Redis[] = [];
  const workers: Worker[] = [];
  const containers: StartedRedisContainer[] = [];
  const polling = { timeout: 10_000 };

  const start = async (opts: {
    pipeline?: Partial<AppConfig['pipeline']>; redisUrl?: string; handler?: JobHandler;
  } = {}) => {
    const ctx = await createTestApp({
      databaseUrl, redisUrl: opts.redisUrl ?? inject('redisUrl'),
      pipeline: { reconcileSeconds: 60, ...opts.pipeline },
      jobHandlers: opts.handler ? [opts.handler] : [],
    });
    apps.push(ctx);
    return ctx;
  };
  const rawQueue = (ctx: TestApp) => {
    const config = ctx.app.get<AppConfig>(APP_CONFIG);
    const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
    connections.push(connection);
    // BullMQ forbids ':' in a name; prefix + name gives the requested qualified namespace.
    const queue = new Queue('content-import', { connection, prefix: config.pipeline.queuePrefix });
    queues.push(queue);
    return { queue, connection };
  };
  const create = (ctx: TestApp, exclusiveKey?: string) => ctx.prisma.$transaction((tx) =>
    ctx.app.get(BackgroundJobsService).create(tx, {
      queue: 'content-import', createdBy: randomUUID(), operationId: randomUUID(), exclusiveKey,
    }));
  const enqueue = (ctx: TestApp, id: string) => ctx.app.get(JobQueueService).enqueue('content-import', id);
  const reconcile = (ctx: TestApp) => ctx.app.get(JobReconcilerService).runOnce();
  const status = async (ctx: TestApp, id: string) => (await ctx.app.get(BackgroundJobsService).get(id))?.status;
  const marker = (effects: string[]): JobHandler => ({
    queue: 'content-import', run: async (job) => {
      await job.tx(async () => { effects.push(job.jobId); });
      return 'succeeded';
    },
  });
  const startConsumer = (ctx: TestApp, handler: JobHandler) => start({
    handler, pipeline: { runWorkers: true, queuePrefix: ctx.app.get<AppConfig>(APP_CONFIG).pipeline.queuePrefix },
  });

  beforeAll(async () => { databaseUrl = await createIsolatedDatabase(); });
  beforeEach(async () => {
    const ctx = await start();
    await ctx.prisma.backgroundJob.deleteMany();
  });
  afterEach(async () => {
    const failures: unknown[] = [];
    for (const ctx of apps.splice(0)) {
      try { await ctx.close(); } catch (err) { failures.push(err); }
    }
    for (const worker of workers.splice(0)) {
      try { await worker.close(); } catch (err) { failures.push(err); }
    }
    for (const queue of queues.splice(0)) {
      try { await queue.obliterate({ force: true }); } catch (err) { failures.push(err); }
      try { await queue.close(); } catch (err) { failures.push(err); }
    }
    for (const connection of connections.splice(0)) connection.disconnect();
    for (const container of containers.splice(0)) {
      try { await container.stop(); } catch (err) { failures.push(err); }
    }
    if (failures.length) throw new AggregateError(failures, 'Queue test cleanup failed');
  });

  it('B2#4 (queue): enqueue stores the supplied id with retry and removal options', async () => {
    const ctx = apps[0];
    const id = await create(ctx);
    const { queue } = rawQueue(ctx);
    expect(await enqueue(ctx, id)).toBe(true);
    const job = await queue.getJob(id);
    expect(job?.id).toBe(id);
    expect(job?.name).toBe('content-import');
    expect(job?.data).toEqual({});
    expect(job?.opts).toMatchObject({
      attempts: 3, backoff: { type: 'exponential', delay: 10, jitter: 0.5 },
      removeOnComplete: true, removeOnFail: true,
    });
    expect(await job?.getState()).toBe('waiting');
    expect(await status(ctx, id)).toBe('queued');
  });

  it('B2E14: unreachable Redis returns false without rejecting or changing the database row', async () => {
    const ctx = await start({ redisUrl: 'redis://127.0.0.1:1' });
    const id = await create(ctx);
    const before = await ctx.app.get(BackgroundJobsService).get(id);
    await expect(enqueue(ctx, id)).resolves.toBe(false);
    expect(await ctx.app.get(BackgroundJobsService).get(id)).toEqual(before);
    expect(ctx.logs).toContainEqual(expect.objectContaining({ level: 'warn', event: 'job_enqueue_failed' }));
  });

  it('B2#36: duplicates while waiting and after completion apply the handler effect only once', async () => {
    const effects: string[] = [];
    const ctx = await start({ handler: marker(effects) });
    const id = await create(ctx);
    const { queue } = rawQueue(ctx);
    expect(await enqueue(ctx, id)).toBe(true);
    expect(await enqueue(ctx, id)).toBe(true);
    expect(await queue.getWaitingCount()).toBe(1);
    expect(effects).toEqual([]);
    await startConsumer(ctx, marker(effects));
    await expect.poll(() => status(ctx, id), polling).toBe('succeeded');
    await expect.poll(() => queue.getJob(id), polling).toBeUndefined();
    expect(effects).toEqual([id]);
    expect(await enqueue(ctx, id)).toBe(true);
    await expect.poll(() => queue.getJob(id), polling).toBeUndefined();
    expect(effects).toEqual([id]);
    expect(await ctx.app.get(BackgroundJobsService).get(id)).toMatchObject({ attempts: 1, leaseEpoch: 1 });
  });

  it('B2#4 (API): runWorkers false starts neither consumers nor reconciliation', async () => {
    const effects: string[] = [];
    const ctx = await start({ handler: marker(effects), pipeline: { runWorkers: false, reconcileSeconds: 0.05, jobAttempts: 1 } });
    const id = await create(ctx);
    const expiredId = await create(ctx);
    const jobs = ctx.app.get(BackgroundJobsService);
    await jobs.acquire(expiredId, 'crashed');
    ctx.clock.advance(6_001);
    const before = await jobs.get(expiredId);
    const { queue } = rawQueue(ctx);
    expect(await enqueue(ctx, id)).toBe(true);
    await sleep(350); // Longer than several configured reconciliation ticks, using real time.
    expect(await (await queue.getJob(id))?.getState()).toBe('waiting');
    expect(effects).toEqual([]);
    expect(await jobs.get(expiredId)).toEqual(before);
    expect(await ctx.prisma.backgroundJob.count({ where: { status: 'failed' } })).toBe(0);
  });

  it('B2#34: BullMQ retries ordinary errors and the last attempt finishes failed instead of releasing', async () => {
    const attempts: number[] = [];
    const ctx = await start({ pipeline: { runWorkers: true, jobAttempts: 2 }, handler: {
      queue: 'content-import', run: async (job) => {
        attempts.push(job.attempt);
        throw new TypeError('Expected handler failure');
      },
    } });
    const id = await create(ctx);
    const { queue } = rawQueue(ctx);
    expect(await enqueue(ctx, id)).toBe(true);
    await expect.poll(() => status(ctx, id), polling).toBe('failed');
    await expect.poll(() => queue.getJob(id), polling).toBeUndefined();
    expect(attempts).toEqual([1, 2]);
    expect(await ctx.app.get(BackgroundJobsService).get(id)).toMatchObject({
      status: 'failed', attempts: 2, finishedAt: ctx.clock.now(),
      errorSummary: 'TypeError: Expected handler failure',
    });
  });

  it('B2#38: losing only this prefix in Redis is repaired from Postgres and the job finishes', async () => {
    const ctx = apps[0];
    const id = await create(ctx);
    const { queue, connection } = rawQueue(ctx);
    expect(await enqueue(ctx, id)).toBe(true);
    const prefix = ctx.app.get<AppConfig>(APP_CONFIG).pipeline.queuePrefix;
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, found] = await connection.scan(cursor, 'MATCH', `${prefix}:*`, 'COUNT', 100);
      cursor = next;
      keys.push(...found);
    } while (cursor !== '0');
    expect(keys.length).toBeGreaterThan(0);
    await connection.del(...keys);
    expect(await queue.getJob(id)).toBeUndefined();
    expect(await reconcile(ctx)).toEqual({ requeued: 1, failed: 0 });
    expect((await queue.getJob(id))?.id).toBe(id);
    const effects: string[] = [];
    await startConsumer(ctx, marker(effects));
    await expect.poll(() => status(ctx, id), polling).toBe('succeeded');
    expect(effects).toEqual([id]);
  });

  it('B2#37 (integration): a crashed owner is requeued only after expiry and the next worker acquires a new epoch', async () => {
    const ctx = apps[0];
    const id = await create(ctx);
    const jobs = ctx.app.get(BackgroundJobsService);
    expect(await jobs.acquire(id, 'crashed')).toEqual({ epoch: 1, attempts: 1 });
    const oldContext = makeJobContext(ctx.prisma, id, 1, 1);
    const running = await jobs.get(id);
    const { queue } = rawQueue(ctx);
    ctx.clock.advance(6_000);
    expect(await reconcile(ctx)).toEqual({ requeued: 0, failed: 0 });
    expect(await jobs.get(id)).toEqual(running);
    expect(await queue.getJob(id)).toBeUndefined();
    ctx.clock.advance(1);
    expect(await reconcile(ctx)).toEqual({ requeued: 1, failed: 0 });
    expect(await jobs.get(id)).toMatchObject({ status: 'queued', leaseOwner: null, leaseExpiresAt: null, attempts: 1 });
    await expect(oldContext.tx(async () => {})).rejects.toThrow(LeaseLostError);
    expect((await queue.getJob(id))?.id).toBe(id);
    const effects: string[] = [];
    await startConsumer(ctx, marker(effects));
    await expect.poll(() => status(ctx, id), polling).toBe('succeeded');
    expect(await jobs.get(id)).toMatchObject({ attempts: 2, leaseEpoch: 3 });
    expect(effects).toEqual([id]);
  });

  it('B2#37: an expired lease at the database attempt limit is failed and never enqueued', async () => {
    const ctx = await start({ pipeline: { jobAttempts: 1 } });
    const id = await create(ctx);
    await ctx.app.get(BackgroundJobsService).acquire(id, 'crashed');
    ctx.clock.advance(6_001);
    const { queue } = rawQueue(ctx);
    expect(await reconcile(ctx)).toEqual({ requeued: 0, failed: 1 });
    expect(await ctx.app.get(BackgroundJobsService).get(id)).toMatchObject({
      status: 'failed', attempts: 1, finishedAt: ctx.clock.now(), errorSummary: 'lease expired after max attempts',
    });
    expect(await queue.getJob(id)).toBeUndefined();
  });

  it('B2#37: worker bootstrap starts recurring reconciliation for leases created after startup', async () => {
    const ctx = await start({ pipeline: { runWorkers: true, reconcileSeconds: 0.05, jobAttempts: 1 } });
    rawQueue(ctx); // Track this namespace for afterEach obliteration, including a queued-scan race.
    // Finish the initial scan before creating a job, so only a later timer tick can repair it.
    await reconcile(ctx);
    const id = await create(ctx);
    await ctx.app.get(BackgroundJobsService).acquire(id, 'crashed-after-startup');
    ctx.clock.advance(6_001);
    await expect.poll(() => status(ctx, id), polling).toBe('failed');
    expect(await ctx.app.get(BackgroundJobsService).get(id)).toMatchObject({
      attempts: 1, errorSummary: 'lease expired after max attempts',
    });
  });

  it.each([1, 3])('B2#37: reconciliation at attempt %s cannot take a lease renewed while its write waits', async (attempts) => {
    const ctx = apps[0];
    const id = await create(ctx);
    const jobs = ctx.app.get(BackgroundJobsService);
    await jobs.acquire(id, 'live-owner');
    await ctx.prisma.backgroundJob.update({ where: { id }, data: { attempts } });
    ctx.clock.advance(6_001);
    const observer = new pg.Client({ connectionString: databaseUrl });
    await observer.connect();
    let pending: ReturnType<typeof reconcile> | undefined;
    try {
      await observer.query('BEGIN');
      await observer.query('SELECT id FROM background_jobs WHERE id = $1::uuid FOR UPDATE', [id]);
      const { rows: [{ pid }] } = await observer.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
      pending = reconcile(ctx);
      void pending.catch(() => {});
      await expect.poll(async () => {
        const { rows } = await observer.query<{ blocked: boolean }>(`
          SELECT EXISTS (SELECT 1 FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock'
              AND $1::int = ANY(pg_blocking_pids(pid))
              AND query LIKE '%background_jobs%') AS blocked
        `, [pid]);
        return rows[0].blocked;
      }, { timeout: 5_000 }).toBe(true);
      const renewedUntil = new Date(ctx.clock.now().getTime() + 6_000);
      await observer.query('UPDATE background_jobs SET lease_expires_at = $2 WHERE id = $1::uuid', [id, renewedUntil]);
      await observer.query('COMMIT');
      expect(await pending).toEqual({ requeued: 0, failed: 0 });
      expect(await jobs.get(id)).toMatchObject({ status: 'running', leaseOwner: 'live-owner', leaseExpiresAt: renewedUntil });
      expect(await rawQueue(ctx).queue.getJob(id)).toBeUndefined();
    } finally {
      await observer.query('ROLLBACK');
      await pending?.catch(() => {});
      await observer.end();
    }
  });

  it.each(['failed', 'completed'] as const)('B2#38: a kept %s Redis job is removed before its queued database id is re-added', async (terminal) => {
    const ctx = apps[0];
    const id = await create(ctx);
    const { queue, connection } = rawQueue(ctx);
    const worker = new Worker(queue.name, async () => {
      if (terminal === 'failed') throw new Error('Kept Redis failure');
    }, { connection, prefix: ctx.app.get<AppConfig>(APP_CONFIG).pipeline.queuePrefix });
    workers.push(worker);
    await worker.waitUntilReady();
    const stale = await queue.add('content-import', { stale: true }, { jobId: id });
    await expect.poll(() => stale.getState(), polling).toBe(terminal);
    await worker.close();
    expect(await status(ctx, id)).toBe('queued');
    expect(await reconcile(ctx)).toEqual({ requeued: 1, failed: 0 });
    const replacement = await queue.getJob(id);
    expect(await replacement?.getState()).toBe('waiting');
    expect(replacement?.data).toEqual({});
    const effects: string[] = [];
    await startConsumer(ctx, marker(effects));
    await expect.poll(() => status(ctx, id), polling).toBe('succeeded');
    expect(effects).toEqual([id]);
  });

  it('B2#39: an exclusive-key acquire miss completes Redis without changing or retrying the queued row', async () => {
    const effects: string[] = [];
    const ctx = await start({ handler: marker(effects) });
    const key = `import:${randomUUID()}`;
    const heldId = await create(ctx, key);
    const id = await create(ctx, key);
    await ctx.app.get(BackgroundJobsService).acquire(heldId, 'other-owner');
    const before = await ctx.app.get(BackgroundJobsService).get(id);
    const { queue } = rawQueue(ctx);
    expect(await enqueue(ctx, id)).toBe(true);
    await startConsumer(ctx, marker(effects));
    await expect.poll(() => queue.getJob(id), polling).toBeUndefined();
    expect(await ctx.app.get(BackgroundJobsService).get(id)).toEqual(before);
    expect(effects).toEqual([]);
  });

  it('B2#37: LeaseLostError from ctx.tx completes Redis without finishing, releasing or retrying the newer owner', async () => {
    let ctx: TestApp;
    const runs: number[] = [];
    const handler: JobHandler = { queue: 'content-import', run: async (job) => {
      runs.push(job.epoch);
      ctx.clock.advance(6_001);
      await ctx.app.get(BackgroundJobsService).acquire(job.jobId, 'new-owner');
      await expect(job.tx(async () => { throw new Error('Must never reach callback'); })).rejects.toThrow(LeaseLostError);
      return job.tx(async () => 'succeeded' as const);
    } };
    ctx = await start({ handler, pipeline: { runWorkers: true } });
    const id = await create(ctx);
    const { queue } = rawQueue(ctx);
    expect(await enqueue(ctx, id)).toBe(true);
    await expect.poll(() => queue.getJob(id), polling).toBeUndefined();
    expect(runs).toEqual([1]);
    expect(await ctx.app.get(BackgroundJobsService).get(id)).toMatchObject({
      status: 'running', leaseOwner: 'new-owner', leaseEpoch: 2, attempts: 2, finishedAt: null,
    });
  });

  it('B2#37: heartbeat uses real intervals while expiry comparisons use FakeClock', async () => {
    let unblock!: () => void;
    const hold = new Promise<void>((resolve) => { unblock = resolve; });
    const ctxReady: JobHandler = { queue: 'content-import', run: async () => { await hold; return 'partial'; } };
    const ctx = await start({ handler: ctxReady, pipeline: { runWorkers: true, heartbeatSeconds: 0.05 } });
    rawQueue(ctx);
    const id = await create(ctx);
    const jobs = ctx.app.get(BackgroundJobsService);
    try {
      expect(await enqueue(ctx, id)).toBe(true);
      await expect.poll(() => status(ctx, id), polling).toBe('running');
      ctx.clock.advance(3_000);
      await expect.poll(async () => (await jobs.get(id))?.leaseExpiresAt?.getTime(), polling)
        .toBe(ctx.clock.now().getTime() + 6_000);
      unblock();
      await expect.poll(() => status(ctx, id), polling).toBe('partial');
      const finished = await jobs.get(id);
      ctx.clock.advance(3_000);
      await sleep(150);
      expect(await jobs.get(id)).toEqual(finished);
    } finally { unblock(); }
  });

  it('B2E15: a dedicated allkeys-lru Redis still enqueues and processes jobs', async () => {
    const container = await new RedisContainer('redis:7.4-alpine')
      .withCommand(['redis-server', '--maxmemory-policy', 'allkeys-lru'])
      .withStartupTimeout(30_000).start();
    containers.push(container);
    const effects: string[] = [];
    const ctx = await start({ redisUrl: container.getConnectionUrl(), handler: marker(effects), pipeline: { runWorkers: true } });
    const { connection } = rawQueue(ctx);
    expect(await connection.config('GET', 'maxmemory-policy')).toEqual(['maxmemory-policy', 'allkeys-lru']);
    const id = await create(ctx);
    expect(await enqueue(ctx, id)).toBe(true);
    await expect.poll(() => status(ctx, id), polling).toBe('succeeded');
    expect(effects).toEqual([id]);
    // BullMQ itself warns via console.warn when reading INFO; it does not use AppLogger.
  }, 60_000);
});
