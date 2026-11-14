import { randomUUID } from 'node:crypto';
import type { Response } from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { TopicSuggestionQueries } from '../../src/content/taxonomy/topic-suggestions.queries.js';
import { withLearnerLock } from '../../src/learning/learning-lock.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const LARGE = 'test-vstep';
const SMALL = 'test-small';
const EXTRA_TOPICS = ['test-food', 'test-hobbies', 'test-travel'];
const ARCHIVED = 'test-archived';
const TOPIC_ADD = '/v1/items/topic-add';
const browserProbe = process.env.WORDMET_TOPIC_PROBE;
const now = new Date('2026-11-14T03:00:00Z');

type SensePage = { items: Array<{ sense_id: string; level: string }>; next_page_token: string | null };
type Receipt = { group_id: string; added: number; eligible: number; skipped_group_full: number };
type Suggestions = {
  items: Array<{ topic: { code: string }; level: string; count: number; samples: Array<{ sense_id: string }> }>;
};

function timing(label: string, durations: number[], bytes?: number) {
  const median = [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)];
  console.log(`[topic pagination] ${label}: ${durations.map((ms) => ms.toFixed(1)).join(' / ')} ms (median ${median.toFixed(1)} ms${bytes === undefined ? '' : `, ${bytes} bytes`})`);
}

async function measure<T>(label: string, run: () => Promise<T>, bytes?: (result: T) => number): Promise<T> {
  let result = await run(); // Warm the connection and query path.
  const durations: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    const start = performance.now();
    result = await run();
    durations.push(performance.now() - start);
  }
  timing(label, durations, bytes?.(result));
  return result;
}

