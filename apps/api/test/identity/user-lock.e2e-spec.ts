import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withUserLock } from '../../src/identity/user-lock.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

function signal() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('Identity user lock', () => {
  let ctx: TestApp;
  beforeAll(async () => { ctx = await createTestApp(); });
  afterAll(async () => { await ctx?.close(); });

  it('B1#34: a second transaction locking the same user waits until the first commits', async () => {
    // Proven from Postgres itself (pg_locks), not from client-side timestamps.
    const userId = randomUUID();
    const locked = signal();
    const release = signal();
    const secondPid = signal() as ReturnType<typeof signal> & { pid?: number };
    let released = false;
    let acquiredWhileHeld = false;
    let acquired = false;

    const first = ctx.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      locked.resolve();
      await release.promise;
    }, transactionOptions);
    const second = (async () => {
      await locked.promise;
      await ctx.prisma.$transaction(async (tx) => {
        const [{ pid }] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
        secondPid.pid = pid;
        secondPid.resolve();
        await withUserLock(tx, userId);
        acquiredWhileHeld = !released;
        acquired = true;
      }, transactionOptions);
    })();

    try {
      await secondPid.promise;
      let waiting = 0;
      for (let i = 0; i < 100 && waiting === 0; i++) {
        const [row] = await ctx.prisma.$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM pg_locks
          WHERE locktype = 'advisory' AND NOT granted AND pid = ${secondPid.pid}`;
        waiting = row.n;
        if (waiting === 0) await delay(50);
      }
      expect(waiting).toBe(1);
      expect(acquired).toBe(false);
    } finally {
      released = true;
      release.resolve();
    }
    await Promise.all([first, second]);
    expect(acquired).toBe(true);
    expect(acquiredWhileHeld).toBe(false);
  });

  it('B1#34: different users acquire locks while the first transaction still holds its lock', async () => {
    const locked = signal();
    const acquired = signal();
    let firstStillLocked = false;
    let independent = false;
    const first = ctx.prisma.$transaction(async (tx) => {
      await withUserLock(tx, randomUUID());
      firstStillLocked = true;
      locked.resolve();
      // Fail rather than deadlock forever if the lock accidentally becomes global.
      try {
        await Promise.race([
          acquired.promise,
          delay(2_000).then(() => { throw new Error('Different-user lock blocked'); }),
        ]);
      } finally {
        firstStillLocked = false;
      }
    }, transactionOptions);
    const second = (async () => {
      await locked.promise;
      await ctx.prisma.$transaction(async (tx) => {
        await withUserLock(tx, randomUUID());
        independent = firstStillLocked;
        acquired.resolve();
      }, transactionOptions);
    })();
    await Promise.all([first, second]);
    expect(independent).toBe(true);
  });
});
