import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EntitlementsService } from '../../src/entitlements/index.js';
import { SettingsService } from '../../src/settings/index.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import {
  finalizeItem, nextItem, practiceRequest, seedPracticeGroup, seedPracticeLearner, startPractice,
} from '../support/practice-helpers.js';
import { resetCatalog } from '../support/reset-catalog.js';

const now = new Date('2026-11-08T03:00:00Z');
const hours = (h: number) => new Date(now.getTime() + h * 3_600_000);
const typing = ['type_word'];

type ItemBody = { item_id: string; round: number; position: number; type: string };

describe('practice sessions (e2e, isolated database)', () => {
  let ctx: TestApp;
  let lemmaCounter = 0;
  const entitlement = { allowed: true, calls: 0 };
  const lemmas = (count: number, prefix = 'w') => Array.from({ length: count }, () => `${prefix}${(lemmaCounter += 1)}`);

  const start = async (userId: string, body: object) => {
    const response = await startPractice(ctx, userId, body);
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body.session as { id: string; target_count: number; words: number; status: string; asked: number };
  };
  const next = async (userId: string, sessionId: string) => {
    const response = await nextItem(ctx, userId, sessionId);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return response.body as { state: string; item?: ItemBody; notice?: string; session: { status: string; asked: number; round: number } };
  };
  /** Asks and finalizes one item; returns its sense id and type. */
  const askAndFinalize = async (userId: string, sessionId: string, result: 'correct' | 'wrong' = 'correct') => {
    const body = await next(userId, sessionId);
    expect(body.state).toBe('question');
    const row = await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: body.item!.item_id } });
    await finalizeItem(ctx.prisma, row.id, result, { at: ctx.clock.now() });
    return { senseId: row.senseId, type: body.item!.type, position: body.item!.position, round: body.item!.round };
  };
  const status = async (sessionId: string) => (await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: sessionId } })).status;
  const setPractice = async (values: Record<string, number | null>) => {
    const settings = ctx.app.get(SettingsService);
    const { version } = await settings.current();
    await settings.update(randomUUID(), version, { practice: values });
  };

  beforeAll(async () => {
    ctx = await createTestApp({
      databaseUrl: await createIsolatedDatabase(),
      providers: [{ provide: EntitlementsService, useValue: {
        check: async () => { entitlement.calls += 1; return { allowed: entitlement.allowed }; },
      } }],
    });
  });
  beforeEach(async () => {
    await ctx.prisma.practiceReport.deleteMany();
    await ctx.prisma.practiceSession.deleteMany();
    await ctx.prisma.practiceQuestion.deleteMany();
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.appSettingChange.deleteMany();
    await ctx.prisma.appSetting.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    ctx.clock.set(now);
    entitlement.allowed = true;
    entitlement.calls = 0;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B4#1: group of 30, 10 questions, level_asc → 10 distinct lowest-level words', async () => {
    const words = lemmas(30);
    const level = (lemma: string) => words.indexOf(lemma) % 6;
    const { userId, groupIds, senses } = await seedPracticeLearner(ctx.prisma, { G: words }, (l) => ({ level: level(l) }));
    const session = await start(userId, { source: 'group', group_id: groupIds.G, sort: 'level_asc', types: typing, count: 10 });
    expect(session).toMatchObject({ target_count: 10, words: 10, status: 'active', asked: 0 });
    const asked: string[] = [];
    for (let i = 0; i < 10; i++) asked.push((await askAndFinalize(userId, session.id)).senseId);
    const lowest = words.filter((l) => level(l) <= 1).map((l) => senses[l]);
    expect(new Set(asked).size).toBe(10);
    expect([...asked].sort()).toEqual([...lowest].sort());
    expect(await next(userId, session.id)).toMatchObject({ state: 'finished', session: { status: 'finished', asked: 10 } });
  });

  it('B4#2: group of 2, 10 questions → waiting_continue after 2 finalized items; continue true → items 3–10 alternate, no two in a row the same word, the next round changes type when it can; continue false → finished with 2', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(2) });
    const types = ['true_false_definition', 'type_word'];
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types, count: 10 });
    const asked = [await askAndFinalize(userId, session.id), await askAndFinalize(userId, session.id)];
    expect(await next(userId, session.id)).toMatchObject({ state: 'waiting_continue', session: { status: 'waiting_continue' } });
    const go = await practiceRequest(ctx, userId, 'post', `/sessions/${session.id}/continue`, { continue: true });
    expect(go.status).toBe(200);
    expect(go.body.session.status).toBe('active');
    for (let i = 0; i < 8; i++) asked.push(await askAndFinalize(userId, session.id));
    expect(asked.map((a) => a.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(asked.map((a) => a.round)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    for (let i = 1; i < asked.length; i++) expect(asked[i].senseId).not.toBe(asked[i - 1].senseId);
    // Each word alternates between the two types it can take.
    for (const senseId of new Set(asked.map((a) => a.senseId))) {
      const its = asked.filter((a) => a.senseId === senseId).map((a) => a.type);
      for (let i = 1; i < its.length; i++) expect(its[i]).not.toBe(its[i - 1]);
    }
    expect(await next(userId, session.id)).toMatchObject({ state: 'finished', session: { asked: 10 } });

    const other = await start(userId, { source: 'group', group_id: groupIds.G, types, count: 10 });
    await askAndFinalize(userId, other.id);
    await askAndFinalize(userId, other.id);
    expect((await next(userId, other.id)).state).toBe('waiting_continue');
    const stop = await practiceRequest(ctx, userId, 'post', `/sessions/${other.id}/continue`, { continue: false });
    expect(stop.body.session).toMatchObject({ status: 'finished', asked: 2 });
    expect(await status(other.id)).toBe('finished');
  });

  it('end rule: target 3 → finished right after the third final result; a void item is made up by another word (round 2: sense_ids never exceed the target)', async () => {
    const words = lemmas(5);
    const { userId, groupIds, senses } = await seedPracticeLearner(ctx.prisma, { G: words });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, sort: 'queue', types: typing, count: 3 });
    await askAndFinalize(userId, session.id);
    const second = await next(userId, session.id);
    const secondSense = (await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: second.item!.item_id } })).senseId;
    await ctx.prisma.sense.update({ where: { id: secondSense }, data: { state: 'retired' } });
    const made = await next(userId, session.id);
    expect(made).toMatchObject({ state: 'question', notice: 'word-not-found', item: { position: 3 } });
    expect(await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: second.item!.item_id } }))
      .toMatchObject({ result: 'void' });
    await finalizeItem(ctx.prisma, made.item!.item_id, 'wrong');
    expect((await next(userId, session.id)).state).toBe('waiting_continue');
    await practiceRequest(ctx, userId, 'post', `/sessions/${session.id}/continue`, { continue: true });
    expect((await askAndFinalize(userId, session.id)).round).toBe(2);
    expect(await next(userId, session.id)).toMatchObject({ state: 'finished', session: { status: 'finished', asked: 3 } });
    expect(Object.values(senses)).toContain(secondSense);
  });

  it('a group of exactly target_count words with one voided in round 1 → waiting_continue', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing, count: 3 });
    const first = await next(userId, session.id);
    const sense = (await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: first.item!.item_id } })).senseId;
    await ctx.prisma.sense.update({ where: { id: sense }, data: { state: 'retired' } });
    const second = await next(userId, session.id);
    expect(second.notice).toBe('word-not-found');
    await finalizeItem(ctx.prisma, second.item!.item_id, 'correct');
    await askAndFinalize(userId, session.id);
    expect(await next(userId, session.id)).toMatchObject({ state: 'waiting_continue', session: { asked: 2 } });
  });

  it('B4#20 / B4E5: a new session abandons the open one; the old device\'s next → 409 session-closed', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const old = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    await next(userId, old.id);
    const fresh = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    expect(await status(old.id)).toBe('abandoned');
    expect(await status(fresh.id)).toBe('active');
    const response = await nextItem(ctx, userId, old.id);
    expect(response.status).toBe(409);
    expect(response.body.type).toMatch(/session-closed$/);
  });

  it('B4#21: current after a reload returns the open session and the pending item; B4#4: next\'s payload has neither answer_key nor hint text', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(4) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: ['mcq_definition', 'type_word'] });
    const body = await next(userId, session.id);
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/answer_key|correct_index|accepted|is_true|first_letter|"text"/);
    expect(body.item).toMatchObject({ hint_level: 0, state: 'unanswered', tries: 0, reportable: true });
    const current = await practiceRequest(ctx, userId, 'get', '/sessions/current');
    expect(current.status).toBe(200);
    expect(current.body.session.id).toBe(session.id);
    expect(current.body.item).toEqual(body.item);
    expect(current.body.notice).toBeUndefined();
    // Another next returns the same pending item.
    expect((await next(userId, session.id)).item).toEqual(body.item);
  });

  it('B4E1: two concurrent next → one item at that position, both responses equal', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(4) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    const [a, b] = await Promise.all([nextItem(ctx, userId, session.id), nextItem(ctx, userId, session.id)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.body.item).toEqual(b.body.item);
    expect(await ctx.prisma.practiceSessionItem.count({ where: { sessionId: session.id } })).toBe(1);
  });

  it('B4E14: today after all of today\'s cards → 409 practice-no-words source-empty, the open session unchanged (B4E30)', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) }, () => ({ level: 2, dueDate: '2026-11-20' }));
    const open = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    const response = await startPractice(ctx, userId, { source: 'today', types: typing });
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ reason: 'source-empty' });
    expect(response.body.type).toMatch(/practice-no-words$/);
    expect(await status(open.id)).toBe('active');
    expect(await ctx.prisma.practiceSession.count({ where: { userId } })).toBe(1);
  });

  it('group-empty: a group with nothing visible → 409 practice-no-words group-empty', async () => {
    const { userId, groupIds, senses } = await seedPracticeLearner(ctx.prisma, { G: lemmas(2) });
    await ctx.prisma.sense.updateMany({ where: { id: { in: Object.values(senses) } }, data: { state: 'retired' } });
    const response = await startPractice(ctx, userId, { source: 'group', group_id: groupIds.G, types: typing });
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ reason: 'group-empty' });
  });

  it('B4E15 / B4E16: only multiple choice and every group under 4 words → no-word-fits-types; a word lacking distractors is skipped for the next', async () => {
    const { userId, groupIds, senses } = await seedPracticeLearner(ctx.prisma, { A: lemmas(3), B: lemmas(2) });
    const refused = await startPractice(ctx, userId, { source: 'all', types: ['mcq_definition'] });
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ reason: 'no-word-fits-types' });
    // A fourth word in A gives A's words multiple choice; B's words are skipped.
    const extra = lemmas(1);
    const more = await seedPracticeLearner(ctx.prisma, { X: extra });
    await seedPracticeGroup(ctx.prisma, userId, 'A2', [...Object.values(senses).slice(0, 3), more.senses[extra[0]]]);
    const session = await start(userId, { source: 'group', group_id: groupIds.A, types: ['mcq_definition'], count: 5 });
    expect(session.words).toBe(3);
    const b = await startPractice(ctx, userId, { source: 'group', group_id: groupIds.B, types: ['mcq_definition'] });
    expect(b.body).toMatchObject({ reason: 'no-word-fits-types' });
  });

  it('B4E18: lowering max_questions_per_session keeps an open session\'s target', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(20) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing, count: 20 });
    await setPractice({ max_questions_per_session: 5, default_questions_per_session: 5 });
    for (let i = 0; i < 6; i++) await askAndFinalize(userId, session.id);
    expect((await next(userId, session.id)).session).toMatchObject({ status: 'active' });
    expect((await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: session.id } })).targetCount).toBe(20);
    const tooMany = await startPractice(ctx, userId, { source: 'group', group_id: groupIds.G, types: typing, count: 6 });
    expect(tooMany.status).toBe(400);
  });

  it('B4E22: next while waiting_continue returns waiting_continue and creates nothing', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(1) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing, count: 5 });
    await askAndFinalize(userId, session.id);
    expect((await next(userId, session.id)).state).toBe('waiting_continue');
    expect((await next(userId, session.id)).state).toBe('waiting_continue');
    expect(await ctx.prisma.practiceSessionItem.count({ where: { sessionId: session.id } })).toBe(1);
  });

  it('B4E6: a sense retired after next: reload (current) → void + word-not-found + the next item in the same reply; the void item is not in asked', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    const first = await next(userId, session.id);
    const sense = (await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: first.item!.item_id } })).senseId;
    await ctx.prisma.sense.update({ where: { id: sense }, data: { state: 'retired' } });
    const current = await practiceRequest(ctx, userId, 'get', '/sessions/current');
    expect(current.status).toBe(200);
    expect(current.body).toMatchObject({ notice: 'word-not-found', item: { position: 2 }, session: { asked: 1 } });
    expect((await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: first.item!.item_id } })).result).toBe('void');
  });

  it('B4E7, B4E32: removed from learning, removed from the group → same', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(4) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    const first = await next(userId, session.id);
    const firstSense = (await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: first.item!.item_id } })).senseId;
    await ctx.prisma.learningItem.deleteMany({ where: { userId, senseId: firstSense } });
    const second = await next(userId, session.id);
    expect(second).toMatchObject({ state: 'question', notice: 'word-not-found', item: { position: 2 } });

    const secondSense = (await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: second.item!.item_id } })).senseId;
    const item = await ctx.prisma.learningItem.findFirstOrThrow({ where: { userId, senseId: secondSense } });
    // Still in learning through another group, but no longer in this one.
    await seedPracticeGroup(ctx.prisma, userId, 'Other', [secondSense]);
    await ctx.prisma.groupItem.delete({ where: { groupId_itemId: { groupId: groupIds.G, itemId: item.id } } });
    const third = await next(userId, session.id);
    expect(third).toMatchObject({ state: 'question', notice: 'word-not-found', item: { position: 3 } });
  });

  it('B4E8 (mechanism): pending_notice set by SQL → next carries word-not-found once and clears it', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    await ctx.prisma.practiceSession.update({ where: { id: session.id }, data: { pendingNotice: 'word-not-found' } });
    const first = await next(userId, session.id);
    expect(first).toMatchObject({ state: 'question', notice: 'word-not-found' });
    expect((await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: session.id } })).pendingNotice).toBeNull();
    expect((await next(userId, session.id)).notice).toBeUndefined();
  });

  it('B4E8b: group deleted → finished + group-not-found', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    const first = await next(userId, session.id);
    await ctx.prisma.learningGroup.delete({ where: { id: groupIds.G } });
    expect(await next(userId, session.id)).toMatchObject({ state: 'finished', notice: 'group-not-found', session: { status: 'finished' } });
    expect((await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: first.item!.item_id } })).result).toBe('void');
  });

  it('B4E31: every word gone → finished', async () => {
    const { userId, groupIds, senses } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    await askAndFinalize(userId, session.id);
    await ctx.prisma.sense.updateMany({ where: { id: { in: Object.values(senses) } }, data: { state: 'retired' } });
    expect(await next(userId, session.id)).toMatchObject({ state: 'finished', session: { status: 'finished', asked: 1 } });
  });

  it('B4E33: in an "all" session, deleting a group drops its only-there words (as B4E7) and keeps a word still in another group, whose next multiple choice takes candidates from the remaining groups', async () => {
    const [shared, ...onlyA] = lemmas(4, 'a');
    const onlyB = lemmas(3, 'b');
    const { userId, groupIds, senses } = await seedPracticeLearner(ctx.prisma, { A: [shared, ...onlyA], B: [shared, ...onlyB] });
    const session = await start(userId, { source: 'all', types: ['mcq_definition'], count: 7 });
    expect(session.words).toBe(7);
    await ctx.prisma.learningItem.deleteMany({ where: { userId, senseId: { in: onlyA.map((l) => senses[l]) } } });
    await ctx.prisma.learningGroup.delete({ where: { id: groupIds.A } });
    const asked: string[] = [];
    for (;;) {
      const body = await next(userId, session.id);
      if (body.state !== 'question') break;
      const item = await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: body.item!.item_id }, include: { question: true } });
      asked.push(item.senseId);
      if (item.senseId === senses[shared]) {
        for (const id of item.question.distractorSenseIds) expect(onlyB.map((l) => senses[l])).toContain(id);
      }
      await finalizeItem(ctx.prisma, item.id, 'correct');
    }
    expect([...asked].sort()).toEqual([shared, ...onlyB].map((l) => senses[l]).sort());
  });

  it('weak source: two weak words start a session ordered level_asc; a word with an open report on its second wrong attempt is not weak', async () => {
    const [low, high, reported, fine] = lemmas(4);
    const level: Record<string, number> = { [low]: 1, [high]: 3, [reported]: 0, [fine]: 0 };
    const { userId, groupIds, senses } = await seedPracticeLearner(ctx.prisma, { G: [high, low, reported, fine] }, (l) => ({ level: level[l] }));
    const warm = await start(userId, { source: 'group', group_id: groupIds.G, types: typing, count: 20 });
    // Two wrong attempts for high, low and reported; reported's second is under an open report.
    const results: Record<string, Array<'correct' | 'wrong'>> = { [low]: ['wrong', 'wrong'], [high]: ['wrong', 'wrong'], [reported]: ['wrong', 'wrong'], [fine]: ['correct', 'correct'] };
    const items: Record<string, string[]> = {};
    for (let i = 0; i < 8; i++) {
      const body = await next(userId, warm.id);
      if (body.state === 'waiting_continue') {
        await practiceRequest(ctx, userId, 'post', `/sessions/${warm.id}/continue`, { continue: true });
        i -= 1;
        continue;
      }
      const row = await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: body.item!.item_id } });
      const lemma = Object.keys(senses).find((l) => senses[l] === row.senseId)!;
      (items[lemma] ??= []).push(row.id);
      ctx.clock.set(new Date(ctx.clock.now().getTime() + 60_000));
      await finalizeItem(ctx.prisma, row.id, results[lemma][items[lemma].length - 1], { at: ctx.clock.now() });
    }
    const reportedItem = await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: items[reported][1] } });
    await ctx.prisma.practiceReport.create({ data: {
      userId, itemId: reportedItem.id, senseId: reportedItem.senseId, questionSnapshot: {}, reason: 'graded_wrong', createdAt: now,
    } });
    const weak = await start(userId, { source: 'weak', types: typing });
    const row = await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: weak.id } });
    expect(row.sort).toBe('level_asc');
    expect(row.senseIds).toEqual([senses[low], senses[high]]);
  });

  it('most_wrong and least_practiced use PracticeStats', async () => {
    const [never, old, recent] = lemmas(3);
    const { userId, groupIds, senses } = await seedPracticeLearner(ctx.prisma, { G: [recent, old, never] });
    const warm = await start(userId, { source: 'group', group_id: groupIds.G, types: typing, count: 3 });
    // recent is practised first (wrong), then old (correct); never is not practised.
    const order: string[] = [];
    for (let i = 0; i < 2; i++) {
      const body = await next(userId, warm.id);
      const item = await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: body.item!.item_id } });
      order.push(item.senseId);
      ctx.clock.set(new Date(ctx.clock.now().getTime() + 60_000));
      await finalizeItem(ctx.prisma, item.id, i === 0 ? 'wrong' : 'correct', { at: ctx.clock.now() });
    }
    // queue sort walks the group in added order: recent, old.
    expect(order).toEqual([senses[recent], senses[old]]);
    const least = await start(userId, { source: 'group', group_id: groupIds.G, sort: 'least_practiced', types: typing, count: 3 });
    expect((await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: least.id } })).senseIds)
      .toEqual([senses[never], senses[recent], senses[old]]);
    const most = await start(userId, { source: 'group', group_id: groupIds.G, sort: 'most_wrong', types: typing, count: 1 });
    expect((await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: most.id } })).senseIds).toEqual([senses[recent]]);
  });

  it('B4E29: two POST /sessions at once with different keys → two 201s, one active session left, no 500', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const body = { source: 'group', group_id: groupIds.G, types: typing };
    const [a, b] = await Promise.all([startPractice(ctx, userId, body), startPractice(ctx, userId, body)]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(await ctx.prisma.practiceSession.count({ where: { userId, status: 'active' } })).toBe(1);
    expect(await ctx.prisma.practiceSession.count({ where: { userId, status: 'abandoned' } })).toBe(1);
  });

  it('idle: 25 h idle → next, finish and continue each 409 session-closed; a fresh query reads status abandoned; current 404; 23 h idle → works', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    await next(userId, session.id);
    ctx.clock.set(hours(23));
    expect((await practiceRequest(ctx, userId, 'get', '/sessions/current')).status).toBe(200);
    // current and next count as activity: 25 h after the last one.
    ctx.clock.set(hours(23 + 25));
    for (const path of ['next', 'finish']) {
      const response = await practiceRequest(ctx, userId, 'post', `/sessions/${session.id}/${path}`);
      expect(response.status).toBe(409);
      expect(response.body.type).toMatch(/session-closed$/);
    }
    const cont = await practiceRequest(ctx, userId, 'post', `/sessions/${session.id}/continue`, { continue: true });
    expect(cont.status).toBe(409);
    expect(cont.body.type).toMatch(/session-closed$/);
    expect(await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: session.id } }))
      .toMatchObject({ status: 'abandoned', endedAt: hours(48) });
    expect((await practiceRequest(ctx, userId, 'get', '/sessions/current')).status).toBe(404);
  });

  it('idle: current closes a session idle over the limit → 404', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    ctx.clock.set(hours(25));
    expect((await practiceRequest(ctx, userId, 'get', '/sessions/current')).status).toBe(404);
    expect(await status(session.id)).toBe('abandoned');
  });

  it('continue on an active session → 409 session-not-waiting; finish twice → the second 409 session-closed', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    const cont = await practiceRequest(ctx, userId, 'post', `/sessions/${session.id}/continue`, { continue: true });
    expect(cont.status).toBe(409);
    expect(cont.body.type).toMatch(/session-not-waiting$/);
    const first = await practiceRequest(ctx, userId, 'post', `/sessions/${session.id}/finish`);
    expect(first.status).toBe(200);
    expect(first.body.session.status).toBe('finished');
    const second = await practiceRequest(ctx, userId, 'post', `/sessions/${session.id}/finish`);
    expect(second.status).toBe(409);
    expect(second.body.type).toMatch(/session-closed$/);
  });

  it('another learner\'s session is 404 on every session route', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const other = await seedPracticeLearner(ctx.prisma, { H: lemmas(1) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    for (const path of ['next', 'finish']) {
      expect((await practiceRequest(ctx, other.userId, 'post', `/sessions/${session.id}/${path}`)).status).toBe(404);
    }
    expect((await practiceRequest(ctx, other.userId, 'post', `/sessions/${session.id}/continue`, { continue: true })).status).toBe(404);
    expect((await practiceRequest(ctx, other.userId, 'get', '/sessions/current')).status).toBe(404);
  });

  it('bad bodies → 400: no types, duplicate types, group without group_id, group_id on another source, unknown sort', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(1) });
    for (const body of [
      { source: 'all', types: [] },
      { source: 'all', types: ['type_word', 'type_word'] },
      { source: 'group', types: typing },
      { source: 'all', group_id: groupIds.G, types: typing },
      { source: 'all', group_filter: 'due', types: typing },
      { source: 'all', sort: 'alphabet', types: typing },
      { source: 'all', types: typing, count: 0 },
    ]) {
      const response = await startPractice(ctx, userId, body);
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
  });

  it('D25: with the providers fake, the check runs at start and before each question; allowed:false → 403 entitlement-required', async () => {
    const { userId, groupIds } = await seedPracticeLearner(ctx.prisma, { G: lemmas(3) });
    const session = await start(userId, { source: 'group', group_id: groupIds.G, types: typing });
    expect(entitlement.calls).toBe(1);
    await askAndFinalize(userId, session.id);
    expect(entitlement.calls).toBe(2);
    entitlement.allowed = false;
    const refused = await nextItem(ctx, userId, session.id);
    expect(refused.status).toBe(403);
    expect(refused.body.type).toMatch(/entitlement-required$/);
    expect(await ctx.prisma.practiceSessionItem.count({ where: { sessionId: session.id } })).toBe(1);
    const start2 = await startPractice(ctx, userId, { source: 'group', group_id: groupIds.G, types: typing });
    expect(start2.status).toBe(403);
    expect(await status(session.id)).toBe('active');
  });
});
