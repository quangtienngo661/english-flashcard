import { afterEach, describe, expect, it, vi } from 'vitest';
import { testConfig } from '../../../test/support/test-config.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import { TTS_CONCURRENCY, TTS_JOB_OPTIONS, TTS_QUEUE, TtsQueueService } from './tts-queue.service.js';

const logger = () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }) as unknown as AppLogger & { warn: ReturnType<typeof vi.fn> };

describe('TtsQueueService (round C, design §5.5)', () => {
  let queue: TtsQueueService | undefined;
  afterEach(async () => { await queue?.onModuleDestroy(); queue = undefined; });

  it('the queue is named content-tts, with four recordings at a time', () => {
    expect(TTS_QUEUE).toBe('content-tts');
    expect(TTS_CONCURRENCY).toBe(4);
  });

  it('a job is three tries with a five-second exponential backoff, cleaned up when done', () => {
    expect(TTS_JOB_OPTIONS).toEqual({ attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: true, removeOnFail: true });
  });

  it('enqueue adds one job per key, with the key as the job id', async () => {
    queue = new TtsQueueService(testConfig(), logger());
    const addBulk = vi.fn(async () => []);
    vi.spyOn(queue as unknown as { queue(): Promise<unknown> }, 'queue').mockResolvedValue({ addBulk });
    await expect(queue.enqueue(['k1', 'k2'])).resolves.toBe(true);
    expect(addBulk).toHaveBeenCalledExactlyOnceWith([
      { name: 'speak', data: { key: 'k1' }, opts: { ...TTS_JOB_OPTIONS, jobId: 'k1' } },
      { name: 'speak', data: { key: 'k2' }, opts: { ...TTS_JOB_OPTIONS, jobId: 'k2' } },
    ]);
  });

  it('a delay is passed on to every job', async () => {
    queue = new TtsQueueService(testConfig(), logger());
    const addBulk = vi.fn(async () => []);
    vi.spyOn(queue as unknown as { queue(): Promise<unknown> }, 'queue').mockResolvedValue({ addBulk });
    await queue.enqueue(['k1'], { delayMs: 60_000 });
    expect((addBulk.mock.calls[0] as unknown as [Array<{ opts: { delay: number } }>])[0][0].opts.delay).toBe(60_000);
  });

  it('no keys: nothing is sent', async () => {
    queue = new TtsQueueService(testConfig(), logger());
    const spy = vi.spyOn(queue as unknown as { queue(): Promise<unknown> }, 'queue');
    await expect(queue.enqueue([])).resolves.toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('Redis unreachable → false within the bound and a warn naming the count, never the text', async () => {
    const log = logger();
    queue = new TtsQueueService(testConfig({ redisUrl: 'redis://127.0.0.1:1' }), log);
    const started = performance.now();
    expect(await queue.enqueue(['k1'])).toBe(false);
    expect(performance.now() - started).toBeLessThan(5_000);
    expect(log.warn).toHaveBeenCalledWith('tts_enqueue_failed', expect.objectContaining({ count: 1 }));
  });

  it('no worker is started unless the process runs workers', async () => {
    queue = new TtsQueueService(testConfig({ pipeline: { ...testConfig().pipeline, runWorkers: false } }), logger());
    await queue.onApplicationBootstrap();
    expect(queue.running).toBe(false);
  });
});
