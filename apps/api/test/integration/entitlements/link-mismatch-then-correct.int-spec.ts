import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BillingInbox } from '../../../src/entitlements/billing/billing-inbox.service.js';
import { BillingEventApplier } from '../../../src/entitlements/billing/event-applier.service.js';
import { toParsedEvent } from '../../../src/entitlements/billing/payos/payos-wire.js';
import { createTestApp, type TestApp } from '../../support/create-test-app.js';
import { createIsolatedDatabase } from '../../support/isolated-database.js';

describe('Link-mismatch webhook followed by correct webhook (R5d, A2.3)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    const databaseUrl = await createIsolatedDatabase();
    ctx = await createTestApp({ databaseUrl });
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('applies the correct webhook after a link-mismatch webhook, dedupes repeats, and does not double-credit without paymentLinkId', async () => {
    const inbox = ctx.app.get(BillingInbox);
    const applier = ctx.app.get(BillingEventApplier);
    const now = ctx.clock.now();

    const user = await ctx.prisma.user.create({
      data: { email: 'learner-a23@example.test', timezone: 'Asia/Ho_Chi_Minh', status: 'active' },
      select: { id: true },
    });

    const orderCode = 1_100_000_001;
    const order = await ctx.prisma.billingOrder.create({
      data: {
        userId: user.id,
        provider: 'payos',
        environment: 'sandbox',
        orderCode: BigInt(orderCode),
        description: 'WM2300001',
        periodMonths: 1,
        amountMinor: 79_000n,
        currency: 'VND',
        status: 'pending',
        paymentLinkId: 'L-good',
        expiresAt: new Date(now.getTime() + 15 * 60_000),
      },
      select: { id: true },
    });

    const webhookOf = (paymentLinkId: string | undefined) =>
      toParsedEvent(
        {
          code: '00',
          desc: 'success',
          success: true,
          signature: 'unused',
          data: {
            orderCode,
            amount: 79_000,
            reference: 'R1',
            ...(paymentLinkId !== undefined ? { paymentLinkId } : {}),
            transactionDateTime: '2026-11-23 10:00:00',
            code: '00',
          },
        },
        'sandbox',
        now,
      )!;

    // 1. Wrong link id -> ignored / link-mismatch
    const badIds = await inbox.store('payos', [webhookOf('L-bad')]);
    expect(badIds).toHaveLength(1);
    await applier.applyMany(badIds);
    const badEvent = await ctx.prisma.billingEvent.findUniqueOrThrow({ where: { id: badIds[0] } });
    expect(badEvent.status).toBe('ignored');
    expect(badEvent.error).toBe('link-mismatch');

    // 2. Correct link id -> paid, 1 payment, 1 period
    const goodIds = await inbox.store('payos', [webhookOf('L-good')]);
    expect(goodIds).toHaveLength(1);
    await applier.applyMany(goodIds);

    const updatedOrder = await ctx.prisma.billingOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(updatedOrder.status).toBe('paid');
    expect(await ctx.prisma.billingOrderPayment.count({ where: { orderId: order.id } })).toBe(1);
    expect(await ctx.prisma.prepaidPeriod.count({ where: { userId: user.id } })).toBe(1);

    // 3. Repeat of L-good -> no new inbox row, still 1 payment
    const repeatIds = await inbox.store('payos', [webhookOf('L-good')]);
    expect(repeatIds).toEqual([]);
    expect(await ctx.prisma.billingOrderPayment.count({ where: { orderId: order.id } })).toBe(1);

    // 4. Webhook without paymentLinkId -> old-format key payos:sandbox:1100000001:R1, still 1 payment
    const noLinkEvent = webhookOf(undefined);
    expect(noLinkEvent.externalEventId).toBe(`${orderCode}:R1`);
    const noLinkIds = await inbox.store('payos', [noLinkEvent]);
    expect(noLinkIds).toHaveLength(1);
    await applier.applyMany(noLinkIds);
    expect(await ctx.prisma.billingOrderPayment.count({ where: { orderId: order.id } })).toBe(1);
    expect(await ctx.prisma.prepaidPeriod.count({ where: { userId: user.id } })).toBe(1);
  });
});
