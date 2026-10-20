// Review probes (independent review 18/10/2026) — not part of the product suite; lives only in the review worktree.
import { appendFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client.js';
import { LearningService } from '../../src/learning/index.js';
import { practiceItemsQuery } from '../../src/learning/practice/practice-reads.queries.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const out = (...a: unknown[]) => appendFileSync(process.env.PROBE_OUT ?? 'probe.out', a.join(' ') + '\n');
const now = new Date('2026-11-08T03:00:00Z');
const GROUPS = 100;
const PER_GROUP = 2000;

describe('review probes: PX2 practiceItems at the plan scale (100 groups x 2,000 words)', () => {
  let ctx: TestApp;
  beforeAll(async () => { ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() }); }, 300_000);
  afterAll(async () => { await ctx?.close(); });

  it('PX2: practiceItems(all) and (today), with GET /v1/groups on the same data as a control', async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const senseIds = await seedVisibleSenses(ctx.prisma, GROUPS * PER_GROUP, 'px');
    await ctx.prisma.$executeRaw`
      INSERT INTO learning_groups (user_id, name, name_key, created_at, updated_at)
      SELECT ${userId}::uuid, 'Group ' || g, 'group ' || g, ${now}, ${now} FROM generate_series(1, ${GROUPS}::int) g`;
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
    ctx.clock.set(now);
    const learning = ctx.app.get(LearningService);
    const time = async (label: string, call: () => Promise<unknown>) => {
      await call();
      const times: number[] = [];
      let size = 0;
      for (let i = 0; i < 3; i += 1) {
        const t = performance.now();
        const r = await call();
        times.push(performance.now() - t);
        size = Array.isArray(r) ? r.length : size;
      }
      out(`PX2 ${label}: median ${[...times].sort((a, b) => a - b)[1].toFixed(0)} ms (${times.map((t) => t.toFixed(0)).join(' / ')}), rows ${size}`);
    };
    const token = (await startSession(ctx, userId)).accessToken;
    await time('control GET /v1/groups', async () => ctx.http().get('/v1/groups').set('Authorization', `Bearer ${token}`));
    await time('practiceItems({ kind: all })', () => learning.practiceItems(userId, { kind: 'all' }));
    await time('practiceItems({ kind: today })', () => learning.practiceItems(userId, { kind: 'today' }));
    const q = practiceItemsQuery(userId, { kind: 'all' }, '2026-11-08', 60, { reviews: 100, new: 20 });
    const plan = await ctx.prisma.$queryRaw<Array<{ 'QUERY PLAN': string }>>(Prisma.sql`EXPLAIN (ANALYZE) ${q}`);
    out('PX2 PLAN all:\n  ' + plan.map((row) => row['QUERY PLAN']).join('\n  '));
    expect(true).toBe(true);
  }, 900_000);
});
