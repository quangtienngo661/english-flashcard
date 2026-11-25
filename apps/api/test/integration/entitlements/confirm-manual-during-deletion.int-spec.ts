import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProblemDetailsException } from '../../../src/common/problem-details/problem-details.exception.js';
import { OrderApplier } from '../../../src/entitlements/orders/order-applier.service.js';
import { createTestApp, type TestApp } from '../../support/create-test-app.js';
import { createIsolatedDatabase } from '../../support/isolated-database.js';

describe('OrderApplier.confirmManual during account deletion (S1)', () => {
  let ctx: TestApp;
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = await createIsolatedDatabase();
    ctx = await createTestApp({ databaseUrl });
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('never opens a prepaid period when confirmManual races with account deletion (5 runs)', async () => {
    const applier = ctx.app.get(OrderApplier);
    const now = ctx.clock.now();
    const adminId = randomUUID();

    for (let i = 0; i < 5; i++) {
      const orderCode = 1_100_000_600 + i;
      const user = await ctx.prisma.user.create({
        data: {
          email: `learner-s1-${i}@example.test`,
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
          description: `WMS10000${i}`,
          periodMonths: 1,
          amountMinor: 79_000n,
          currency: 'VND',
          status: 'pending',
          paymentLinkId: `link-s1-${i}`,
          expiresAt: new Date(now.getTime() + 15 * 60_000),
        },
        select: { id: true },
      });

      let confirmError: unknown = null;
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
        const confirmPromise = applier
          .confirmManual({
            orderId: order.id,
            adminId,
            reference: `MANUAL-S1-${i}`,
            amount: 79_000,
            reason: 'bank slip verified',
          })
          .catch((err) => {
            confirmError = err;
          });

        await Promise.all([delPromise, confirmPromise]);
      } finally {
        await tDel.end();
      }

      const periodCount = await ctx.prisma.prepaidPeriod.count({ where: { userId: user.id } });
      expect(periodCount, `run ${i}: deleting user must have 0 prepaid_periods`).toBe(0);
      expect(confirmError, `run ${i}: confirmManual must reject with 409`).toBeInstanceOf(ProblemDetailsException);
      expect((confirmError as ProblemDetailsException).getStatus()).toBe(409);
    }
  });
});
