// Review probes (independent review 18/10/2026) — not part of the product suite; lives only in the review worktree.
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const out = (...a: unknown[]) => appendFileSync(process.env.PROBE_OUT ?? 'probe.out', a.join(' ') + '\n');
const now = new Date('2026-11-08T03:00:00Z');

describe('review probes: LN1 and CT2 at scale', () => {
  let ctx: TestApp;
  let url: string;
  let token: string;
  let userA: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const median = async (label: string, call: () => Promise<{ status: number }>) => {
    const first = await call();
    const times: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const t = performance.now();
      const r = await call();
      times.push(performance.now() - t);
      if (r.status !== first.status) out(label, 'status changed', first.status, r.status);
    }
    const m = [...times].sort((a, b) => a - b)[2];
    out(`${label}: status ${first.status}, median ${m.toFixed(0)} ms (${times.map((t) => t.toFixed(0)).join(' / ')})`);
    return m;
  };

  beforeAll(async () => {
    url = await createIsolatedDatabase();
    ctx = await createTestApp({ databaseUrl: url });
    ctx.clock.set(now);
    userA = (await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' })).userId;
    token = (await startSession(ctx, userA)).accessToken;
  }, 300_000);
  afterAll(async () => { await ctx?.close(); });

  it('LN1: group detail, group items page and delete group with and without 300,000 group_items of other learners', async () => {
    const senseIds = await seedVisibleSenses(ctx.prisma, 2000, 'ln');
    const [group] = await ctx.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO learning_groups (user_id, name, name_key, created_at, updated_at)
      VALUES (${userA}::uuid, 'G', 'g', ${now}, ${now}) RETURNING id::text`;
    await ctx.prisma.$executeRaw`
      INSERT INTO learning_items (user_id, sense_id, level, due_date, priority, created_at)
      SELECT ${userA}::uuid, s, 1, DATE '2026-11-08', false, ${now} FROM unnest(${senseIds}::uuid[]) s`;
    await ctx.prisma.$executeRaw`
      INSERT INTO group_items (group_id, item_id, added_at)
      SELECT ${group.id}::uuid, i.id, ${now} FROM learning_items i WHERE i.user_id = ${userA}::uuid`;
    await ctx.prisma.$executeRaw`ANALYZE`;
    const detail = () => ctx.http().get(`/v1/groups/${group.id}`).set(auth());
    const items = () => ctx.http().get(`/v1/groups/${group.id}/items`).query({ page_size: 100 }).set(auth());
    await median('LN1 before: GET /v1/groups/:id', detail);
    await median('LN1 before: GET /v1/groups/:id/items?page_size=100', items);

    const background = Array.from({ length: 150 }, () => randomUUID());
    await ctx.prisma.$executeRaw`
      INSERT INTO learning_groups (user_id, name, name_key, created_at, updated_at)
      SELECT u, 'BG', 'bg', ${now}, ${now} FROM unnest(${background}::uuid[]) u`;
    await ctx.prisma.$executeRaw`
      INSERT INTO learning_items (user_id, sense_id, level, due_date, priority, created_at)
      SELECT u, s, 1, DATE '2026-11-08', false, ${now} FROM unnest(${background}::uuid[]) u CROSS JOIN unnest(${senseIds}::uuid[]) s`;
    await ctx.prisma.$executeRaw`
      INSERT INTO group_items (group_id, item_id, added_at)
      SELECT g.id, i.id, ${now} FROM learning_items i JOIN learning_groups g ON g.user_id = i.user_id
      WHERE i.user_id = ANY(${background}::uuid[])`;
    await ctx.prisma.$executeRaw`ANALYZE`;
    out('LN1 group_items total:', await ctx.prisma.groupItem.count());
    await median('LN1 after: GET /v1/groups/:id', detail);
    await median('LN1 after: GET /v1/groups/:id/items?page_size=100', items);

    // The SQL Prisma really sends for the two relation filters, and its plan.
    const logged = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }), log: [{ emit: 'event', level: 'query' }] });
    const seen: Array<{ query: string; params: string }> = [];
    (logged as unknown as { $on(e: 'query', cb: (q: { query: string; params: string }) => void): void })
      .$on('query', (q) => seen.push({ query: q.query, params: q.params }));
    await logged.learningItem.count({ where: { groups: { some: { groupId: group.id }, every: { groupId: group.id } } } });
    await logged.groupItem.findMany({ where: { groupId: group.id }, take: 101,
      include: { item: { include: { _count: { select: { groups: true } } } } } });
    for (const q of seen) {
      out('LN1 SQL:', q.query.replace(/\s+/g, ' ').slice(0, 900), 'params', q.params.slice(0, 200));
      if (!/^\s*SELECT/i.test(q.query)) continue;
      try {
        const params = JSON.parse(q.params) as unknown[];
        const plan = await ctx.prisma.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(`EXPLAIN (ANALYZE) ${q.query}`, ...params);
        out('LN1 PLAN:\n  ' + plan.map((row) => row['QUERY PLAN']).join('\n  '));
      } catch (e) {
        out('LN1 EXPLAIN failed:', (e as Error).message.slice(0, 300));
      }
    }
    await logged.$disconnect();

    const started = performance.now();
    const del = await ctx.http().delete(`/v1/groups/${group.id}`).set(auth()).set('Idempotency-Key', randomUUID());
    out(`LN1 after: DELETE /v1/groups/:id status ${del.status} in ${(performance.now() - started).toFixed(0)} ms`, JSON.stringify(del.body).slice(0, 200));
    expect(true).toBe(true);
  }, 900_000);

  it('CT2: lookup, words search and word page with and without 300,000 private entries of other learners', async () => {
    await seedVisibleSenses(ctx.prisma, 7800, 'cat');
    await ctx.prisma.$executeRaw`ANALYZE`;
    const lookup = () => ctx.http().get('/v1/lookup').query({ q: 'cat-1' }).set(auth());
    const words = () => ctx.http().get('/v1/words').query({ q: 'cat-12' }).set(auth());
    const page = () => ctx.http().get('/v1/words/cat-1').set(auth());
    const control = () => ctx.http().get('/v1/senses/search').query({ q: 'cat-12' }).set(auth());
    await median('CT2 before: GET /v1/lookup?q=cat-1', lookup);
    await median('CT2 before: GET /v1/words?q=cat-12', words);
    await median('CT2 before: GET /v1/words/cat-1', page);
    await median('CT2 before (control, catalog-only route): GET /v1/senses/search?q=cat-12', control);

    const owners = Array.from({ length: 300 }, () => randomUUID());
    await ctx.prisma.$executeRawUnsafe(`
      WITH e AS (
        INSERT INTO entries (lemma, pos, scope, owner_user_id)
        SELECT 'priv-' || g, 'noun', 'private', ($1::uuid[])[1 + g % 300] FROM generate_series(1, 300000) g
        RETURNING id
      ), s AS (
        INSERT INTO senses (entry_id, state) SELECT id, 'open' FROM e RETURNING id
      ), r AS (
        INSERT INTO sense_revisions (sense_id, revision_no, status, draft_source, content_hash, created_by, published_at, examples)
        SELECT id, 1, 'published', 'ui', md5(id::text), gen_random_uuid(), now(), ARRAY['A private example.'] FROM s
        RETURNING id
      )
      INSERT INTO sense_revision_texts (revision_id, language, kind, text) SELECT id, 'vi', 'gloss', 'riêng' FROM r`, owners);
    await ctx.prisma.$executeRawUnsafe(`
      UPDATE senses s SET live_revision_id = r.id FROM sense_revisions r
      WHERE r.sense_id = s.id AND s.live_revision_id IS NULL`);
    await ctx.prisma.$executeRaw`ANALYZE`;
    out('CT2 entries total:', await ctx.prisma.entry.count(), 'private:', await ctx.prisma.entry.count({ where: { scope: 'private' } }));
    await median('CT2 after: GET /v1/lookup?q=cat-1', lookup);
    await median('CT2 after: GET /v1/words?q=cat-12', words);
    await median('CT2 after: GET /v1/words/cat-1', page);
    await median('CT2 after (control, catalog-only route): GET /v1/senses/search?q=cat-12', control);
    expect(true).toBe(true);
  }, 900_000);
});
