import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { IdentityService } from '../../../src/identity/profile/identity.service.js';
import { RetentionService } from '../../../src/learning/retention/retention.service.js';
import type { SettingsService } from '../../../src/settings/settings.service.js';
import { createIntegrationPrisma, type IntegrationPrisma } from '../support/integration-prisma.js';

describe('PRD-02: RetentionService counts studied=true activity days only on Postgres', () => {
  let db: IntegrationPrisma;

  beforeAll(async () => {
    db = await createIntegrationPrisma();
  });

  afterAll(async () => {
    await db.close();
  });

  it('counts only studied=true rows for D7 cohort retention and today.active', async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    // Monday 2026-11-02 09:00 Vietnam time = 2026-11-02T02:00:00Z
    const regAt = new Date('2026-11-02T02:00:00.000Z');
    const day7 = new Date('2026-11-09T00:00:00.000Z');
    // Sunday 2026-11-15 VN: whole 2026-11-02..08 cohort has reached D7, and 2026-11-09 is inside the 7-day active window [11-09..11-15].
    const now = new Date('2026-11-15T05:00:00.000Z');

    await db.prisma.learningActivityDay.createMany({
      data: [
        { userId: userA, localDate: day7, studied: false },
        { userId: userB, localDate: day7, studied: true },
      ],
    });

    const identity = {
      staffUserIds: async () => [],
      registrations: async () => [
        { userId: userA, createdAt: regAt, emailVerified: true, staff: false },
        { userId: userB, createdAt: regAt, emailVerified: true, staff: false },
      ],
    } as unknown as IdentityService;

    const settings = {
      get: async () => ({ learning: { activeWindowDays: 7 } }),
    } as unknown as SettingsService;

    const service = new RetentionService(db.prisma, identity, settings);
    const view = await service.report({ from: '2026-11-02', to: '2026-11-15' }, now);

    const cohort = view.cohorts.find((c) => c.week_start === '2026-11-02');
    expect(cohort).toEqual({ week_start: '2026-11-02', size: 2, d7: 1, d30: null });
    expect(view.today.active).toBe(1);
    expect(view.today.stopped).toBe(0);
  });
});
