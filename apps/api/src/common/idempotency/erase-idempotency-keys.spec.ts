import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../generated/prisma/client.js';
import { deleteIdempotencyKeysOf } from './erase-idempotency-keys.js';

describe('deleteIdempotencyKeysOf', () => {
  it('deletes by user id only', async () => {
    const deleteMany = vi.fn(async () => ({ count: 3 }));
    await deleteIdempotencyKeysOf({ idempotencyKey: { deleteMany } } as unknown as Prisma.TransactionClient, 'user-1');
    expect(deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { userId: 'user-1' } });
  });
});
