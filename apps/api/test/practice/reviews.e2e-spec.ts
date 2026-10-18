import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import {
  nextItem, practiceRequest, seedPracticeGroup, seedPracticeUser, startPractice, type PracticeItemState,
} from '../support/practice-helpers.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedPracticeSense } from '../support/seed-practice.js';

const now = new Date('2026-11-08T03:00:00Z');
const today = new Date('2026-11-08T00:00:00Z');

describe('practice reviews and summary (e2e, isolated database)', () => {
  let ctx: TestApp;
  let counter = 0;

  /** A learner with one group of `count` words (lemmas w1…), each in the given state; a session over it, typing only. */
  const setup = async (count: number, state: (i: number) => PracticeItemState = () => ({ level: 2, dueDate: '2026-11-08' }),
    opts: { private?: boolean } = {}) => {
    const userId = await seedPracticeUser(ctx.prisma);
    const words: Array<{ lemma: string; senseId: string; entryId: string }> = [];
    for (let i = 0; i < count; i++) {
      const lemma = `word${(counter += 1)}`;
      const seeded = await seedPracticeSense(ctx.prisma, { lemma, glossVi: `nghĩa ${i}`, ownerUserId: opts.private ? userId : undefined });
      words.push({ lemma, ...seeded });
    }
    const groupId = await seedPracticeGroup(ctx.prisma, userId, 'G', words.map((w) => w.senseId), state);
    const start = await startPractice(ctx, userId, { source: 'group', group_id: groupId, types: ['type_word'], prompt_style: 'meaning', sort: 'queue', count: 20 });
    expect(start.status, JSON.stringify(start.body)).toBe(201);
    return { userId, groupId, words, sessionId: start.body.session.id as string };
  };
  /** Asks the next item and answers it through the API: the right lemma, or a wrong word then skip. */
  const ask = async (userId: string, sessionId: string, how: 'right' | 'wrong' | 'hinted' | 'pending' = 'right') => {
    let next = await nextItem(ctx, userId, sessionId);
    if (next.body.state === 'waiting_continue') {
      await practiceRequest(ctx, userId, 'post', `/sessions/${sessionId}/continue`, { continue: true });
      next = await nextItem(ctx, userId, sessionId);
    }
    expect(next.body.state, JSON.stringify(next.body)).toBe('question');
    const itemId = next.body.item.item_id as string;
    const row = await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: itemId }, include: { question: true } });
    const lemma = (row.question.answerKey as { reveal: { lemma: string } }).reveal.lemma;
    if (how === 'hinted') await practiceRequest(ctx, userId, 'post', `/items/${itemId}/hint`, { level: 2 });
    if (how === 'pending') {
      await practiceRequest(ctx, userId, 'post', `/items/${itemId}/answer`, { text: 'zzz' });
      return { itemId, lemma, senseId: row.senseId };
    }
    if (how === 'wrong') {
      await practiceRequest(ctx, userId, 'post', `/items/${itemId}/answer`, { text: 'zzz' });
      expect((await practiceRequest(ctx, userId, 'post', `/items/${itemId}/skip`)).body.result).toBe('wrong');
    } else {
      expect((await practiceRequest(ctx, userId, 'post', `/items/${itemId}/answer`, { text: lemma })).body.result).toBe('correct');
    }
    return { itemId, lemma, senseId: row.senseId };
  };
  const review = (userId: string, itemId: string, action: 'needs_review' | 'known') =>
    practiceRequest(ctx, userId, 'post', `/items/${itemId}/review`, { action });
  const practiceLogs = (userId: string) => ctx.prisma.learningLogEntry.findMany({ where: { userId, origin: 'practice' } });
  const expectProblem = (response: { status: number; body: { type?: string } }, status: number, slug: string) => {
    expect(response.status, JSON.stringify(response.body)).toBe(status);
    expect(response.body.type).toMatch(new RegExp(`${slug}$`));
  };

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  beforeEach(async () => {
    await ctx.prisma.practiceSession.deleteMany();
    await ctx.prisma.practiceQuestion.deleteMany();
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    ctx.clock.set(now);
  });
  afterAll(async () => { await ctx?.close(); });

  it('B4#9: known → level +1, due by the ladder, priority off, log origin practice, group_id null', async () => {
    const { userId, sessionId } = await setup(1, () => ({ level: 2, dueDate: '2026-11-08', priority: true }));
    const { itemId, senseId } = await ask(userId, sessionId);
    const response = await review(userId, itemId, 'known');
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toEqual({ action: 'known', item_id: itemId, level: 3, due_date: '2026-11-15', priority: false });
    expect(await ctx.prisma.learningItem.findFirstOrThrow({ where: { userId, senseId } }))
      .toMatchObject({ level: 3, dueDate: new Date('2026-11-15T00:00:00Z'), priority: false });
    expect(await practiceLogs(userId)).toEqual([expect.objectContaining({ answer: 'known', groupId: null, reviewId: itemId, localDate: today })]);
    expect((await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: itemId } })).reviewAction).toBe('known');
  });

  it('B4#10: correct with a hint → known 409 known-not-allowed', async () => {
    const { userId, sessionId } = await setup(1);
    const { itemId } = await ask(userId, sessionId, 'hinted');
    expectProblem(await review(userId, itemId, 'known'), 409, 'known-not-allowed');
  });

  it('B4E9: early word → 409 known-not-allowed, no log row', async () => {
    const { userId, sessionId } = await setup(1, () => ({ level: 2, dueDate: '2026-11-20' }));
    const { itemId } = await ask(userId, sessionId);
    expectProblem(await review(userId, itemId, 'known'), 409, 'known-not-allowed');
    expect(await practiceLogs(userId)).toEqual([]);
  });

  it('B4E10: needs_review twice, and again from the summary → one Learning write', async () => {
    const { userId, sessionId, words } = await setup(1);
    const { itemId } = await ask(userId, sessionId, 'wrong');
    const first = await review(userId, itemId, 'needs_review');
    expect(first.body).toEqual({ action: 'needs_review', item_id: itemId, level: 1, due_date: '2026-11-08', priority: true });
    expect((await review(userId, itemId, 'needs_review')).body).toEqual(first.body);
    const summary = await practiceRequest(ctx, userId, 'get', `/sessions/${sessionId}/summary`);
    expect(summary.body.words).toEqual([{ sense_id: words[0].senseId, lemma: words[0].lemma, meaning: 'nghĩa 0', item_id: itemId, action: 'needs_review' }]);
    expect((await review(userId, summary.body.words[0].item_id, 'needs_review')).status).toBe(200);
    expect(await practiceLogs(userId)).toHaveLength(1);
  });

  it('B4E11: needs_review then known → 409 review-already-set', async () => {
    const { userId, sessionId } = await setup(1);
    const { itemId } = await ask(userId, sessionId);
    expect((await review(userId, itemId, 'needs_review')).status).toBe(200);
    expectProblem(await review(userId, itemId, 'known'), 409, 'review-already-set');
  });

  it('B4E7 / B4E34: removed from learning → 409 not-in-learning; before the final result → 409 not-answered', async () => {
    const { userId, sessionId } = await setup(2);
    const pending = await ask(userId, sessionId, 'pending');
    expectProblem(await review(userId, pending.itemId, 'needs_review'), 409, 'not-answered');
    await practiceRequest(ctx, userId, 'post', `/items/${pending.itemId}/skip`);
    await ctx.prisma.learningItem.deleteMany({ where: { userId, senseId: pending.senseId } });
    expectProblem(await review(userId, pending.itemId, 'needs_review'), 409, 'not-in-learning');
    expect((await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: pending.itemId } })).reviewAction).toBeNull();
  });

  it('B4#11: three listed words, one already pressed → review-all adds 2', async () => {
    const { userId, sessionId } = await setup(4);
    const a = await ask(userId, sessionId, 'wrong');
    await ask(userId, sessionId, 'hinted');
    await ask(userId, sessionId, 'wrong');
    await ask(userId, sessionId, 'right');
    await review(userId, a.itemId, 'needs_review');
    const summary = await practiceRequest(ctx, userId, 'get', `/sessions/${sessionId}/summary`);
    expect(summary.body).toMatchObject({ asked: 4, correct: 2, wrong: 2 });
    expect(summary.body.words).toHaveLength(3);
    const all = await practiceRequest(ctx, userId, 'post', `/sessions/${sessionId}/review-all`);
    expect(all.status).toBe(200);
    expect(all.body).toEqual({ added: 2 });
    expect(await practiceLogs(userId)).toHaveLength(3);
    const again = await practiceRequest(ctx, userId, 'post', `/sessions/${sessionId}/review-all`);
    expect(again.body).toEqual({ added: 0 });
  });

  it('B4E42: a word wrong in round 1 and right in round 2 → one write, keyed by its last item, and a second review-all adds 0', async () => {
    const { userId, sessionId } = await setup(1);
    await ask(userId, sessionId, 'wrong');
    const second = await ask(userId, sessionId, 'right');
    const summary = await practiceRequest(ctx, userId, 'get', `/sessions/${sessionId}/summary`);
    expect(summary.body.words).toEqual([expect.objectContaining({ item_id: second.itemId, action: null })]);
    expect((await practiceRequest(ctx, userId, 'post', `/sessions/${sessionId}/review-all`)).body).toEqual({ added: 1 });
    expect(await practiceLogs(userId)).toEqual([expect.objectContaining({ reviewId: second.itemId })]);
    expect((await practiceRequest(ctx, userId, 'post', `/sessions/${sessionId}/review-all`)).body).toEqual({ added: 0 });
  });

  it('a word wrong in round 1 whose round-2 item was left in try_again when the session finished → the summary keys it by the round-1 item and review-all writes it', async () => {
    const { userId, sessionId } = await setup(1);
    const first = await ask(userId, sessionId, 'wrong');
    await ask(userId, sessionId, 'pending');
    expect((await practiceRequest(ctx, userId, 'post', `/sessions/${sessionId}/finish`)).status).toBe(200);
    const summary = await practiceRequest(ctx, userId, 'get', `/sessions/${sessionId}/summary`);
    expect(summary.body).toMatchObject({ asked: 1, wrong: 1, correct: 0, words: [{ item_id: first.itemId, action: null }] });
    expect((await practiceRequest(ctx, userId, 'post', `/sessions/${sessionId}/review-all`)).body).toEqual({ added: 1 });
    expect(await practiceLogs(userId)).toEqual([expect.objectContaining({ reviewId: first.itemId })]);
  });

  it('B4E43: review on a finished session works, on an abandoned one → 409 session-closed; summary and review-all of an abandoned session → 409 session-closed', async () => {
    const { userId, sessionId, groupId } = await setup(2);
    const a = await ask(userId, sessionId, 'wrong');
    const b = await ask(userId, sessionId, 'wrong');
    await practiceRequest(ctx, userId, 'post', `/sessions/${sessionId}/finish`);
    expect((await review(userId, a.itemId, 'needs_review')).status).toBe(200);
    // A new session on a fresh copy of the words abandons the open one.
    const other = await startPractice(ctx, userId, { source: 'group', group_id: groupId, types: ['type_word'] });
    const otherItem = (await nextItem(ctx, userId, other.body.session.id)).body.item.item_id as string;
    await practiceRequest(ctx, userId, 'post', `/items/${otherItem}/answer`, { text: 'zzz' });
    await practiceRequest(ctx, userId, 'post', `/items/${otherItem}/skip`);
    await startPractice(ctx, userId, { source: 'group', group_id: groupId, types: ['type_word'] });
    expectProblem(await review(userId, otherItem, 'needs_review'), 409, 'session-closed');
    expectProblem(await practiceRequest(ctx, userId, 'get', `/sessions/${other.body.session.id}/summary`), 409, 'session-closed');
    expectProblem(await practiceRequest(ctx, userId, 'post', `/sessions/${other.body.session.id}/review-all`), 409, 'session-closed');
    expect((await review(userId, b.itemId, 'needs_review')).status).toBe(200);
  });

  it('Review Focus 1: review-all racing a single review on the same word → one Learning log row', async () => {
    const { userId, sessionId } = await setup(1);
    const { itemId } = await ask(userId, sessionId, 'wrong');
    const [single, all] = await Promise.all([
      review(userId, itemId, 'needs_review'),
      practiceRequest(ctx, userId, 'post', `/sessions/${sessionId}/review-all`),
    ]);
    expect(single.status).toBe(200);
    expect(all.status).toBe(200);
    expect(await practiceLogs(userId)).toHaveLength(1);
  });

  it('lock order: review racing DELETE /v1/my-words on the same private word, and review-all of three words racing DELETE /v1/groups/:id → both finish without a deadlock error', async () => {
    const mine = await setup(1, () => ({ level: 2, dueDate: '2026-11-08' }), { private: true });
    const { itemId } = await ask(mine.userId, mine.sessionId, 'wrong');
    const token = (await startSession(ctx, mine.userId)).accessToken;
    const [reviewed, deleted] = await Promise.all([
      review(mine.userId, itemId, 'needs_review'),
      ctx.http().delete(`/v1/my-words/${mine.words[0].entryId}`).set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID()),
    ]);
    expect([200, 404, 409]).toContain(reviewed.status);
    expect(deleted.status).toBe(204);

    const group = await setup(3);
    for (let i = 0; i < 3; i++) await ask(group.userId, group.sessionId, 'wrong');
    const groupToken = (await startSession(ctx, group.userId)).accessToken;
    const [all, dropped] = await Promise.all([
      practiceRequest(ctx, group.userId, 'post', `/sessions/${group.sessionId}/review-all`),
      ctx.http().delete(`/v1/groups/${group.groupId}`).set('Authorization', `Bearer ${groupToken}`).set('Idempotency-Key', randomUUID()),
    ]);
    expect(all.status).toBe(200);
    expect(dropped.status).toBe(204);
    expect([0, 3]).toContain(all.body.added);
  });

  it('B4#27 / B4E45: five practice "known" after the group used its cap → levels up, the group\'s cap count unchanged', async () => {
    const { userId, sessionId, groupId } = await setup(5);
    const capRows = await ctx.prisma.learningLogEntry.count({ where: { userId, groupId, localDate: today } });
    for (let i = 0; i < 5; i++) {
      const { itemId } = await ask(userId, sessionId);
      expect((await review(userId, itemId, 'known')).body.level).toBe(3);
    }
    expect(await ctx.prisma.learningLogEntry.count({ where: { userId, groupId, localDate: today } })).toBe(capRows);
    expect(await ctx.prisma.learningLogEntry.count({ where: { userId, groupId: null, origin: 'practice' } })).toBe(5);
  });

  it('B4E41 / B4#24: 20 questions in one minute (next + answer + review each, 60 writes) → no 429', async () => {
    const { userId, sessionId } = await setup(20);
    for (let i = 0; i < 20; i++) {
      const next = await nextItem(ctx, userId, sessionId);
      expect(next.status).toBe(200);
      const itemId = next.body.item.item_id as string;
      const row = await ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: itemId }, include: { question: true } });
      const lemma = (row.question.answerKey as { reveal: { lemma: string } }).reveal.lemma;
      expect((await practiceRequest(ctx, userId, 'post', `/items/${itemId}/answer`, { text: lemma })).status).toBe(200);
      expect((await review(userId, itemId, 'needs_review')).status).toBe(200);
    }
  });

  it('another learner\'s item or session → 404 on review, summary and review-all', async () => {
    const { userId, sessionId } = await setup(1);
    const { itemId } = await ask(userId, sessionId, 'wrong');
    const other = await seedPracticeUser(ctx.prisma);
    expect((await review(other, itemId, 'needs_review')).status).toBe(404);
    expect((await practiceRequest(ctx, other, 'get', `/sessions/${sessionId}/summary`)).status).toBe(404);
    expect((await practiceRequest(ctx, other, 'post', `/sessions/${sessionId}/review-all`)).status).toBe(404);
  });
});
