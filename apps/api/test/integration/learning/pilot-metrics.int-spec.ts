import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Clock } from '../../../src/common/clock/clock.js';
import type { AppLogger } from '../../../src/common/logging/app-logger.js';
import { IdentityService } from '../../../src/identity/profile/identity.service.js';
import { PilotMetricsService } from '../../../src/learning/retention/pilot-metrics.service.js';
import { createIntegrationPrisma, type IntegrationPrisma } from '../support/integration-prisma.js';

describe('S-2/S-4: PilotMetricsService SQL aggregation and member scoping on Postgres', () => {
  let db: IntegrationPrisma;
  let service: PilotMetricsService;
  let orderSeq = 1_300_000_000;

  beforeAll(async () => {
    db = await createIntegrationPrisma();
    const clock = { now: () => new Date('2026-11-23T05:00:00.000Z') } as unknown as Clock;
    const logger = { info: () => {}, warn: () => {}, error: () => {} } as unknown as AppLogger;
    const identity = new IdentityService(db.prisma, clock, logger);
    service = new PilotMetricsService(db.prisma, identity);
  });

  afterAll(async () => {
    await db?.close();
  });

  async function seedUser(opts: {
    email: string;
    createdAt: Date;
    verified?: boolean;
    staffRole?: 'admin' | 'editor' | null;
  }): Promise<string> {
    const row = await db.prisma.user.create({
      data: {
        email: opts.email,
        timezone: 'Asia/Ho_Chi_Minh',
        emailVerifiedAt: opts.verified === false ? null : opts.createdAt,
        staffRole: opts.staffRole ?? null,
        createdAt: opts.createdAt,
        updatedAt: opts.createdAt,
      },
      select: { id: true },
    });
    return row.id;
  }

  async function seedLog(opts: {
    userId: string;
    kind: 'review' | 'relearn';
    wasDue: boolean;
    levelBefore: number;
    levelAfter: number;
    localDate: string;
    at: Date;
  }): Promise<void> {
    await db.prisma.learningLogEntry.create({
      data: {
        userId: opts.userId,
        itemId: randomUUID(),
        senseId: randomUUID(),
        kind: opts.kind,
        wasDue: opts.wasDue,
        levelBefore: opts.levelBefore,
        levelAfter: opts.levelAfter,
        localDate: new Date(`${opts.localDate}T00:00:00.000Z`),
        at: opts.at,
      },
    });
  }

  async function seedOrder(opts: { userId: string; status: 'paid' | 'pending'; createdAt: Date }): Promise<void> {
    const code = BigInt(orderSeq++);
    await db.prisma.billingOrder.create({
      data: {
        userId: opts.userId,
        provider: 'payos',
        environment: 'sandbox',
        orderCode: code,
        description: `WM${code}`,
        periodMonths: 1,
        amountMinor: 59_000n,
        currency: 'VND',
        status: opts.status,
        expiresAt: new Date(opts.createdAt.getTime() + 3_600_000),
        createdAt: opts.createdAt,
        updatedAt: opts.createdAt,
      },
    });
  }

  async function seedSession(opts: { userId: string; aiPlanned: number; startedAt: Date }): Promise<void> {
    await db.prisma.practiceSession.create({
      data: {
        userId: opts.userId,
        source: 'all',
        sort: 'overdue_first',
        types: ['mcq_definition'],
        promptStyle: 'meaning',
        targetCount: 5,
        senseIds: [randomUUID()],
        status: 'finished',
        startedAt: opts.startedAt,
        lastActivityAt: opts.startedAt,
        aiPlanned: opts.aiPlanned,
      },
    });
  }

  it('aggregates recall_by_level in SQL for verified in-range members and excludes staff and ineligible sign-ups', async () => {
    // Range: 2026-11-16 (Mon) .. 2026-11-22 (Sun); now = 2026-11-23 12:00 VN (today = 2026-11-23).
    const now = new Date('2026-11-23T05:00:00.000Z');

    // Verified non-staff members registered in range:
    const m1 = await seedUser({ email: 'm1@example.test', createdAt: new Date('2026-11-16T03:00:00.000Z') }); // regDay 11-16 (eligible)
    const m2 = await seedUser({ email: 'm2@example.test', createdAt: new Date('2026-11-17T03:00:00.000Z') }); // regDay 11-17 (eligible)
    // Registered on `to` (2026-11-22): regDay + 1 = 2026-11-23 === today -> NOT activation-eligible (S-4).
    const mLastDay = await seedUser({ email: 'mlast@example.test', createdAt: new Date('2026-11-22T03:00:00.000Z') });
    // Registered before `from`: excluded from members, weeks, and recall_by_level.
    const mBefore = await seedUser({ email: 'mbefore@example.test', createdAt: new Date('2026-11-10T03:00:00.000Z') });
    // Staff and unverified users registered in range: excluded from members, weeks, and recall_by_level.
    const staffUser = await seedUser({
      email: 'staff@example.test',
      createdAt: new Date('2026-11-16T04:00:00.000Z'),
      staffRole: 'admin',
    });
    const unverifiedUser = await seedUser({
      email: 'unverified@example.test',
      createdAt: new Date('2026-11-16T05:00:00.000Z'),
      verified: false,
    });

    // Activity days for activation:
    await db.prisma.learningActivityDay.createMany({
      data: [
        // m1 studied on regDay + 1 -> activated
        { userId: m1, localDate: new Date('2026-11-17T00:00:00.000Z'), studied: true },
        // m2 has studied=false on regDay and studied=true on regDay + 3 -> NOT activated
        { userId: m2, localDate: new Date('2026-11-17T00:00:00.000Z'), studied: false },
        { userId: m2, localDate: new Date('2026-11-20T00:00:00.000Z'), studied: true },
        // mLastDay studied on regDay -> excluded from activation eligibility because regDay + 1 === today
        { userId: mLastDay, localDate: new Date('2026-11-22T00:00:00.000Z'), studied: true },
      ],
    });

    // Learning log entries:
    // m1: 2 due review rows at level 1 (1 remembered, 1 not), plus excluded rows (wasDue=false, kind=relearn, out-of-range local_date)
    await seedLog({ userId: m1, kind: 'review', wasDue: true, levelBefore: 1, levelAfter: 2, localDate: '2026-11-18', at: new Date('2026-11-18T05:00:00.000Z') });
    await seedLog({ userId: m1, kind: 'review', wasDue: true, levelBefore: 1, levelAfter: 1, localDate: '2026-11-19', at: new Date('2026-11-19T05:00:00.000Z') });
    await seedLog({ userId: m1, kind: 'review', wasDue: false, levelBefore: 1, levelAfter: 2, localDate: '2026-11-19', at: new Date('2026-11-19T06:00:00.000Z') });
    await seedLog({ userId: m1, kind: 'relearn', wasDue: true, levelBefore: 1, levelAfter: 2, localDate: '2026-11-19', at: new Date('2026-11-19T07:00:00.000Z') });
    await seedLog({ userId: m1, kind: 'review', wasDue: true, levelBefore: 1, levelAfter: 2, localDate: '2026-11-23', at: new Date('2026-11-22T18:00:00.000Z') });
    // m2: 2 due review rows at level 3 (1 remembered, 1 not)
    await seedLog({ userId: m2, kind: 'review', wasDue: true, levelBefore: 3, levelAfter: 4, localDate: '2026-11-20', at: new Date('2026-11-20T05:00:00.000Z') });
    await seedLog({ userId: m2, kind: 'review', wasDue: true, levelBefore: 3, levelAfter: 2, localDate: '2026-11-21', at: new Date('2026-11-21T05:00:00.000Z') });
    // mLastDay: in-range verified non-staff member -> counted in recall_by_level (level 3, remembered)
    await seedLog({ userId: mLastDay, kind: 'review', wasDue: true, levelBefore: 3, levelAfter: 4, localDate: '2026-11-22', at: new Date('2026-11-22T05:00:00.000Z') });
    // Excluded users' due reviews in range:
    await seedLog({ userId: mBefore, kind: 'review', wasDue: true, levelBefore: 1, levelAfter: 2, localDate: '2026-11-18', at: new Date('2026-11-18T05:00:00.000Z') });
    await seedLog({ userId: staffUser, kind: 'review', wasDue: true, levelBefore: 1, levelAfter: 2, localDate: '2026-11-18', at: new Date('2026-11-18T06:00:00.000Z') });
    await seedLog({ userId: unverifiedUser, kind: 'review', wasDue: true, levelBefore: 3, levelAfter: 4, localDate: '2026-11-18', at: new Date('2026-11-18T07:00:00.000Z') });

    // Orders: 2 member orders (1 paid, 1 pending) + 1 staff paid order (excluded)
    await seedOrder({ userId: m1, status: 'paid', createdAt: new Date('2026-11-18T05:00:00.000Z') });
    await seedOrder({ userId: m2, status: 'pending', createdAt: new Date('2026-11-19T05:00:00.000Z') });
    await seedOrder({ userId: staffUser, status: 'paid', createdAt: new Date('2026-11-19T06:00:00.000Z') });

    // Practice sessions: 2 member sessions (1 with AI, 1 without) + 1 staff AI session (excluded)
    await seedSession({ userId: m1, aiPlanned: 2, startedAt: new Date('2026-11-18T04:00:00.000Z') });
    await seedSession({ userId: m2, aiPlanned: 0, startedAt: new Date('2026-11-19T04:00:00.000Z') });
    await seedSession({ userId: staffUser, aiPlanned: 3, startedAt: new Date('2026-11-19T07:00:00.000Z') });

    const view = await service.report({ from: '2026-11-16', to: '2026-11-22' }, now);

    expect(view).toEqual({
      from: '2026-11-16',
      to: '2026-11-22',
      members: 2,
      activated: 1,
      weeks: [{ week: '2026-11-16', verified: 3, orders_created: 2, orders_paid: 1 }],
      ai_sessions: { sessions: 2, with_ai: 1 },
      recall_by_level: [
        { level: 1, due_answers: 2, remembered: 1 },
        { level: 3, due_answers: 3, remembered: 2 },
      ],
    });
  });

  it('returns empty recall_by_level when no verified non-staff members registered in range', async () => {
    const view = await service.report(
      { from: '2026-10-01', to: '2026-10-07' },
      new Date('2026-11-23T05:00:00.000Z'),
    );
    expect(view.members).toBe(0);
    expect(view.activated).toBe(0);
    expect(view.recall_by_level).toEqual([]);
  });
});
