import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { runIdempotentInTx } from './run-idempotent-in-tx.js';

const input = { key: 'press', userId: 'u1', endpoint: '/v1/items/topic-add', payloadHash: 'hash1' };
const now = () => new Date('2026-11-14T04:00:00Z');
const receipt = { added: 1 };

function setup(locked = true) {
  let row: Record<string, unknown> | null = null;
  const tx = {
    $queryRaw: vi.fn(async () => [{ locked }]),
    idempotencyKey: {
      findFirst: vi.fn(async () => row),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { row = data; }),
      delete: vi.fn(async () => { row = null; }),
    },
  };
  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const before = row;
      try { return await fn(tx); } catch (error) { row = before; throw error; }
    },
  } as unknown as PrismaClient;
  return { prisma, tx };
}

describe('runIdempotentInTx', () => {
  it('replays a committed receipt and rejects a different payload with the same key', async () => {
    const { prisma } = setup();
    const handler = vi.fn(async (_tx: unknown, save: (body: typeof receipt) => Promise<void>) => {
      await save(receipt);
      return receipt;
    });
    await expect(runIdempotentInTx(prisma, input, handler, { now })).resolves.toEqual(receipt);
    await expect(runIdempotentInTx(prisma, input, handler, { now })).resolves.toEqual(receipt);
    await expect(runIdempotentInTx(prisma, { ...input, payloadHash: 'other' }, handler, { now })).rejects.toMatchObject({ status: 400 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('retries a rolled-back write and receipt with its original key', async () => {
    const { prisma, tx } = setup();
    await expect(runIdempotentInTx(prisma, input, async (_tx, save) => {
      await save(receipt);
      throw new Error('write failed');
    }, { now })).rejects.toThrow('write failed');
    await expect(runIdempotentInTx(prisma, input, async (_tx, save) => {
      await save(receipt);
      return receipt;
    }, { now })).resolves.toEqual(receipt);
    expect(tx.idempotencyKey.create).toHaveBeenCalledTimes(2);
  });

  it('reports a running attempt with Retry-After without invoking the writer', async () => {
    const { prisma } = setup(false);
    const handler = vi.fn();
    await expect(runIdempotentInTx(prisma, input, handler, { now })).rejects.toMatchObject({ status: 409, retryAfterSeconds: 2 });
    expect(handler).not.toHaveBeenCalled();
  });
});
