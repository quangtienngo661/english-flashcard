import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { ReviewsService } from './reviews.service.js';

const userId = '00000000-0000-4000-8000-000000000001';
const itemId = '00000000-0000-4000-8000-0000000000a1';
const groupId = '00000000-0000-4000-8000-0000000000c1';
const reviewId = '00000000-0000-4000-8000-0000000000b1';
const input = { itemId, groupId, answer: 'review' as const, reviewId };

/** `stored` is the log row a replayed review_id finds. Every write is recorded in `events`, in order. */
function setup(at: string, stored: Record<string, unknown> | null = null, item: Record<string, unknown> = {}, itemRow: Record<string, unknown> | null = null) {
  const events: string[] = [];
  const tx = {
    learningLogEntry: {
      findFirst: vi.fn(async () => stored),
      create: vi.fn(async (_args: { data: { localDate: Date } }) => { events.push('log'); }),
    },
    $queryRaw: vi.fn(async () => [{ id: itemId }]),
    groupItem: { findFirst: vi.fn(async () => ({ groupId, itemId })) },
    learningItem: {
      findUniqueOrThrow: vi.fn(async () => ({
        id: itemId, senseId: 's1', level: 2, dueDate: new Date('2026-10-18T00:00:00Z'), priority: false, lastReviewedAt: null, ...item,
      })),
      findUnique: vi.fn(async () => itemRow),
      update: vi.fn(async () => { events.push('update'); }),
    },
    learningActivityDay: { createMany: vi.fn(async () => { events.push('activity'); return { count: 1 }; }) },
  };
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaClient;
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
  const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
  const service = new ReviewsService(prisma, new FakeClock(new Date(at)), identity, settings);
  return { service, tx, events };
}

describe('ReviewsService.answer — records a learning activity day (nhóm B M6, D39)', () => {
  it('Review focus 1: an answer at 00:01 learner-local (17:01 UTC the day before) writes the log row, then the activity day of the NEW date as the last write', async () => {
    const { service, tx, events } = setup('2026-10-19T17:01:00Z');
    await service.answer(userId, input);
    expect(tx.learningLogEntry.create.mock.calls[0][0].data.localDate).toEqual(new Date('2026-10-20T00:00:00.000Z'));
    expect(tx.learningActivityDay.createMany).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId, localDate: new Date('2026-10-20T00:00:00.000Z') }], skipDuplicates: true,
    });
    expect(events).toEqual(['update', 'log', 'activity']);
  });

  it('Review focus 2: a replayed review_id returns the stored result and writes no activity statement', async () => {
    const { service, tx, events } = setup('2026-10-19T17:01:00Z', {
      itemId, groupId, answer: 'review', levelAfter: 1, dueAfter: new Date('2026-10-20T00:00:00Z'), section: 'due',
    }, {}, { priority: true });
    await expect(service.answer(userId, input)).resolves.toEqual({
      item_id: itemId, level: 1, due_date: '2026-10-20', priority: true, section: 'due',
    });
    expect(tx.learningActivityDay.createMany).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('a failing activity write fails the review (the transaction rolls the log row back with it)', async () => {
    const { service, tx } = setup('2026-10-19T03:00:00Z');
    const boom = new Error('activity insert failed');
    tx.learningActivityDay.createMany.mockRejectedValueOnce(boom);
    await expect(service.answer(userId, input)).rejects.toBe(boom);
  });
});

describe('ReviewsService.answer — flashcards only move new words (round C, DC4)', () => {
  const known = { ...input, answer: 'known' as const };
  it('"known" on a due level-3 word leaves the item alone but still writes one log row (the cap counts it)', async () => {
    const { service, tx, events } = setup('2026-11-07T03:00:00Z', null, { level: 3, dueDate: new Date('2026-11-05T00:00:00Z') });
    await expect(service.answer(userId, known)).resolves.toMatchObject({ level: 3, due_date: '2026-11-05', priority: false, section: 'due' });
    expect(tx.learningItem.update).not.toHaveBeenCalled();
    expect(tx.learningLogEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.learningLogEntry.create.mock.calls[0][0].data).toMatchObject({
      section: 'due', groupId, levelBefore: 3, levelAfter: 3, answer: 'known',
    });
    expect(events).toEqual(['log', 'activity']);
  });

  it('"known" on a new word still moves it to level 1, due tomorrow', async () => {
    const { service, tx } = setup('2026-11-07T03:00:00Z', null, { level: 0, dueDate: new Date('2026-11-07T00:00:00Z') });
    await expect(service.answer(userId, known)).resolves.toMatchObject({ level: 1, due_date: '2026-11-08', section: 'new' });
    expect(tx.learningItem.update).toHaveBeenCalledTimes(1);
  });

  it('replaying "known" for an item that is still priority reports priority: true (read from the item, not from the answer)', async () => {
    const { service } = setup('2026-11-07T03:00:00Z', {
      itemId, groupId, answer: 'known', levelAfter: 1, dueAfter: new Date('2026-11-07T00:00:00Z'), section: 'priority',
    }, {}, { priority: true });
    await expect(service.answer(userId, known)).resolves.toMatchObject({ priority: true, section: 'priority' });
  });

  it('replaying "review" for an item that has since been deleted reports priority: false', async () => {
    const { service } = setup('2026-11-07T03:00:00Z', {
      itemId, groupId, answer: 'review', levelAfter: 1, dueAfter: new Date('2026-11-07T00:00:00Z'), section: 'due',
    }, {}, null);
    await expect(service.answer(userId, input)).resolves.toMatchObject({ priority: false });
  });
});
