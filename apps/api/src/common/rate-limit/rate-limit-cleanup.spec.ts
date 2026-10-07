import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { deleteExpiredRateLimitCounters } from './rate-limit-cleanup.js';

describe('deleteExpiredRateLimitCounters', () => {
  it('deletes only counters strictly older than 24 hours and returns the count', async () => {
    const now = new Date('2026-10-07T12:00:00.000Z');
    const boundary = new Date('2026-10-06T12:00:00.000Z');
    let rows = [new Date(boundary.getTime() - 1), boundary, new Date(boundary.getTime() + 1)];
    const deleteMany = vi.fn(async ({ where }: { where: { windowStart: { lt: Date } } }) => {
      const original = rows.length;
      rows = rows.filter((date) => date >= where.windowStart.lt);
      return { count: original - rows.length };
    });
    const prisma = { rateLimitCounter: { deleteMany } } as unknown as PrismaClient;
    expect(await deleteExpiredRateLimitCounters(prisma, now)).toBe(1);
    expect(rows).toEqual([boundary, new Date(boundary.getTime() + 1)]);
    expect(now.toISOString()).toBe('2026-10-07T12:00:00.000Z');
    expect(await deleteExpiredRateLimitCounters(prisma, now)).toBe(0);
  });
});
