import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReadinessService } from './readiness.service.js';

const never = () => new Promise<never>(() => {});

function service(prisma: () => Promise<unknown>, ping: () => Promise<unknown>) {
  return new ReadinessService({ $queryRaw: vi.fn(prisma) } as never, { ping: vi.fn(ping), quit: vi.fn(async () => 'OK') } as never);
}

describe('ReadinessService', () => {
  afterEach(() => vi.useRealTimers());

  it('both answer → database ok, redis ok', async () => {
    expect(await service(async () => [{ '?column?': 1 }], async () => 'PONG').check()).toEqual({ database: 'ok', redis: 'ok' });
  });

  it('the database query rejects → database fail, redis still ok', async () => {
    expect(await service(async () => { throw new Error('ECONNREFUSED'); }, async () => 'PONG').check()).toEqual({ database: 'fail', redis: 'ok' });
  });

  it('the Redis ping rejects → redis fail, database still ok', async () => {
    expect(await service(async () => [], async () => { throw new Error('ECONNREFUSED'); }).check()).toEqual({ database: 'ok', redis: 'fail' });
  });

  it('a database that never answers is a fail after 2 000 ms, and the check settles', async () => {
    vi.useFakeTimers();
    const pending = service(never, async () => 'PONG').check();
    let settled = false;
    void pending.then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ database: 'fail', redis: 'ok' });
  });

  it('a Redis that never answers is a fail after 2 000 ms', async () => {
    vi.useFakeTimers();
    const pending = service(async () => [], never).check();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await pending).toEqual({ database: 'ok', redis: 'fail' });
  });

  it('closes its Redis connection when the module stops', async () => {
    const redis = { ping: vi.fn(), quit: vi.fn(async () => 'OK') };
    await new ReadinessService({ $queryRaw: vi.fn() } as never, redis as never).onModuleDestroy();
    expect(redis.quit).toHaveBeenCalledOnce();
  });
});
