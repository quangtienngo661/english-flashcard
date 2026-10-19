import { describe, expect, it } from 'vitest';
import type { Prisma } from '../generated/prisma/client.js';
import { lockAiDaily, lockPool, lockUser } from './entitlements.locks.js';

/** A fake transaction client that records the SQL text and the values of every `$executeRaw` call. */
function fakeTx() {
  const calls: { sql: string; values: unknown[] }[] = [];
  const tx = {
    $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({ sql: strings.join('?'), values });
      return Promise.resolve(0);
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, calls };
}

describe('entitlements locks', () => {
  it('B5E4: the user and pool keys include the user id, so two users with the same operation id never share a lock', async () => {
    const { tx, calls } = fakeTx();
    await lockUser(tx, 'user-a');
    await lockUser(tx, 'user-b');
    await lockPool(tx, 'user-a', 'ai_practice');
    await lockPool(tx, 'user-b', 'ai_practice');

    const keys = calls.map((c) => c.values[0]);
    expect(keys).toEqual([
      'entitlements.user:user-a',
      'entitlements.user:user-b',
      'entitlements.pool:user-a:ai_practice',
      'entitlements.pool:user-b:ai_practice',
    ]);
    expect(new Set(keys).size).toBe(4);
  });

  it('takes a transaction-scoped advisory lock on the hashed key', async () => {
    const { tx, calls } = fakeTx();
    await lockAiDaily(tx);
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain('pg_advisory_xact_lock(hashtextextended(');
    expect(calls[0].values).toEqual(['entitlements.ai_daily']);
  });

  it('keeps the pools of one user apart', async () => {
    const { tx, calls } = fakeTx();
    await lockPool(tx, 'user-a', 'ai_practice');
    await lockPool(tx, 'user-a', 'ai_lookup');
    expect(calls[0].values[0]).not.toEqual(calls[1].values[0]);
  });
});
