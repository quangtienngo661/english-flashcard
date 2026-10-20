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
