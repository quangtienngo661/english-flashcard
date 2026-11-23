import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoticePlanner } from '../../../src/entitlements/notices/notice-planner.service.js';
import { SourcesRepository } from '../../../src/entitlements/sources/sources.repository.js';
import type { SettingsService } from '../../../src/settings/index.js';
import { createIntegrationPrisma, type IntegrationPrisma } from '../support/integration-prisma.js';

describe('NoticePlanner.plan with deleting user (SEC-08, A1.4)', () => {
  let db: IntegrationPrisma;
  let planner: NoticePlanner;

  beforeAll(async () => {
    db = await createIntegrationPrisma();
    const settings = {
      get: async () => ({
        entitlements: {
          trialReminderDaysBefore: 3,
          renewalNoticeDaysBefore: 3,
        },
      }),
    } as unknown as SettingsService;
    planner = new NoticePlanner(db.prisma, settings, new SourcesRepository());
  });

  afterAll(async () => {
    await db?.close();
  });

  async function seedExpiringPeriod(
    status: 'active' | 'deleting',
    orderCode: bigint,
    email: string,
    now: Date,
  ): Promise<string> {
    const user = await db.prisma.user.create({
      data: {
        email,
        timezone: 'Asia/Ho_Chi_Minh',
        status,
        ...(status === 'deleting' ? { deletingSince: now, deletingBy: 'self' } : {}),
      },
      select: { id: true },
    });
    const order = await db.prisma.billingOrder.create({
      data: {
        userId: user.id,
        provider: 'payos',
        environment: 'sandbox',
        orderCode,
        description: `WM${String(orderCode).slice(-7)}`,
        periodMonths: 1,
        amountMinor: 79_000n,
        currency: 'VND',
        status: 'paid',
        paidVia: 'webhook',
        paymentLinkId: `link-${orderCode}`,
        expiresAt: new Date(now.getTime() - 25 * 86_400_000),
      },
      select: { id: true },
    });
    const payment = await db.prisma.billingOrderPayment.create({
      data: {
        orderId: order.id,
        paymentKey: `payos:sandbox:${orderCode}:ref1`,
        source: 'webhook',
        reference: 'ref1',
        amountMinor: 79_000n,
        outcome: 'opened-period',
      },
      select: { id: true },
    });
    await db.prisma.prepaidPeriod.create({
      data: {
        userId: user.id,
        orderId: order.id,
        paymentId: payment.id,
        startsAt: new Date(now.getTime() - 28 * 86_400_000),
        // Ends in 2 days — inside renewalNoticeDaysBefore = 3.
        endsAt: new Date(now.getTime() + 2 * 86_400_000),
      },
    });
    return user.id;
  }

  it('writes expiry notices for active users, skips deleting users, and stays idempotent', async () => {
    const now = new Date('2026-11-23T10:00:00Z');
    const userA = await seedExpiringPeriod('active', 1_100_000_101n, 'active-a14@example.test', now);
    const userB = await seedExpiringPeriod('deleting', 1_100_000_102n, 'deleting-a14@example.test', now);

    await planner.plan(now);

    expect(await db.prisma.entitlementNotice.count({ where: { userId: userA } })).toBe(1);
    expect(await db.prisma.entitlementNotice.count({ where: { userId: userB } })).toBe(0);

    // Second run must not duplicate A's notice.
    await planner.plan(now);
    expect(await db.prisma.entitlementNotice.count({ where: { userId: userA } })).toBe(1);
    expect(await db.prisma.entitlementNotice.count({ where: { userId: userB } })).toBe(0);
  });
});
