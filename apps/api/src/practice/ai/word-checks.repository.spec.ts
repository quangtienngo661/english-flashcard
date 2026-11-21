import { describe, expect, it, vi } from 'vitest';
import { USER_DATA_TX } from '../../identity/user-lock.js';
import { WordChecksRepository } from './word-checks.repository.js';

const USER = '00000000-0000-4000-8000-000000000001';
const SENSE = '00000000-0000-4000-8000-000000000002';
const NOW = new Date('2026-11-21T00:00:00Z');

function setup(userStatus: 'active' | 'deleting' | null) {
  const tx = {
    $executeRaw: vi.fn(async () => 1),
    user: {
      findUnique: vi.fn(async () => (userStatus === null ? null : { status: userStatus })),
    },
    practiceWordCheck: {
      upsert: vi.fn(async () => ({})),
    },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>, _options?: unknown) => fn(tx)),
    practiceWordCheck: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
    },
  };
  const repo = new WordChecksRepository(prisma as never);
  return { repo, prisma, tx };
}

describe('WordChecksRepository.put (F-04)', () => {
  it.each([null, 'deleting'] as const)('skips upsert and returns false when user is %s', async (status) => {
    const { repo, prisma, tx } = setup(status);
    expect(await repo.put(USER, SENSE, 'k1', 'ok', NOW)).toBe(false);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.practiceWordCheck.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction.mock.calls[0]?.[1]).toEqual(USER_DATA_TX);
  });

  it('upserts and returns true for an active user (positive control)', async () => {
    const { repo, prisma, tx } = setup('active');
    expect(await repo.put(USER, SENSE, 'k1', 'ok', NOW)).toBe(true);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.practiceWordCheck.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0]?.[1]).toEqual(USER_DATA_TX);
  });
});
