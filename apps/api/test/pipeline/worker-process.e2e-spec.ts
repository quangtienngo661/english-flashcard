import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
import { ContentService } from '../../src/content/index.js';
import { BackgroundJobsService } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { workerEnv } from '../support/worker-env.js';

describe('standalone worker process (e2e)', () => {
  let ctx: TestApp;
  let child: ChildProcess | undefined;
  let exited: Promise<void> | undefined;
  let output = '';
  let spawnError: Error | undefined;

  const stop = async () => {
    if (!child || !exited) return;
    let timer: NodeJS.Timeout | undefined;
    try {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      const graceful = await Promise.race([
        exited.then(() => true),
        new Promise<boolean>((resolve) => { timer = setTimeout(() => { resolve(false); }, 5_000); }),
      ]);
      if (!graceful) { child.kill('SIGKILL'); await exited; }
    } finally { clearTimeout(timer); child = undefined; }
  };
  beforeAll(async () => {
    if (!existsSync('dist/worker.js')) throw new Error('dist/worker.js is missing; run pnpm build first');
    const databaseUrl = await createIsolatedDatabase();
    ctx = await createTestApp({ databaseUrl, redisUrl: inject('redisUrl'), pipeline: { runWorkers: false } });
  });
  afterAll(async () => { try { await stop(); } finally { await ctx?.close(); } });

  it('B2#4 (entry point): a real worker reconciles expired database leases and stays alive without an HTTP server', async () => {
    const jobs = ctx.app.get(BackgroundJobsService);
    const content = ctx.app.get(ContentService);
    const ids: string[] = [];
    const senses: Array<{ senseId: string; revisionId: string }> = [];
    for (const attempts of [1, 3]) {
      const actorId = randomUUID();
      const lemma = `process-${randomUUID()}`;
      const sense = await ctx.prisma.$transaction(async (tx) => {
        await content.lockEntryKey(tx, lemma, 'noun');
        const { entry } = await content.ensureEntry(tx, { lemma, pos: 'noun', variants: [] });
        await content.setEditorialLevel(tx, entry.id, 'A1');
        return content.createSense(tx, { entryId: entry.id, contextLabel: null, source: 'ui', actorId,
          content: { glossVi: 'ngân hàng', examplesEn: ['I visited the bank.'], topicCodes: ['business'] } });
      });
      const id = await ctx.prisma.$transaction(async (tx) => {
        const jobId = await jobs.create(tx, { queue: 'content-publish', createdBy: actorId, operationId: randomUUID() });
        await tx.publishJob.create({ data: { id: jobId, filter: { senseIds: [sense.senseId] }, snapshotCount: 1,
          notReadyCount: 0, counters: { processed: 0, pending: 1, published: 0, already_published: 0, refused: 0 } } });
        await tx.publishJobItem.create({ data: { jobId, senseId: sense.senseId, revisionNo: 1 } });
        return jobId;
      });
      await ctx.prisma.backgroundJob.update({ where: { id }, data: {
        status: 'running', attempts, leaseEpoch: 1, leaseOwner: 'crashed-process',
        leaseExpiresAt: new Date('2000-01-01T00:00:00Z'),
      } });
      ids.push(id);
      senses.push(sense);
    }
    const prefix = `wordmet-process-${randomUUID()}`;
    const databaseUrl = ctx.app.get<AppConfig>(APP_CONFIG).databaseUrl;
    const connection = new Redis(inject('redisUrl'), { maxRetriesPerRequest: null });
    const queue = new Queue('content-publish', { connection, prefix });
    try {
      child = spawn(process.execPath, ['dist/worker.js'], {
        env: workerEnv(databaseUrl, inject('redisUrl'), prefix), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
      });
      exited = new Promise<void>((resolve) => {
        child!.once('error', (error) => { spawnError = error; resolve(); });
        child!.once('exit', () => { resolve(); });
      });
      child.stdout?.on('data', (chunk: Buffer) => { output = (output + chunk.toString()).slice(-8_000); });
      child.stderr?.on('data', (chunk: Buffer) => { output = (output + chunk.toString()).slice(-8_000); });
      // Both supported queues now have real handlers (Tasks 18/23). A recoverable lease is
      // requeued AND consumed, so 'queued' is only a transient state and cannot be polled
      // reliably. Valid publish fixtures let us assert recovery through the real handler's
      // settled state instead. No Redis job is seeded: attempts=2 and epoch=3 prove the
      // reconciler fenced epoch=1 before the runner acquired a fresh lease and published.
      // An exhausted lease still fails entirely in the reconciler without entering BullMQ.
      // 30s, not 10s: this waits on a REAL spawned node process (cold Node start + full Nest DI
      // bootstrap + Postgres/Redis connects + its first reconciler sweep). A full e2e-suite run
      // on 13/10/2026, now also running real-files.e2e-spec.ts and revert.e2e-spec.ts's own real
      // multi-thousand-row CSV imports concurrently, measurably exceeded 10s here.
      await expect.poll(async () => {
        if (spawnError) throw spawnError;
        if (child!.exitCode !== null || child!.signalCode !== null) throw new Error(`Worker exited early: ${output}`);
        return (await Promise.all(ids.map((id) => jobs.get(id)))).map((row) => row?.status);
      }, { timeout: 30_000 }).toEqual(['succeeded', 'failed']);
      expect(await jobs.get(ids[0])).toMatchObject({ attempts: 2, leaseEpoch: 3, errorSummary: null });
      expect((await jobs.get(ids[0]))?.leaseOwner).not.toBe('crashed-process');
      expect((await jobs.get(ids[0]))?.finishedAt).not.toBeNull();
      expect(await ctx.prisma.publishJobItem.findMany({ where: { jobId: ids[0] } })).toMatchObject([
        { senseId: senses[0].senseId, revisionNo: 1, outcome: 'published', reason: null },
      ]);
      expect(await ctx.prisma.publishJob.findUniqueOrThrow({ where: { id: ids[0] } })).toMatchObject({
        counters: { processed: 1, pending: 0, published: 1, already_published: 0, refused: 0 },
      });
      expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: senses[0].senseId } })).toMatchObject({ liveRevisionId: senses[0].revisionId });
      expect(await jobs.get(ids[1])).toMatchObject({ attempts: 3, leaseEpoch: 2, leaseOwner: null, leaseExpiresAt: null,
        errorSummary: 'lease expired after max attempts' });
      expect((await jobs.get(ids[1]))?.finishedAt).not.toBeNull();
      expect(await ctx.prisma.publishJobItem.findMany({ where: { jobId: ids[1] } })).toMatchObject([
        { senseId: senses[1].senseId, outcome: 'pending' },
      ]);
      expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: senses[1].senseId } })).toMatchObject({ liveRevisionId: null });
      await expect.poll(() => queue.getJob(ids[0]), { timeout: 5_000 }).toBeUndefined();
      expect(await queue.getJob(ids[1])).toBeUndefined();
      await sleep(150);
      expect(child.exitCode).toBeNull();
      expect(child.signalCode).toBeNull();
    } finally {
      try { await stop(); } finally {
        try { await queue.obliterate({ force: true }); } finally {
          try { await queue.close(); } finally { connection.disconnect(); }
        }
      }
    }
    // 60s outer ceiling, not the 30s default: must comfortably outlast the 30s poll above.
  }, 60_000);
});
