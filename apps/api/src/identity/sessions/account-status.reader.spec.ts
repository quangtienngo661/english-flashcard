import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaAccountStatusReader } from './account-status.reader.js';

function setup(chain: unknown) {
  const findUnique = vi.fn(async () => chain);
  const reader = new PrismaAccountStatusReader({ sessionChain: { findUnique } } as unknown as PrismaClient);
  return { reader, findUnique };
}

describe('PrismaAccountStatusReader', () => {
  it('B8: reads the chain and its owner in one query', async () => {
    const userId = randomUUID();
    const chainId = randomUUID();
    const { reader, findUnique } = setup({
      userId, revokedAt: null, authMethod: 'google', user: { status: 'deleting' },
    });
    expect(await reader.read(userId, chainId)).toEqual({ status: 'deleting', authMethod: 'google', revoked: false });
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: chainId } }));
  });

  it('B8: a revoked chain is reported as revoked', async () => {
    const userId = randomUUID();
    const { reader } = setup({ userId, revokedAt: new Date(), authMethod: 'password', user: { status: 'active' } });
    expect(await reader.read(userId, randomUUID())).toMatchObject({ revoked: true });
  });

  it('B8: returns null when the chain does not exist', async () => {
    expect(await setup(null).reader.read(randomUUID(), randomUUID())).toBeNull();
  });

  it('B8: returns null for a chain that belongs to another user', async () => {
    const { reader } = setup({ userId: randomUUID(), revokedAt: null, authMethod: 'password', user: { status: 'active' } });
    expect(await reader.read(randomUUID(), randomUUID())).toBeNull();
  });
});
