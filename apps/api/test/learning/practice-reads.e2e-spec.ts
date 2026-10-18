import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addDays } from '../../src/common/time/local-date.js';
import { LearningService, type PracticeItem } from '../../src/learning/index.js';
import { SettingsService } from '../../src/settings/index.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const date = (value: string) => new Date(`${value}T00:00:00Z`);
const today = '2026-11-08';
// 10:00 on 2026-11-08 in Asia/Ho_Chi_Minh (the seeded learners' zone).
const now = new Date('2026-11-08T03:00:00Z');
type State = { level: number; dueDate: string; priority?: boolean };

describe('Learning reads for Practice (e2e, isolated database)', () => {
  let ctx: TestApp;
  let learning: LearningService;
  let senseCounter = 0;

  const senses = (count: number) => seedVisibleSenses(ctx.prisma, count, `p${(senseCounter += 1)}`);
  const learner = async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    return { userId, token: async () => (await startSession(ctx, userId)).accessToken };
  };
  const group = async (userId: string, name: string) => (await ctx.prisma.learningGroup.create({
    data: { userId, name, nameKey: name.toLowerCase(), createdAt: now, updatedAt: now },
  })).id;
  /** Items in the order given; added_at grows by one second per item so "earliest added" is that order. */
  const seed = async (userId: string, groupIds: string[], senseIds: string[], state: (index: number) => State) => {
    const items = senseIds.map((senseId, index) => {
      const { level, dueDate, priority } = state(index);
      return { id: randomUUID(), userId, senseId, level, dueDate: date(dueDate), priority: priority ?? false, createdAt: now };
    });
    await ctx.prisma.learningItem.createMany({ data: items });
    await link(groupIds, items.map(({ id }) => id), 0);
    return items.map(({ id }) => id);
  };
  const link = async (groupIds: string[], itemIds: string[], offsetSeconds: number) => {
    await ctx.prisma.groupItem.createMany({ data: groupIds.flatMap((groupId) => itemIds.map((itemId, index) => ({
      groupId, itemId, addedAt: new Date(now.getTime() - 86_400_000 + (offsetSeconds + index) * 1000),
    }))) });
  };
  const dueQueue = async (token: string, groupId: string) => {
    const response = await ctx.http().get(`/v1/groups/${groupId}/queue`).query({ mode: 'due' })
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    return (response.body.cards as Array<{ item_id: string }>).map(({ item_id }) => item_id);
  };
  const setCaps = async (values: { reviews_per_group_per_day?: number; new_per_group_per_day?: number }) => {
    const settings = ctx.app.get(SettingsService);
    const { version } = await settings.current();
    await settings.update(randomUUID(), version, { learning: values });
  };
  /** `count` flashcard review rows of today in the group, as `POST /v1/reviews` writes them. */
  const logReviews = async (userId: string, groupId: string, itemId: string, senseId: string, section: string, count: number) => {
    await ctx.prisma.learningLogEntry.createMany({ data: Array.from({ length: count }, () => ({
      userId, itemId, senseId, groupId, kind: 'review', answer: 'known', section, localDate: date(today), at: now,
    })) });
  };
  const ids = (items: PracticeItem[]) => items.map(({ item_id }) => item_id).sort();
  const retire = (senseId: string) => ctx.prisma.sense.update({ where: { id: senseId }, data: { state: 'retired' } });

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    learning = ctx.app.get(LearningService);
  });
  beforeEach(async () => {
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.appSettingChange.deleteMany();
    await ctx.prisma.appSetting.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(now);
  });
  afterAll(async () => { await ctx?.close(); });

  it('today equals the union of GET /v1/groups/:id/queue?mode=due over all groups, a word in two groups once', async () => {
    await setCaps({ reviews_per_group_per_day: 3, new_per_group_per_day: 2 });
    const me = await learner();
    const [a, b] = [await group(me.userId, 'A'), await group(me.userId, 'B')];
    const s = await senses(24);
    // Shared by both groups: one priority, two due, two new.
    await seed(me.userId, [a, b], s.slice(0, 5), (i) => [
      { level: 1, dueDate: today, priority: true }, { level: 2, dueDate: addDays(today, -3) },
      { level: 1, dueDate: addDays(today, -1) }, { level: 0, dueDate: today }, { level: 0, dueDate: today },
    ][i]);
    // Only in A: due, early, backlog, new.
    await seed(me.userId, [a], s.slice(5, 12), (i) => [
      { level: 3, dueDate: addDays(today, -5) }, { level: 1, dueDate: today }, { level: 2, dueDate: addDays(today, 2) },
      { level: 2, dueDate: addDays(today, -70) }, { level: 0, dueDate: today }, { level: 0, dueDate: today },
      { level: 2, dueDate: addDays(today, -70), priority: true },
    ][i]);
    // Only in B: due and new.
    await seed(me.userId, [b], s.slice(12, 18), (i) => (i < 3 ? { level: 1, dueDate: addDays(today, -i) } : { level: 0, dueDate: today }));
    const token = await me.token();

    const expected = [...new Set([...await dueQueue(token, a), ...await dueQueue(token, b)])].sort();
    const items = await learning.practiceItems(me.userId, { kind: 'today' });
    expect(ids(items)).toEqual(expected);
    expect(items).toHaveLength(new Set(items.map(({ item_id }) => item_id)).size);
  });

  it('today after 100 due reviews in a group leaves that group\'s due part out (caps from the log)', async () => {
    const me = await learner();
    const [a, b] = [await group(me.userId, 'A'), await group(me.userId, 'B')];
    const s = await senses(8);
    const aDue = await seed(me.userId, [a], s.slice(0, 2), () => ({ level: 2, dueDate: addDays(today, -1) }));
    const aNew = await seed(me.userId, [a], s.slice(2, 3), () => ({ level: 0, dueDate: today }));
    const aPriority = await seed(me.userId, [a], s.slice(3, 4), () => ({ level: 1, dueDate: today, priority: true }));
    const bDue = await seed(me.userId, [b], s.slice(4, 6), () => ({ level: 2, dueDate: addDays(today, -1) }));
    await logReviews(me.userId, a, aDue[0], s[0], 'due', 100);
    // Priority and practice rows never use a cap.
    await logReviews(me.userId, b, bDue[0], s[4], 'priority', 150);
    await ctx.prisma.learningLogEntry.createMany({ data: Array.from({ length: 150 }, () => ({
      userId: me.userId, itemId: bDue[0], senseId: s[4], groupId: null, kind: 'review', answer: 'known', section: 'due',
      localDate: date(today), at: now,
    })) });

    expect(ids(await learning.practiceItems(me.userId, { kind: 'today' })))
      .toEqual([...aNew, ...aPriority, ...bDue].sort());
  });

  it('all returns every visible item once, backlog included', async () => {
    const me = await learner();
    const [a, b] = [await group(me.userId, 'A'), await group(me.userId, 'B')];
    const s = await senses(4);
    const shared = await seed(me.userId, [a, b], s.slice(0, 1), () => ({ level: 2, dueDate: addDays(today, 3) }));
    const backlog = await seed(me.userId, [a], s.slice(1, 2), () => ({ level: 3, dueDate: addDays(today, -90) }));
    const fresh = await seed(me.userId, [b], s.slice(2, 3), () => ({ level: 0, dueDate: today }));
    const hidden = await seed(me.userId, [b], s.slice(3, 4), () => ({ level: 1, dueDate: today }));
    await retire(s[3]);

    const items = await learning.practiceItems(me.userId, { kind: 'all' });
    expect(ids(items)).toEqual([...shared, ...backlog, ...fresh].sort());
    expect(ids(items)).not.toContain(hidden[0]);
    expect(items.find(({ item_id }) => item_id === backlog[0])).toMatchObject({ section: 'backlog', level: 3 });
  });

  it('priority leaves out a priority item 61 days overdue (D48)', async () => {
    const me = await learner();
    const a = await group(me.userId, 'A');
    const s = await senses(3);
    const kept = await seed(me.userId, [a], s.slice(0, 2), (i) => ({ level: 1, dueDate: addDays(today, -i * 60), priority: true }));
    await seed(me.userId, [a], s.slice(2, 3), () => ({ level: 1, dueDate: addDays(today, -61), priority: true }));

    expect(ids(await learning.practiceItems(me.userId, { kind: 'priority' }))).toEqual([...kept].sort());
  });

  it('group filters all / due / priority / 2 return the expected sets', async () => {
    await setCaps({ reviews_per_group_per_day: 1 });
    const me = await learner();
    const [a, b] = [await group(me.userId, 'A'), await group(me.userId, 'B')];
    const s = await senses(7);
    const [overdue, due] = await seed(me.userId, [a], s.slice(0, 2), (i) => ({ level: 2, dueDate: addDays(today, -2 + i) }));
    const [flagged] = await seed(me.userId, [a], s.slice(2, 3), () => ({ level: 1, dueDate: today, priority: true }));
    const [backlog] = await seed(me.userId, [a], s.slice(3, 4), () => ({ level: 2, dueDate: addDays(today, -61), priority: true }));
    const [fresh] = await seed(me.userId, [a], s.slice(4, 5), () => ({ level: 0, dueDate: today }));
    const [early] = await seed(me.userId, [a], s.slice(5, 6), () => ({ level: 2, dueDate: addDays(today, 5) }));
    await seed(me.userId, [b], s.slice(6, 7), () => ({ level: 2, dueDate: today }));
    const token = await me.token();
    const read = (filter: 'all' | 'due' | 'priority' | 0 | 1 | 2 | 3 | 4 | 5) =>
      learning.practiceItems(me.userId, { kind: 'group', groupId: a, filter }).then(ids);

    expect(await read('all')).toEqual([overdue, due, flagged, backlog, fresh, early].sort());
    // The group's flashcard list of today: priority, then one due (cap 1, most overdue first), then new.
    expect(await read('due')).toEqual([flagged, overdue, fresh].sort());
    expect(await read('due')).toEqual((await dueQueue(token, a)).sort());
    expect(await read('priority')).toEqual([flagged]);
    expect(await read(2)).toEqual([overdue, due, backlog, early].sort());
    expect(await read(4)).toEqual([]);
  });

  it('a retired sense is absent from every scope', async () => {
    const me = await learner();
    const a = await group(me.userId, 'A');
    const s = await senses(1);
    await seed(me.userId, [a], s, () => ({ level: 1, dueDate: today, priority: true }));
    await retire(s[0]);

    for (const scope of [
      { kind: 'today' }, { kind: 'all' }, { kind: 'priority' }, { kind: 'senses', senseIds: s },
      ...(['all', 'due', 'priority', 1] as const).map((filter) => ({ kind: 'group' as const, groupId: a, filter })),
    ] as const) {
      expect(await learning.practiceItems(me.userId, scope), JSON.stringify(scope)).toEqual([]);
    }
  });

  it('senses returns the learner\'s visible items of the given senses only', async () => {
    const [me, other] = [await learner(), await learner()];
    const [mine, theirs] = [await group(me.userId, 'A'), await group(other.userId, 'A')];
    const s = await senses(3);
    const [first] = await seed(me.userId, [mine], s.slice(0, 1), () => ({ level: 1, dueDate: today }));
    await seed(me.userId, [mine], s.slice(1, 2), () => ({ level: 1, dueDate: today }));
    await seed(other.userId, [theirs], s.slice(2, 3), () => ({ level: 1, dueDate: today }));

    expect(ids(await learning.practiceItems(me.userId, { kind: 'senses', senseIds: [s[0], s[2]] }))).toEqual([first]);
    expect(await learning.practiceItems(me.userId, { kind: 'senses', senseIds: [] })).toEqual([]);
  });

  it('another learner\'s group → 404', async () => {
    const [me, other] = [await learner(), await learner()];
    const theirs = await group(other.userId, 'A');
    await expect(learning.practiceItems(me.userId, { kind: 'group', groupId: theirs, filter: 'all' }))
      .rejects.toMatchObject({ status: 404 });
    await expect(learning.practiceItems(me.userId, { kind: 'group', groupId: randomUUID(), filter: 'due' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('B4E24: practiceGroupMates of a word in two groups returns the union of both groups\' visible senses, each once, without the word itself, never another learner\'s items; a batch of three senses answers all three in one call', async () => {
    const [me, other] = [await learner(), await learner()];
    const [it_, work, alone] = [await group(me.userId, 'IT'), await group(me.userId, 'Work'), await group(me.userId, 'Alone')];
    const theirs = await group(other.userId, 'IT');
    const s = await senses(9);
    // s0 is in IT and Work; s1 in both too (so it must appear once); s2–s3 only IT; s4 only Work; s5 retired, in IT.
    await seed(me.userId, [it_, work], s.slice(0, 2), () => ({ level: 1, dueDate: today }));
    await seed(me.userId, [it_], [s[2], s[3], s[5]], () => ({ level: 1, dueDate: today }));
    await seed(me.userId, [work], [s[4]], () => ({ level: 1, dueDate: today }));
    await seed(me.userId, [alone], [s[6]], () => ({ level: 1, dueDate: today }));
    await retire(s[5]);
    // Another learner holds s0 and s7 in a group of their own.
    await seed(other.userId, [theirs], [s[0], s[7]], () => ({ level: 1, dueDate: today }));
    const notLearning = s[8];

    const mates = await learning.practiceGroupMates(me.userId, [s[0], s[6], notLearning]);
    expect([...mates.keys()].sort()).toEqual([s[0], s[6], notLearning].sort());
    expect([...mates.get(s[0])!].sort()).toEqual([s[1], s[2], s[3], s[4]].sort());
    expect(mates.get(s[6])).toEqual([]);
    expect(mates.get(notLearning)).toEqual([]);
    expect((await learning.practiceGroupMates(me.userId, [s[4]])).get(s[4])!.sort()).toEqual([s[0], s[1]].sort());
    expect((await learning.practiceGroupMates(other.userId, [s[0]])).get(s[0])).toEqual([s[7]]);
    expect((await learning.practiceGroupMates(me.userId, [])).size).toBe(0);
  });

  it('practiceCheck reports a word removed from the group but still learning (inGroup false) and a deleted group (groupExists false)', async () => {
    const me = await learner();
    const [a, b] = [await group(me.userId, 'A'), await group(me.userId, 'B')];
    const s = await senses(2);
    const [item] = await seed(me.userId, [a, b], s.slice(0, 1), () => ({ level: 2, dueDate: today }));
    await ctx.prisma.groupItem.delete({ where: { groupId_itemId: { groupId: a, itemId: item } } });

    expect(await learning.practiceCheck(me.userId, s[0], a)).toMatchObject({
      item: { item_id: item, sense_id: s[0], level: 2 }, groupExists: true, inGroup: false,
    });
    expect(await learning.practiceCheck(me.userId, s[0], b)).toMatchObject({ groupExists: true, inGroup: true });
    expect(await learning.practiceCheck(me.userId, s[0], null)).toMatchObject({
      item: { item_id: item }, groupExists: null, inGroup: null,
    });
    await ctx.prisma.learningGroup.delete({ where: { id: b } });
    expect(await learning.practiceCheck(me.userId, s[0], b)).toMatchObject({
      item: { item_id: item }, groupExists: false, inGroup: false,
    });
    expect(await learning.practiceCheck(me.userId, s[1], null)).toEqual({ item: null, groupExists: null, inGroup: null });
  });

  it('due_now is true for level 0 with due date tomorrow, for priority, and for a backlog word', async () => {
    const me = await learner();
    const a = await group(me.userId, 'A');
    const s = await senses(5);
    const [zero, flagged, backlog, early, due] = await seed(me.userId, [a], s, (i) => [
      { level: 0, dueDate: addDays(today, 1) }, { level: 1, dueDate: addDays(today, 1), priority: true },
      { level: 2, dueDate: addDays(today, -61) }, { level: 2, dueDate: addDays(today, 1) }, { level: 2, dueDate: today },
    ][i]);

    const byId = new Map((await learning.practiceItems(me.userId, { kind: 'all' })).map((item) => [item.item_id, item]));
    expect(byId.get(zero)).toMatchObject({ due_now: true, section: 'new', due_date: addDays(today, 1) });
    expect(byId.get(flagged)).toMatchObject({ due_now: true, section: 'priority', priority: true });
    expect(byId.get(backlog)).toMatchObject({ due_now: true, section: 'backlog' });
    expect(byId.get(early)).toMatchObject({ due_now: false, section: 'early' });
    expect(byId.get(due)).toMatchObject({ due_now: true, section: 'due' });
  });

  it('last_needs_review_at is the newest review-answer row; added_at is the earliest group link', async () => {
    const me = await learner();
    const [a, b] = [await group(me.userId, 'A'), await group(me.userId, 'B')];
    const s = await senses(2);
    const [item, plain] = await seed(me.userId, [b], s, () => ({ level: 1, dueDate: today, priority: true }));
    // Linked to A ten minutes earlier than to B.
    await ctx.prisma.groupItem.create({ data: { groupId: a, itemId: item, addedAt: new Date(now.getTime() - 87_000_000) } });
    const row = (answer: string, at: string, kind = 'review') => ({
      userId: me.userId, itemId: item, senseId: s[0], groupId: a, kind, answer, localDate: date(today), at: new Date(at),
    });
    await ctx.prisma.learningLogEntry.createMany({ data: [
      row('review', '2026-11-01T01:00:00Z'), row('review', '2026-11-05T01:00:00Z'), row('known', '2026-11-07T01:00:00Z'),
      row('review', '2026-11-07T02:00:00Z', 'item_added'),
    ] });

    const byId = new Map((await learning.practiceItems(me.userId, { kind: 'all' })).map((x) => [x.item_id, x]));
    expect(byId.get(item)).toMatchObject({
      last_needs_review_at: '2026-11-05T01:00:00.000Z', added_at: new Date(now.getTime() - 87_000_000).toISOString(),
    });
    expect(byId.get(plain)).toMatchObject({ last_needs_review_at: null, added_at: new Date(now.getTime() - 86_399_000).toISOString() });
  });
});
