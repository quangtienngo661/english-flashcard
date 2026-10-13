import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { isTransientDbError, withTransientRetry } from './transient-retry.js';

const prismaError = (code: string, meta?: Record<string, unknown>) => new Prisma.PrismaClientKnownRequestError(
  'Database request failed', { code, clientVersion: '7.10.0', meta },
);

describe('isTransientDbError', () => {
  it.each(['P1001', 'P1002', 'P1017', 'P2034'])('B2#34: recognizes Prisma %s', (code) => {
    expect(isTransientDbError(prismaError(code))).toBe(true);
  });

  it.each(['P1001', 'P1002'])('B2#34: recognizes initialization error %s', (code) => {
    expect(isTransientDbError(new Prisma.PrismaClientInitializationError('Cannot connect', '7.10.0', code))).toBe(true);
  });

  it.each(['40001', '40P01', '08000', '08003', '08006', '08P01'])('B2#34: recognizes SQLSTATE %s', (code) => {
    expect(isTransientDbError({ code })).toBe(true);
    expect(isTransientDbError(prismaError('P2010', { code }))).toBe(true);
    expect(isTransientDbError({ cause: { code } })).toBe(true);
    expect(isTransientDbError(prismaError('P2010', {
      driverAdapterError: { cause: { originalCode: code } },
    }))).toBe(true);
  });

  it.each(['P2002', 'P2003'])('B2#34: does not retry Prisma %s', (code) => {
    expect(isTransientDbError(prismaError(code))).toBe(false);
  });

  it('B2#34: rejects ordinary, missing, unknown and unreadable error codes without throwing', () => {
    for (const error of [new Error('Validation failed'), null, undefined, 'P1001', { code: 40001 },
      { code: '23505' }, { code: '23503' }, { meta: { code: 'unknown' } },
      new Prisma.PrismaClientInitializationError('Invalid configuration', '7.10.0', 'P1012')]) {
      expect(isTransientDbError(error)).toBe(false);
    }
    expect(isTransientDbError({ get code() { throw new Error('Unreadable'); } })).toBe(false);
    expect(isTransientDbError(new Proxy({}, { get() { throw new Error('Unreadable'); } }))).toBe(false);
  });
});

describe('withTransientRetry', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('B2#34: retries three times with exponential jitter and throws the fourth failure', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const errors = Array.from({ length: 4 }, () => prismaError('P2034'));
    let calls = 0;
    const waits: number[] = [];
    await expect(withTransientRetry(async () => { throw errors[calls++]; }, {
      retries: 3, baseMs: 100, sleep: async (ms) => { waits.push(ms); },
    })).rejects.toBe(errors[3]);
    expect(calls).toBe(4);
    expect(waits).toHaveLength(3);
    waits.forEach((wait, attempt) => {
      const base = 100 * 2 ** attempt;
      expect(wait).toBeGreaterThan(base);
      expect(wait).toBeLessThan(base * 2);
      if (attempt > 0) expect(wait).toBeGreaterThan(waits[attempt - 1]);
    });
  });

  it('B2#34: throws a validation error on the first attempt with no sleeps', async () => {
    const error = new Error('Validation failed');
    const fn = vi.fn(async () => { throw error; });
    const sleep = vi.fn(async (_ms: number) => {});
    await expect(withTransientRetry(fn, { retries: 3, baseMs: 100, sleep })).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('B2#34: returns a successful retry without exhausting the budget', async () => {
    let calls = 0;
    const sleep = vi.fn(async (_ms: number) => {});
    expect(await withTransientRetry(async () => {
      if (++calls < 3) throw { code: '40001' };
      return 'done';
    }, { retries: 3, baseMs: 10, sleep })).toBe('done');
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('B2#34: zero retries throws the first transient failure without sleeping', async () => {
    const error = prismaError('P1001');
    const fn = vi.fn(async () => { throw error; });
    const sleep = vi.fn(async (_ms: number) => {});
    await expect(withTransientRetry(fn, { retries: 0, baseMs: 10, sleep })).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('B2#34: stops immediately if a retry encounters a non-transient error', async () => {
    const validation = new Error('Validation failed');
    let calls = 0;
    const sleep = vi.fn(async (_ms: number) => {});
    await expect(withTransientRetry(async () => {
      if (++calls === 1) throw prismaError('P1017');
      throw validation;
    }, { retries: 3, baseMs: 10, sleep })).rejects.toBe(validation);
    expect(calls).toBe(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });
});