describe('topic pagination (e2e, isolated PostgreSQL)', () => {
  let ctx: TestApp;
  let sourceId: string;
  let large: string[];
  let small: string[];
  let wrongLevel: string;
  let functionWord: string;

  async function tag(senseIds: string[], topic: string) {
    await ctx.prisma.senseRevision.updateMany({
      where: { senseId: { in: senseIds } }, data: { topicCodes: [topic] },
    });
    const entries = await ctx.prisma.sense.findMany({ where: { id: { in: senseIds } }, select: { entryId: true } });
    await ctx.prisma.entryLevel.createMany({
      data: entries.map(({ entryId }) => ({ entryId, sourceId, basis: 'imported', level: 'B2' })),
    });
  }

  beforeAll(async () => {
    ctx = await createTestApp({
      databaseUrl: await createIsolatedDatabase(),
      redisUrl: inject('redisUrl'),
      ...(browserProbe && { config: { corsOrigins: ['http://localhost:3001'] } }),
    });
    // Keep one listener open so concurrent supertest requests share the same HTTP server.
    await ctx.app.listen(browserProbe ? 33492 : 0, '127.0.0.1');
    ctx.clock.set(now);

    const source = await ctx.prisma.dataSource.create({
      data: { kind: 'owner', name: 'Topic pagination scale test', displayPriority: 0 },
    });
    sourceId = source.id;
    await ctx.prisma.topic.createMany({
      data: [LARGE, SMALL, ...EXTRA_TOPICS, ARCHIVED].map((code) => ({ code, ...(code === ARCHIVED && { archivedAt: now }) })),
    });
    large = await seedVisibleSenses(ctx.prisma, 2694, 'vstep');
    small = await seedVisibleSenses(ctx.prisma, 8, 'small');
    await tag(large, LARGE);
    await tag(small, SMALL);
    [wrongLevel, functionWord] = await seedVisibleSenses(ctx.prisma, 2, 'a-decoy');
    await tag([wrongLevel, functionWord], LARGE);
    const wrongLevelEntry = await ctx.prisma.sense.findUniqueOrThrow({ where: { id: wrongLevel }, select: { entryId: true } });
    // The entry has an imported B2 tag, but its displayed level is the editorial C1.
    await ctx.prisma.entryLevel.create({
      data: { entryId: wrongLevelEntry.entryId, sourceId, basis: 'editorial', level: 'C1' },
    });
    const functionEntry = await ctx.prisma.sense.findUniqueOrThrow({ where: { id: functionWord }, select: { entryId: true } });
    await ctx.prisma.entry.update({ where: { id: functionEntry.entryId }, data: { functionWordOverride: true } });
    for (const topic of [...EXTRA_TOPICS, ARCHIVED]) {
      await tag(await seedVisibleSenses(ctx.prisma, 10, topic), topic);
    }
    await ctx.prisma.$executeRaw`ANALYZE`;
  });

  afterAll(async () => { await ctx?.close(); });

  async function learner() {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    return { userId, token: (await startSession(ctx, userId)).accessToken };
  }

  async function group(userId: string, name: string, senseIds: string[]) {
    const { id } = await ctx.prisma.learningGroup.create({
      data: { userId, name, nameKey: name.toLowerCase(), createdAt: now, updatedAt: now },
    });
    if (senseIds.length > 0) {
      await ctx.prisma.$executeRaw`
        WITH seeded AS (
          INSERT INTO learning_items (user_id, sense_id, level, due_date, created_at)
          SELECT ${userId}::uuid, sense_id, 0, DATE '2026-11-14', ${now}
          FROM unnest(${senseIds}::uuid[]) AS senses(sense_id)
          RETURNING id
        )
        INSERT INTO group_items (group_id, item_id, added_at)
        SELECT ${id}::uuid, id, ${now} FROM seeded`;
    }
    return id;
  }

  const get = (token: string, path: string) => ctx.http().get(path).set('Authorization', `Bearer ${token}`);
  const browse = (token: string, topic = LARGE, pageToken?: string) => get(token, '/v1/senses').query({
    topic, level: 'B2', exclude_function_words: 'true', page_size: 20, ...(pageToken && { page_token: pageToken }),
  });
  const summary = (token: string, topic = LARGE) => get(token, '/v1/items/topic-summary').query({ topic, level: 'B2' });
  const post = (token: string, key: string, body: object) => ctx.http().post(TOPIC_ADD)
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send(body);
  const selected = (senseIds: string[], target: { group_id: string } | { new_group_name: string }) => ({
    topic: LARGE, level: 'B2', mode: 'selected', target, sense_ids: senseIds,
  });
  const size = (response: Response) => Buffer.byteLength(response.text);

  async function expectWrites(userId: string, expected: { groups: number; items: number; links: number; logs: number }) {
    expect(await ctx.prisma.learningGroup.count({ where: { userId } })).toBe(expected.groups);
    expect(await ctx.prisma.learningItem.count({ where: { userId } })).toBe(expected.items);
    expect(await ctx.prisma.groupItem.count({ where: { group: { userId } } })).toBe(expected.links);
    expect(await ctx.prisma.learningLogEntry.count({ where: { userId, kind: 'item_added' } })).toBe(expected.logs);
  }

  // Check PG's lock table so a lost scheduling race cannot masquerade as proven concurrency.
  function whileLearnerLocked<T>(userId: string, run: (waitForRequests: (count: number) => Promise<void>) => Promise<T>) {
    return ctx.prisma.$transaction(async (tx) => {
      await withLearnerLock(tx, userId);
      return run(async (count) => {
        await expect.poll(async () => {
          const [row] = await tx.$queryRaw<Array<{ count: number }>>`
            SELECT count(*)::int AS count
            FROM pg_locks waiter
            JOIN pg_locks holder USING (locktype, database, classid, objid, objsubid)
            WHERE holder.pid = pg_backend_pid() AND holder.granted
              AND holder.locktype = 'advisory' AND NOT waiter.granted`;
          return row.count;
        }, { timeout: 5_000 }).toBe(count);
      });
    }, { timeout: 15_000 });
  }

  it('pages by cursor and counts only visible B2 senses, including items in another group', async () => {
    const { userId, token } = await learner();
    const existingGroup = await group(userId, 'Already learning', large.slice(0, 2000));
    const first = await measure('first browse page', () => browse(token).expect(200), size);
    const firstPage = first.body as SensePage;
    expect(firstPage.items).toHaveLength(20);
    expect(firstPage.items[0]).toMatchObject({ sense_id: large[0], level: 'B2' });
    expect(firstPage.next_page_token).toEqual(expect.any(String));

    const second = await measure('next browse page', () => browse(token, LARGE, firstPage.next_page_token!).expect(200), size);
    const secondPage = second.body as SensePage;
    expect(secondPage.items).toHaveLength(20);
    expect(new Set([...firstPage.items, ...secondPage.items].map((item) => item.sense_id)).size).toBe(40);

    for (const page of [firstPage, secondPage]) {
      const states = await get(token, '/v1/items').query({ sense_ids: page.items.map(({ sense_id }) => sense_id).join(',') }).expect(200);
      expect(states.body.items).toContainEqual(expect.objectContaining({ group_ids: [existingGroup] }));
      expect(states.body.items.length).toBeLessThanOrEqual(20);
    }
    expect((await measure('large topic summary', () => summary(token).expect(200), size)).body)
      .toEqual({ total: 2694, learning: 2000, unlearned: 694 });

    const control = await browse(token, SMALL).expect(200);
    expect((control.body as SensePage).items.map(({ sense_id }) => sense_id)).toEqual(small);
    expect(control.body.next_page_token).toBeNull();
    expect((await summary(token, SMALL).expect(200)).body).toEqual({ total: 8, learning: 0, unlearned: 8 });
    expect((await summary(token, 'no-such-topic').expect(200)).body).toEqual({ total: 0, learning: 0, unlearned: 0 });
    const withoutFunctionFilter = await get(token, '/v1/senses').query({ topic: LARGE, level: 'B2' }).expect(200);
    expect(withoutFunctionFilter.body.items[0]).toMatchObject({ sense_id: functionWord, is_function_word: true });
    const c1 = await get(token, '/v1/senses').query({ topic: LARGE, level: 'C1', exclude_function_words: 'true' }).expect(200);
    expect(c1.body.items).toEqual([expect.objectContaining({ sense_id: wrongLevel })]);
  });

  it('classifies selected IDs against current catalog and learner state before taking the last slot', async () => {
    const { userId, token } = await learner();
    const target = await group(userId, 'Target', large.slice(0, 1999));
    const learned = large[1999];
    await group(userId, 'Other group', [learned]);
    const [first, second] = large.slice(2000, 2002);
    const moved = small[0];
    await ctx.prisma.senseRevision.updateMany({ where: { senseId: moved }, data: { topicCodes: [SMALL, LARGE] } });
    try {
      const beforeMove = await browse(token).expect(200);
      expect(beforeMove.body.items).toContainEqual(expect.objectContaining({ sense_id: moved }));
    } finally {
      await ctx.prisma.senseRevision.updateMany({ where: { senseId: moved }, data: { topicCodes: [SMALL] } });
    }
    const response = await post(token, randomUUID(), selected([second, wrongLevel, learned, functionWord, first, moved], { group_id: target }))
      .expect(200);
    expect(response.body).toMatchObject({
      group_id: target, mode: 'selected', eligible: 2, added: 1, skipped_group_full: 1,
      added_ids: [first], already_learning_ids: [learned], group_full_ids: [second],
    });
    expect(new Set(response.body.unavailable_ids)).toEqual(new Set([wrongLevel, functionWord, moved]));
    expect(response.body.unavailable_ids).toHaveLength(3);
    await expectWrites(userId, { groups: 2, items: 2001, links: 2001, logs: 1 });
    expect(await ctx.prisma.groupItem.count({ where: { groupId: target, item: { senseId: first } } })).toBe(1);
    expect(await ctx.prisma.groupItem.count({ where: { groupId: target, item: { senseId: second } } })).toBe(0);
  });

  it('adds all currently eligible senses up to 2,000 and returns a count-only receipt', async () => {
    const { userId, token } = await learner();
    const start = performance.now();
    const response = await post(token, randomUUID(), {
      topic: LARGE, level: 'B2', mode: 'all_unlearned', target: { new_group_name: 'Scale group' },
    }).expect(200);
    timing('all topic add, 2,000 writes', [performance.now() - start], size(response));
    const { group_id: target } = response.body as Receipt;
    expect(response.body).toEqual({ group_id: target, mode: 'all_unlearned', eligible: 2694, added: 2000, skipped_group_full: 694 });
    expect(target).toEqual(expect.any(String));
    await expectWrites(userId, { groups: 1, items: 2000, links: 2000, logs: 2000 });
    const stored = await ctx.prisma.learningItem.findMany({ where: { userId }, select: { senseId: true } });
    const catalogIds = new Set(large);
    expect(stored.every(({ senseId }) => catalogIds.has(senseId))).toBe(true);
    expect(stored.some(({ senseId }) => senseId === large[0])).toBe(true);
  });

  it('serializes two different keys contending for the last slot', async () => {
    const { userId, token } = await learner();
    const target = await group(userId, 'Busy target', large.slice(0, 1999));
    const pending = await whileLearnerLocked(userId, async (waitForRequests) => {
      const requests = large.slice(1999, 2001).map((senseId) =>
        post(token, randomUUID(), selected([senseId], { group_id: target })).then((res) => res));
      await waitForRequests(2);
      return requests;
    });
    const responses = await Promise.all(pending);
    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    expect(responses.map(({ body }) => body.added).sort()).toEqual([0, 1]);
    expect(responses.map(({ body }) => body.skipped_group_full).sort()).toEqual([0, 1]);
    await expectWrites(userId, { groups: 1, items: 2000, links: 2000, logs: 1 });
  });

  it('returns Retry-After for the same key in flight and replays the committed receipt without writing twice', async () => {
    const { userId, token } = await learner();
    const key = randomUUID();
    const body = selected([large[0]], { new_group_name: 'Created exactly once' });
    const { first } = await whileLearnerLocked(userId, async (waitForRequests) => {
      const pending = post(token, key, body).then((res) => res);
      await waitForRequests(1);
      await post(token, key, body).timeout(4_000).expect(409).expect('Retry-After', '2');
      return { first: pending };
    });
    // Observe the commit without using the original response body, as when that response is lost.
    expect((await first).status).toBe(200);
    const row = await ctx.prisma.idempotencyKey.findFirstOrThrow({ where: { userId, key, endpoint: TOPIC_ADD } });
    expect(row.responseBody).toMatchObject({ mode: 'selected', added: 1, added_ids: [large[0]] });
    await expectWrites(userId, { groups: 1, items: 1, links: 1, logs: 1 });
    const replay = await post(token, key, body).expect(200);
    expect(replay.body).toEqual(row.responseBody);
    await post(token, key, { ...body, sense_ids: [large[1]] }).expect(400);
    await expectWrites(userId, { groups: 1, items: 1, links: 1, logs: 1 });
  });

  it('rolls back the saved receipt and all learning rows when a later database write fails', async () => {
    const { userId, token } = await learner();
    const key = randomUUID();
    const body = selected([large[0]], { new_group_name: 'Rollback and retry' });
    await ctx.prisma.$executeRaw`CREATE SEQUENCE topic_receipt_observed`;
    await ctx.prisma.$executeRaw`
      CREATE FUNCTION fail_topic_add_after_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM idempotency_keys
          WHERE user_id = NEW.user_id AND endpoint = '/v1/items/topic-add' AND status = 'succeeded'
        ) THEN
          PERFORM nextval('topic_receipt_observed');
        END IF;
        RAISE EXCEPTION 'Injected learning log write failure';
      END;
      $$`;
    await ctx.prisma.$executeRaw`
      CREATE TRIGGER fail_topic_add_after_receipt BEFORE INSERT ON learning_log
      FOR EACH ROW EXECUTE FUNCTION fail_topic_add_after_receipt()`;
    try {
      const receiptWasObserved = async () => (await ctx.prisma.$queryRaw<Array<{ is_called: boolean }>>`
        SELECT is_called FROM topic_receipt_observed`)[0].is_called;
      expect(await receiptWasObserved()).toBe(false);
      await post(token, key, body).expect(500);
      // nextval survives rollback and tells us the trigger actually saw the saved receipt.
      expect(await receiptWasObserved()).toBe(true);
      expect(await ctx.prisma.idempotencyKey.count({ where: { userId, key, endpoint: TOPIC_ADD } })).toBe(0);
      await expectWrites(userId, { groups: 0, items: 0, links: 0, logs: 0 });
    } finally {
      await ctx.prisma.$executeRaw`DROP TRIGGER fail_topic_add_after_receipt ON learning_log`;
      await ctx.prisma.$executeRaw`DROP FUNCTION fail_topic_add_after_receipt()`;
      await ctx.prisma.$executeRaw`DROP SEQUENCE topic_receipt_observed`;
    }
    await post(token, key, body).expect(200);
    await expectWrites(userId, { groups: 1, items: 1, links: 1, logs: 1 });
  });

  it('suggests four distinct eligible topics and reads at most four sample rows from PostgreSQL', async () => {
    const { token } = await learner();
    const response = await measure('suggestions', () => get(token, '/v1/topics/suggestions').expect(200), size);
    expect(response.headers['cache-control']).toBe('private, no-store');
    const { items } = response.body as Suggestions;
    expect(items).toHaveLength(4);
    expect(new Set(items.map(({ topic }) => topic.code))).toEqual(new Set([LARGE, ...EXTRA_TOPICS]));
    expect(items.find(({ topic }) => topic.code === LARGE)).toMatchObject({ level: 'B2', count: 2694 });
    expect(items.filter(({ topic }) => topic.code !== LARGE).every(({ count }) => count === 10)).toBe(true);
    expect(items.every(({ samples }) => samples.length === 4)).toBe(true);

    const queries = ctx.app.get(TopicSuggestionQueries);
    const samples = await measure('large topic sample query', () => queries.samples(LARGE, 'B2', 'vi', 321));
    expect(samples).toHaveLength(4);
    expect(new Set(samples.map(({ sense_id }) => sense_id)).size).toBe(4);
    const catalogIds = new Set(large);
    expect(samples.every(({ sense_id }) => catalogIds.has(sense_id))).toBe(true);
  });
  it.skipIf(!browserProbe)('runs the opt-in Playwright probe against the test API', async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    await group(userId, 'Browser topic already learning', large.slice(0, 2000));
    const { refreshToken } = await startSession(ctx, userId, 'web');
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    try {
      const { stdout } = await promisify(execFile)(process.execPath, [browserProbe!], {
        env: { ...process.env, WORDMET_TEST_REFRESH: refreshToken },
        timeout: 210_000,
      });
      console.log(stdout);
    } catch (error) {
      console.log((error as { stdout?: string; stderr?: string }).stdout, (error as { stderr?: string }).stderr);
      throw error;
    }
  }, 220_000);
});
