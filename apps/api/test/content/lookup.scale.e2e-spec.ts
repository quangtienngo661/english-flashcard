import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const OTHER_USERS = 300;
const PER_USER = 1000;
// ASSUMPTION (design §6.4): the owner confirms the threshold; both medians are printed for that.
const FACTOR = 2;

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

describe('lookup and word search at scale (e2e, isolated database)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  }, 300_000);
  afterAll(async () => { await ctx?.close(); });

  it('300,000 private words of other learners do not slow GET /v1/lookup or GET /v1/words?q by more than 2x', async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    await seedVisibleSenses(ctx.prisma, 9_800, 'scale');
    // The learner's own private word (control: it must stay visible).
    await ctx.prisma.$executeRaw`
      WITH e AS (INSERT INTO entries (lemma, pos, scope, owner_user_id) VALUES ('scale-own', 'noun', 'private', ${userId}::uuid) RETURNING id),
      s AS (INSERT INTO senses (entry_id, state) SELECT id, 'open' FROM e RETURNING id),
      r AS (INSERT INTO sense_revisions (sense_id, revision_no, status, draft_source, content_hash, created_by, published_at, examples)
        SELECT id, 1, 'published', 'ui', md5(id::text), gen_random_uuid(), now(), ARRAY[]::text[] FROM s RETURNING id, sense_id)
      INSERT INTO sense_revision_texts (revision_id, language, kind, text) SELECT id, 'vi', 'gloss', 'own' FROM r`;
    await ctx.prisma.$executeRaw`
      UPDATE senses SET live_revision_id = (SELECT r.id FROM sense_revisions r WHERE r.sense_id = senses.id)
      WHERE entry_id IN (SELECT id FROM entries WHERE lemma = 'scale-own')`;
    await ctx.prisma.$executeRaw`ANALYZE`;

    const token = (await startSession(ctx, userId)).accessToken;
    const get = (path: string) => ctx.http().get(path).set('Authorization', `Bearer ${token}`);
    const measure = async (path: string) => {
      expect((await get(path)).status).toBe(200); // warm-up: connection, plan cache
      const timings: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const started = performance.now();
        expect((await get(path)).status).toBe(200);
        timings.push(performance.now() - started);
      }
      return median(timings);
    };
    const lookupPath = '/v1/lookup?q=scale-5000';
    const wordsPath = '/v1/words?q=scale-500&page_size=20';
    const lookupBefore = await measure(lookupPath);
    const wordsBefore = await measure(wordsPath);

    await ctx.prisma.$executeRaw`
      WITH owners AS (SELECT gen_random_uuid() AS id, g AS n FROM generate_series(1, ${OTHER_USERS}::int) g),
      e AS (
        INSERT INTO entries (lemma, pos, scope, owner_user_id)
        SELECT 'scale-' || (o.n * 100000 + w), 'noun', 'private', o.id
        FROM owners o, generate_series(1, ${PER_USER}::int) w RETURNING id
      ), s AS (INSERT INTO senses (entry_id, state) SELECT id, 'open' FROM e RETURNING id)
      INSERT INTO sense_revisions (sense_id, revision_no, status, draft_source, content_hash, created_by, published_at, examples)
      SELECT id, 1, 'published', 'ui', md5(id::text), gen_random_uuid(), now(), ARRAY[]::text[] FROM s`;
    await ctx.prisma.$executeRaw`
      UPDATE senses SET live_revision_id = r.id FROM sense_revisions r WHERE r.sense_id = senses.id AND senses.live_revision_id IS NULL`;
    await ctx.prisma.$executeRaw`
      INSERT INTO sense_revision_texts (revision_id, language, kind, text)
      SELECT r.id, 'vi', 'gloss', 'other' FROM sense_revisions r WHERE r.id NOT IN (SELECT revision_id FROM sense_revision_texts)`;
    // VACUUM sets the visibility hints autovacuum would have set by the time real data is read; ANALYZE refreshes the statistics.
    await ctx.prisma.$executeRawUnsafe('VACUUM ANALYZE');
    expect(await ctx.prisma.entry.count({ where: { scope: 'private' } })).toBe(OTHER_USERS * PER_USER + 1);

    const lookupAfter = await measure(lookupPath);
    const wordsAfter = await measure(wordsPath);
    console.log(`[T5] lookup median ${lookupBefore.toFixed(0)} -> ${lookupAfter.toFixed(0)} ms; words?q median ${wordsBefore.toFixed(0)} -> ${wordsAfter.toFixed(0)} ms`);

    // Controls: the learner's own private word is found, another learner's never is.
    const own = await get('/v1/lookup?q=scale-own');
    expect(own.body.senses.map((s: { lemma: string }) => s.lemma)).toEqual(['scale-own']);
    const foreign = await get('/v1/lookup?q=scale-100001'); // owner 1's first word
    expect(foreign.body.senses).toEqual([]);
    const foreignSearch = await get('/v1/words?q=scale-100001');
    expect(foreignSearch.body.items).toEqual([]);

    expect(lookupAfter).toBeLessThanOrEqual(FACTOR * lookupBefore);
    expect(wordsAfter).toBeLessThanOrEqual(FACTOR * wordsBefore);
  }, 300_000);
});
