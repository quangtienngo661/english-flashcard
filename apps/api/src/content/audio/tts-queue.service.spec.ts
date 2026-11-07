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

describe('TtsQueueService.process (the worker)', () => {
  const job = (name: string, over: Record<string, unknown> = {}) => ({
    name, data: { key: 'k1' }, attemptsMade: 1, opts: { attempts: 3 }, moveToDelayed: vi.fn(async () => undefined), ...over,
  });
  const service = () => new TtsQueueService(testConfig(), logger());

  it('a speak job goes to the speak handler with the key and the tries so far', async () => {
    const queue = service();
    const speak = vi.fn(async () => undefined);
    queue.setHandler('speak', speak);
    await queue.process(job('speak') as never);
    expect(speak).toHaveBeenCalledExactlyOnceWith('k1', { attemptsMade: 1, attempts: 3 });
  });

  it('a speak job that must wait (the daily cap) is moved to the delayed set and ends with DelayedError, using no try', async () => {
    const queue = service();
    const until = new Date('2026-11-08T00:00:00Z');
    queue.setHandler('speak', async () => ({ deferUntil: until }));
    const speaking = job('speak');
    await expect(queue.process(speaking as never, 'token-1')).rejects.toMatchObject({ name: 'DelayedError' });
    expect(speaking.moveToDelayed).toHaveBeenCalledExactlyOnceWith(until.getTime(), 'token-1');
  });

  it('sweep and cleanup jobs go to their handlers', async () => {
    const queue = service();
    const [sweep, cleanup] = [vi.fn(async () => undefined), vi.fn(async () => undefined)];
    queue.setHandler('sweep', sweep);
    queue.setHandler('cleanup', cleanup);
    await queue.process(job('sweep') as never);
    await queue.process(job('cleanup') as never);
    expect(sweep).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('a job with no handler fails loudly', async () => {
    await expect(service().process(job('speak') as never)).rejects.toThrow(/No TTS handler/);
    await expect(service().process(job('other') as never)).rejects.toThrow(/No TTS handler/);
  });

  it('the schedulers are every five minutes and every week', async () => {
    const mod = await import('./tts-queue.service.js');
    expect(mod.TTS_SWEEP_EVERY_MS).toBe(300_000);
    expect(mod.TTS_CLEANUP_EVERY_MS).toBe(604_800_000);
  });
});
