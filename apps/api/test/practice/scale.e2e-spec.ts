import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ContentService } from '../../src/content/index.js';
import { LearningService, type PracticeItem } from '../../src/learning/index.js';
import { QuestionBuilder } from '../../src/practice/questions/question-builder.service.js';
import { sortWords } from '../../src/practice/sessions/order.js';
import { PracticeStats } from '../../src/practice/weak/practice-stats.js';
import { seedUser } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { practiceRequest } from '../support/practice-helpers.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const now = new Date('2026-11-08T03:00:00Z');
const GROUPS = 100;
const PER_GROUP = 2000;
// ASSUMPTION (plan, Review Focus 2): the threshold is the owner's to confirm; the median is printed for that.
const THRESHOLD_MS = 1000;

/** Test-only timing: wraps a real method and records each call's duration under a label; production code is unchanged. */
function timeCalls(target: object, method: string, label: string, calls: Map<string, number[]>, keep?: (result: unknown) => void) {
  const record = target as Record<string, (...args: unknown[]) => Promise<unknown>>;
  const original = record[method].bind(target);
  vi.spyOn(record, method).mockImplementation(async (...args: unknown[]) => {
    const started = performance.now();
    try {
      const result = await original(...args);
      keep?.(result);
      return result;
    } finally {
      calls.set(label, [...(calls.get(label) ?? []), performance.now() - started]);
    }
  });
}
const sum = (values: number[] = []) => values.reduce((a, b) => a + b, 0);

describe('practice at scale (e2e, isolated database)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  }, 300_000);
  afterAll(async () => { await ctx?.close(); });

  it('Review Focus 2: 100 groups × 2,000 items, source all, types [mcq_definition] → session start prints its median and is < 1 s', async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const senseIds = await seedVisibleSenses(ctx.prisma, GROUPS * PER_GROUP, 'pscale');
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
    expect(await ctx.prisma.groupItem.count()).toBe(GROUPS * PER_GROUP);

    ctx.clock.set(now);
    const start = () => practiceRequest(ctx, userId, 'post', '/sessions', { source: 'all', types: ['mcq_definition'] });
    expect((await start()).status).toBe(201); // warm-up: connection, plan cache
    const calls = new Map<string, number[]>();
    let items: PracticeItem[] = [];
    timeCalls(ctx.app.get(LearningService), 'practiceItems', 'practiceItems', calls, (result) => { items = result as PracticeItem[]; });
    timeCalls(ctx.app.get(PracticeStats), 'statsFor', 'statsFor', calls);
    timeCalls(ctx.app.get(QuestionBuilder), 'availability', 'availability', calls);
    timeCalls(ctx.app.get(LearningService), 'practiceGroupMates', 'groupMates', calls);
    timeCalls(ctx.app.get(ContentService), 'practiceCandidates', 'candidates', calls);
    const timings: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      calls.clear();
      const started = performance.now();
      const response = await start();
      timings.push(performance.now() - started);
      // sortWords is a plain function: timed apart, on the same words the request sorted.
      const sortStarted = performance.now();
      sortWords(items.map((item) => ({ ...item, last_practiced_at: null, recent_wrong: 0 })), 'least_practiced', Math.random);
      const sortMs = performance.now() - sortStarted;
      const known = sum(calls.get('practiceItems')) + sum(calls.get('statsFor')) + sum(calls.get('availability'));
      const f = (n: number) => n.toFixed(0);
      console.log(`[Review Focus 2 breakdown, run ${i + 1}] total ${f(timings[i])} ms; practiceItems(all) ${f(sum(calls.get('practiceItems')))} ms (${items.length} rows); statsFor ${f(sum(calls.get('statsFor')))} ms; sortWords ~${f(sortMs)} ms (timed apart); availability ${calls.get('availability')?.length ?? 0} batch(es) ${f(sum(calls.get('availability')))} ms = groupMates ${f(sum(calls.get('groupMates')))} ms + candidates ${f(sum(calls.get('candidates')))} ms + filter; rest (sort, transaction, HTTP) ${f(timings[i] - known)} ms`);
      expect(response.status).toBe(201);
      expect(response.body.session).toMatchObject({ words: 10, sort: 'least_practiced' });
    }
    const median = [...timings].sort((a, b) => a - b)[1];
    console.log(`[Review Focus 2] POST /v1/practice/sessions, ${GROUPS} groups x ${PER_GROUP} items: ${timings.map((t) => t.toFixed(0)).join(' / ')} ms (median ${median.toFixed(0)} ms, threshold ${THRESHOLD_MS} ms)`);
    expect(median).toBeLessThan(THRESHOLD_MS);
  }, 300_000);
});
