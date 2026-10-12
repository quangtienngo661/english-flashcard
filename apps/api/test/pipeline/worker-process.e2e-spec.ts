import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
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
    const ids: string[] = [];
    for (const attempts of [1, 3]) {
      const id = await ctx.prisma.$transaction((tx) => jobs.create(tx, {
        queue: 'content-import', createdBy: randomUUID(), operationId: randomUUID(),
      }));
      await ctx.prisma.backgroundJob.update({ where: { id }, data: {
        status: 'running', attempts, leaseEpoch: 1, leaseOwner: 'crashed-process',
        leaseExpiresAt: new Date('2000-01-01T00:00:00Z'),
      } });
      ids.push(id);
    }
    const prefix = `wordmet-process-${randomUUID()}`;
    const databaseUrl = ctx.app.get<AppConfig>(APP_CONFIG).databaseUrl;
    const connection = new Redis(inject('redisUrl'), { maxRetriesPerRequest: null });
    const queue = new Queue('content-import', { connection, prefix });
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
      // Task 12 has no production handlers. Observe the real reconciler instead of adding a fake
      // production handler: a recoverable lease queues again, an exhausted lease becomes failed.
      await expect.poll(async () => {
        if (spawnError) throw spawnError;
        if (child!.exitCode !== null || child!.signalCode !== null) throw new Error(`Worker exited early: ${output}`);
        return (await Promise.all(ids.map((id) => jobs.get(id)))).map((row) => row?.status);
      }, { timeout: 10_000 }).toEqual(['queued', 'failed']);
      expect(await jobs.get(ids[0])).toMatchObject({ attempts: 1, leaseOwner: null, leaseExpiresAt: null });
      expect(await jobs.get(ids[1])).toMatchObject({ attempts: 3, errorSummary: 'lease expired after max attempts' });
      expect((await jobs.get(ids[1]))?.finishedAt).not.toBeNull();
      await expect.poll(async () => (await queue.getJob(ids[0]))?.id, { timeout: 5_000 }).toBe(ids[0]);
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
  });
});
