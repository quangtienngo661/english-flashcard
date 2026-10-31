import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../generated/prisma/client.js';
import { recordActivityIn } from './record-activity.js';

describe('recordActivityIn', () => {
  it('writes one (learner, local date) row with skipDuplicates, so a second write on the same day is a no-op, not a unique violation', async () => {
    const createMany = vi.fn(async () => ({ count: 1 }));
    const db = { learningActivityDay: { createMany } } as unknown as Prisma.TransactionClient;
    await recordActivityIn(db, 'u1', '2026-10-20');
    expect(createMany).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId: 'u1', localDate: new Date('2026-10-20T00:00:00.000Z') }], skipDuplicates: true,
    });
  });

  it('an error from the database reaches the caller, so the transaction of the write it marks rolls back', async () => {
    const boom = new Error('insert failed');
    const db = { learningActivityDay: { createMany: vi.fn(async () => { throw boom; }) } } as unknown as Prisma.TransactionClient;
    await expect(recordActivityIn(db, 'u1', '2026-10-20')).rejects.toBe(boom);
  });
});
