import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addDays } from '../../src/common/time/local-date.js';
import { ContentService } from '../../src/content/index.js';
import { LearningService } from '../../src/learning/index.js';
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
type Card = { item_id: string; sense_id: string; level: number; due_date: string; priority: boolean; section: string;
  content: { sense_id: string; lemma: string; sentences: string[] } };

describe('group counts and the review queue (e2e, isolated database)', () => {
  let ctx: TestApp;
  let senseCounter = 0;

  const senses = (count: number) => seedVisibleSenses(ctx.prisma, count, `w${(senseCounter += 1)}`);
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
    await ctx.prisma.groupItem.createMany({ data: groupIds.flatMap((groupId) => items.map((item, index) => ({
      groupId, itemId: item.id, addedAt: new Date(now.getTime() - 86_400_000 + index * 1000),
    }))) });
    return items.map(({ id }) => id);
  };
  const groups = async (token: string) => {
    const response = await ctx.http().get('/v1/groups').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    return response.body.items as Array<{ id: string; today: { priority: number; due: number; new: number }; backlog: number;
      total: number; cells: Array<{ level: number; total: number; due: number }>; name: string }>;
  };
  const counts = async (token: string, groupId: string) => (await groups(token)).find(({ id }) => id === groupId)!;
  const queue = async (token: string, groupId: string, mode = 'due') => {
    const response = await ctx.http().get(`/v1/groups/${groupId}/queue`).query({ mode }).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    return response.body.cards as Card[];
  };
  const answer = async (token: string, itemId: string, groupId: string, value: 'known' | 'review' = 'known') => {
    const response = await ctx.http().post('/v1/reviews').set('Authorization', `Bearer ${token}`)
      .send({ item_id: itemId, group_id: groupId, answer: value, review_id: randomUUID() });
    expect(response.status).toBe(200);
    return response.body;
  };
  const setCaps = async (learning: { reviews_per_group_per_day?: number | null; new_per_group_per_day?: number }) => {
    const settings = ctx.app.get(SettingsService);
    const { version } = await settings.current();
    await settings.update(randomUUID(), version, { learning });
  };

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  beforeEach(async () => {
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await ctx.prisma.contextSentence.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.appSettingChange.deleteMany();
    await ctx.prisma.appSetting.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(now);
  });
  afterAll(async () => { await ctx?.close(); });

  it('B3#6: 3 priority, 150 due, 30 new and caps 100/20 → 3 priority, 100 due in order, 20 new in order; after 40 due reviews today the next read gives 60 due', async () => {
    const me = await learner();
    const g = await group(me.userId, 'Big');
    const ids = await senses(183);
    const priority = await seed(me.userId, [g], ids.slice(0, 3), () => ({ level: 1, dueDate: today, priority: true }));
    // Unique (overdue, level) pairs: overdue 0..49 days, level 1..3.
    const dueState = (i: number) => ({ level: 1 + (i % 3), dueDate: addDays(today, -Math.floor(i / 3)) });
    const due = await seed(me.userId, [g], ids.slice(3, 153), dueState);
    const fresh = await seed(me.userId, [g], ids.slice(153), () => ({ level: 0, dueDate: today }));
    const token = await me.token();

    expect(await counts(token, g)).toMatchObject({ total: 183, today: { priority: 3, due: 100, new: 20 }, backlog: 0 });
    const cards = await queue(token, g);
    expect(cards).toHaveLength(123);
    expect(cards.slice(0, 3).map((c) => c.item_id).sort()).toEqual([...priority].sort());
    expect(cards.slice(0, 3).every((c) => c.section === 'priority')).toBe(true);
    const expectedDue = due.map((id, i) => ({ id, ...dueState(i) }))
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.level - b.level)).slice(0, 100);
    expect(cards.slice(3, 103).map((c) => c.item_id)).toEqual(expectedDue.map(({ id }) => id));
    expect(cards.slice(3, 103).every((c) => c.section === 'due')).toBe(true);
    expect(cards.slice(103).map((c) => c.item_id)).toEqual(fresh.slice(0, 20));
    expect(cards.slice(103).every((c) => c.section === 'new' && c.level === 0)).toBe(true);
    expect(cards[3].content).toMatchObject({ sense_id: cards[3].sense_id, lemma: expect.stringMatching(/^w\d+-\d+$/), sentences: [] });

    for (const card of cards.slice(3, 43)) await answer(token, card.item_id, g);
    expect((await counts(token, g)).today).toEqual({ priority: 3, due: 60, new: 20 });
    const next = await queue(token, g);
    expect(next.filter((c) => c.section === 'due')).toHaveLength(60);
    expect(next.filter((c) => c.section === 'due').map((c) => c.item_id))
      .toEqual(due.map((id, i) => ({ id, ...dueState(i) }))
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.level - b.level))
        .slice(40, 100).map(({ id }) => id));
  });

  it('B3#4 (queue): an item answered "review" is first in its group\'s next queue, with its content and sentences', async () => {
    const me = await learner();
    const g = await group(me.userId, 'G');
    const ids = await senses(5);
    const items = await seed(me.userId, [g], ids, (i) => ({ level: 2, dueDate: addDays(today, -i) }));
    await ctx.prisma.$transaction((tx) => ctx.app.get(ContentService).addSentence(tx, {
      userId: me.userId, senseId: ids[1], text: 'I met this word at work.',
    }));
    const token = await me.token();
    // Most overdue first: items[4] leads before the answer.
    expect((await queue(token, g))[0].item_id).toBe(items[4]);
    await answer(token, items[1], g, 'review');
    const [first] = await queue(token, g);
    expect(first).toMatchObject({ item_id: items[1], level: 1, due_date: today, priority: true, section: 'priority' });
    expect(first.content).toMatchObject({ sense_id: ids[1], sentences: ['I met this word at work.'] });
  });

  it('priority answers never use the cap', async () => {
    await setCaps({ reviews_per_group_per_day: 2, new_per_group_per_day: 1 });
    const me = await learner();
    const g = await group(me.userId, 'G');
    const ids = await senses(8);
    const flagged = await seed(me.userId, [g], ids.slice(0, 3), () => ({ level: 1, dueDate: today, priority: true }));
    await seed(me.userId, [g], ids.slice(3, 6), () => ({ level: 2, dueDate: today }));
    await seed(me.userId, [g], ids.slice(6), () => ({ level: 0, dueDate: today }));
    const token = await me.token();
    for (const id of flagged) await answer(token, id, g);
    expect((await counts(token, g)).today).toEqual({ priority: 0, due: 2, new: 1 });
    expect((await queue(token, g)).map((c) => c.section)).toEqual(['due', 'due', 'new']);
  });

  it('B3E9: lowering the review cap mid-day applies on the next read and today\'s reviews still count', async () => {
    const me = await learner();
    const g = await group(me.userId, 'G');
    const items = await seed(me.userId, [g], await senses(12), (i) => ({ level: 2, dueDate: addDays(today, -i) }));
    const token = await me.token();
    for (const id of items.slice(0, 5)) await answer(token, id, g);
    expect((await counts(token, g)).today.due).toBe(7);
    await setCaps({ reviews_per_group_per_day: 4 });
    expect((await counts(token, g)).today.due).toBe(0);
    expect((await queue(token, g)).filter((c) => c.section === 'due')).toEqual([]);
    await setCaps({ reviews_per_group_per_day: 8 });
    expect((await counts(token, g)).today.due).toBe(3);
    expect((await queue(token, g)).filter((c) => c.section === 'due')).toHaveLength(3);
  });

  it('B3E10: a word in A and B answered in A counts for A only and is no longer due in B', async () => {
    await setCaps({ reviews_per_group_per_day: 1 });
    const me = await learner();
    const [a, b] = [await group(me.userId, 'A'), await group(me.userId, 'B')];
    const [x, y, z] = await senses(3);
    const [shared] = await seed(me.userId, [a, b], [x], () => ({ level: 2, dueDate: addDays(today, -5) }));
    await seed(me.userId, [a], [y], () => ({ level: 2, dueDate: today }));
    const [onlyB] = await seed(me.userId, [b], [z], () => ({ level: 2, dueDate: today }));
    const token = await me.token();
    await answer(token, shared, a);
    expect((await counts(token, a)).today.due).toBe(0);
    expect((await counts(token, b)).today.due).toBe(1);
    expect((await queue(token, b)).map((c) => c.item_id)).toEqual([onlyB]);
  });

  it('B3E8: 59 days overdue is due; level ≥ 1 at 61 days leaves the queue and counts as backlog', async () => {
    const me = await learner();
    const g = await group(me.userId, 'G');
    const [due59, due60, late61] = await seed(me.userId, [g], await senses(3), (i) => ({
      level: 3, dueDate: addDays(today, -[59, 60, 61][i]),
    }));
    const token = await me.token();
    expect(await counts(token, g)).toMatchObject({ total: 3, today: { priority: 0, due: 2, new: 0 }, backlog: 1 });
    expect((await queue(token, g)).map((c) => c.item_id)).toEqual([due60, due59]);
    expect((await queue(token, g, 'all')).map((c) => c.item_id).sort()).toEqual([due59, due60, late61].sort());
  });

  it('B3E35: 2,000 new words → 20 new per day, never backlog', async () => {
    const me = await learner();
    const g = await group(me.userId, 'Bulk');
    await seed(me.userId, [g], await senses(2000), () => ({ level: 0, dueDate: addDays(today, -200) }));
    const token = await me.token();
    const result = await counts(token, g);
    expect(result).toMatchObject({ total: 2000, today: { priority: 0, due: 0, new: 20 }, backlog: 0 });
    expect(result.cells[0]).toEqual({ level: 0, total: 2000, due: 2000 });
    expect((await queue(token, g)).filter((c) => c.section === 'new')).toHaveLength(20);
  });

  it('B3E21: a retired sense stays in the group list with sense_changed and is absent from queue and counts', async () => {
    const me = await learner();
    const g = await group(me.userId, 'G');
    const ids = await senses(3);
    const items = await seed(me.userId, [g], ids, () => ({ level: 2, dueDate: today }));
    expect((await ctx.app.get(ContentService).retire([ids[0]]))[0]).toMatchObject({ ok: true });
    const token = await me.token();
    expect(await counts(token, g)).toMatchObject({ total: 2, today: { due: 2 } });
    expect((await queue(token, g)).map((c) => c.item_id).sort()).toEqual(items.slice(1).sort());
    expect((await queue(token, g, 'all')).map((c) => c.item_id)).not.toContain(items[0]);
    const listed = await ctx.http().get(`/v1/groups/${g}/items`).set('Authorization', `Bearer ${token}`);
    expect(listed.body.items.find((item: { item_id: string }) => item.item_id === items[0])).toMatchObject({ sense_changed: true });
  });

  it('mode=all returns every other item exactly once and ignores caps', async () => {
    await setCaps({ reviews_per_group_per_day: 1, new_per_group_per_day: 1 });
    const me = await learner();
    const g = await group(me.userId, 'G');
    const ids = await senses(12);
    const items = [
      ...await seed(me.userId, [g], ids.slice(0, 4), () => ({ level: 0, dueDate: today })),
      ...await seed(me.userId, [g], ids.slice(4, 8), () => ({ level: 2, dueDate: addDays(today, -1) })),
      ...await seed(me.userId, [g], ids.slice(8, 10), () => ({ level: 4, dueDate: addDays(today, 9) })),
      ...await seed(me.userId, [g], ids.slice(10), () => ({ level: 1, dueDate: today, priority: true })),
    ];
    const other = await group(me.userId, 'Other');
    await seed(me.userId, [other], await senses(2), () => ({ level: 0, dueDate: today }));
    const token = await me.token();
    const cards = await queue(token, g, 'all');
    expect(cards.map((c) => c.item_id).sort()).toEqual([...items].sort());
    expect(new Set(cards.map((c) => c.item_id)).size).toBe(12);
    expect(cards.filter((c) => c.section === 'early')).toHaveLength(2);
    expect((await queue(token, g)).length).toBe(4);
  });

  it('caps reset at the learner\'s local midnight (FakeClock across Asia/Ho_Chi_Minh midnight)', async () => {
    await setCaps({ reviews_per_group_per_day: 2 });
    const me = await learner();
    const g = await group(me.userId, 'G');
    const items = await seed(me.userId, [g], await senses(5), (i) => ({ level: 3, dueDate: addDays(today, -1 - i) }));
    ctx.clock.set(new Date('2026-11-08T16:50:00Z')); // 23:50 local
    let token = await me.token();
    await answer(token, items[4], g);
    await answer(token, items[3], g);
    expect((await counts(token, g)).today.due).toBe(0);
    ctx.clock.set(new Date('2026-11-08T17:10:00Z')); // 00:10 local, 2026-11-09
    token = await me.token();
    expect((await counts(token, g)).today.due).toBe(2);
    expect((await queue(token, g)).map((c) => c.item_id)).toEqual([items[2], items[1]]);
  });

  it('GET /v1/groups orders groups with priority first, then by cards waiting, then by name, with cells per level', async () => {
    const me = await learner();
    const [quiet, busy, flagged, empty] = [
      await group(me.userId, 'Quiet'), await group(me.userId, 'Busy'), await group(me.userId, 'Flagged'), await group(me.userId, 'Empty'),
    ];
    await seed(me.userId, [quiet], await senses(1), () => ({ level: 2, dueDate: today }));
    await seed(me.userId, [busy], await senses(3), (i) => ({ level: i, dueDate: i === 2 ? addDays(today, 3) : today }));
    await seed(me.userId, [flagged], await senses(1), () => ({ level: 1, dueDate: today, priority: true }));
    const list = await groups(await me.token());
    expect(list.map(({ name }) => name)).toEqual(['Flagged', 'Busy', 'Quiet', 'Empty']);
    expect(list[1]).toEqual({
      id: busy, name: 'Busy', version: 0, total: 3, today: { priority: 0, due: 1, new: 1 }, backlog: 0,
      cells: [
        { level: 0, total: 1, due: 1 }, { level: 1, total: 1, due: 1 }, { level: 2, total: 1, due: 0 },
        { level: 3, total: 0, due: 0 }, { level: 4, total: 0, due: 0 }, { level: 5, total: 0, due: 0 },
      ],
    });
    expect(list[3]).toMatchObject({ id: empty, total: 0, today: { priority: 0, due: 0, new: 0 }, backlog: 0 });
  });

  it('cardsLeftToday returns the learners with at least one card left after caps', async () => {
    await setCaps({ reviews_per_group_per_day: 1 });
    const busy = await learner();
    const done = await learner();
    const idle = await learner();
    const gBusy = await group(busy.userId, 'G');
    await seed(busy.userId, [gBusy], await senses(1), () => ({ level: 2, dueDate: today }));
    const gDone = await group(done.userId, 'G');
    const [item] = await seed(done.userId, [gDone], await senses(2), () => ({ level: 2, dueDate: today }));
    await answer(await done.token(), item, gDone);
    const learning = ctx.app.get(LearningService);
    expect(await learning.cardsLeftToday([
      { userId: busy.userId, today }, { userId: done.userId, today }, { userId: idle.userId, today },
    ])).toEqual(new Set([busy.userId]));
    // Tomorrow the done learner's cap resets but the answered card is not due; the other one still is.
    expect(await learning.cardsLeftToday([{ userId: done.userId, today: addDays(today, 1) }])).toEqual(new Set([done.userId]));
    expect(await learning.cardsLeftToday([])).toEqual(new Set());
  });
  it('M2 (review probe P1): a level-0 item added in UTC+14 is still new after the learner moves to UTC−12; "known" lifts it to level 1 once and it leaves the queue', async () => {
    ctx.clock.set(new Date('2026-11-01T10:30:00Z')); // 2026-11-02 in Pacific/Kiritimati, 2026-10-31 in Etc/GMT+12
    const me = await learner();
    await ctx.prisma.user.update({ where: { id: me.userId }, data: { timezone: 'Pacific/Kiritimati' } });
    const g = await group(me.userId, 'G');
    const [senseId] = await senses(1);
    const added = await ctx.http().post(`/v1/groups/${g}/items`).set('Authorization', `Bearer ${await me.token()}`)
      .set('Idempotency-Key', randomUUID()).send({ sense_id: senseId });
    expect(added.body).toMatchObject({ level: 0, due_date: '2026-11-02' });
    await ctx.prisma.user.update({ where: { id: me.userId }, data: { timezone: 'Etc/GMT+12' } });
    const token = await me.token();
    expect((await queue(token, g)).map((c) => [c.section, c.level])).toEqual([['new', 0]]);
    expect(await answer(token, added.body.item_id, g)).toEqual({
      item_id: added.body.item_id, level: 1, due_date: '2026-11-01', priority: false, section: 'new',
    });
    expect(await queue(token, g)).toEqual([]);
    expect(await ctx.prisma.learningLogEntry.findMany({ where: { userId: me.userId, kind: 'review' } })).toEqual([
      expect.objectContaining({ section: 'new', wasDue: true, levelBefore: 0, levelAfter: 1, localDate: date('2026-10-31') }),
    ]);
    expect((await counts(token, g)).today).toEqual({ priority: 0, due: 0, new: 0 });
  });

  it('L2 (review probe P4): answering backlog words in mode=all is logged as backlog and never uses the review cap; their levels change as usual', async () => {
    await setCaps({ reviews_per_group_per_day: 10 });
    const me = await learner();
    const g = await group(me.userId, 'G');
    const ids = await senses(11);
    const backlog = await seed(me.userId, [g], ids.slice(0, 10), () => ({ level: 3, dueDate: '2026-08-30' }));
    const [due] = await seed(me.userId, [g], ids.slice(10), () => ({ level: 2, dueDate: today }));
    const token = await me.token();
    expect(await counts(token, g)).toMatchObject({ today: { due: 1 }, backlog: 10 });
    const all = await queue(token, g, 'all');
    expect(all.filter((c) => c.section === 'backlog').map((c) => c.item_id).sort()).toEqual([...backlog].sort());
    for (const id of backlog) expect((await answer(token, id, g)).section).toBe('backlog');
    expect(await ctx.prisma.learningItem.findMany({ where: { id: { in: backlog } } }))
      .toEqual(backlog.map(() => expect.objectContaining({ level: 4, dueDate: date(addDays(today, 14)) })));
    expect((await ctx.prisma.learningLogEntry.findMany({ where: { userId: me.userId } })).map((row) => row.section))
      .toEqual(Array(10).fill('backlog'));
    expect(await counts(token, g)).toMatchObject({ today: { due: 1 }, backlog: 0 });
    expect((await queue(token, g)).map((c) => c.item_id)).toEqual([due]);
  });

  it('T-C1: answering a new card lowers today.new by one; answering early uses no cap', async () => {
    await setCaps({ reviews_per_group_per_day: 10, new_per_group_per_day: 3 });
    const me = await learner();
    const g = await group(me.userId, 'G');
    const ids = await senses(6);
    const fresh = await seed(me.userId, [g], ids.slice(0, 5), () => ({ level: 0, dueDate: today }));
    const [early] = await seed(me.userId, [g], ids.slice(5), () => ({ level: 3, dueDate: addDays(today, 5) }));
    const token = await me.token();
    expect((await counts(token, g)).today).toEqual({ priority: 0, due: 0, new: 3 });
    expect((await answer(token, fresh[0], g)).section).toBe('new');
    expect((await counts(token, g)).today).toEqual({ priority: 0, due: 0, new: 2 });
    expect(await answer(token, early, g)).toMatchObject({ section: 'early', level: 3 });
    expect((await counts(token, g)).today).toEqual({ priority: 0, due: 0, new: 2 });
    expect((await queue(token, g)).filter((c) => c.section === 'new')).toHaveLength(2);
  });

  it('B4#26: cap null, 150 due → GET /v1/groups reports 150 due and the queue returns 150; cap back to 100 → 100', async () => {
    await setCaps({ reviews_per_group_per_day: null });
    const me = await learner();
    const g = await group(me.userId, 'G');
    const ids = await senses(150);
    const due = await seed(me.userId, [g], ids, (i) => ({ level: 1 + (i % 3), dueDate: addDays(today, -Math.floor(i / 3)) }));
    const token = await me.token();

    expect((await counts(token, g)).today).toEqual({ priority: 0, due: 150, new: 0 });
    const cards = await queue(token, g);
    expect(cards.map((c) => c.item_id).sort()).toEqual([...due].sort());
    expect(cards.every((c) => c.section === 'due')).toBe(true);
    expect([...await ctx.app.get(LearningService).cardsLeftToday([{ userId: me.userId, today }])]).toEqual([me.userId]);

    await setCaps({ reviews_per_group_per_day: 100 });
    expect((await counts(token, g)).today).toEqual({ priority: 0, due: 100, new: 0 });
    expect(await queue(token, g)).toHaveLength(100);
  });

  it('B4E44: with cap null the new-word cap of 20 still applies and practiceItems(today) holds every due word', async () => {
    await setCaps({ reviews_per_group_per_day: null });
    const me = await learner();
    const g = await group(me.userId, 'G');
    const ids = await senses(140);
    const due = await seed(me.userId, [g], ids.slice(0, 110), () => ({ level: 2, dueDate: addDays(today, -1) }));
    const fresh = await seed(me.userId, [g], ids.slice(110), () => ({ level: 0, dueDate: today }));
    const token = await me.token();
    // 100 flashcard reviews today would have used the default cap.
    await ctx.prisma.learningLogEntry.createMany({ data: Array.from({ length: 100 }, () => ({
      userId: me.userId, itemId: due[0], senseId: ids[0], groupId: g, kind: 'review', answer: 'known', section: 'due',
      localDate: date(today), at: now,
    })) });

    expect((await counts(token, g)).today).toEqual({ priority: 0, due: 110, new: 20 });
    expect(await queue(token, g)).toHaveLength(130);
    const today_ = await ctx.app.get(LearningService).practiceItems(me.userId, { kind: 'today' });
    expect(today_.map(({ item_id }) => item_id).sort()).toEqual([...due, ...fresh.slice(0, 20)].sort());
  });

  it('T-C4: the queue and backlog of another learner\'s group → 404', async () => {
    const owner = await learner();
    const g = await group(owner.userId, 'Mine');
    await seed(owner.userId, [g], await senses(1), () => ({ level: 2, dueDate: today }));
    const stranger = await learner();
    const token = await stranger.token();
    for (const path of [`/v1/groups/${g}/queue`, `/v1/groups/${g}/queue?mode=all`, `/v1/groups/${g}/backlog`, `/v1/groups/${randomUUID()}/queue`]) {
      const response = await ctx.http().get(path).set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(404);
      expect(response.body.type).toBe('https://api.example.com/problems/not-found');
    }
  });
  it('L1 / D48 (review probe P2): a priority word overdue by more than 60 days leaves the priority section for the backlog; relearn clears the flag', async () => {
    const me = await learner();
    const g = await group(me.userId, 'G');
    const ids = await senses(2);
    const [stale] = await seed(me.userId, [g], ids.slice(0, 1), () => ({ level: 1, dueDate: '2026-09-01', priority: true }));
    const [fresh] = await seed(me.userId, [g], ids.slice(1), () => ({ level: 1, dueDate: addDays(today, -60), priority: true }));
    const token = await me.token();
    expect(await counts(token, g)).toMatchObject({ today: { priority: 1, due: 0, new: 0 }, backlog: 1 });
    expect((await queue(token, g)).map((c) => [c.item_id, c.section])).toEqual([[fresh, 'priority']]);
    const backlog = await ctx.http().get(`/v1/groups/${g}/backlog`).set('Authorization', `Bearer ${token}`);
    expect(backlog.body.items.map((item: { item_id: string }) => item.item_id)).toEqual([stale]);
    expect((await queue(token, g, 'all')).find((c) => c.item_id === stale)).toMatchObject({ section: 'backlog' });
    // The fresh priority word still counts as a card left today.
    expect(await ctx.app.get(LearningService).cardsLeftToday([{ userId: me.userId, today }])).toEqual(new Set([me.userId]));
    const relearned = await ctx.http().post('/v1/items/relearn').set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID()).send({ item_ids: [stale] });
    expect(relearned.body).toEqual({ relearned: 1 });
    expect(await ctx.prisma.learningItem.findUnique({ where: { id: stale } }))
      .toMatchObject({ level: 0, dueDate: date(today), priority: false });
    expect(await counts(token, g)).toMatchObject({ today: { priority: 1, due: 0, new: 1 }, backlog: 0 });
  });

  it('L1 / D48: a learner whose only card is a stale priority word has no card left today', async () => {
    const me = await learner();
    const g = await group(me.userId, 'G');
    await seed(me.userId, [g], await senses(1), () => ({ level: 1, dueDate: '2026-09-01', priority: true }));
    expect(await ctx.app.get(LearningService).cardsLeftToday([{ userId: me.userId, today }])).toEqual(new Set());
    expect((await counts(await me.token(), g)).today).toEqual({ priority: 0, due: 0, new: 0 });
  });
});
