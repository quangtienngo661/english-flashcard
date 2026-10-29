import { afterEach, describe, expect, it, vi } from 'vitest';
import { testConfig } from '../../../test/support/test-config.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import { EVAL_QUEUE, EvalQueue } from './eval-queue.service.js';

const logger = () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }) as unknown as AppLogger & { warn: ReturnType<typeof vi.fn> };

describe('EvalQueue', () => {
  let queue: EvalQueue | undefined;
  afterEach(async () => { await queue?.onModuleDestroy(); queue = undefined; });

  it('the queue is named ai-eval', () => {
    expect(EVAL_QUEUE).toBe('ai-eval');
  });

  it('B6E91: Redis unreachable → enqueue returns false within the bound and warns ai_eval_enqueue_failed', async () => {
    const log = logger();
    queue = new EvalQueue(testConfig({ redisUrl: 'redis://127.0.0.1:1' }), log, { run: vi.fn() } as never);
    const started = performance.now();
    expect(await queue.enqueue('22222222-2222-4222-8222-222222222222')).toBe(false);
    expect(performance.now() - started).toBeLessThan(5_000);
    expect(log.warn).toHaveBeenCalledWith('ai_eval_enqueue_failed', expect.objectContaining({ run_id: '22222222-2222-4222-8222-222222222222' }));
  });

  it('enqueueJudgePass adds a job named judge, with the pass id as data and job id, and the options of enqueue (M3-T8)', async () => {
    queue = new EvalQueue(testConfig({ redisUrl: 'redis://127.0.0.1:1' }), logger(), { run: vi.fn() } as never);
    const add = vi.fn(async () => ({}));
    vi.spyOn(queue as unknown as { queue(): Promise<unknown> }, 'queue').mockResolvedValue({ add });
    await expect(queue.enqueueJudgePass('P1')).resolves.toBe(true);
    expect(add).toHaveBeenCalledExactlyOnceWith('judge', { passId: 'P1' }, { jobId: 'judge-P1', attempts: 1, removeOnComplete: true, removeOnFail: true });
  });

  it('enqueueJudgePass with Redis unreachable → false within the bound and a warn naming the pass', async () => {
    const log = logger();
    queue = new EvalQueue(testConfig({ redisUrl: 'redis://127.0.0.1:1' }), log, { run: vi.fn() } as never);
    const started = performance.now();
    expect(await queue.enqueueJudgePass('P1')).toBe(false);
    expect(performance.now() - started).toBeLessThan(5_000);
    expect(log.warn).toHaveBeenCalledWith('ai_judge_enqueue_failed', expect.objectContaining({ pass_id: 'P1' }));
  });

  it('no Worker outside the worker process', async () => {
    const job = { run: vi.fn() };
    queue = new EvalQueue(testConfig({ redisUrl: 'redis://127.0.0.1:1' }), logger(), job as never);
    await queue.onApplicationBootstrap();
    expect(queue.running).toBe(false);
  });
});
