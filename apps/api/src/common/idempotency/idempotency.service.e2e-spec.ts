import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PRISMA_CLIENT, PrismaModule } from '../db/prisma.module.js';
import { runIdempotent } from './idempotency.service.js';

describe('runIdempotent (e2e)', () => {
  let prisma: PrismaClient;
  let moduleRef: TestingModule;
  let key: string;
  let userId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule.forRoot({ connectionString: inject('databaseUrl') })],
    }).compile();
    prisma = moduleRef.get(PRISMA_CLIENT);
  });

  beforeEach(() => {
    key = randomUUID();
    userId = randomUUID();
  });

  afterAll(async () => {
    await moduleRef?.close();
    await prisma?.$disconnect();
  });

  it('B0#2: a never-seen key proceeds and runs the handler', async () => {
    const r = await runIdempotent(prisma, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: { ok: true } }));
    expect(r).toMatchObject({ kind: 'proceed', status: 200, body: { ok: true } });
  });

  it('B0#1: a key whose advisory lock is held by a live, open transaction returns conflict immediately', async () => {
    let lockAcquired!: () => void;
    const lockAcquiredPromise = new Promise<void>((resolve) => { lockAcquired = resolve; });
    let released!: () => void;
    const holding = new Promise<void>((resolve) => { released = resolve; });
    const holderDone = prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1 || ':' || $2 || ':' || $3)::bigint)`,
        key, userId, '/v1/sample',
      );
      lockAcquired();
      await holding;
    });
    await lockAcquiredPromise; // only now is the lock actually held
    const started = Date.now();
    const r = await runIdempotent(prisma, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: {} }));
    expect(Date.now() - started).toBeLessThan(1000); // non-blocking: must not wait on the holder
    expect(r.kind).toBe('conflict');
    released();
    await holderDone;
  });

  it('B0#3: a succeeded key with the same payload hash replays without running the handler', async () => {
    await prisma.idempotencyKey.create({ data: { key, userId, endpoint: '/v1/sample', status: 'succeeded', payloadHash: 'h1', responseStatus: 200, responseBody: { ok: true } } });
    let handlerRan = false;
    const r = await runIdempotent(prisma, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => { handlerRan = true; return { status: 200, body: {} }; });
    expect(r).toEqual({ kind: 'replay', status: 200, body: { ok: true } });
    expect(handlerRan).toBe(false);
  });

  it('B0#4: a key with a different payload hash is rejected without running the handler', async () => {
    await prisma.idempotencyKey.create({ data: { key, userId, endpoint: '/v1/sample', status: 'succeeded', payloadHash: 'h1', responseStatus: 200, responseBody: {} } });
    let handlerRan = false;
    const r = await runIdempotent(prisma, { key, userId, endpoint: '/v1/sample', payloadHash: 'h2' },
      async () => { handlerRan = true; return { status: 200, body: {} }; });
    expect(r.kind).toBe('reject');
    expect(handlerRan).toBe(false);
  });

  it('B0E1: an orphaned in_progress row (no live holder) is claimed as a new attempt', async () => {
    await prisma.idempotencyKey.create({ data: { key, userId, endpoint: '/v1/sample', status: 'in_progress', payloadHash: 'h1' } }); // nobody holds the advisory lock on this key
    const r = await runIdempotent(prisma, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: { recovered: true } }));
    expect(r).toMatchObject({ kind: 'proceed', status: 200, body: { recovered: true } });
  });

  it('B0E7: a row past the 24h retention window is claimed as a new request', async () => {
    await prisma.idempotencyKey.create({ data: { key, userId, endpoint: '/v1/sample', status: 'succeeded', payloadHash: 'h1', responseStatus: 200, responseBody: {}, createdAt: new Date(Date.now() - 25 * 3600 * 1000) } });
    const r = await runIdempotent(prisma, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: { fresh: true } }));
    expect(r).toMatchObject({ kind: 'proceed', status: 200, body: { fresh: true } });
  });

  it('B0E8: a handler slower than the configured timeout aborts instead of holding the lock forever', async () => {
    await expect(
      runIdempotent(
        prisma,
        { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          return { status: 200, body: {} };
        },
        { timeoutSeconds: 0.3 },
      ),
    ).rejects.toThrow();

    // The connection the aborted transaction used must not poison the pool for later work.
    const r = await runIdempotent(prisma, { key: randomUUID(), userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: { ok: true } }));
    expect(r.kind).toBe('proceed');
  });

  it('Review Focus #1: two genuinely concurrent runs for the same key run the handler exactly once', async () => {
    // Exact timing (conflict-vs-proceed, or proceed-vs-replay if the first finishes before the
    // second's lock attempt) is non-deterministic and both are correct outcomes. The invariant
    // that must always hold regardless of timing is: the side-effecting handler never runs twice,
    // and neither attempt is ever rejected (same key, same payload).
    let handlerRunCount = 0;
    const runOnce = () =>
      runIdempotent(prisma, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' }, async () => {
        handlerRunCount += 1;
        return { status: 200, body: { marker: 'x' } };
      });
    const [a, b] = await Promise.all([runOnce(), runOnce()]);
    expect(handlerRunCount).toBe(1);
    expect(a.kind).not.toBe('reject');
    expect(b.kind).not.toBe('reject');
    expect([a.kind, b.kind]).toContain('proceed');
  });

  it('Review Focus #7: a handler slower than Prisma\'s 5s default completes within runIdempotent\'s 30s default', async () => {
    const r = await runIdempotent(prisma, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 6000));
        return { status: 200, body: { ok: true } };
      });
    expect(r).toMatchObject({ kind: 'proceed', status: 200, body: { ok: true } });
  }, 10_000);
});
