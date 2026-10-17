import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const date = (value: string) => new Date(`${value}T00:00:00Z`);
// 2026-11-08 10:00 in Asia/Ho_Chi_Minh (the seeded learners' zone).
const now = new Date('2026-11-08T03:00:00Z');

describe('reviews (e2e, isolated database)', () => {
  let ctx: TestApp;
  const learner = async () => {
    const user = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const group = await ctx.prisma.learningGroup.create({
      data: { userId: user.userId, name: 'Tech', nameKey: 'tech', createdAt: now, updatedAt: now },
    });
    return { userId: user.userId, groupId: group.id };
  };
  // Task 12's add route does not exist yet: items and their group links are inserted directly.
  const seedItem = async (userId: string, groupIds: string[], state: {
    level: number; dueDate: string; priority?: boolean; lastReviewedAt?: Date;
  }) => {
    const item = await ctx.prisma.learningItem.create({ data: {
      userId, senseId: randomUUID(), level: state.level, dueDate: date(state.dueDate), priority: state.priority ?? false,
      lastReviewedAt: state.lastReviewedAt ?? null, createdAt: now,
    } });
    await ctx.prisma.groupItem.createMany({ data: groupIds.map((groupId) => ({ groupId, itemId: item.id, addedAt: now })) });
    return item;
  };
  const answer = async (userId: string, body: object) => {
    // A fresh session per call: the FakeClock may have moved past an earlier token's expiry.
    const { accessToken } = await startSession(ctx, userId);
    return ctx.http().post('/v1/reviews').set('Authorization', `Bearer ${accessToken}`).send(body);
  };
  const itemRow = (id: string) => ctx.prisma.learningItem.findUnique({ where: { id } });
  const logOf = (itemId: string) => ctx.prisma.learningLogEntry.findMany({ where: { itemId }, orderBy: { at: 'asc' } });

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  beforeEach(async () => {
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(now);
  });
  afterAll(async () => { await ctx?.close(); });

  it('B3#2: "known" on a due item → level +1, due by the ladder, priority cleared; the log row carries every column', async () => {
    const { userId, groupId } = await learner();
    const item = await seedItem(userId, [groupId], { level: 2, dueDate: '2026-11-05', lastReviewedAt: new Date('2026-11-02T03:00:00Z') });
    const reviewId = randomUUID();
    const response = await answer(userId, { item_id: item.id, group_id: groupId, answer: 'known', review_id: reviewId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ item_id: item.id, level: 3, due_date: '2026-11-15', priority: false, section: 'due' });
    expect(await itemRow(item.id)).toMatchObject({ level: 3, dueDate: date('2026-11-15'), priority: false, lastReviewedAt: now });
    expect(await logOf(item.id)).toEqual([{
      id: expect.any(String), userId, itemId: item.id, senseId: item.senseId, groupId, kind: 'review', answer: 'known',
      rating: 'Good', levelBefore: 2, levelAfter: 3, dueBefore: date('2026-11-05'), dueAfter: date('2026-11-15'), wasDue: true,
      daysSinceLast: 6, reviewId, section: 'due', localDate: date('2026-11-08'), at: now,
    }]);
  });

  it('B3#2: level 5 stays 5 and a priority item at level 1 goes to 2 with priority cleared', async () => {
    const { userId, groupId } = await learner();
    const top = await seedItem(userId, [groupId], { level: 5, dueDate: '2026-11-08' });
    const flagged = await seedItem(userId, [groupId], { level: 1, dueDate: '2026-11-08', priority: true });
    expect((await answer(userId, { item_id: top.id, group_id: groupId, answer: 'known', review_id: randomUUID() })).body)
      .toEqual({ item_id: top.id, level: 5, due_date: '2026-12-08', priority: false, section: 'due' });
    expect((await answer(userId, { item_id: flagged.id, group_id: groupId, answer: 'known', review_id: randomUUID() })).body)
      .toEqual({ item_id: flagged.id, level: 2, due_date: '2026-11-11', priority: false, section: 'priority' });
    expect(await itemRow(flagged.id)).toMatchObject({ level: 2, dueDate: date('2026-11-11'), priority: false });
  });

  it('B3#3: "known" on an item not yet due → level and due date unchanged, the log says was_due=false', async () => {
    const { userId, groupId } = await learner();
    const item = await seedItem(userId, [groupId], { level: 3, dueDate: '2026-11-12' });
    const response = await answer(userId, { item_id: item.id, group_id: groupId, answer: 'known', review_id: randomUUID() });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ item_id: item.id, level: 3, due_date: '2026-11-12', priority: false, section: 'early' });
    expect(await itemRow(item.id)).toMatchObject({ level: 3, dueDate: date('2026-11-12'), priority: false });
    expect(await logOf(item.id)).toEqual([expect.objectContaining({
      kind: 'review', answer: 'known', rating: 'Good', wasDue: false, section: 'early', levelBefore: 3, levelAfter: 3,
      dueBefore: date('2026-11-12'), dueAfter: date('2026-11-12'), daysSinceLast: null,
    })]);
  });

  it('B3#4: "review" → level 1, due today, priority, whether due or not', async () => {
    const { userId, groupId } = await learner();
    const early = await seedItem(userId, [groupId], { level: 3, dueDate: '2026-11-12' });
    const fresh = await seedItem(userId, [groupId], { level: 0, dueDate: '2026-11-08' });
    expect((await answer(userId, { item_id: early.id, group_id: groupId, answer: 'review', review_id: randomUUID() })).body)
      .toEqual({ item_id: early.id, level: 1, due_date: '2026-11-08', priority: true, section: 'early' });
    expect((await answer(userId, { item_id: fresh.id, group_id: groupId, answer: 'review', review_id: randomUUID() })).body)
      .toEqual({ item_id: fresh.id, level: 1, due_date: '2026-11-08', priority: true, section: 'new' });
    expect(await itemRow(early.id)).toMatchObject({ level: 1, dueDate: date('2026-11-08'), priority: true });
    expect(await logOf(early.id)).toEqual([expect.objectContaining({
      answer: 'review', rating: 'Again', wasDue: false, levelBefore: 3, levelAfter: 1, dueAfter: date('2026-11-08'),
    })]);
  });

  it('B3E4: one review_id sent twice → identical responses and one log row', async () => {
    const { userId, groupId } = await learner();
    const item = await seedItem(userId, [groupId], { level: 1, dueDate: '2026-11-08' });
    const body = { item_id: item.id, group_id: groupId, answer: 'known', review_id: randomUUID() };
    const first = await answer(userId, body);
    const second = await answer(userId, body);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(first.body).toMatchObject({ level: 2, due_date: '2026-11-11' });
    expect(await logOf(item.id)).toHaveLength(1);
    expect(await itemRow(item.id)).toMatchObject({ level: 2, dueDate: date('2026-11-11') });
    // The same review_id sent at the same moment twice still gives one row.
    const again = { ...body, review_id: randomUUID() };
    ctx.clock.set(new Date('2026-11-11T03:00:00Z'));
    const [a, b] = await Promise.all([answer(userId, again), answer(userId, again)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(b.body).toEqual(a.body);
    expect(await logOf(item.id)).toHaveLength(2);
  });

  it('B3E4: one review_id reused with a different item, group or answer → 400 and nothing changes', async () => {
    const { userId, groupId } = await learner();
    const other = await ctx.prisma.learningGroup.create({
      data: { userId, name: 'Other', nameKey: 'other', createdAt: now, updatedAt: now },
    });
    const item = await seedItem(userId, [groupId, other.id], { level: 1, dueDate: '2026-11-08' });
    const second = await seedItem(userId, [groupId], { level: 1, dueDate: '2026-11-08' });
    const body = { item_id: item.id, group_id: groupId, answer: 'known', review_id: randomUUID() };
    expect((await answer(userId, body)).status).toBe(200);
    for (const changed of [{ item_id: second.id }, { group_id: other.id }, { answer: 'review' }]) {
      const response = await answer(userId, { ...body, ...changed });
      expect(response.status).toBe(400);
      expect(response.body.title).toBe('review_id reused with a different payload');
    }
    expect(await ctx.prisma.learningLogEntry.count()).toBe(1);
    expect(await itemRow(item.id)).toMatchObject({ level: 2, dueDate: date('2026-11-11'), priority: false });
    expect(await itemRow(second.id)).toMatchObject({ level: 1, dueDate: date('2026-11-08') });
  });

  it('learning.review rate limit: 120 answers in one minute pass, the 121st → 429 rate-limited with retry-after', async () => {
    const { userId, groupId } = await learner();
    const item = await seedItem(userId, [groupId], { level: 3, dueDate: '2026-11-20' });
    const { accessToken } = await startSession(ctx, userId);
    const send = () => ctx.http().post('/v1/reviews').set('Authorization', `Bearer ${accessToken}`)
      .send({ item_id: item.id, group_id: groupId, answer: 'known', review_id: randomUUID() });
    for (let i = 0; i < 120; i += 1) expect((await send()).status).toBe(200);
    const refused = await send();
    expect(refused.status).toBe(429);
    expect(refused.body.type).toBe(problem('rate-limited'));
    expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
    expect(await ctx.prisma.learningLogEntry.count()).toBe(120);
    // The answers did not use the general write budget.
    expect((await ctx.http().post('/v1/groups').set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID()).send({ name: 'Still allowed' })).status).toBe(201);
  });

  it('B3E5: two concurrent answers on one item serialize — known+known: the second is early and changes nothing; known+review: review applies', async () => {
    const { userId, groupId } = await learner();
    const twice = await seedItem(userId, [groupId], { level: 2, dueDate: '2026-11-08' });
    const results = await Promise.all([1, 2].map(() =>
      answer(userId, { item_id: twice.id, group_id: groupId, answer: 'known', review_id: randomUUID() })));
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    const rows = await logOf(twice.id);
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.wasDue)).toEqual([expect.objectContaining({ levelBefore: 2, levelAfter: 3 })]);
    expect(rows.filter((row) => !row.wasDue)).toEqual([expect.objectContaining({
      section: 'early', levelBefore: 3, levelAfter: 3, dueBefore: date('2026-11-15'), dueAfter: date('2026-11-15'),
    })]);
    expect(await itemRow(twice.id)).toMatchObject({ level: 3, dueDate: date('2026-11-15'), priority: false });

    const mixed = await seedItem(userId, [groupId], { level: 2, dueDate: '2026-11-08' });
    await Promise.all(['known', 'review'].map((value) =>
      answer(userId, { item_id: mixed.id, group_id: groupId, answer: value, review_id: randomUUID() })));
    const pair = await logOf(mixed.id);
    expect(pair).toHaveLength(2);
    // Serialized: the second row starts from the first row's result, and the item holds the second row's result.
    const [first, second] = pair[0].levelBefore === 2 && pair[1].levelBefore !== 2 ? pair : [pair[1], pair[0]];
    expect(second).toMatchObject({ levelBefore: first.levelAfter, dueBefore: first.dueAfter });
    const final = await itemRow(mixed.id);
    expect(final).toMatchObject({ level: second.levelAfter, dueDate: second.dueAfter });
    if (second.answer === 'review') {
      expect(final).toMatchObject({ level: 1, dueDate: date('2026-11-08'), priority: true });
    } else {
      // "review" came first and made the item priority, so the later "known" is due and applies.
      expect(first).toMatchObject({ answer: 'review', levelAfter: 1 });
      expect(final).toMatchObject({ level: 2, dueDate: date('2026-11-11'), priority: false });
    }
  });

  it('B3E6: answering an item removed meanwhile → 404; so does an item not in that group or another learner\'s item', async () => {
    const { userId, groupId } = await learner();
    const other = await ctx.prisma.learningGroup.create({
      data: { userId, name: 'Other', nameKey: 'other', createdAt: now, updatedAt: now },
    });
    const removed = await seedItem(userId, [groupId], { level: 1, dueDate: '2026-11-08' });
    await ctx.prisma.learningItem.delete({ where: { id: removed.id } });
    const elsewhere = await seedItem(userId, [other.id], { level: 1, dueDate: '2026-11-08' });
    const stranger = await learner();
    const theirs = await seedItem(stranger.userId, [stranger.groupId], { level: 1, dueDate: '2026-11-08' });
    for (const body of [
      { item_id: removed.id, group_id: groupId }, { item_id: elsewhere.id, group_id: groupId },
      { item_id: theirs.id, group_id: stranger.groupId }, { item_id: theirs.id, group_id: groupId },
    ]) {
      const response = await answer(userId, { ...body, answer: 'known', review_id: randomUUID() });
      expect(response.status).toBe(404);
      expect(response.body.type).toBe(problem('not-found'));
    }
    expect(await ctx.prisma.learningLogEntry.count()).toBe(0);
    expect(await itemRow(theirs.id)).toMatchObject({ level: 1, dueDate: date('2026-11-08') });
  });

  it('bad input → 400 validation-failed; a learner without a native language → 403', async () => {
    const { userId, groupId } = await learner();
    const item = await seedItem(userId, [groupId], { level: 1, dueDate: '2026-11-08' });
    for (const body of [
      { item_id: item.id, group_id: groupId, answer: 'maybe', review_id: randomUUID() },
      { item_id: item.id, group_id: groupId, answer: 'known' },
      { item_id: item.id, group_id: groupId, answer: 'known', review_id: 'not-a-uuid' },
      { item_id: item.id, group_id: groupId, answer: 'known', review_id: randomUUID(), extra: 1 },
    ]) {
      const response = await answer(userId, body);
      expect(response.status).toBe(400);
      expect(response.body.type).toBe(problem('validation-failed'));
    }
    const incomplete = await seedUser(ctx.prisma, { verified: true });
    expect((await answer(incomplete.userId, { item_id: item.id, group_id: groupId, answer: 'known', review_id: randomUUID() })).status)
      .toBe(403);
    expect(await ctx.prisma.learningLogEntry.count()).toBe(0);
  });

  it('B3#5 / T-C3: 90 FakeClock days without answers change neither level nor due date; queue, backlog and counts read it, never move it', async () => {
    const { userId, groupId } = await learner();
    const [senseId] = await seedVisibleSenses(ctx.prisma, 1, 'idle');
    const item = await ctx.prisma.learningItem.create({ data: {
      userId, senseId, level: 3, dueDate: date('2026-11-10'), createdAt: now,
    } });
    await ctx.prisma.groupItem.create({ data: { groupId, itemId: item.id, addedAt: now } });
    const before = await itemRow(item.id);
    const read = async (path: string) => {
      const { accessToken } = await startSession(ctx, userId);
      const response = await ctx.http().get(path).set('Authorization', `Bearer ${accessToken}`);
      expect(response.status).toBe(200);
      return response.body;
    };
    for (let day = 0; day < 90; day += 10) {
      ctx.clock.advance(10 * 86_400_000);
      await read(`/v1/groups/${groupId}`);
      await read(`/v1/groups/${groupId}/queue`);
      await read(`/v1/groups/${groupId}/backlog`);
      await read('/v1/groups');
    }
    // 2026-11-08 + 90 days = 2027-02-06: 88 days overdue, so the word sits in the backlog and out of the queue.
    expect((await read(`/v1/groups/${groupId}/queue`)).cards).toEqual([]);
    expect((await read(`/v1/groups/${groupId}/backlog`)).items).toEqual([expect.objectContaining({
      item_id: item.id, level: 3, due_date: '2026-11-10', days_overdue: 88,
    })]);
    expect((await read('/v1/groups')).items[0]).toMatchObject({ backlog: 1, today: { priority: 0, due: 0, new: 0 } });
    expect(await itemRow(item.id)).toEqual(before);
    expect(await ctx.prisma.learningLogEntry.count()).toBe(0);
  });

  it('T-C2: one review_id sent at the same moment for two different items → one 200, one 400, one log row', async () => {
    const { userId, groupId } = await learner();
    const first = await seedItem(userId, [groupId], { level: 1, dueDate: '2026-11-08' });
    const second = await seedItem(userId, [groupId], { level: 1, dueDate: '2026-11-08' });
    const reviewId = randomUUID();
    const results = await Promise.all([first, second].map((item) =>
      answer(userId, { item_id: item.id, group_id: groupId, answer: 'known', review_id: reviewId })));
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    const rows = await ctx.prisma.learningLogEntry.findMany({ where: { reviewId } });
    expect(rows).toHaveLength(1);
    const winner = results.find((r) => r.status === 200)!.body.item_id;
    expect(rows[0].itemId).toBe(winner);
    const loser = winner === first.id ? second : first;
    expect(await itemRow(loser.id)).toMatchObject({ level: 1, dueDate: date('2026-11-08') });
  });

});
