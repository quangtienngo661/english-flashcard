import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { PilotMetricsService } from './pilot-metrics.service.js';

function makeService() {
  const prisma = {
    billingOrder: { findMany: vi.fn().mockResolvedValue([]) },
    practiceSession: { count: vi.fn().mockResolvedValue(0) },
    learningLogEntry: { findMany: vi.fn().mockResolvedValue([]) },
    learningActivityDay: { groupBy: vi.fn().mockResolvedValue([]) },
  };
  const identity = {
    registrations: vi.fn().mockResolvedValue([]),
    staffUserIds: vi.fn().mockResolvedValue([]),
  };
  const service = new PilotMetricsService(
    prisma as unknown as PrismaClient,
    identity as unknown as IdentityService,
  );
  return { service, prisma, identity };
}

describe('PilotMetricsService', () => {
  it('computes activation, weekly orders, AI sessions, and excludes staff from members and recall_by_level', async () => {
    const { service, prisma, identity } = makeService();
    identity.staffUserIds.mockResolvedValue(['staff-1']);
    identity.registrations.mockResolvedValue([
      { userId: 'u-1', emailVerified: true, staff: false, createdAt: new Date('2026-11-16T03:00:00Z') }, // 2026-11-16 VN
      { userId: 'u-2', emailVerified: true, staff: false, createdAt: new Date('2026-11-17T03:00:00Z') }, // 2026-11-17 VN
      { userId: 'u-unverified', emailVerified: false, staff: false, createdAt: new Date('2026-11-17T03:00:00Z') },
      { userId: 'staff-1', emailVerified: true, staff: true, createdAt: new Date('2026-11-17T03:00:00Z') },
    ]);
    prisma.learningActivityDay.groupBy.mockResolvedValue([
      { userId: 'u-1', _min: { localDate: new Date('2026-11-17T00:00:00Z') } }, // +1 day -> activated
      { userId: 'u-2', _min: { localDate: new Date('2026-11-19T00:00:00Z') } }, // +2 days -> not activated
    ]);
    prisma.billingOrder.findMany.mockResolvedValue([
      { createdAt: new Date('2026-11-18T05:00:00Z'), status: 'paid' },
      { createdAt: new Date('2026-11-19T05:00:00Z'), status: 'pending' },
    ]);
    prisma.practiceSession.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(4);
    prisma.learningLogEntry.findMany.mockResolvedValue([
      { userId: 'u-1', levelBefore: 1, levelAfter: 2 },
      { userId: 'u-2', levelBefore: 1, levelAfter: 1 },
      { userId: 'staff-1', levelBefore: 1, levelAfter: 2 }, // excluded
    ]);

    const res = await service.report(
      { from: '2026-11-16', to: '2026-11-22' },
      new Date('2026-11-23T05:00:00Z'),
    );

    expect(res).toEqual({
      from: '2026-11-16',
      to: '2026-11-22',
      members: 2,
      activated: 1,
      weeks: [{ week: '2026-11-16', verified: 2, orders_created: 2, orders_paid: 1 }],
      ai_sessions: { sessions: 10, with_ai: 4 },
      recall_by_level: [{ level: 1, due_answers: 2, remembered: 1 }],
    });
  });

  it('skips learningActivityDay query when no verified members registered in range', async () => {
    const { service, prisma } = makeService();
    const res = await service.report(
      { from: '2026-11-16', to: '2026-11-22' },
      new Date('2026-11-23T05:00:00Z'),
    );
    expect(res.members).toBe(0);
    expect(res.activated).toBe(0);
    expect(prisma.learningActivityDay.groupBy).not.toHaveBeenCalled();
  });
});
