import { describe, expect, it, vi } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { FakeClock } from '../../common/clock/clock.js';
import { LearnerContentGuard } from '../../content/learner/learner-content.guard.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import type { LearningService } from '../learning.service.js';
import { StreakController } from './streak.controller.js';

describe('GET /v1/me/streak (giao diện mới §10.5)', () => {
  it('today is the learner-local date: 17:30 UTC on 31/10 is 01/11 in Ho Chi Minh', async () => {
    const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
    const streakAsOf = vi.fn(async () => ({ days: 3, studiedToday: false }));
    const controller = new StreakController(
      new FakeClock(new Date('2026-10-31T17:30:00Z')),
      identity,
      { streakAsOf } as unknown as LearningService,
    );
    const result = await controller.streak({ userId: 'u1', nativeLanguage: 'vi' });
    expect(streakAsOf).toHaveBeenCalledExactlyOnceWith('u1', '2026-11-01');
    expect(result).toEqual({ days: 3, studied_today: false });
  });

  it('is a learner route (LearnerContentGuard)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, StreakController)).toEqual([LearnerContentGuard]);
  });
});
