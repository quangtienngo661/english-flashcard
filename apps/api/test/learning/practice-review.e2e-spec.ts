import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays } from '../../src/common/time/local-date.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { LearningService, PRIVATE_SENSES_CLEANUP, type PrivateSensesCleanup } from '../../src/learning/index.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedVisibleSenses } from '../support/seed-senses.js';
import { testConfig } from '../support/test-config.js';

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const today = '2026-11-08';
// 10:00 on 2026-11-08 in Asia/Ho_Chi_Minh (the seeded learners' zone).
const now = new Date('2026-11-08T03:00:00Z');
type State = { level: number; dueDate: string; priority?: boolean };
type Input = { senseId: string; action: 'known' | 'review'; reviewId: string };

describe('practice review write and the private-senses cleanup port (e2e, isolated database)', () => {
  let ctx: TestApp;
  let plain: TestApp;
  let learning: LearningService;
  let senseCounter = 0;
  const port = { deleteForSenses: vi.fn<PrivateSensesCleanup['deleteForSenses']>() };

  const senses = (count: number) => seedVisibleSenses(ctx.prisma, count, `r${(senseCounter += 1)}`);
  const learner = async (app: TestApp = ctx) => {
    const { userId } = await seedUser(app.prisma, { verified: true, nativeLanguage: 'vi' });
    const token = (await startSession(app, userId)).accessToken;
    const group = async (name: string) => (await app.prisma.learningGroup.create({
      data: { userId, name, nameKey: name.toLowerCase(), createdAt: now, updatedAt: now },
    })).id;
    return { userId, token, group };
  };
  const seed = async (userId: string, groupId: string, senseIds: string[], state: (index: number) => State) => {
    const items = senseIds.map((senseId, index) => {
      const { level, dueDate, priority } = state(index);
      return { id: randomUUID(), userId, senseId, level, dueDate: date(dueDate), priority: priority ?? false, createdAt: now };
    });
    await ctx.prisma.learningItem.createMany({ data: items });
    await ctx.prisma.groupItem.createMany({ data: items.map((item, index) => ({
      groupId, itemId: item.id, addedAt: new Date(now.getTime() - 86_400_000 + index * 1000),
    })) });
    return items.map(({ id }) => id);
  };
  const review = (userId: string, inputs: Input[]) =>
    ctx.prisma.$transaction((tx) => learning.practiceReview(tx, userId, inputs), transactionOptions);
  const one = (senseId: string, action: Input['action'], reviewId = randomUUID()) => ({ senseId, action, reviewId });
  const logOf = (userId: string) => ctx.prisma.learningLogEntry.findMany({ where: { userId, kind: 'review' } });
  const groupsToday = async (token: string) => {
    const response = await ctx.http().get('/v1/groups').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    return Object.fromEntries((response.body.items as Array<{ id: string; today: object }>).map((g) => [g.id, g.today]));
  };
  const quickAdd = (app: TestApp, token: string, body: object) => app.http().post('/v1/quick-add')
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID()).send(body);
  const deleteWord = (app: TestApp, token: string, entryId: string) => app.http().delete(`/v1/my-words/${entryId}`)
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID());
  /** A private word in two groups with a sentence and a flashcard review: everything deleteMyWord removes. */
  const privateWord = async (app: TestApp) => {
    const me = await learner(app);
    const [a, b] = [await me.group('A'), await me.group('B')];
    const added = await quickAdd(app, me.token, { group_id: a, new_word: { lemma: 'yeet', meaning: 'ném' }, sentence: 'Yeet!' });
    expect(added.status).toBe(201);
    expect((await quickAdd(app, me.token, { group_id: b, sense_id: added.body.sense_id })).status).toBe(201);
    const answered = await app.http().post('/v1/reviews').set('Authorization', `Bearer ${me.token}`)
      .send({ item_id: added.body.item_id, group_id: a, answer: 'known', review_id: randomUUID() });
    expect(answered.status).toBe(200);
    const entry = await app.prisma.entry.findFirstOrThrow({ where: { scope: 'private', ownerUserId: me.userId } });
    return { me, entryId: entry.id, senseId: added.body.sense_id as string };
  };
  const stored = async (app: TestApp, userId: string) => ({
    entries: await app.prisma.entry.count({ where: { scope: 'private', ownerUserId: userId } }),
    items: await app.prisma.learningItem.count({ where: { userId } }),
    links: await app.prisma.groupItem.count({ where: { item: { userId } } }),
    sentences: await app.prisma.contextSentence.count({ where: { userId } }),
    log: await app.prisma.learningLogEntry.count({ where: { userId } }),
  });

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    const databaseUrl = await createIsolatedDatabase();
    ctx = await createTestApp({ databaseUrl, config, providers: [{ provide: PRIVATE_SENSES_CLEANUP, useValue: port }] });
    plain = await createTestApp({ databaseUrl, config });
    learning = ctx.app.get(LearningService);
  });
  beforeEach(async () => {
    port.deleteForSenses.mockReset();
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await ctx.prisma.contextSentence.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.appSettingChange.deleteMany();
    await ctx.prisma.appSetting.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(now);
    plain.clock.set(now);
  });
  afterAll(async () => {
    await plain?.close();
    await ctx?.close();
  });

  it('B4#9 (Learning side): known on a due item → level +1, due by the ladder, priority off; the log row has origin practice and group_id null', async () => {
    const me = await learner();
    const g = await me.group('A');
    const s = await senses(1);
    const [item] = await seed(me.userId, g, s, () => ({ level: 2, dueDate: addDays(today, -1), priority: true }));
    const reviewId = randomUUID();

    expect(await review(me.userId, [one(s[0], 'known', reviewId)])).toEqual([{
      senseId: s[0], outcome: 'applied', item_id: item, level: 3, due_date: addDays(today, 7), priority: false,
    }]);
    expect(await ctx.prisma.learningItem.findUniqueOrThrow({ where: { id: item } })).toMatchObject({
      level: 3, dueDate: date(addDays(today, 7)), priority: false, lastReviewedAt: now,
    });
    expect(await logOf(me.userId)).toEqual([expect.objectContaining({
      itemId: item, senseId: s[0], groupId: null, origin: 'practice', answer: 'known', rating: 'Good', levelBefore: 2,
      levelAfter: 3, wasDue: true, reviewId, section: 'priority', localDate: date(today), at: now,
    })]);
  });

  it('review → level 1, due today, priority on', async () => {
    const me = await learner();
    const g = await me.group('A');
    const s = await senses(1);
    const [item] = await seed(me.userId, g, s, () => ({ level: 4, dueDate: addDays(today, 10) }));

    expect(await review(me.userId, [one(s[0], 'review')])).toEqual([{
      senseId: s[0], outcome: 'applied', item_id: item, level: 1, due_date: today, priority: true,
    }]);
    expect(await logOf(me.userId)).toEqual([expect.objectContaining({
      answer: 'review', rating: 'Again', levelBefore: 4, levelAfter: 1, origin: 'practice', groupId: null, section: 'early',
    })]);
  });

  it('B4E9: known on an early item → known-not-allowed and no log row', async () => {
    const me = await learner();
    const g = await me.group('A');
    const s = await senses(1);
    const [item] = await seed(me.userId, g, s, () => ({ level: 2, dueDate: addDays(today, 1) }));

    expect(await review(me.userId, [one(s[0], 'known')])).toEqual([{ senseId: s[0], outcome: 'known-not-allowed' }]);
    expect(await logOf(me.userId)).toEqual([]);
    expect(await ctx.prisma.learningItem.findUniqueOrThrow({ where: { id: item } }))
      .toMatchObject({ level: 2, dueDate: date(addDays(today, 1)), lastReviewedAt: null });
  });

  it('the same review_id twice → one log row, the same result', async () => {
    const me = await learner();
    const g = await me.group('A');
    const s = await senses(1);
    await seed(me.userId, g, s, () => ({ level: 1, dueDate: today }));
    const input = one(s[0], 'known');

    const first = await review(me.userId, [input]);
    const [again, concurrent] = await Promise.all([review(me.userId, [input]), review(me.userId, [input])]);
    expect(again).toEqual(first);
    expect(concurrent).toEqual(first);
    expect(await logOf(me.userId)).toHaveLength(1);
    expect(await ctx.prisma.learningItem.findFirstOrThrow({ where: { userId: me.userId } })).toMatchObject({ level: 2 });
  });

  it('a sense not in learning → not-in-learning', async () => {
    const [me, other] = [await learner(), await learner()];
    const s = await senses(2);
    // Another learner's item of s[1] is not the caller's.
    await seed(other.userId, await other.group('A'), s.slice(1), () => ({ level: 1, dueDate: today }));

    expect(await review(me.userId, [one(s[0], 'review'), one(s[1], 'known')])).toEqual([
      { senseId: s[0], outcome: 'not-in-learning' }, { senseId: s[1], outcome: 'not-in-learning' },
    ]);
    expect(await ctx.prisma.learningLogEntry.count()).toBe(0);
  });

  it('three inputs lock their items in id order and return three outcomes', async () => {
    const me = await learner();
    const g = await me.group('A');
    const s = await senses(4);
    const [due, early] = await seed(me.userId, g, s.slice(0, 2), (i) => ({ level: 1, dueDate: addDays(today, i) }));
    const inputs = [one(s[0], 'known'), one(s[1], 'known'), one(s[3], 'review')];

    expect(await review(me.userId, inputs)).toEqual([
      { senseId: s[0], outcome: 'applied', item_id: due, level: 2, due_date: addDays(today, 3), priority: false },
      { senseId: s[1], outcome: 'known-not-allowed' },
      { senseId: s[3], outcome: 'not-in-learning' },
    ]);
    // Opposite input orders at the same moment: both lock in id order, so one waits for the other instead of deadlocking.
    const items = await seed(me.userId, g, s.slice(2, 3), () => ({ level: 1, dueDate: today }));
    const forward = [s[0], s[1], s[2]].map((senseId) => one(senseId, 'review'));
    const backward = [s[2], s[1], s[0]].map((senseId) => one(senseId, 'review'));
    const results = await Promise.all([review(me.userId, forward), review(me.userId, backward)]);
    expect(results.flat().every(({ outcome }) => outcome === 'applied')).toBe(true);
    expect(await ctx.prisma.learningLogEntry.count({ where: { itemId: { in: [due, early, ...items] } } })).toBe(7);
  });

  it('D35 / B4#27: after 100 due reviews in the group, five practice "known" writes leave GET /v1/groups\' cap counts unchanged', async () => {
    const me = await learner();
    const [full, half] = [await me.group('Full'), await me.group('Half')];
    const s = await senses(220);
    const fullItems = await seed(me.userId, full, s.slice(0, 110), () => ({ level: 2, dueDate: addDays(today, -1) }));
    const halfItems = await seed(me.userId, half, s.slice(110), () => ({ level: 2, dueDate: addDays(today, -1) }));
    const flashcards = (groupId: string, itemId: string, senseId: string, count: number) => ctx.prisma.learningLogEntry.createMany({
      data: Array.from({ length: count }, () => ({
        userId: me.userId, itemId, senseId, groupId, kind: 'review', answer: 'known', section: 'due', localDate: date(today), at: now,
      })),
    });
    await flashcards(full, fullItems[0], s[0], 100);
    await flashcards(half, halfItems[0], s[110], 60);
    const before = await groupsToday(me.token);
    expect(before).toMatchObject({ [full]: { due: 0 }, [half]: { due: 40 } });

    const results = await review(me.userId, [...s.slice(105, 110), ...s.slice(215, 220)].map((senseId) => one(senseId, 'known')));
    expect(results.every((r) => r.outcome === 'applied' && r.level === 3)).toBe(true);
    expect(await groupsToday(me.token)).toEqual(before);
    expect(await ctx.prisma.learningLogEntry.count({ where: { userId: me.userId, groupId: { not: null } } })).toBe(160);
    expect(await ctx.prisma.learningLogEntry.count({ where: { userId: me.userId, groupId: null, origin: 'practice' } })).toBe(10);
  });

  it('with a recording port supplied through createTestApp\'s providers option, deleteMyWord calls it with the deleted sense ids before the items are gone', async () => {
    const { me, entryId, senseId } = await privateWord(ctx);
    const seen: Array<{ userId: string; senseIds: string[]; items: number; log: number }> = [];
    port.deleteForSenses.mockImplementation(async (tx: Prisma.TransactionClient, userId: string, senseIds: string[]) => {
      seen.push({
        userId, senseIds,
        items: await tx.learningItem.count({ where: { userId, senseId: { in: senseIds } } }),
        log: await tx.learningLogEntry.count({ where: { userId, senseId: { in: senseIds } } }),
      });
    });

    expect((await deleteWord(ctx, me.token, entryId)).status).toBe(204);
    expect(seen).toEqual([{ userId: me.userId, senseIds: [senseId], items: 1, log: 2 }]);
    expect(await stored(ctx, me.userId)).toEqual({ entries: 0, items: 0, links: 0, sentences: 0, log: 0 });
  });

  it('a port that throws rolls the whole delete back (entry, items and log still there)', async () => {
    const { me, entryId } = await privateWord(ctx);
    const before = await stored(ctx, me.userId);
    port.deleteForSenses.mockRejectedValue(new Error('practice cleanup failed'));

    expect((await deleteWord(ctx, me.token, entryId)).status).toBe(500);
    expect(await stored(ctx, me.userId)).toEqual(before);
    expect(before).toEqual({ entries: 1, items: 1, links: 2, sentences: 1, log: 2 });
  });

  it('without a provider deleteMyWord works as before', async () => {
    const { me, entryId } = await privateWord(plain);

    expect((await deleteWord(plain, me.token, entryId)).status).toBe(204);
    expect(await stored(plain, me.userId)).toEqual({ entries: 0, items: 0, links: 0, sentences: 0, log: 0 });
    expect(port.deleteForSenses).not.toHaveBeenCalled();
  });
});
