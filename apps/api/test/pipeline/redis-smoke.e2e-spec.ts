import { randomUUID } from 'node:crypto';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { afterEach, beforeEach, describe, expect, inject, it } from 'vitest';

describe('Redis and BullMQ infrastructure', () => {
  let connection: Redis;
  let queue: Queue;
  const workers: Worker[] = [];
  const connections: Redis[] = [];
  const polling = { timeout: 10_000 };

  beforeEach(() => {
    connection = new Redis(inject('redisUrl'), { maxRetriesPerRequest: null });
    connections.push(connection);
    queue = new Queue(`smoke-${randomUUID()}`, { connection });
  });

  afterEach(async () => {
    const failures: unknown[] = [];
    for (const worker of workers.splice(0)) {
      try {
        await worker.close();
      } catch (error) {
        failures.push(error);
      }
    }
    try {
      // Remove only this test's queue keys; other suites share this Redis container.
      await queue.obliterate({ force: true });
    } catch (error) {
      failures.push(error);
    }
    try {
      await queue.close();
    } catch (error) {
      failures.push(error);
    }
    for (const client of connections.splice(0)) client.disconnect();
    if (failures.length > 0) throw new AggregateError(failures, 'Redis smoke test cleanup failed');
  });

  it('B2#4 (infra): adding the same jobId twice while stored leaves exactly one waiting job', async () => {
    const first = await queue.add('smoke', { run: 1 }, { jobId: 'same-job' });
    const duplicate = await queue.add('smoke', { run: 2 }, { jobId: 'same-job' });

    expect(duplicate.id).toBe(first.id);
    expect(await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')).toEqual({
      waiting: 1, active: 0, completed: 0, failed: 0, delayed: 0,
    });
    const stored = await queue.getJobs('waiting');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('same-job');
    expect(stored[0].data).toEqual({ run: 1 });
  });

  it('B2#4 (infra): removeOnComplete allows the same jobId to be added and run again after completion', async () => {
    const runs: number[] = [];
    const worker = new Worker(queue.name, async (job) => {
      runs.push(job.data.run as number);
    }, { connection });
    workers.push(worker);
    await worker.waitUntilReady();

    await queue.add('smoke', { run: 1 }, { jobId: 'same-job', removeOnComplete: true });
    await expect.poll(() => queue.getJob('same-job'), polling).toBeUndefined();
    expect(runs).toEqual([1]);

    await queue.add('smoke', { run: 2 }, { jobId: 'same-job', removeOnComplete: true });
    await expect.poll(() => queue.getJob('same-job'), polling).toBeUndefined();
    expect(runs).toEqual([1, 2]);
    expect(await queue.getCompletedCount()).toBe(0);
  });

  it('B2#4 (infra): a failed job kept in Redis blocks re-adding the same jobId', async () => {
    const runs: number[] = [];
    const worker = new Worker(queue.name, async (job) => {
      runs.push(job.data.run as number);
      throw new Error('Expected smoke test failure');
    }, { connection });
    workers.push(worker);
    await worker.waitUntilReady();

    const first = await queue.add('smoke', { run: 1 }, { jobId: 'same-job' });
    await expect.poll(() => first.getState(), polling).toBe('failed');

    const duplicate = await queue.add('smoke', { run: 2 }, { jobId: 'same-job' });
    expect(duplicate.id).toBe(first.id);
    expect(await duplicate.getState()).toBe('failed');
    expect((await queue.getJob('same-job'))?.data).toEqual({ run: 1 });
    expect(await queue.getJobCounts('waiting', 'active', 'failed')).toEqual({ waiting: 0, active: 0, failed: 1 });
    expect(runs).toEqual([1]);
  });

  it('B2#4 (infra): removeOnFail allows the same jobId to be added and run again after failure', async () => {
    const runs: number[] = [];
    const worker = new Worker(queue.name, async (job) => {
      runs.push(job.data.run as number);
      throw new Error('Expected smoke test failure');
    }, { connection });
    workers.push(worker);
    await worker.waitUntilReady();

    await queue.add('smoke', { run: 1 }, { jobId: 'same-job', removeOnFail: true });
    await expect.poll(() => queue.getJob('same-job'), polling).toBeUndefined();
    expect(runs).toEqual([1]);

    await queue.add('smoke', { run: 2 }, { jobId: 'same-job', removeOnFail: true });
    await expect.poll(() => queue.getJob('same-job'), polling).toBeUndefined();
    expect(runs).toEqual([1, 2]);
    expect(await queue.getFailedCount()).toBe(0);
  });

  it('B2#4 (infra): Worker requires maxRetriesPerRequest null on an ioredis connection', async () => {
    const defaultConnection = new Redis(inject('redisUrl'));
    connections.push(defaultConnection);
    expect(() => {
      workers.push(new Worker(queue.name, async () => {}, { connection: defaultConnection, autorun: false }));
    }).toThrow(/maxRetriesPerRequest must be null/);

    expect(() => {
      workers.push(new Worker(queue.name, async () => {}, { connection, autorun: false }));
    }).not.toThrow();
    await workers[0].waitUntilReady();
  });

  it('B2E15: the Testcontainers Redis runs with maxmemory-policy noeviction', async () => {
    expect(await connection.config('GET', 'maxmemory-policy')).toEqual(['maxmemory-policy', 'noeviction']);
  });
});
