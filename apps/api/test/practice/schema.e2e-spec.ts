import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

const at = new Date('2026-11-01T03:00:00Z');

describe('practice schema (e2e, isolated database)', () => {
  let ctx: TestApp;
  const session = (userId: string, status = 'active', data: Record<string, unknown> = {}) => ctx.prisma.practiceSession.create({
    data: {
      userId, source: 'today', sort: 'queue', types: ['mcq_definition'], promptStyle: 'meaning', targetCount: 10,
      senseIds: [randomUUID()], status, startedAt: at, lastActivityAt: at, ...data,
    },
  });
  const question = (userId: string, data: Record<string, unknown> = {}) => ctx.prisma.practiceQuestion.create({
    data: {
      userId, senseId: randomUUID(), type: 'mcq_definition', promptStyle: 'meaning', schemaVersion: 1, prompt: {},
      answerKey: {}, hints: {}, createdAt: at, ...data,
    },
  });
  const item = (sessionId: string, userId: string, questionId: string, position: number, data: Record<string, unknown> = {}) =>
    ctx.prisma.practiceSessionItem.create({
      data: { sessionId, userId, questionId, senseId: randomUUID(), round: 1, position, askedAt: at, ...data },
    });

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  afterAll(async () => { await ctx?.close(); });

  it('a second open session for one user is refused by the partial index, a finished one is not', async () => {
    const learner = randomUUID();
    await session(learner, 'active');
    await expect(session(learner, 'waiting_continue')).rejects.toMatchObject({ code: 'P2002' });
    await expect(session(learner, 'active')).rejects.toMatchObject({ code: 'P2002' });
    await session(learner, 'finished');
    await session(learner, 'abandoned');
    // Another learner has their own open session.
    await expect(session(randomUUID(), 'active')).resolves.toMatchObject({ status: 'active' });
    expect(await ctx.prisma.practiceSession.count({ where: { userId: learner } })).toBe(3);
  });

  it('(session_id, position) is unique', async () => {
    const learner = randomUUID();
    const s = await session(learner);
    const q = await question(learner);
    await item(s.id, learner, q.id, 1);
    await expect(item(s.id, learner, q.id, 1)).rejects.toMatchObject({ code: 'P2002' });
    await expect(item(s.id, learner, q.id, 2)).resolves.toMatchObject({ position: 2 });
  });

  it('deleting an item nulls its report\'s item_id', async () => {
    const learner = randomUUID();
    const s = await session(learner, 'finished');
    const q = await question(learner);
    const i = await item(s.id, learner, q.id, 1);
    const report = await ctx.prisma.practiceReport.create({ data: {
      userId: learner, itemId: i.id, senseId: i.senseId, questionSnapshot: {}, reason: 'meaning_wrong', createdAt: at,
    } });
    // One report per item.
    await expect(ctx.prisma.practiceReport.create({ data: {
      userId: learner, itemId: i.id, senseId: i.senseId, questionSnapshot: {}, reason: 'other', createdAt: at,
    } })).rejects.toMatchObject({ code: 'P2002' });

    await ctx.prisma.practiceSessionItem.delete({ where: { id: i.id } });
    expect(await ctx.prisma.practiceReport.findUnique({ where: { id: report.id } }))
      .toMatchObject({ itemId: null, status: 'open', senseId: i.senseId });
  });

  it('deleting a question that an item still points to is refused', async () => {
    const learner = randomUUID();
    const s = await session(learner, 'finished');
    const q = await question(learner);
    await item(s.id, learner, q.id, 1);
    await expect(ctx.prisma.practiceQuestion.delete({ where: { id: q.id } })).rejects.toThrow();
    expect(await ctx.prisma.practiceQuestion.count({ where: { id: q.id } })).toBe(1);
    // Deleting the session cascades its items, then the question can go.
    await ctx.prisma.practiceSession.delete({ where: { id: s.id } });
    expect(await ctx.prisma.practiceSessionItem.count({ where: { sessionId: s.id } })).toBe(0);
    await ctx.prisma.practiceQuestion.delete({ where: { id: q.id } });
  });

  it('an enum value outside the CHECK lists (result, status, pending_notice, prompt_style) is refused', async () => {
    const learner = randomUUID();
    await expect(session(learner, 'paused')).rejects.toThrow();
    await expect(session(learner, 'finished', { pendingNotice: 'something' })).rejects.toThrow();
    await expect(session(learner, 'finished', { promptStyle: 'audio' })).rejects.toThrow();
    await expect(session(learner, 'finished', { types: ['mcq_definition', 'essay'] })).rejects.toThrow();
    await expect(session(learner, 'finished', { pendingNotice: 'word-not-found' })).resolves.toMatchObject({ pendingNotice: 'word-not-found' });

    await expect(question(learner, { promptStyle: 'audio' })).rejects.toThrow();
    await expect(question(learner, { type: 'essay' })).rejects.toThrow();
    const s = await session(learner, 'finished');
    const q = await question(learner, { type: 'type_word', promptStyle: 'sentence', blank: { text: 'deployed', base: false } });
    await expect(item(s.id, learner, q.id, 1, { result: 'partial' })).rejects.toThrow();
    await expect(item(s.id, learner, q.id, 1, { reviewAction: 'forget' })).rejects.toThrow();
    await expect(item(s.id, learner, q.id, 1, { result: 'void' })).resolves.toMatchObject({ result: 'void', tries: 0, hintLevel: 0 });
  });
});
