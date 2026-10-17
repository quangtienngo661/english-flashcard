import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addDays } from '../../src/common/time/local-date.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const date = (value: string) => new Date(`${value}T00:00:00Z`);
const today = '2026-11-08';
const now = new Date('2026-11-08T03:00:00Z'); // 10:00 in Asia/Ho_Chi_Minh
type BacklogItem = { item_id: string; sense_id: string; level: number; due_date: string; days_overdue: number;
  content: { sense_id: string; lemma: string } };

describe('backlog and relearn (e2e, isolated database)', () => {
  let ctx: TestApp;
  let prefix = 0;

  const learner = async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const token = (await startSession(ctx, userId)).accessToken;
    const groupId = (await ctx.prisma.learningGroup.create({
      data: { userId, name: 'G', nameKey: 'g', createdAt: now, updatedAt: now },
    })).id;
    return { userId, token, groupId };
  };
  const seed = async (userId: string, groupId: string, states: Array<{ level: number; overdue: number }>) => {
    const senseIds = await seedVisibleSenses(ctx.prisma, states.length, `b${(prefix += 1)}`);
    const items = states.map(({ level, overdue }, i) => ({
      id: randomUUID(), userId, senseId: senseIds[i], level, dueDate: date(addDays(today, -overdue)), createdAt: now,
    }));
    await ctx.prisma.learningItem.createMany({ data: items });
    await ctx.prisma.groupItem.createMany({ data: items.map((item) => ({ groupId, itemId: item.id, addedAt: now })) });
    return items.map(({ id }) => id);
  };
  const backlog = (token: string, groupId: string, query: object = {}) => ctx.http().get(`/v1/groups/${groupId}/backlog`)
    .query(query).set('Authorization', `Bearer ${token}`);
  const relearn = (token: string, itemIds: unknown) => ctx.http().post('/v1/items/relearn')
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID()).send({ item_ids: itemIds });
  const counts = async (token: string, groupId: string) => (await ctx.http().get('/v1/groups')
    .set('Authorization', `Bearer ${token}`)).body.items.find((g: { id: string }) => g.id === groupId);
  const queueIds = async (token: string, groupId: string) => (await ctx.http().get(`/v1/groups/${groupId}/queue`)
    .set('Authorization', `Bearer ${token}`)).body.cards.map((c: { item_id: string }) => c.item_id);

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
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
  });
  afterAll(async () => { await ctx?.close(); });

  it('B3#7: a level-2 item 61 days overdue is listed in backlog and absent from the queue; relearn makes it level 0, counted as new, with a relearn log row', async () => {
    const me = await learner();
    const [late, onTime] = await seed(me.userId, me.groupId, [{ level: 2, overdue: 61 }, { level: 2, overdue: 3 }]);
    const listed = await backlog(me.token, me.groupId);
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual({ items: [{
      item_id: late, sense_id: expect.any(String), level: 2, due_date: addDays(today, -61), days_overdue: 61,
      content: expect.objectContaining({ lemma: expect.stringMatching(/^b\d+-1$/) }),
    }], next_page_token: null });
    expect(listed.body.items[0].content.sense_id).toBe(listed.body.items[0].sense_id);
    expect(await queueIds(me.token, me.groupId)).toEqual([onTime]);
    expect(await counts(me.token, me.groupId)).toMatchObject({ backlog: 1, today: { due: 1, new: 0 } });

    const response = await relearn(me.token, [late]);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ relearned: 1 });
    expect(await ctx.prisma.learningItem.findUnique({ where: { id: late } }))
      .toMatchObject({ level: 0, dueDate: date(today), priority: false });
    expect(await ctx.prisma.learningLogEntry.findMany({ where: { itemId: late } })).toEqual([expect.objectContaining({
      kind: 'relearn', userId: me.userId, groupId: null, levelBefore: 2, levelAfter: 0, dueBefore: date(addDays(today, -61)),
      dueAfter: date(today), localDate: date(today), at: now,
    })]);
    expect((await backlog(me.token, me.groupId)).body.items).toEqual([]);
    expect(await counts(me.token, me.groupId)).toMatchObject({ backlog: 0, today: { due: 1, new: 1 } });
    expect(await queueIds(me.token, me.groupId)).toEqual([onTime, late]);
  });

  it('B3E35 (backlog): level-0 items are never listed; the list is most overdue first and paged', async () => {
    const me = await learner();
    const ids = await seed(me.userId, me.groupId, [
      { level: 0, overdue: 400 }, { level: 1, overdue: 61 }, { level: 5, overdue: 90 }, { level: 3, overdue: 75 },
      { level: 2, overdue: 60 },
    ]);
    const first = await backlog(me.token, me.groupId, { page_size: 2 });
    expect(first.body.items.map((item: BacklogItem) => [item.item_id, item.days_overdue])).toEqual([[ids[2], 90], [ids[3], 75]]);
    const rest = await backlog(me.token, me.groupId, { page_size: 2, page_token: first.body.next_page_token });
    expect(rest.body).toMatchObject({ items: [{ item_id: ids[1], days_overdue: 61 }], next_page_token: null });
    expect((await backlog(me.token, me.groupId, { page_token: 'garbage' })).status).toBe(400);
  });

  it('relearn ignores another learner\'s ids and items not in the backlog; bad input → 400', async () => {
    const me = await learner();
    const stranger = await learner();
    const [mine, recent] = await seed(me.userId, me.groupId, [{ level: 3, overdue: 70 }, { level: 3, overdue: 2 }]);
    const [theirs] = await seed(stranger.userId, stranger.groupId, [{ level: 3, overdue: 70 }]);
    const response = await relearn(me.token, [mine, theirs, recent, randomUUID()]);
    expect(response.body).toEqual({ relearned: 1 });
    expect(await ctx.prisma.learningItem.findUnique({ where: { id: theirs } })).toMatchObject({ level: 3 });
    expect(await ctx.prisma.learningItem.findUnique({ where: { id: recent } })).toMatchObject({ level: 3 });
    expect(await ctx.prisma.learningLogEntry.count({ where: { userId: stranger.userId } })).toBe(0);
    expect((await backlog(me.token, stranger.groupId)).status).toBe(404);
    for (const body of [[], Array.from({ length: 101 }, () => randomUUID()), ['nope'], undefined]) {
      expect((await relearn(me.token, body)).status).toBe(400);
    }
  });
  it('L4: relearn waits for a review in progress on the same item and sees its result — the review is not overwritten', async () => {
    const me = await learner();
    const [item] = await seed(me.userId, me.groupId, [{ level: 3, overdue: 70 }]);
    let locked!: () => void;
    let release!: () => void;
    const lockTaken = new Promise<void>((resolve) => { locked = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    // Another device answers the card: it holds the item row, moves it out of the backlog, and commits later.
    const review = ctx.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM learning_items WHERE id = ${item}::uuid FOR UPDATE`;
      await tx.learningItem.update({ where: { id: item }, data: { level: 4, dueDate: date(addDays(today, 14)) } });
      locked();
      await gate;
    }, { timeout: 30_000, maxWait: 5_000 });
    await lockTaken;
    let settled = false;
    const pending = relearn(me.token, [item]).then((response) => { settled = true; return response; });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(settled).toBe(false);
    release();
    await review;
    const response = await pending;
    expect(response.body).toEqual({ relearned: 0 });
    expect(await ctx.prisma.learningItem.findUnique({ where: { id: item } }))
      .toMatchObject({ level: 4, dueDate: date(addDays(today, 14)) });
    expect(await ctx.prisma.learningLogEntry.count({ where: { itemId: item } })).toBe(0);
  });
});
