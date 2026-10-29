import { describe, expect, it, vi } from 'vitest';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { runIdempotent } from './idempotency.service.js';

interface Row {
  key: string;
  userId: string;
  endpoint: string;
  status: string;
  payloadHash: string;
  responseStatus: number | null;
  responseBody: unknown;
  createdAt: Date;
  updatedAt: Date;
}
type Where = Partial<Pick<Row, 'key' | 'userId' | 'endpoint' | 'status'>>;

/**
 * In-memory stand-in for the idempotency_keys table. Writes and commits are recorded in `events`; calls made through a
 * transaction are prefixed `tx<n>:`, calls on the client itself are not. A failed transaction restores the rows it changed.
 */
function fakePrisma(options: { locked?: boolean } = {}) {
  let rows: Row[] = [];
  const events: string[] = [];
  const failNext: { create?: unknown; updateMany?: unknown; deleteMany?: unknown } = {};
  let transactions = 0;

  const matches = (row: Row, where: Where) =>
    Object.entries(where).every(([field, value]) => row[field as keyof Row] === value);
  const takeFailure = (op: 'create' | 'updateMany' | 'deleteMany') => {
    const failure = failNext[op];
    delete failNext[op];
    if (failure) throw failure;
  };

  const table = (prefix: string) => ({
    findFirst: async ({ where }: { where: Where }) => {
      const row = rows.find((candidate) => matches(candidate, where));
      return row ? { ...row } : null;
    },
    create: async ({ data }: { data: Omit<Row, 'responseStatus' | 'responseBody' | 'createdAt' | 'updatedAt'> & Partial<Row> }) => {
      events.push(`${prefix}create`);
      takeFailure('create');
      const dbNow = new Date(); // the column default now(): the database's clock, not the caller's
      rows.push({ responseStatus: null, responseBody: null, createdAt: dbNow, updatedAt: dbNow, ...data });
    },
    delete: async ({ where }: { where: { key_userId_endpoint: Where } }) => {
      events.push(`${prefix}delete`);
      rows = rows.filter((row) => !matches(row, where.key_userId_endpoint));
    },
    updateMany: async ({ where, data }: { where: Where; data: Partial<Row> }) => {
      events.push(`${prefix}updateMany:${data.status}`);
      takeFailure('updateMany');
      const hit = rows.filter((row) => matches(row, where));
      hit.forEach((row) => Object.assign(row, data, data.responseBody === Prisma.JsonNull ? { responseBody: null } : {}));
      return { count: hit.length };
    },
    deleteMany: async ({ where }: { where: Where }) => {
      events.push(`${prefix}deleteMany`);
      takeFailure('deleteMany');
      const before = rows.length;
      rows = rows.filter((row) => !matches(row, where));
      return { count: before - rows.length };
    },
  });

  const prisma = {
    $transaction: async <R>(fn: (tx: unknown) => Promise<R>) => {
      transactions += 1;
      const prefix = `tx${transactions}:`;
      const snapshot = rows.map((row) => ({ ...row }));
      const tx = { $queryRawTyped: async () => [{ locked: options.locked ?? true }], idempotencyKey: table(prefix) };
      try {
        const result = await fn(tx);
        events.push(`${prefix}commit`);
        return result;
      } catch (error) {
        rows = snapshot;
        events.push(`${prefix}rollback`);
        throw error;
      }
    },
    idempotencyKey: table(''),
  };

  return {
    prisma: prisma as unknown as PrismaClient,
    events,
    failNext,
    rows: () => rows,
    seed: (row: Row) => rows.push(row),
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

const params = { key: 'k-1', userId: '00000000-0000-4000-8000-000000000001', endpoint: '/v1/sample', payloadHash: 'h1' };
const t0 = new Date('2020-01-01T10:00:00Z');
const at = (seconds: number) => new Date(t0.getTime() + seconds * 1000);

describe('runIdempotent: claim, run, finish (C1)', () => {
  it('C1: the claim commits before the handler runs, and the finish is a separate write', async () => {
    const fake = fakePrisma();
    const result = await runIdempotent(fake.prisma, params, async () => {
      fake.events.push('handler');
      return { status: 201, body: { id: 'a' } };
    }, { now: () => t0 });

    expect(result).toEqual({ kind: 'proceed', status: 201, body: { id: 'a' } });
    expect(fake.events).toEqual(['tx1:create', 'tx1:commit', 'handler', 'updateMany:succeeded']);
    expect(fake.rows()).toEqual([{ ...params, status: 'succeeded', responseStatus: 201, responseBody: { id: 'a' }, createdAt: t0, updatedAt: t0 }]);
  });

  it('FE29: a second call with the same key while the first handler runs gets conflict, retryAfterSeconds 2', async () => {
    const fake = fakePrisma();
    const started = deferred();
    const release = deferred();
    let runs = 0;
    const first = runIdempotent(fake.prisma, params, async () => {
      runs += 1;
      started.resolve();
      await release.promise;
      return { status: 201, body: { id: 'a' } };
    }, { now: () => at(5) });
    await started.promise;

    const second = await runIdempotent(fake.prisma, params, async () => {
      runs += 1;
      return { status: 201, body: { id: 'b' } };
    }, { now: () => at(10) });

    expect(second).toEqual({ kind: 'conflict', retryAfterSeconds: 2 });
    release.resolve();
    await expect(first).resolves.toEqual({ kind: 'proceed', status: 201, body: { id: 'a' } });
    expect(runs).toBe(1);
  });

  it('FE28: handler outlives the 30 s lease → a retry at 35 s is abandoned; the late finish stores succeeded; a retry after that replays', async () => {
    const fake = fakePrisma();
    let clock = t0;
    const now = () => clock;
    const started = deferred();
    const release = deferred();
    const first = runIdempotent(fake.prisma, params, async () => {
      started.resolve();
      await release.promise;
      return { status: 201, body: { id: 'a' } };
    }, { leaseSeconds: 30, now });
    await started.promise;

    clock = at(35);
    let retryRan = false;
    const retry = () => runIdempotent(fake.prisma, params, async () => {
      retryRan = true;
      return { status: 201, body: { id: 'b' } };
    }, { leaseSeconds: 30, now });
    expect(await retry()).toEqual({ kind: 'abandoned' });

    clock = at(40);
    release.resolve();
    await expect(first).resolves.toEqual({ kind: 'proceed', status: 201, body: { id: 'a' } });
    expect(fake.rows()).toEqual([expect.objectContaining({ status: 'succeeded', responseStatus: 201, responseBody: { id: 'a' }, updatedAt: at(40) })]);

    clock = at(45);
    expect(await retry()).toEqual({ kind: 'replay', status: 201, body: { id: 'a' } });
    expect(retryRan).toBe(false);
  });

  it('FE30: the handler throws → the in_progress row is deleted and the error propagates; a retry runs the handler again', async () => {
    const fake = fakePrisma();
    const failure = new Error('handler failed');

    await expect(runIdempotent(fake.prisma, params, async () => { throw failure; }, { now: () => t0 })).rejects.toBe(failure);
    expect(fake.events).toEqual(['tx1:create', 'tx1:commit', 'deleteMany']);
    expect(fake.rows()).toEqual([]);

    const retry = await runIdempotent(fake.prisma, params, async () => ({ status: 201, body: { id: 'b' } }), { now: () => at(1) });
    expect(retry).toEqual({ kind: 'proceed', status: 201, body: { id: 'b' } });
  });

  it('FE30: the handler throws and releasing the key also fails → the handler\'s error propagates and the row stays in_progress', async () => {
    const fake = fakePrisma();
    const failure = new Error('handler failed');
    fake.failNext.deleteMany = new Error('release failed');

    await expect(runIdempotent(fake.prisma, params, async () => { throw failure; }, { now: () => t0 })).rejects.toBe(failure);
    expect(fake.events).toEqual(['tx1:create', 'tx1:commit', 'deleteMany']);
    expect(fake.rows()).toEqual([expect.objectContaining({ status: 'in_progress' })]);
  });

  it('B1-9: a failed release is reported to onReleaseFailed (the key stays in_progress), and the error of the handler still wins', async () => {
    const fake = fakePrisma();
    const failure = new Error('handler failed');
    const releaseFailure = new Error('release failed');
    fake.failNext.deleteMany = releaseFailure;
    const onReleaseFailed = vi.fn();

    await expect(runIdempotent(fake.prisma, params, async () => { throw failure; }, { now: () => t0, onReleaseFailed })).rejects.toBe(failure);
    expect(onReleaseFailed).toHaveBeenCalledExactlyOnceWith(releaseFailure);
  });

  it('B1-9: a release that works does not report anything', async () => {
    const fake = fakePrisma();
    const onReleaseFailed = vi.fn();
    await expect(runIdempotent(fake.prisma, params, async () => { throw new Error('handler failed'); }, { now: () => t0, onReleaseFailed })).rejects.toThrow('handler failed');
    expect(onReleaseFailed).not.toHaveBeenCalled();
  });

  it('FE31: the finish write fails → the error propagates and the row stays in_progress', async () => {
    const fake = fakePrisma();
    const finishFailure = new Error('finish write failed');
    fake.failNext.updateMany = finishFailure;

    await expect(runIdempotent(fake.prisma, params, async () => ({ status: 201, body: { id: 'a' } }), { now: () => t0 }))
      .rejects.toBe(finishFailure);
    expect(fake.events).toEqual(['tx1:create', 'tx1:commit', 'updateMany:succeeded']);
    expect(fake.rows()).toEqual([expect.objectContaining({ status: 'in_progress', responseStatus: null })]);
  });

  it('a row older than 24 h is deleted and the call claims afresh', async () => {
    const fake = fakePrisma();
    const old = at(-25 * 3600);
    fake.seed({ ...params, status: 'succeeded', responseStatus: 201, responseBody: { id: 'old' }, createdAt: old, updatedAt: old });

    const result = await runIdempotent(fake.prisma, params, async () => ({ status: 201, body: { id: 'fresh' } }), { now: () => t0 });

    expect(result).toEqual({ kind: 'proceed', status: 201, body: { id: 'fresh' } });
    expect(fake.events).toEqual(['tx1:delete', 'tx1:create', 'tx1:commit', 'updateMany:succeeded']);
    expect(fake.rows()).toEqual([expect.objectContaining({ status: 'succeeded', responseBody: { id: 'fresh' }, createdAt: t0 })]);
  });

  it('two first requests race past the lock: the unique violation on insert is a conflict and the handler does not run', async () => {
    const fake = fakePrisma();
    fake.failNext.create = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
    let ran = false;

    const result = await runIdempotent(fake.prisma, params, async () => {
      ran = true;
      return { status: 201, body: {} };
    }, { now: () => t0 });

    expect(result).toEqual({ kind: 'conflict', retryAfterSeconds: 2 });
    expect(ran).toBe(false);
    expect(fake.events).toEqual(['tx1:create', 'tx1:rollback']);
  });

  it('the advisory lock is held by another claim → conflict, nothing written, the handler does not run', async () => {
    const fake = fakePrisma({ locked: false });
    let ran = false;

    const result = await runIdempotent(fake.prisma, params, async () => {
      ran = true;
      return { status: 201, body: {} };
    }, { now: () => t0 });

    expect(result).toEqual({ kind: 'conflict', retryAfterSeconds: 2 });
    expect(ran).toBe(false);
    expect(fake.events).toEqual(['tx1:commit']);
  });
});
