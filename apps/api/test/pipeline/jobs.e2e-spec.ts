import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BackgroundJobsService, makeJobContext } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { LeaseLostError } from '../../src/content-pipeline/jobs/job-types.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { testConfig } from '../support/test-config.js';

describe('background jobs (e2e, isolated database)', () => {
  let ctx: TestApp;
  let jobs: BackgroundJobsService;
  let observer: pg.Client;
  const config = testConfig();
  const leaseMs = config.pipeline.leaseSeconds * 1000;
  const create = (input: { id?: string; exclusiveKey?: string } = {}) => ctx.prisma.$transaction((tx) => jobs.create(tx, {
    ...input, queue: 'content-import', createdBy: randomUUID(), operationId: randomUUID(),
  }));
  const createBatch = async () => {
    const id = await create();
    await ctx.prisma.importBatch.create({ data: {
      id, fileName: 'marker.csv', fileSha256: 'a'.repeat(64), fileSize: 1, rowCount: 1,
      rawHeaders: ['headword'], warnings: [], counters: { processed: 0 },
    } });
    return id;
  };

  beforeAll(async () => {
    const databaseUrl = await createIsolatedDatabase();
    ctx = await createTestApp({ databaseUrl, pipeline: config.pipeline });
    jobs = ctx.app.get(BackgroundJobsService);
    observer = new pg.Client({ connectionString: databaseUrl });
    await observer.connect();
  });
  beforeEach(async () => {
    await ctx.prisma.backgroundJob.deleteMany();
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
  });
  afterAll(async () => {
    try { await observer?.end(); } finally { await ctx?.close(); }
  });

  it('B2#37: create preserves supplied ids and metadata and otherwise uses a generated id', async () => {
    const id = randomUUID();
    const createdBy = randomUUID();
    const operationId = randomUUID();
    expect(await ctx.prisma.$transaction((tx) => jobs.create(tx, {
      id, queue: 'content-publish', createdBy, operationId, exclusiveKey: 'publish:marker',
    }))).toBe(id);
    expect(await jobs.get(id)).toMatchObject({
      id, queue: 'content-publish', createdBy, operationId, exclusiveKey: 'publish:marker',
      status: 'queued', attempts: 0, leaseEpoch: 0, leaseOwner: null, leaseExpiresAt: null,
      startedAt: null, finishedAt: null, errorSummary: null,
    });
    const generated = await create();
    expect(generated).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
    expect(await jobs.get(generated)).toMatchObject({ id: generated, exclusiveKey: null });
    expect(await jobs.get(randomUUID())).toBeNull();
    const rolledBack = randomUUID();
    await expect(ctx.prisma.$transaction(async (tx) => {
      await jobs.create(tx, { id: rolledBack, queue: 'content-import', createdBy, operationId });
      throw new Error('Rollback');
    })).rejects.toThrow('Rollback');
    expect(await jobs.get(rolledBack)).toBeNull();
  });

  it('B2#37: acquire bumps epoch and attempts, refuses a live lease and allows takeover only after expiry', async () => {
    const id = await create();
    const startedAt = ctx.clock.now();
    expect(await jobs.acquire(id, 'first')).toEqual({ epoch: 1, attempts: 1 });
    const running = await jobs.get(id);
    expect(running).toMatchObject({
      status: 'running', leaseOwner: 'first', leaseEpoch: 1, attempts: 1, startedAt,
      leaseExpiresAt: new Date(startedAt.getTime() + leaseMs),
    });
    expect(await jobs.acquire(id, 'second')).toBeNull();
    expect(await jobs.get(id)).toEqual(running);
    ctx.clock.advance(leaseMs);
    expect(await jobs.acquire(id, 'second')).toBeNull();
    expect(await jobs.get(id)).toEqual(running);
    ctx.clock.advance(1);
    expect(await jobs.acquire(id, 'second')).toEqual({ epoch: 2, attempts: 2 });
    expect(await jobs.get(id)).toMatchObject({
      status: 'running', leaseOwner: 'second', leaseEpoch: 2, attempts: 2, startedAt,
      leaseExpiresAt: new Date(ctx.clock.now().getTime() + leaseMs),
    });
    expect(await jobs.acquire(randomUUID(), 'missing')).toBeNull();
  });

  it('B2#37: takeover fences the old context, heartbeat, finish and release without writing anything', async () => {
    const id = await createBatch();
    const first = (await jobs.acquire(id, 'first'))!;
    const oldContext = makeJobContext(ctx.prisma, id, first.attempts, first.epoch);
    expect(oldContext).toMatchObject({ jobId: id, attempt: 1, epoch: 1 });
    ctx.clock.advance(leaseMs + 1);
    const second = await jobs.acquire(id, 'second');
    expect(second).toEqual({ epoch: 2, attempts: 2 });
    const takenOver = await jobs.get(id);
    let callbackRan = false;
    await expect(oldContext.tx(async (tx) => {
      callbackRan = true;
      await tx.importRowOutcome.create({ data: { batchId: id, rowNumber: 2, outcome: 'created' } });
    })).rejects.toThrow(LeaseLostError);
    expect(callbackRan).toBe(false);
    expect(await ctx.prisma.importRowOutcome.count({ where: { batchId: id } })).toBe(0);
    expect(await jobs.extend(id, first.epoch, 'first')).toBe(false);
    expect(await jobs.finish(id, first.epoch, 'failed', 'stale owner')).toBe(false);
    expect(await jobs.release(id, first.epoch)).toBe(false);
    expect(await jobs.get(id)).toEqual(takenOver);
    expect(await jobs.get(id)).toMatchObject({ status: 'running', leaseOwner: 'second', leaseEpoch: 2 });
  });

  it('B2#37: a missing job loses its lease before running the transaction callback', async () => {
    const id = randomUUID();
    let callbackRan = false;
    await expect(makeJobContext(ctx.prisma, id, 1, 1).tx(async () => {
      callbackRan = true;
    })).rejects.toThrow(`Lease lost for job ${id}`);
    expect(callbackRan).toBe(false);
  });

  it('B2E13: an open row transaction blocks takeover until commit and the next owner finds one completed write', async () => {
    const id = await createBatch();
    const first = (await jobs.acquire(id, 'first'))!;
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    let reportReady!: (pid: number) => void;
    let reportFailure!: (error: unknown) => void;
    const ready = new Promise<number>((resolve, reject) => { reportReady = resolve; reportFailure = reject; });
    const firstTx = makeJobContext(ctx.prisma, id, first.attempts, first.epoch).tx(async (tx) => {
      await tx.importRowOutcome.create({ data: { batchId: id, rowNumber: 2, outcome: 'created' } });
      const [{ pid }] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
      reportReady(pid);
      await hold;
    });
    // Attach rejection handling before waiting on the barrier, including assertion-failure cleanup.
    void firstTx.catch(reportFailure);
    let acquired = false;
    let takeover: Promise<{ epoch: number; attempts: number } | null> | undefined;
    try {
      const holderPid = await ready;
      ctx.clock.advance(leaseMs + 1);
      takeover = jobs.acquire(id, 'second').then((result) => { acquired = true; return result; });
      void takeover.catch(() => {});
      // Observe a real server-side lock wait from a separate connection. This control distinguishes
      // blocking on ctx.tx's FOR SHARE from a query that simply has not started yet; no elapsed-time
      // assertion is used. The deadline only bounds a broken test's polling.
      let blocked = false;
      const deadline = Date.now() + 5_000;
      while (!blocked && Date.now() < deadline) {
        const result = await observer.query<{ blocked: boolean }>(`
          SELECT EXISTS (
            SELECT 1 FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock'
              AND $1::int = ANY(pg_blocking_pids(pid))
              AND query LIKE '%UPDATE background_jobs%'
          ) AS blocked
        `, [holderPid]);
        blocked = result.rows[0].blocked;
        if (!blocked) await sleep(10);
      }
      expect(blocked).toBe(true);
      expect(acquired).toBe(false);
      // The marker is still uncommitted and invisible on the observer connection while acquire waits.
      expect((await observer.query('SELECT * FROM import_row_outcomes WHERE batch_id = $1::uuid', [id])).rows).toHaveLength(0);
      release();
      const second = await takeover;
      // A fresh connection sees the marker when acquire returns: the first transaction has committed,
      // regardless of the order in which client-side promise callbacks receive their server replies.
      expect((await observer.query('SELECT * FROM import_row_outcomes WHERE batch_id = $1::uuid', [id])).rows)
        .toMatchObject([{ row_number: 2, outcome: 'created' }]);
      await firstTx;
      expect(second).toEqual({ epoch: 2, attempts: 2 });
      const writes = await makeJobContext(ctx.prisma, id, second!.attempts, second!.epoch).tx(async (tx) => {
        const done = await tx.importRowOutcome.findUnique({ where: { batchId_rowNumber: { batchId: id, rowNumber: 2 } } });
        if (done) return 0;
        await tx.importRowOutcome.create({ data: { batchId: id, rowNumber: 2, outcome: 'created' } });
        return 1;
      });
      expect(writes).toBe(0);
      expect(await ctx.prisma.importRowOutcome.findMany({ where: { batchId: id } })).toMatchObject([
        { rowNumber: 2, outcome: 'created' },
      ]);
      expect(await jobs.get(id)).toMatchObject({ leaseEpoch: 2, attempts: 2, leaseOwner: 'second' });
    } finally {
      release();
      await Promise.allSettled([firstTx, ...(takeover ? [takeover] : [])]);
    }
  });

  it('B2#37: heartbeat extends from Clock.now only for the current running epoch and owner', async () => {
    const id = await create();
    await jobs.acquire(id, 'first');
    ctx.clock.advance(leaseMs / 2);
    const before = await jobs.get(id);
    expect(await jobs.extend(id, 1, 'other')).toBe(false);
    expect(await jobs.extend(id, 0, 'first')).toBe(false);
    expect(await jobs.get(id)).toEqual(before);
    expect(await jobs.extend(id, 1, 'first')).toBe(true);
    expect(await jobs.get(id)).toEqual({ ...before, leaseExpiresAt: new Date(ctx.clock.now().getTime() + leaseMs) });
    await jobs.finish(id, 1, 'succeeded');
    const finished = await jobs.get(id);
    expect(await jobs.extend(id, 1, 'first')).toBe(false);
    expect(await jobs.get(id)).toEqual(finished);
  });

  it.each(['succeeded', 'partial', 'failed'] as const)('B2#37: finish records %s and Clock.now only for the current epoch', async (status) => {
    const id = await create();
    await jobs.acquire(id, 'first');
    ctx.clock.advance(1000);
    const before = await jobs.get(id);
    expect(await jobs.finish(id, 0, status, 'stale')).toBe(false);
    expect(await jobs.get(id)).toEqual(before);
    expect(await jobs.finish(id, 1, status, 'summary')).toBe(true);
    expect(await jobs.get(id)).toEqual({ ...before, status, finishedAt: ctx.clock.now(), errorSummary: 'summary' });
    expect(await jobs.acquire(id, 'second')).toBeNull();
    expect(await jobs.finish(randomUUID(), 1, status)).toBe(false);
  });

  it('B2#37: release clears the lease and preserves attempts until another acquire; finish without a summary stores null', async () => {
    const id = await create();
    await jobs.acquire(id, 'first');
    const before = await jobs.get(id);
    expect(await jobs.release(id, 0)).toBe(false);
    expect(await jobs.get(id)).toEqual(before);
    expect(await jobs.release(id, 1)).toBe(true);
    expect(await jobs.get(id)).toEqual({ ...before, status: 'queued', leaseOwner: null, leaseExpiresAt: null });
    expect(await jobs.release(id, 1)).toBe(false);
    expect(await jobs.acquire(id, 'second')).toEqual({ epoch: 2, attempts: 2 });
    expect(await jobs.finish(id, 2, 'succeeded')).toBe(true);
    expect(await jobs.get(id)).toMatchObject({ errorSummary: null, finishedAt: ctx.clock.now() });
  });

  it.each(['finish', 'release'] as const)('B2#39: exclusive_key refuses a second running job, which can acquire after %s', async (action) => {
    const exclusiveKey = `content-import:${randomUUID()}`;
    const first = await create({ exclusiveKey });
    const second = await create({ exclusiveKey });
    expect(await jobs.acquire(first, 'first')).toEqual({ epoch: 1, attempts: 1 });
    const queued = await jobs.get(second);
    expect(await jobs.acquire(second, 'second')).toBeNull();
    expect(await jobs.get(second)).toEqual(queued);
    if (action === 'finish') expect(await jobs.finish(first, 1, 'succeeded')).toBe(true);
    else expect(await jobs.release(first, 1)).toBe(true);
    expect(await jobs.acquire(second, 'second')).toEqual({ epoch: 1, attempts: 1 });
    expect(await jobs.get(second)).toMatchObject({ status: 'running', leaseOwner: 'second', leaseEpoch: 1, attempts: 1 });
  });

  it('B2#39: concurrent acquires of jobs sharing an exclusive_key never both succeed', async () => {
    const exclusiveKey = `content-import:${randomUUID()}`;
    const ids = [await create({ exclusiveKey }), await create({ exclusiveKey })];
    const results = await Promise.all(ids.map((id, index) => jobs.acquire(id, `owner-${index}`)));
    expect(results.filter((result) => result !== null)).toHaveLength(1);
    for (const [index, id] of ids.entries()) {
      expect(await jobs.get(id)).toMatchObject(results[index] === null
        ? { status: 'queued', attempts: 0, leaseEpoch: 0, leaseOwner: null, startedAt: null, leaseExpiresAt: null }
        : { status: 'running', attempts: 1, leaseEpoch: 1, leaseOwner: `owner-${index}` });
    }
  });
});
