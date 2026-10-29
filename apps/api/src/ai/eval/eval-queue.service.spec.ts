import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { testConfig } from '../../../test/support/test-config.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import { EVAL_QUEUE, EvalQueue } from './eval-queue.service.js';

const NOW = new Date('2026-10-30T03:00:00Z');
/** A queue with the judge parts stubbed; `parts` lets a test see them. */
function makeQueue(log: AppLogger, parts: { job?: unknown; judgeJob?: unknown; passes?: unknown } = {}): EvalQueue {
  return new EvalQueue(
    testConfig({ redisUrl: 'redis://127.0.0.1:1' }), log, (parts.job ?? { run: vi.fn() }) as never, (parts.judgeJob ?? { run: vi.fn() }) as never,
    (parts.passes ?? { release: vi.fn(async () => []) }) as never, new FakeClock(NOW),
  );
}

const logger = () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }) as unknown as AppLogger & { warn: ReturnType<typeof vi.fn> };

describe('EvalQueue', () => {
  let queue: EvalQueue | undefined;
  afterEach(async () => { await queue?.onModuleDestroy(); queue = undefined; });

  it('the queue is named ai-eval', () => {
    expect(EVAL_QUEUE).toBe('ai-eval');
  });

  it('B6E91: Redis unreachable → enqueue returns false within the bound and warns ai_eval_enqueue_failed', async () => {
    const log = logger();
    queue = makeQueue(log);
    const started = performance.now();
    expect(await queue.enqueue('22222222-2222-4222-8222-222222222222')).toBe(false);
    expect(performance.now() - started).toBeLessThan(5_000);
    expect(log.warn).toHaveBeenCalledWith('ai_eval_enqueue_failed', expect.objectContaining({ run_id: '22222222-2222-4222-8222-222222222222' }));
  });

  it('enqueueJudgePass adds a job named judge, with the pass id as data and job id, and the options of enqueue (M3-T8)', async () => {
    queue = makeQueue(logger());
    const add = vi.fn(async () => ({}));
    vi.spyOn(queue as unknown as { queue(): Promise<unknown> }, 'queue').mockResolvedValue({ add });
    await expect(queue.enqueueJudgePass('P1')).resolves.toBe(true);
    expect(add).toHaveBeenCalledExactlyOnceWith('judge', { passId: 'P1' }, { jobId: 'judge-P1', attempts: 1, removeOnComplete: true, removeOnFail: true });
  });

  it('enqueueJudgePass with Redis unreachable → false within the bound and a warn naming the pass', async () => {
    const log = logger();
    queue = makeQueue(log);
    const started = performance.now();
    expect(await queue.enqueueJudgePass('P1')).toBe(false);
    expect(performance.now() - started).toBeLessThan(5_000);
    expect(log.warn).toHaveBeenCalledWith('ai_judge_enqueue_failed', expect.objectContaining({ pass_id: 'P1' }));
  });

  describe('the worker callback (M3-T9)', () => {
    const ADD = ['judge', { passId: 'P1' }, { jobId: 'judge-P1', attempts: 1, removeOnComplete: true, removeOnFail: true }];
    const withAdd = (current: EvalQueue) => {
      const add = vi.fn(async () => ({}));
      vi.spyOn(current as unknown as { queue(): Promise<unknown> }, 'queue').mockResolvedValue({ add });
      return add;
    };

    it('a judge job runs the pass and nothing else', async () => {
      const judgeJob = { run: vi.fn(async () => undefined) };
      const job = { run: vi.fn() };
      const passes = { release: vi.fn(async () => []) };
      queue = makeQueue(logger(), { job, judgeJob, passes });
      await queue.process({ name: 'judge', data: { passId: 'P' } } as never);
      expect(judgeJob.run).toHaveBeenCalledExactlyOnceWith('P');
      expect(job.run).not.toHaveBeenCalled();
      expect(passes.release).not.toHaveBeenCalled();
    });

    it('a run job runs the run, then releases the passes waiting for it and queues each as a judge job', async () => {
      const order: string[] = [];
      const job = { run: vi.fn(async () => { order.push('run'); }) };
      const passes = { release: vi.fn(async () => { order.push('release'); return ['P1']; }) };
      queue = makeQueue(logger(), { job, passes });
      const add = withAdd(queue);
      await queue.process({ name: 'run', data: { runId: 'R' } } as never);
      expect(order).toEqual(['run', 'release']);
      expect(job.run).toHaveBeenCalledExactlyOnceWith('R');
      expect(passes.release).toHaveBeenCalledExactlyOnceWith('R', NOW);
      expect(add).toHaveBeenCalledExactlyOnceWith(...ADD);
    });

    it('a run with no waiting pass queues no judge job', async () => {
      queue = makeQueue(logger(), { passes: { release: vi.fn(async () => []) } });
      const add = withAdd(queue);
      await queue.process({ name: 'run', data: { runId: 'R' } } as never);
      expect(add).not.toHaveBeenCalled();
    });

    it('a release that fails does not fail the run job: it warns, and the hourly job asks again', async () => {
      const log = logger();
      queue = makeQueue(log, { passes: { release: vi.fn(async () => { throw new Error('db down'); }) } });
      const add = withAdd(queue);
      await expect(queue.process({ name: 'run', data: { runId: 'R' } } as never)).resolves.toBeUndefined();
      expect(add).not.toHaveBeenCalled();
      expect(log.warn).toHaveBeenCalledWith('ai_judge_release_failed', expect.objectContaining({ run_id: 'R' }));
    });
  });

  it('no Worker outside the worker process', async () => {
    const job = { run: vi.fn() };
    queue = makeQueue(logger(), { job });
    await queue.onApplicationBootstrap();
    expect(queue.running).toBe(false);
  });
});
