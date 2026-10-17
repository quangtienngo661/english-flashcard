import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { learningMetrics } from '../support/learning-metrics.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

// 10:00 in Asia/Ho_Chi_Minh (the seeded learner's zone) on a local date.
const morning = (value: string) => new Date(`${value}T03:00:00Z`);

describe('learning metrics from the log (e2e, isolated database)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  afterAll(async () => { await ctx?.close(); });

  let added = 0;

  it('B3#20 / T-C6: from a month of real adds and answers learningMetrics returns the expected weekly adds, 48-hour share and active days', async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const group = await ctx.prisma.learningGroup.create({
      data: { userId, name: 'Month', nameKey: 'month', createdAt: morning('2026-11-02'), updatedAt: morning('2026-11-02') },
    });
    // Adds and answers go through the real routes, so the log rows are the ones production writes.
    const add = async (day: string) => {
      ctx.clock.set(morning(day));
      const [senseId] = await seedVisibleSenses(ctx.prisma, 1, `m${day}-${(added += 1)}`);
      const { accessToken } = await startSession(ctx, userId);
      const response = await ctx.http().post(`/v1/groups/${group.id}/items`).set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', randomUUID()).send({ sense_id: senseId });
      expect(response.status).toBe(201);
      return response.body.item_id as string;
    };
    const known = async (itemId: string, day: string) => {
      ctx.clock.set(morning(day));
      const { accessToken } = await startSession(ctx, userId);
      const response = await ctx.http().post('/v1/reviews').set('Authorization', `Bearer ${accessToken}`)
        .send({ item_id: itemId, group_id: group.id, answer: 'known', review_id: randomUUID() });
      expect(response.status).toBe(200);
    };

    const [a, b] = [await add('2026-11-02'), await add('2026-11-02')];
    await add('2026-11-02'); // never answered
    const d = await add('2026-11-10');
    await add('2026-11-10');

    await known(a, '2026-11-02'); // due 11-03
    await known(b, '2026-11-02'); // due 11-03
    await known(a, '2026-11-03'); // on time; due 11-06
    await known(b, '2026-11-04'); // second day of the window; due 11-07 (never answered)
    await known(a, '2026-11-08'); // two days late; due 11-15 (never answered)
    await known(d, '2026-11-10'); // due 11-11
    await known(d, '2026-11-11'); // due 11-14
    await known(d, '2026-11-14'); // due 11-21
    await known(d, '2026-11-22'); // second day of the window; due 12-06, outside the month

    expect(await learningMetrics(ctx.prisma, userId, '2026-11-01', '2026-11-30')).toEqual({
      weeklyAdds: { '2026-W45': 3, '2026-W46': 2 },
      // Due dates: a 11-03 ✓, 11-06 ✗, 11-15 ✗; b 11-03 ✓, 11-07 ✗; d 11-11 ✓, 11-14 ✓, 11-21 ✓.
      due: { total: 8, answeredWithin48h: 5, share: 5 / 8 },
      activeDays: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-08', '2026-11-10', '2026-11-11', '2026-11-14', '2026-11-22'],
    });
    // A window that closes after `to` is not counted yet.
    expect((await learningMetrics(ctx.prisma, userId, '2026-11-01', '2026-11-21')).due).toEqual({
      total: 7, answeredWithin48h: 4, share: 4 / 7,
    });
  });
});
