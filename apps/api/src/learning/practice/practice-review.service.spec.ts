import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { PracticeReviewService } from './practice-review.service.js';

const userId = '00000000-0000-4000-8000-000000000001';
const senseId = '00000000-0000-4000-8000-0000000000a1';
const reviewId = '00000000-0000-4000-8000-0000000000b1';

function setup() {
  const tx = {
    $queryRaw: vi.fn(async () => []),
    learningLogEntry: { findFirst: vi.fn(async () => null) },
  };
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'UTC' })) };
  const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) };
  const service = new PracticeReviewService(
    new FakeClock(new Date('2026-10-19T03:00:00Z')), identity as unknown as IdentityService, settings as unknown as SettingsService,
  );
  return { service, tx: tx as unknown as Prisma.TransactionClient, identity, settings };
}

describe('PracticeReviewService.review — reads inside the caller\'s transaction', () => {
  it('PX4: practiceReview reads the profile and the settings through the caller\'s tx', async () => {
    const { service, tx, identity, settings } = setup();
    const outcomes = await service.review(tx, userId, [{ senseId, action: 'review', reviewId }]);
    expect(outcomes).toEqual([{ senseId, outcome: 'not-in-learning' }]);
    expect(identity.getProfile).toHaveBeenCalledExactlyOnceWith(userId, tx);
    expect(settings.get).toHaveBeenCalledExactlyOnceWith(tx);
  });
});

// nhóm B M6 (D39): one activity day per call that wrote at least one log row.
const otherSense = '00000000-0000-4000-8000-0000000000a2';
const otherReview = '00000000-0000-4000-8000-0000000000b2';

/** `learning` holds the senses the learner has an item for; `stored` the review ids whose log row already exists. */
function writing(at: string, learning: string[], stored: string[] = []) {
  const events: string[] = [];
  const tx = {
    $queryRaw: vi.fn(async () => learning.map((sense) => ({ id: `item-${sense}`, sense_id: sense }))),
    learningLogEntry: {
      findFirst: vi.fn(async ({ where }: { where: { reviewId: string } }) => (stored.includes(where.reviewId) ? {
        itemId: 'item-old', levelAfter: 1, dueAfter: new Date('2026-10-20T00:00:00Z'), answer: 'review',
      } : null)),
      create: vi.fn(async () => { events.push('log'); }),
    },
    learningItem: {
      findUniqueOrThrow: vi.fn(async () => ({
        id: 'item-x', level: 2, dueDate: new Date('2026-10-18T00:00:00Z'), priority: false, lastReviewedAt: null,
      })),
      update: vi.fn(async () => { events.push('update'); }),
    },
    learningActivityDay: { createMany: vi.fn(async () => { events.push('activity'); return { count: 1 }; }) },
  };
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) };
  const service = new PracticeReviewService(
    new FakeClock(new Date(at)), identity as unknown as IdentityService,
    { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService,
  );
  return { service, tx: tx as unknown as Prisma.TransactionClient, rawTx: tx, events };
}

describe('PracticeReviewService.review — records a learning activity day (nhóm B M6, D39)', () => {
  it('one input applied and one not in learning → one activity statement, after the loop, with the local date of the log row', async () => {
    const { service, tx, rawTx, events } = writing('2026-10-19T17:01:00Z', [senseId]);
    const outcomes = await service.review(tx, userId, [
      { senseId, action: 'review', reviewId }, { senseId: otherSense, action: 'review', reviewId: otherReview },
    ]);
    expect(outcomes.map(({ outcome }) => outcome)).toEqual(['applied', 'not-in-learning']);
    expect(rawTx.learningActivityDay.createMany).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId, localDate: new Date('2026-10-20T00:00:00.000Z') }], skipDuplicates: true,
    });
    expect(events).toEqual(['update', 'log', 'activity']);
  });

  it('two inputs applied → still one activity statement', async () => {
    const { service, tx, rawTx, events } = writing('2026-10-19T03:00:00Z', [senseId, otherSense]);
    await service.review(tx, userId, [
      { senseId, action: 'review', reviewId }, { senseId: otherSense, action: 'review', reviewId: otherReview },
    ]);
    expect(rawTx.learningActivityDay.createMany).toHaveBeenCalledOnce();
    expect(events).toEqual(['update', 'log', 'update', 'log', 'activity']);
  });

  it('only stored replays → no activity statement', async () => {
    const { service, tx, rawTx, events } = writing('2026-10-19T03:00:00Z', [senseId], [reviewId]);
    const outcomes = await service.review(tx, userId, [{ senseId, action: 'review', reviewId }]);
    expect(outcomes.map(({ outcome }) => outcome)).toEqual(['applied']);
    expect(rawTx.learningActivityDay.createMany).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('only "known" on a card that is not due (known-not-allowed) and only not-in-learning → no activity statement', async () => {
    const { service, tx, rawTx } = writing('2026-10-19T03:00:00Z', [senseId]);
    rawTx.learningItem.findUniqueOrThrow.mockResolvedValue({
      id: 'item-x', level: 3, dueDate: new Date('2026-10-30T00:00:00Z'), priority: false, lastReviewedAt: null,
    });
    const outcomes = await service.review(tx, userId, [
      { senseId, action: 'known', reviewId }, { senseId: otherSense, action: 'review', reviewId: otherReview },
    ]);
    expect(outcomes.map(({ outcome }) => outcome)).toEqual(['known-not-allowed', 'not-in-learning']);
    expect(rawTx.learningActivityDay.createMany).not.toHaveBeenCalled();
  });

  it('no inputs → no statement at all', async () => {
    const { service, tx, rawTx } = writing('2026-10-19T03:00:00Z', []);
    await expect(service.review(tx, userId, [])).resolves.toEqual([]);
    expect(rawTx.learningActivityDay.createMany).not.toHaveBeenCalled();
  });
});
