import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const now = new Date('2026-11-08T03:00:00Z');
const GROUPS = 100;
const PER_GROUP = 2000;
// ASSUMPTION (plan, Review Focus 5): the threshold is the owner's to confirm; the duration is printed for that.
const THRESHOLD_MS = 500;

describe('learning at scale (e2e, isolated database)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  }, 300_000);
  afterAll(async () => { await ctx?.close(); });

  it('Review Focus 5: 100 groups × 2,000 items seeded with generate_series → GET /v1/groups prints its duration and is < 500 ms', async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const senseIds = await seedVisibleSenses(ctx.prisma, GROUPS * PER_GROUP, 'scale');
    await ctx.prisma.$executeRaw`
      INSERT INTO learning_groups (user_id, name, name_key, created_at, updated_at)
      SELECT ${userId}::uuid, 'Group ' || g, 'group ' || g, ${now}, ${now} FROM generate_series(1, ${GROUPS}::int) g`;
    // Levels 0–5 and due dates spread over the last 90 days, so every count has work to do.
    await ctx.prisma.$executeRaw`
      INSERT INTO learning_items (user_id, sense_id, level, due_date, priority, created_at)
      SELECT ${userId}::uuid, s.id, (s.n % 6)::int, DATE '2026-11-08' - (s.n % 90)::int, s.n % 97 = 0, ${now}
      FROM unnest(${senseIds}::uuid[]) WITH ORDINALITY AS s(id, n)`;
    await ctx.prisma.$executeRaw`
      INSERT INTO group_items (group_id, item_id, added_at)
      SELECT g.id, i.id, ${now}
      FROM (SELECT id, row_number() OVER (ORDER BY id) - 1 AS r FROM learning_items WHERE user_id = ${userId}::uuid) i
      JOIN (SELECT id, row_number() OVER (ORDER BY name_key) - 1 AS r FROM learning_groups WHERE user_id = ${userId}::uuid) g
        ON g.r = i.r / ${PER_GROUP}`;
    await ctx.prisma.$executeRaw`ANALYZE`;
    expect(await ctx.prisma.groupItem.count()).toBe(GROUPS * PER_GROUP);

    ctx.clock.set(now);
    const token = (await startSession(ctx, userId)).accessToken;
    const get = () => ctx.http().get('/v1/groups').set('Authorization', `Bearer ${token}`);
    expect((await get()).status).toBe(200); // warm-up: connection, plan cache
    const timings: number[] = [];
    let body: { items: Array<{ total: number }> } = { items: [] };
    for (let i = 0; i < 3; i += 1) {
      const started = performance.now();
      const response = await get();
      timings.push(performance.now() - started);
      expect(response.status).toBe(200);
      body = response.body;
    }
    const median = [...timings].sort((a, b) => a - b)[1];
    console.log(`[Review Focus 5] GET /v1/groups, ${GROUPS} groups x ${PER_GROUP} items: ${timings.map((t) => t.toFixed(0)).join(' / ')} ms (median ${median.toFixed(0)} ms, threshold ${THRESHOLD_MS} ms)`);
    expect(body.items).toHaveLength(GROUPS);
    expect(body.items.every(({ total }) => total === PER_GROUP)).toBe(true);
    expect(median).toBeLessThan(THRESHOLD_MS);
  }, 300_000);
});
