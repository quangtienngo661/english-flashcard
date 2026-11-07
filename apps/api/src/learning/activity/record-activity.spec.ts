import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../generated/prisma/client.js';
import { recordActivityIn } from './record-activity.js';

const day = new Date('2026-10-20T00:00:00.000Z');

/** An in-memory `learning_activity_days`: rows keyed by user and date, with `studied`. */
function fakeDb(initial: Array<{ userId: string; localDate: Date; studied: boolean }> = []) {
  const rows = [...initial];
  const find = (userId: string, localDate: Date) => rows.find((row) => row.userId === userId && row.localDate.getTime() === localDate.getTime());
  const learningActivityDay = {
    createMany: vi.fn(async ({ data }: { data: Array<{ userId: string; localDate: Date; studied?: boolean }> }) => {
      let count = 0;
      for (const { userId, localDate, studied } of data) {
        if (find(userId, localDate)) continue;
        rows.push({ userId, localDate, studied: studied ?? false });
        count++;
      }
      return { count };
    }),
    updateMany: vi.fn(async ({ where, data }: { where: { userId: string; localDate: Date; studied: boolean }; data: { studied: boolean } }) => {
      const row = find(where.userId, where.localDate);
      if (!row || row.studied !== where.studied) return { count: 0 };
      row.studied = data.studied;
      return { count: 1 };
    }),
  };
  return { db: { learningActivityDay } as unknown as Prisma.TransactionClient, rows, learningActivityDay };
}

describe('recordActivityIn', () => {
  it('writes one (learner, local date) row with skipDuplicates, so a second write on the same day is a no-op, not a unique violation', async () => {
    const { db, learningActivityDay } = fakeDb();
    await recordActivityIn(db, 'u1', '2026-10-20', { studied: false });
    expect(learningActivityDay.createMany).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId: 'u1', localDate: day }], skipDuplicates: true,
    });
  });

  it('an error from the database reaches the caller, so the transaction of the write it marks rolls back', async () => {
    const boom = new Error('insert failed');
    const db = { learningActivityDay: { createMany: vi.fn(async () => { throw boom; }), updateMany: vi.fn(async () => { throw boom; }) } } as unknown as Prisma.TransactionClient;
    await expect(recordActivityIn(db, 'u1', '2026-10-20', { studied: false })).rejects.toBe(boom);
    await expect(recordActivityIn(db, 'u1', '2026-10-20', { studied: true })).rejects.toBe(boom);
  });

  it('studied: false on a new day creates a row with studied = false and is never the first study', async () => {
    const { db, rows } = fakeDb();
    await expect(recordActivityIn(db, 'u1', '2026-10-20', { studied: false })).resolves.toEqual({ firstStudied: false });
    expect(rows).toEqual([{ userId: 'u1', localDate: day, studied: false }]);
  });

  it('studied: true after studied: false on the same day flips the row and is the first study', async () => {
    const { db, rows } = fakeDb();
    await recordActivityIn(db, 'u1', '2026-10-20', { studied: false });
    await expect(recordActivityIn(db, 'u1', '2026-10-20', { studied: true })).resolves.toEqual({ firstStudied: true });
    expect(rows).toEqual([{ userId: 'u1', localDate: day, studied: true }]);
  });

  it('a second studied: true on the same day is not the first study', async () => {
    const { db } = fakeDb();
    await expect(recordActivityIn(db, 'u1', '2026-10-20', { studied: true })).resolves.toEqual({ firstStudied: true });
    await expect(recordActivityIn(db, 'u1', '2026-10-20', { studied: true })).resolves.toEqual({ firstStudied: false });
  });

  it('studied: false never turns a studied day back', async () => {
    const { db, rows } = fakeDb([{ userId: 'u1', localDate: day, studied: true }]);
    await recordActivityIn(db, 'u1', '2026-10-20', { studied: false });
    expect(rows[0].studied).toBe(true);
  });

  it('a new day with studied: true is the first study of that day', async () => {
    const { db, rows } = fakeDb([{ userId: 'u1', localDate: new Date('2026-10-19T00:00:00.000Z'), studied: true }]);
    await expect(recordActivityIn(db, 'u1', '2026-10-20', { studied: true })).resolves.toEqual({ firstStudied: true });
    expect(rows).toHaveLength(2);
  });

  it('another learner\'s row does not count', async () => {
    const { db } = fakeDb([{ userId: 'u2', localDate: day, studied: true }]);
    await expect(recordActivityIn(db, 'u1', '2026-10-20', { studied: true })).resolves.toEqual({ firstStudied: true });
  });

  it('a row another request inserts between our update and our insert (as not studied) is still flipped by us', async () => {
    const { db, rows, learningActivityDay } = fakeDb();
    // The first update finds nothing; then the other request inserts its non-studied row before our insert runs.
    const realUpdate = learningActivityDay.updateMany.getMockImplementation()!;
    learningActivityDay.updateMany.mockImplementationOnce(async (args) => {
      const result = await realUpdate(args);
      rows.push({ userId: 'u1', localDate: day, studied: false });
      return result;
    });
    await expect(recordActivityIn(db, 'u1', '2026-10-20', { studied: true })).resolves.toEqual({ firstStudied: true });
    expect(rows).toEqual([{ userId: 'u1', localDate: day, studied: true }]);
  });
});
