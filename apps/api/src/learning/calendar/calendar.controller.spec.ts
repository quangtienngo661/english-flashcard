import { describe, expect, it, vi } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { LearnerContentGuard } from '../../content/learner/learner-content.guard.js';
import { CalendarController } from './calendar.controller.js';
import type { CalendarService } from './calendar.service.js';

describe('GET /v1/me/calendar', () => {
  it('is a learner route (LearnerContentGuard)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CalendarController)).toEqual([LearnerContentGuard]);
  });

  it('passes the learner id and month to the service', async () => {
    const month = vi.fn(async () => ({ month: '2026-11', days: [], totals: { study_days: 0, learned: 0, reviewed: 0, practice_sessions: 0 } }));
    const controller = new CalendarController({ month } as unknown as CalendarService);
    await controller.month({ userId: 'u1', nativeLanguage: 'vi' }, { month: '2026-11' });
    expect(month).toHaveBeenCalledExactlyOnceWith('u1', '2026-11');
  });
});
