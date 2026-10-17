import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, type Level, type RevisionContent } from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedVisibleSenses } from '../support/seed-senses.js';
import { testConfig } from '../support/test-config.js';

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const date = (value: string) => new Date(`${value}T00:00:00Z`);
// 2026-11-02 01:30 in Asia/Ho_Chi_Minh (the seeded learners' zone), still 2026-11-01 in UTC.
const now = new Date('2026-11-01T18:30:00Z');
const complete: RevisionContent = {
  glossVi: 'nghĩa', definitionEn: null, examplesEn: ['An example.'], topicCodes: ['food'], acceptedForms: [],
};

describe('learning items (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;

  const tx = <T>(action: (tx: Prisma.TransactionClient) => Promise<T>) => ctx.prisma.$transaction(action, transactionOptions);
  const catalog = async (lemma: string, options: { pos?: string; level?: Level; topics?: string[] } = {}) => {
    const pos = options.pos ?? 'noun';
    const senseId = await tx(async (t) => {
      await content.lockEntryKey(t, lemma, pos);
      const { entry } = await content.ensureEntry(t, { lemma, pos, variants: [] });
      await content.setEditorialLevel(t, entry.id, options.level ?? 'A2');
      return (await content.createSense(t, { entryId: entry.id, contextLabel: null, source: 'ui', actorId,
        content: { ...complete, topicCodes: options.topics ?? ['food'] } })).senseId;
    });
    expect(await content.publishItem({ senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    return senseId;
  };
  const privateSense = (ownerId: string, lemma: string) => tx(async (t) => (await content.createPrivateSense(t, {
    ownerId, lemma, pos: 'noun', meaning: { text: 'riêng', language: 'vi' }, level: null, topicCodes: [], formOf: null,
  })).senseId);
  const learner = async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const token = (await startSession(ctx, userId)).accessToken;
    const group = async (name: string) => (await ctx.prisma.learningGroup.create({
      data: { userId, name, nameKey: name.toLowerCase(), createdAt: now, updatedAt: now },
    })).id;
    return { userId, token, group };
  };
  const send = <T extends { set(name: string, value: string): T }>(request: T, token: string, write = true) => {
    const authed = request.set('Authorization', `Bearer ${token}`);
    return write ? authed.set('Idempotency-Key', randomUUID()) : authed;
  };
  const add = (token: string, groupId: string, senseId: string) =>
    send(ctx.http().post(`/v1/groups/${groupId}/items`), token).send({ sense_id: senseId });
  const bulk = (token: string, groupId: string, filter: object) =>
    send(ctx.http().post(`/v1/groups/${groupId}/items/bulk`), token).send(filter);
  const unlink = (token: string, groupId: string, itemId: string) =>
    send(ctx.http().delete(`/v1/groups/${groupId}/items/${itemId}`), token);
  const forget = (token: string, itemId: string) => send(ctx.http().delete(`/v1/items/${itemId}`), token);
  const states = (token: string, senseIds: string[]) =>
    send(ctx.http().get('/v1/items').query({ sense_ids: senseIds.join(',') }), token, false);
  const listGroup = (token: string, groupId: string, query: object = {}) =>
    send(ctx.http().get(`/v1/groups/${groupId}/items`).query(query), token, false);
  const itemsOf = (userId: string) => ctx.prisma.learningItem.findMany({ where: { userId }, include: { groups: true } });
  const logOf = (userId: string) => ctx.prisma.learningLogEntry.findMany({ where: { userId }, orderBy: { at: 'asc' } });
  const fill = async (userId: string, groupId: string, count: number) => {
    const items = await ctx.prisma.learningItem.createManyAndReturn({ data: Array.from({ length: count }, () => ({
      userId, senseId: randomUUID(), level: 0, dueDate: date('2026-11-02'), createdAt: now,
    })) });
    await ctx.prisma.groupItem.createMany({ data: items.map((item) => ({ groupId, itemId: item.id, addedAt: now })) });
  };

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(now);
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B3#1: the first add creates level 0 due today in the learner\'s zone in the chosen group; another learner\'s group id → 404 and nothing stored', async () => {
    const senseId = await catalog('apple');
    const me = await learner();
    const tech = await me.group('Tech');
    const response = await add(me.token, tech, senseId);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ item_id: expect.any(String), level: 0, due_date: '2026-11-02', created: true });
    expect(await itemsOf(me.userId)).toEqual([expect.objectContaining({
      id: response.body.item_id, senseId, level: 0, dueDate: date('2026-11-02'), priority: false, lastReviewedAt: null,
      groups: [expect.objectContaining({ groupId: tech, addedAt: now })],
    })]);
    expect(await logOf(me.userId)).toEqual([expect.objectContaining({
      kind: 'item_added', itemId: response.body.item_id, senseId, groupId: tech, levelAfter: 0, dueAfter: date('2026-11-02'),
      localDate: date('2026-11-02'), at: now,
    })]);

    const stranger = await learner();
    const theirs = await stranger.group('Theirs');
    const refused = await add(me.token, theirs, senseId);
    expect(refused.status).toBe(404);
    expect(refused.body.type).toBe(problem('not-found'));
    expect(await ctx.prisma.groupItem.count({ where: { groupId: theirs } })).toBe(0);
    expect(await ctx.prisma.learningLogEntry.count()).toBe(1);
  });

  it('adding a learnt sense to a second group links the same item; adding it again to the same group changes nothing', async () => {
    const senseId = await catalog('apple');
    const me = await learner();
    const [a, b] = [await me.group('A'), await me.group('B')];
    const first = await add(me.token, a, senseId);
    ctx.clock.set(new Date('2026-11-05T03:00:00Z'));
    me.token = (await startSession(ctx, me.userId)).accessToken;
    const second = await add(me.token, b, senseId);
    expect(second.status).toBe(201);
    expect(second.body).toEqual({ item_id: first.body.item_id, level: 0, due_date: '2026-11-02', created: false });
    const again = await add(me.token, b, senseId);
    expect(again.body).toEqual(second.body);
    const [item] = await itemsOf(me.userId);
    expect(item.groups.map(({ groupId }) => groupId).sort()).toEqual([a, b].sort());
    // Linking an item already learnt is not a new word.
    expect((await logOf(me.userId)).map(({ kind }) => kind)).toEqual(['item_added']);
  });

  it('B3E19: removing from the last group deletes the item and logs item_removed, removing from one of two keeps it', async () => {
    const senseId = await catalog('apple');
    const me = await learner();
    const [a, b] = [await me.group('A'), await me.group('B')];
    const { body: added } = await add(me.token, a, senseId);
    await add(me.token, b, senseId);

    const fromOne = await unlink(me.token, a, added.item_id);
    expect(fromOne.status).toBe(200);
    expect(fromOne.body).toEqual({ removed_from_learning: false });
    expect(await itemsOf(me.userId)).toEqual([expect.objectContaining({ groups: [expect.objectContaining({ groupId: b })] })]);

    const fromLast = await unlink(me.token, b, added.item_id);
    expect(fromLast.body).toEqual({ removed_from_learning: true });
    expect(await itemsOf(me.userId)).toEqual([]);
    // T-C8: every column of both log rows.
    const empty = { answer: null, rating: null, wasDue: null, daysSinceLast: null, reviewId: null, section: null };
    expect(await logOf(me.userId)).toEqual([
      { id: expect.any(String), userId: me.userId, itemId: added.item_id, senseId, groupId: a, kind: 'item_added', ...empty,
        levelBefore: null, levelAfter: 0, dueBefore: null, dueAfter: date('2026-11-02'), localDate: date('2026-11-02'), at: now },
      { id: expect.any(String), userId: me.userId, itemId: added.item_id, senseId, groupId: b, kind: 'item_removed', ...empty,
        levelBefore: 0, levelAfter: null, dueBefore: date('2026-11-02'), dueAfter: null, localDate: date('2026-11-02'), at: now },
    ]);
    // The item is gone: removing it again is 404.
    expect((await unlink(me.token, b, added.item_id)).status).toBe(404);
  });

  it('DELETE /v1/items/:id removes the item from every group, logs item_removed and keeps earlier log rows', async () => {
    const senseId = await catalog('apple');
    const me = await learner();
    const [a, b] = [await me.group('A'), await me.group('B')];
    const { body: added } = await add(me.token, a, senseId);
    await add(me.token, b, senseId);
    const response = await forget(me.token, added.item_id);
    expect(response.status).toBe(204);
    expect(await itemsOf(me.userId)).toEqual([]);
    expect(await ctx.prisma.groupItem.count()).toBe(0);
    expect(await logOf(me.userId)).toEqual([
      expect.objectContaining({ kind: 'item_added', itemId: added.item_id }),
      expect.objectContaining({ kind: 'item_removed', itemId: added.item_id, senseId, groupId: null, levelBefore: 0,
        dueBefore: date('2026-11-02') }),
    ]);
    const stranger = await learner();
    const { body: theirs } = await add(stranger.token, await stranger.group('S'), senseId);
    expect((await forget(me.token, theirs.item_id)).status).toBe(404);
    expect(await itemsOf(stranger.userId)).toHaveLength(1);
  });

  it('B3E20: re-adding a removed sense starts a new item at level 0', async () => {
    const senseId = await catalog('apple');
    const me = await learner();
    const a = await me.group('A');
    const { body: first } = await add(me.token, a, senseId);
    await ctx.prisma.learningItem.update({ where: { id: first.item_id }, data: { level: 3, dueDate: date('2026-11-09') } });
    await forget(me.token, first.item_id);
    const again = await add(me.token, a, senseId);
    expect(again.body).toEqual({ item_id: expect.any(String), level: 0, due_date: '2026-11-02', created: true });
    expect(again.body.item_id).not.toBe(first.item_id);
    // T-C8: the removal keeps the old item's level and date; the re-add is a fresh item_added.
    expect((await logOf(me.userId)).map(({ kind, itemId, levelBefore, levelAfter, dueBefore, dueAfter, groupId }) =>
      ({ kind, itemId, levelBefore, levelAfter, dueBefore, dueAfter, groupId }))).toEqual([
      { kind: 'item_added', itemId: first.item_id, levelBefore: null, levelAfter: 0, dueBefore: null, dueAfter: date('2026-11-02'), groupId: a },
      { kind: 'item_removed', itemId: first.item_id, levelBefore: 3, levelAfter: null, dueBefore: date('2026-11-09'), dueAfter: null, groupId: null },
      { kind: 'item_added', itemId: again.body.item_id, levelBefore: null, levelAfter: 0, dueBefore: null, dueAfter: date('2026-11-02'), groupId: a },
    ]);
  });

  it('B3E22: bulk add of A2 + food skips function words and existing items and returns the counts', async () => {
    const apple = await catalog('apple');
    const bread = await catalog('bread');
    await catalog('cheese');
    await catalog('some', { pos: 'determiner' }); // a function word
    await catalog('dinner', { level: 'B1' }); // another level
    await catalog('laptop', { topics: ['technology'] }); // another topic
    const me = await learner();
    const [food, other] = [await me.group('Food'), await me.group('Other')];
    await add(me.token, food, apple);
    await add(me.token, other, bread); // learnt elsewhere: linked, not created
    const response = await bulk(me.token, food, { level: 'A2', topic: 'food' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ added: 2, already_in_group: 1, skipped_function_words: 1, skipped_group_full: 0 });
    const items = await itemsOf(me.userId);
    expect(items).toHaveLength(3);
    expect(items.filter((item) => item.groups.some(({ groupId }) => groupId === food))).toHaveLength(3);
    expect(items.find((item) => item.senseId === bread)!.groups).toHaveLength(2);
    // One item_added per created item: apple, bread (first add) and cheese.
    expect((await logOf(me.userId)).filter(({ kind }) => kind === 'item_added')).toHaveLength(3);
    // Bad filters are refused.
    for (const filter of [{ level: 'Z9' }, { pos: 'thing' }, { topic: 'Not A Code!' }, { extra: true }]) {
      expect((await bulk(me.token, food, filter)).status).toBe(400);
    }
  });

  it('B3E33 (bulk): senses without a topic are not added by a topic filter', async () => {
    await catalog('apple');
    const plain = await catalog('plain', { topics: [] });
    const me = await learner();
    const group = await me.group('Food');
    expect((await bulk(me.token, group, { topic: 'food' })).body).toMatchObject({ added: 1 });
    expect((await itemsOf(me.userId)).map(({ senseId }) => senseId)).not.toContain(plain);
    expect((await bulk(me.token, group, { level: 'A2' })).body).toMatchObject({ added: 1, already_in_group: 1 });
  });

  it('a group already holding many matching words still fills its free slots when the catalog has unadded ones', async () => {
    const senses = [];
    for (const lemma of ['apple', 'bread', 'cheese', 'dates', 'eggs', 'figs', 'grapes', 'honey']) senses.push(await catalog(lemma));
    const me = await learner();
    const group = await me.group('Food');
    for (const senseId of senses.slice(0, 3)) await add(me.token, group, senseId);
    await fill(me.userId, group, 1995); // 1,998 in the group: two free slots
    expect((await bulk(me.token, group, { topic: 'food' })).body)
      .toEqual({ added: 2, already_in_group: 3, skipped_function_words: 0, skipped_group_full: 3 });
    expect(await ctx.prisma.groupItem.count({ where: { groupId: group } })).toBe(2000);
  });

  it('group-full: with 2,000 seeded items a single add is 409 group-full and bulk reports skipped_group_full', async () => {
    const apple = await catalog('apple');
    await catalog('bread');
    const me = await learner();
    const [full, other] = [await me.group('Full'), await me.group('Other')];
    await add(me.token, other, apple);
    await fill(me.userId, full, 2000);
    const refused = await add(me.token, full, apple);
    expect(refused.status).toBe(409);
    expect(refused.body.type).toBe(problem('group-full'));
    expect((await bulk(me.token, full, { topic: 'food' })).body)
      .toEqual({ added: 0, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 2 });
    expect(await ctx.prisma.groupItem.count({ where: { groupId: full } })).toBe(2000);
    expect(await ctx.prisma.learningItem.count({ where: { senseId: apple } })).toBe(1);
  });

  it('B3#12 (items): another learner\'s private sense_id → 404; items?sense_ids never reveals other learners', async () => {
    const apple = await catalog('apple');
    const me = await learner();
    const stranger = await learner();
    const theirPrivate = await privateSense(stranger.userId, 'yeet');
    const myPrivate = await privateSense(me.userId, 'skrrt');
    const group = await me.group('Mine');
    const refused = await add(me.token, group, theirPrivate);
    expect(refused.status).toBe(404);
    expect(refused.body.type).toBe(problem('not-found'));
    expect((await add(me.token, group, randomUUID())).status).toBe(404);
    expect((await add(me.token, group, myPrivate)).status).toBe(201);
    await add(stranger.token, await stranger.group('Theirs'), theirPrivate);
    await add(stranger.token, await stranger.group('Also'), apple);

    const read = await states(me.token, [apple, theirPrivate, myPrivate]);
    expect(read.status).toBe(200);
    expect(read.body).toEqual({ items: [{
      sense_id: myPrivate, item_id: expect.any(String), level: 0, due_date: '2026-11-02', priority: false, group_ids: [group],
    }] });
    expect((await states(me.token, Array.from({ length: 101 }, () => randomUUID()))).status).toBe(400);
    expect((await states(me.token, ['nope'])).status).toBe(400);
  });

  it('cell=3 lists only level-3 items of the group, with group count and a changed-sense flag', async () => {
    const senses = [];
    for (const lemma of ['apple', 'bread', 'cheese', 'dates']) senses.push(await catalog(lemma));
    const me = await learner();
    const [group, other] = [await me.group('Food'), await me.group('Other')];
    const ids: string[] = [];
    for (const senseId of senses) ids.push((await add(me.token, group, senseId)).body.item_id);
    await add(me.token, other, senses[1]);
    await ctx.prisma.learningItem.updateMany({ where: { id: { in: [ids[1], ids[2]] } }, data: { level: 3, dueDate: date('2026-11-09') } });
    await ctx.prisma.learningItem.update({ where: { id: ids[3] }, data: { level: 1, priority: true } });
    expect((await content.retire([senses[2]]))[0]).toMatchObject({ ok: true });

    const level3 = await listGroup(me.token, group, { cell: '3' });
    expect(level3.status).toBe(200);
    expect(level3.body).toEqual({ items: [
      { item_id: ids[1], sense_id: senses[1], level: 3, due_date: '2026-11-09', priority: false, group_count: 2,
        sense_changed: false, added_at: now.toISOString() },
      { item_id: ids[2], sense_id: senses[2], level: 3, due_date: '2026-11-09', priority: false, group_count: 1,
        sense_changed: true, added_at: now.toISOString() },
    ].sort((x, y) => x.item_id.localeCompare(y.item_id)), next_page_token: null });
    expect((await listGroup(me.token, group, { cell: 'priority' })).body.items.map((item: { item_id: string }) => item.item_id))
      .toEqual([ids[3]]);
    // Without a cell: every item, paged.
    const first = await listGroup(me.token, group, { page_size: 3 });
    expect(first.body.items).toHaveLength(3);
    const rest = await listGroup(me.token, group, { page_size: 3, page_token: first.body.next_page_token });
    expect(rest.body).toMatchObject({ items: [expect.any(Object)], next_page_token: null });
    expect([...first.body.items, ...rest.body.items].map((item: { item_id: string }) => item.item_id).sort()).toEqual([...ids].sort());
    expect((await listGroup(me.token, group, { cell: '6' })).status).toBe(400);
    const stranger = await learner();
    expect((await listGroup(stranger.token, group)).status).toBe(404);
  });

  it('two adds of the same sense sent at the same moment (to one group or two) leave one item and both requests succeed', async () => {
    const apple = await catalog('apple');
    const bread = await catalog('bread');
    const me = await learner();
    const [a, b] = [await me.group('A'), await me.group('B')];
    const same = await Promise.all([add(me.token, a, apple), add(me.token, a, apple)]);
    expect(same.map((r) => r.status)).toEqual([201, 201]);
    expect(same[0].body.item_id).toBe(same[1].body.item_id);
    expect(same.map((r) => r.body.created).sort()).toEqual([false, true]);
    const two = await Promise.all([add(me.token, a, bread), add(me.token, b, bread)]);
    expect(two.map((r) => r.status)).toEqual([201, 201]);
    expect(two[0].body.item_id).toBe(two[1].body.item_id);
    const items = await itemsOf(me.userId);
    expect(items).toHaveLength(2);
    expect(items.find((item) => item.senseId === bread)!.groups).toHaveLength(2);
    expect((await logOf(me.userId)).filter(({ kind }) => kind === 'item_added')).toHaveLength(2);
  });
  it('L3 (review probe P3): bulk add of 2,005 matching nouns into an empty group adds 2,000 and reports 5 skipped_group_full', async () => {
    await seedVisibleSenses(ctx.prisma, 2005, 'bulk');
    const me = await learner();
    const group = await me.group('Nouns');
    const response = await bulk(me.token, group, { pos: 'noun' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ added: 2000, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 5 });
    expect(await ctx.prisma.groupItem.count({ where: { groupId: group } })).toBe(2000);
  }, 120_000);

  it('T-C5: two adds into a group with one free slot sent at the same moment → one 201, one 409 group-full, 2,000 stored', async () => {
    const [apple, bread] = [await catalog('apple'), await catalog('bread')];
    const me = await learner();
    const group = await me.group('Almost full');
    await fill(me.userId, group, 1999);
    const results = await Promise.all([add(me.token, group, apple), add(me.token, group, bread)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)!.body.type).toBe(problem('group-full'));
    expect(await ctx.prisma.groupItem.count({ where: { groupId: group } })).toBe(2000);
    expect(await ctx.prisma.learningItem.count({ where: { userId: me.userId, senseId: { in: [apple, bread] } } })).toBe(1);
  });
});
