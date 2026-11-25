import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OrdersRepository } from '../../../src/entitlements/orders/orders.repository.js';
import { createIntegrationPrisma, type IntegrationPrisma } from '../support/integration-prisma.js';

describe('PAY-07/TST-01: OrdersRepository.claimForReconcile & claimForCheck boundaries on Postgres', () => {
  let db: IntegrationPrisma;
  const repo = new OrdersRepository();
  const NOW = new Date('2026-11-23T12:00:00.000Z');
  const SEC = 1_000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  let seq = 1_200_000_000;

  beforeAll(async () => {
    db = await createIntegrationPrisma();
  });

  afterAll(async () => {
    await db.close();
  });

  async function seedOrder(opts: {
    status: string;
    paymentLinkId?: string | null;
    reviewReason?: string | null;
    createdAt: Date;
    checkedAt?: Date | null;
    userId?: string;
  }): Promise<string> {
    const id = randomUUID();
    const orderCode = BigInt(seq++);
    await db.prisma.billingOrder.create({
      data: {
        id,
        userId: opts.userId ?? randomUUID(),
        periodMonths: 1,
        amountMinor: 59_000n,
        currency: 'VND',
        provider: 'payos',
        environment: 'sandbox',
        orderCode,
        description: `WM${orderCode}`,
        paymentLinkId: opts.paymentLinkId ?? null,
        checkoutUrl: opts.paymentLinkId ? 'https://pay.example.test/x' : null,
        status: opts.status,
        reviewReason: opts.reviewReason ?? null,
        expiresAt: new Date(NOW.getTime() + HOUR),
        createdAt: opts.createdAt,
        updatedAt: opts.createdAt,
        checkedAt: opts.checkedAt ?? null,
      },
    });
    return id;
  }

  it('claims exactly the orders matching every SQL boundary of claimForReconcile', async () => {
    // 1. pending with link: 5 min - 1 s -> NO; 5 min + 1 s -> YES
    const pendingLinkTooNew = await seedOrder({
      status: 'pending',
      paymentLinkId: 'lnk-1',
      createdAt: new Date(NOW.getTime() - (5 * MIN - SEC)),
    });
    const pendingLinkOldEnough = await seedOrder({
      status: 'pending',
      paymentLinkId: 'lnk-2',
      createdAt: new Date(NOW.getTime() - (5 * MIN + SEC)),
    });

    // 2. pending without link: 2 min - 1 s -> NO; 2 min + 1 s -> YES
    const pendingNoLinkTooNew = await seedOrder({
      status: 'pending',
      paymentLinkId: null,
      createdAt: new Date(NOW.getTime() - (2 * MIN - SEC)),
    });
    const pendingNoLinkOldEnough = await seedOrder({
      status: 'pending',
      paymentLinkId: null,
      createdAt: new Date(NOW.getTime() - (2 * MIN + SEC)),
    });

    // 3. needs_review / amount-short: 7 days - 1 s -> YES; 7 days + 1 s -> NO
    const shortWithin7d = await seedOrder({
      status: 'needs_review',
      reviewReason: 'amount-short',
      paymentLinkId: 'lnk-3',
      createdAt: new Date(NOW.getTime() - (7 * DAY - SEC)),
    });
    const shortOver7d = await seedOrder({
      status: 'needs_review',
      reviewReason: 'amount-short',
      paymentLinkId: 'lnk-4',
      createdAt: new Date(NOW.getTime() - (7 * DAY + SEC)),
    });

    // 4. failed, no link, review_reason null:
    //    24 h - 1 s -> YES; 24 h + 1 s -> NO; checked 59 min ago -> NO; checked 61 min ago -> YES
    const failedWithin24h = await seedOrder({
      status: 'failed',
      paymentLinkId: null,
      reviewReason: null,
      createdAt: new Date(NOW.getTime() - (24 * HOUR - SEC)),
    });
    const failedOver24h = await seedOrder({
      status: 'failed',
      paymentLinkId: null,
      reviewReason: null,
      createdAt: new Date(NOW.getTime() - (24 * HOUR + SEC)),
    });
    const failedChecked59m = await seedOrder({
      status: 'failed',
      paymentLinkId: null,
      reviewReason: null,
      createdAt: new Date(NOW.getTime() - 2 * HOUR),
      checkedAt: new Date(NOW.getTime() - 59 * MIN),
    });
    const failedChecked61m = await seedOrder({
      status: 'failed',
      paymentLinkId: null,
      reviewReason: null,
      createdAt: new Date(NOW.getTime() - 2 * HOUR),
      checkedAt: new Date(NOW.getTime() - 61 * MIN),
    });

    // 5. failed, no link, review_reason = 'provider-mismatch' -> NO
    const failedProviderMismatch = await seedOrder({
      status: 'failed',
      paymentLinkId: null,
      reviewReason: 'provider-mismatch',
      createdAt: new Date(NOW.getTime() - HOUR),
    });

    const claimed = await repo.claimForReconcile(db.prisma, NOW, 100);
    const ids = new Set(claimed.map((o) => o.id));

    expect(ids.has(pendingLinkTooNew)).toBe(false);
    expect(ids.has(pendingLinkOldEnough)).toBe(true);

    expect(ids.has(pendingNoLinkTooNew)).toBe(false);
    expect(ids.has(pendingNoLinkOldEnough)).toBe(true);

    expect(ids.has(shortWithin7d)).toBe(true);
    expect(ids.has(shortOver7d)).toBe(false);

    expect(ids.has(failedWithin24h)).toBe(true);
    expect(ids.has(failedOver24h)).toBe(false);
    expect(ids.has(failedChecked59m)).toBe(false);
    expect(ids.has(failedChecked61m)).toBe(true);

    expect(ids.has(failedProviderMismatch)).toBe(false);
  });

  it('claimForCheck respects minGapMs and allows pending or needs_review/amount-short only', async () => {
    const userId = randomUUID();
    const orderId = await seedOrder({
      userId,
      status: 'needs_review',
      reviewReason: 'amount-short',
      paymentLinkId: 'lnk-check',
      createdAt: new Date(NOW.getTime() - 10 * MIN),
    });

    const first = await repo.claimForCheck(db.prisma, orderId, userId, NOW, 10_000);
    expect(first?.id).toBe(orderId);

    // 9s later (< 10s minGapMs) -> null
    const tooSoon = await repo.claimForCheck(db.prisma, orderId, userId, new Date(NOW.getTime() + 9_000), 10_000);
    expect(tooSoon).toBeNull();

    // 11s later (> 10s minGapMs) -> claimed again
    const allowed = await repo.claimForCheck(db.prisma, orderId, userId, new Date(NOW.getTime() + 11_000), 10_000);
    expect(allowed?.id).toBe(orderId);
  });
});
