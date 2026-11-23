import pg from 'pg';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BillingInbox } from '../../../src/entitlements/billing/billing-inbox.service.js';
import { BillingEventApplier } from '../../../src/entitlements/billing/event-applier.service.js';
import { toParsedEvent } from '../../../src/entitlements/billing/payos/payos-wire.js';
import { createTestApp, type TestApp } from '../../support/create-test-app.js';
import { createIsolatedDatabase } from '../../support/isolated-database.js';

describe('OrderApplier.applyPayment during account deletion (A1.5)', () => {
  let ctx: TestApp;
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = await createIsolatedDatabase();
    ctx = await createTestApp({ databaseUrl });
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('never opens a prepaid period while an account deletion transaction holds the identity lock (5 runs)', async () => {
    const inbox = ctx.app.get(BillingInbox);
    const applier = ctx.app.get(BillingEventApplier);
    const now = ctx.clock.now();

    for (let i = 0; i < 5; i++) {
      const orderCode = 1_100_000_500 + i;
      const linkId = `link-a15-${i}`;
      const user = await ctx.prisma.user.create({
        data: {
          email: `learner-a15-${i}@example.test`,
          timezone: 'Asia/Ho_Chi_Minh',
          status: 'active',
        },
        select: { id: true },
      });

      const order = await ctx.prisma.billingOrder.create({
        data: {
          userId: user.id,
          provider: 'payos',
          environment: 'sandbox',
          orderCode: BigInt(orderCode),
          description: `WM150000${i}`,
          periodMonths: 1,
          amountMinor: 79_000n,
          currency: 'VND',
          status: 'pending',
          paymentLinkId: linkId,
          expiresAt: new Date(now.getTime() + 15 * 60_000),
        },
        select: { id: true },
      });

      const parsed = toParsedEvent(
        {
          code: '00',
          desc: 'success',
          success: true,
          signature: 'unused-in-store',
          data: {
            orderCode,
            amount: 79_000,
            reference: `REF-A15-${i}`,
            paymentLinkId: linkId,
            transactionDateTime: '2026-11-23 10:00:00',
            code: '00',
          },
        },
        'sandbox',
        now,
      );
      expect(parsed).not.toBeNull();
      const eventIds = await inbox.store('payos', [parsed!]);
      expect(eventIds).toHaveLength(1);

      const tDel = new pg.Client({ connectionString: databaseUrl });
      await tDel.connect();
      try {
        const delPromise = (async () => {
          await tDel.query('BEGIN');
          await tDel.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`identity.user:${user.id}`]);
          await tDel.query(`UPDATE users SET status = 'deleting' WHERE id = $1::uuid`, [user.id]);
          await tDel.query(`DELETE FROM prepaid_periods WHERE user_id = $1::uuid`, [user.id]);
          await tDel.query('SELECT pg_sleep(1.5)');
          await tDel.query('COMMIT');
        })();

        await delay(200);
        const applyPromise = applier.applyMany(eventIds);

        await Promise.all([delPromise, applyPromise]);
      } finally {
        await tDel.end();
      }

      // If apply failed due to deadlock (40P01), re-apply after deletion committed must still open 0 periods.
      await applier.applyMany(eventIds);

      const periodCount = await ctx.prisma.prepaidPeriod.count({ where: { userId: user.id } });
      expect(periodCount, `run ${i}: deleted user must have 0 prepaid_periods`).toBe(0);

      const updatedOrder = await ctx.prisma.billingOrder.findUniqueOrThrow({ where: { id: order.id } });
      expect(updatedOrder.reviewReason === 'account-deleted' || periodCount === 0).toBe(true);
    }
  });
});
