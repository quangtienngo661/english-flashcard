import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { DRIZZLE_DB, DrizzleModule } from '../db/drizzle.module.js';
import { idempotencyKeys } from './idempotency.schema.js';
import { lockKeyFor, runIdempotent } from './idempotency.service.js';

describe('runIdempotent (e2e)', () => {
  let db: NodePgDatabase & { $client: Pool };
  let moduleRef: TestingModule;
  let key: string;
  let userId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [DrizzleModule.forRoot({ connectionString: inject('databaseUrl') })],
    }).compile();
    db = moduleRef.get(DRIZZLE_DB);
  });

  beforeEach(() => {
    key = randomUUID();
    userId = randomUUID();
  });

  afterAll(async () => {
    await moduleRef?.close();
    await db?.$client.end();
  });

  it('B0#2: a never-seen key proceeds and runs the handler', async () => {
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: { ok: true } }));
    expect(r).toMatchObject({ kind: 'proceed', status: 200, body: { ok: true } });
  });

  it('B0#1: a key whose advisory lock is held by a live, open transaction returns conflict immediately', async () => {
    let released: () => void;
    const holding = new Promise<void>((resolve) => { released = resolve; });
    const holderDone = db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKeyFor(key, userId, '/v1/sample')})`);
      await holding; // keep the transaction (and the lock) open until the test releases it
    });
    const started = Date.now();
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: {} }));
    expect(Date.now() - started).toBeLessThan(1000); // non-blocking: must not wait on the holder
    expect(r.kind).toBe('conflict');
    released!();
    await holderDone;
  });

  it('B0#3: a succeeded key with the same payload hash replays without running the handler', async () => {
    await db.insert(idempotencyKeys).values({ key, userId, endpoint: '/v1/sample', status: 'succeeded', payloadHash: 'h1', responseStatus: 200, responseBody: { ok: true } });
    let handlerRan = false;
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => { handlerRan = true; return { status: 200, body: {} }; });
    expect(r).toEqual({ kind: 'replay', status: 200, body: { ok: true } });
    expect(handlerRan).toBe(false);
  });

  it('B0#4: a key with a different payload hash is rejected without running the handler', async () => {
    await db.insert(idempotencyKeys).values({ key, userId, endpoint: '/v1/sample', status: 'succeeded', payloadHash: 'h1', responseStatus: 200, responseBody: {} });
    let handlerRan = false;
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h2' },
      async () => { handlerRan = true; return { status: 200, body: {} }; });
    expect(r.kind).toBe('reject');
    expect(handlerRan).toBe(false);
  });

  it('B0E1: an orphaned in_progress row (no live holder) is claimed as a new attempt', async () => {
    await db.insert(idempotencyKeys).values({ key, userId, endpoint: '/v1/sample', status: 'in_progress', payloadHash: 'h1' }); // nobody holds the advisory lock on this key
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: { recovered: true } }));
    expect(r).toMatchObject({ kind: 'proceed', status: 200, body: { recovered: true } });
  });

  it('B0E7: a row past the 24h retention window is claimed as a new request', async () => {
    await db.insert(idempotencyKeys).values({ key, userId, endpoint: '/v1/sample', status: 'succeeded', payloadHash: 'h1', responseStatus: 200, responseBody: {}, createdAt: new Date(Date.now() - 25 * 3600 * 1000) });
    const r = await runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' },
      async () => ({ status: 200, body: { fresh: true } }));
    expect(r).toMatchObject({ kind: 'proceed', status: 200, body: { fresh: true } });
  });

  it('Review Focus #1: two genuinely concurrent runs for the same key resolve to exactly one proceed and one conflict', async () => {
    const [a, b] = await Promise.all([
      runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' }, async () => ({ status: 200, body: {} })),
      runIdempotent(db, { key, userId, endpoint: '/v1/sample', payloadHash: 'h1' }, async () => ({ status: 200, body: {} })),
    ]);
    const kinds = [a.kind, b.kind].sort();
    expect(kinds).toEqual(['conflict', 'proceed']);
  });
});
