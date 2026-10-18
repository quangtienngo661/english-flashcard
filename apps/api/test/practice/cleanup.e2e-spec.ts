import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MaintenanceScheduler } from '../../src/common/maintenance/maintenance.scheduler.js';
import { PRIVATE_SENSES_CLEANUP, type PrivateSensesCleanup } from '../../src/learning/index.js';
import { PracticeCleanupService } from '../../src/practice/maintenance/practice-cleanup.service.js';
import { SettingsService } from '../../src/settings/index.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedPracticeSense } from '../support/seed-practice.js';
import { testConfig } from '../support/test-config.js';

const now = new Date('2026-11-08T03:00:00Z');
const hour = 3_600_000;
const day = 24 * hour;
const transactionOptions = { timeout: 30_000, maxWait: 5_000 };

describe('practice cleanup and the private-word port (e2e, isolated database)', () => {
  let ctx: TestApp;
  let cleanup: PracticeCleanupService;
  let lemma = 0;

  const session = (userId: string, data: { status?: string; at?: Date; endedAt?: Date | null; lastActivityAt?: Date } = {}) =>
    ctx.prisma.practiceSession.create({ data: {
      userId, source: 'all', sort: 'queue', types: ['type_word'], promptStyle: 'meaning', targetCount: 10, senseIds: [],
      status: data.status ?? 'finished', startedAt: data.at ?? now, lastActivityAt: data.lastActivityAt ?? data.at ?? now,
      endedAt: data.endedAt === undefined ? (data.status === 'active' || data.status === 'waiting_continue' ? null : data.at ?? now)
        : data.endedAt,
    } });
  /** A question and its item in Task 8's shapes; `result: null` is an item still waiting for its final result. */
  const item = async (sessionId: string, userId: string, position: number,
    data: { senseId?: string; askedAt?: Date; result?: string | null; distractors?: string[] } = {}) => {
    const senseId = data.senseId ?? randomUUID();
    const askedAt = data.askedAt ?? now;
    const question = await ctx.prisma.practiceQuestion.create({ data: {
      userId, senseId, type: 'type_word', promptStyle: 'meaning', schemaVersion: 1,
      prompt: { kind: 'type_meaning', meaning: 'nghĩa', meaning_language: 'vi', context_label: null },
      answerKey: { reveal: { lemma: 'x', meaning: 'nghĩa', definition_en: null }, asked_private: false, kind: 'type_word',
        main: 'x', accepted: ['x'] },
      hints: { level1: null, level2: null }, distractorSenseIds: data.distractors ?? [], createdAt: askedAt,
    } });
    const result = data.result === undefined ? 'correct' : data.result;
    return ctx.prisma.practiceSessionItem.create({ data: {
      sessionId, userId, questionId: question.id, senseId, round: 1, position, askedAt,
      answeredAt: result === null ? null : askedAt, answerRaw: result === null ? null : 'x', tries: result === null ? 0 : 1, result,
    } });
  };
  const reportOf = (userId: string, data: { itemId?: string | null; senseId?: string; status?: string; createdAt?: Date;
    resolvedAt?: Date | null }) => ctx.prisma.practiceReport.create({ data: {
    userId, itemId: data.itemId ?? null, senseId: data.senseId ?? randomUUID(), questionSnapshot: { kept: true }, reason: 'other',
    status: data.status ?? 'open', createdAt: data.createdAt ?? now, resolvedAt: data.resolvedAt ?? null,
    resolvedBy: data.resolvedAt ? randomUUID() : null,
  } });
  const learner = async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    return { userId, token: (await startSession(ctx, userId)).accessToken };
  };
  const ids = async () => ({
    sessions: (await ctx.prisma.practiceSession.findMany({ select: { id: true } })).map(({ id }) => id).sort(),
    items: (await ctx.prisma.practiceSessionItem.findMany({ select: { id: true } })).map(({ id }) => id).sort(),
    questions: (await ctx.prisma.practiceQuestion.findMany({ select: { id: true } })).map(({ id }) => id).sort(),
    reports: (await ctx.prisma.practiceReport.findMany({ select: { id: true } })).map(({ id }) => id).sort(),
  });
  const monthsAgo = (months: number, plusMs = 0) => {
    const at = new Date(now);
    at.setUTCMonth(at.getUTCMonth() - months);
    return new Date(at.getTime() + plusMs);
  };

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config });
    cleanup = ctx.app.get(PracticeCleanupService);
  });
  beforeEach(async () => {
    await ctx.prisma.practiceReport.deleteMany();
    await ctx.prisma.practiceSession.deleteMany();
    await ctx.prisma.practiceQuestion.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.appSettingChange.deleteMany();
    await ctx.prisma.appSetting.deleteMany();
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(now);
  });
  afterAll(async () => { await ctx?.close(); });

  it('B4#16: FakeClock past 6 months → old items, questions and sessions gone, an open report kept with item_id null, a resolved old report gone', async () => {
    const userId = randomUUID();
    const old = monthsAgo(6, -hour);
    const oldSession = await session(userId, { at: old });
    const oldItem = await item(oldSession.id, userId, 1, { askedAt: old });
    const openReport = await reportOf(userId, { itemId: oldItem.id, createdAt: old });
    const oldResolved = await reportOf(userId, { status: 'fixed', createdAt: old, resolvedAt: old });
    // Kept: an item asked just inside the window, a resolved report resolved inside it, an old open report.
    const recentSession = await session(userId, { at: monthsAgo(6, hour) });
    const recentItem = await item(recentSession.id, userId, 1, { askedAt: monthsAgo(6, hour) });
    const recentResolved = await reportOf(userId, { status: 'no_error', createdAt: old, resolvedAt: monthsAgo(6, hour) });
    const oldOpenNoItem = await reportOf(userId, { createdAt: monthsAgo(12) });

    await ctx.app.get(MaintenanceScheduler).runAll();

    const after = await ids();
    expect(after.sessions).toEqual([recentSession.id]);
    expect(after.items).toEqual([recentItem.id]);
    expect(after.questions).toEqual([recentItem.questionId]);
    expect(after.reports).toEqual([openReport.id, recentResolved.id, oldOpenNoItem.id].sort());
    expect(await ctx.prisma.practiceReport.findUniqueOrThrow({ where: { id: openReport.id } }))
      .toMatchObject({ itemId: null, status: 'open', questionSnapshot: { kept: true } });
    expect(after.reports).not.toContain(oldResolved.id);
  });

  it('an open session older than the window is not deleted; an item still referenced keeps its question', async () => {
    const userId = randomUUID();
    const old = monthsAgo(7);
    // Still active (its last activity is recent), with an old first item and a recent second one.
    const open = await session(userId, { status: 'active', at: old, lastActivityAt: now });
    await item(open.id, userId, 1, { askedAt: old });
    const recent = await item(open.id, userId, 2, { askedAt: now, result: null });
    await cleanup.runOnce(now);
    expect(await ids()).toMatchObject({ sessions: [open.id], items: [recent.id], questions: [recent.questionId] });
  });

  it('B4E19: lowering history_months to 3 deletes by the new cutoff on the next run', async () => {
    const userId = randomUUID();
    const s = await session(userId, { at: monthsAgo(4) });
    const i = await item(s.id, userId, 1, { askedAt: monthsAgo(4) });
    await cleanup.runOnce(now);
    expect((await ids()).items).toEqual([i.id]);
    const settings = ctx.app.get(SettingsService);
    await settings.update(randomUUID(), 0, { practice: { history_months: 3 } });
    await cleanup.runOnce(now);
    expect(await ids()).toEqual({ sessions: [], items: [], questions: [], reports: [] });
  });

  it('an active session idle 25 hours becomes abandoned; one idle 23 hours stays', async () => {
    const idle = await session(randomUUID(), { status: 'active', lastActivityAt: new Date(now.getTime() - 25 * hour) });
    const waiting = await session(randomUUID(), { status: 'waiting_continue', lastActivityAt: new Date(now.getTime() - 25 * hour) });
    const fresh = await session(randomUUID(), { status: 'active', lastActivityAt: new Date(now.getTime() - 23 * hour) });
    const finished = await session(randomUUID(), { status: 'finished', at: new Date(now.getTime() - 2 * day) });
    await cleanup.runOnce(now);
    const status = async (id: string) => ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id } });
    expect(await status(idle.id)).toMatchObject({ status: 'abandoned', endedAt: now });
    expect(await status(waiting.id)).toMatchObject({ status: 'abandoned', endedAt: now });
    expect(await status(fresh.id)).toMatchObject({ status: 'active', endedAt: null });
    expect(await status(finished.id)).toMatchObject({ status: 'finished', endedAt: new Date(now.getTime() - 2 * day) });
  });

  it('idle_session_close_hours comes from the settings', async () => {
    const s = await session(randomUUID(), { status: 'active', lastActivityAt: new Date(now.getTime() - 3 * hour) });
    await cleanup.runOnce(now);
    expect((await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: s.id } })).status).toBe('active');
    await ctx.app.get(SettingsService).update(randomUUID(), 0, { practice: { idle_session_close_hours: 2 } });
    await cleanup.runOnce(now);
    expect((await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: s.id } })).status).toBe('abandoned');
  });

  it('B4#22: deleting a private word removes its questions, items and reports in the deleteMyWord transaction', async () => {
    const me = await learner();
    const word = await seedPracticeSense(ctx.prisma, { lemma: `riêng${(lemma += 1)}`, glossVi: 'của tôi', ownerUserId: me.userId });
    const finished = await session(me.userId);
    const privateItem = await item(finished.id, me.userId, 1, { senseId: word.senseId, result: 'wrong' });
    // Seeded directly: the API refuses a report on a private asked word, but nothing of that sense may survive.
    await reportOf(me.userId, { itemId: privateItem.id, senseId: word.senseId });
    // Another word's question with the private word as a distractor stays.
    const other = await item(finished.id, me.userId, 2, { distractors: [word.senseId] });
    const otherReport = await reportOf(me.userId, { itemId: other.id, senseId: other.senseId });
    // Another learner's rows of a random sense are untouched.
    const stranger = randomUUID();
    const strangerItem = await item((await session(stranger)).id, stranger, 1);

    const response = await ctx.http().delete(`/v1/my-words/${word.entryId}`)
      .set('Authorization', `Bearer ${me.token}`).set('Idempotency-Key', randomUUID());
    expect(response.status).toBe(204);

    expect(await ctx.prisma.practiceSessionItem.count({ where: { senseId: word.senseId } })).toBe(0);
    expect(await ctx.prisma.practiceQuestion.count({ where: { senseId: word.senseId } })).toBe(0);
    expect(await ctx.prisma.practiceReport.count({ where: { senseId: word.senseId } })).toBe(0);
    const after = await ids();
    expect(after.items).toEqual([other.id, strangerItem.id].sort());
    expect(after.questions).toEqual([other.questionId, strangerItem.questionId].sort());
    expect(after.reports).toEqual([otherReport.id]);
    expect(await ctx.prisma.practiceQuestion.findUniqueOrThrow({ where: { id: other.questionId } }))
      .toMatchObject({ distractorSenseIds: [word.senseId] });
  });

  it('the port writes through the given transaction: a rollback keeps every practice row', async () => {
    const userId = randomUUID();
    const senseId = randomUUID();
    const open = await session(userId, { status: 'active' });
    const pending = await item(open.id, userId, 1, { senseId, result: null });
    const before = await ids();
    const port = ctx.app.get<PrivateSensesCleanup>(PRIVATE_SENSES_CLEANUP);
    await expect(ctx.prisma.$transaction(async (tx) => {
      await port.deleteForSenses(tx, userId, [senseId]);
      expect(await tx.practiceSessionItem.count({ where: { id: pending.id } })).toBe(0);
      throw new Error('rollback');
    }, transactionOptions)).rejects.toThrow('rollback');
    expect(await ids()).toEqual(before);
    expect((await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: open.id } })).pendingNotice).toBeNull();
    // An empty list is a no-op.
    await ctx.prisma.$transaction((tx) => port.deleteForSenses(tx, userId, []), transactionOptions);
    expect(await ids()).toEqual(before);
  });

  it('B4E8 (port side): the open session whose pending item was that word gets pending_notice word-not-found and the item is gone; a session whose item of that word was already final gets no notice', async () => {
    const me = await learner();
    const word = await seedPracticeSense(ctx.prisma, { lemma: `riêng${(lemma += 1)}`, glossVi: 'của tôi', ownerUserId: me.userId });
    const open = await session(me.userId, { status: 'active' });
    await item(open.id, me.userId, 1, { result: 'correct' });
    const pending = await item(open.id, me.userId, 2, { senseId: word.senseId, result: null });
    // Asked by the same learner on another device earlier; final, then a new session took over.
    const done = await session(me.userId, { status: 'abandoned' });
    await item(done.id, me.userId, 1, { senseId: word.senseId, result: 'wrong' });

    const response = await ctx.http().delete(`/v1/my-words/${word.entryId}`)
      .set('Authorization', `Bearer ${me.token}`).set('Idempotency-Key', randomUUID());
    expect(response.status).toBe(204);

    expect(await ctx.prisma.practiceSessionItem.count({ where: { id: pending.id } })).toBe(0);
    expect(await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: open.id } }))
      .toMatchObject({ status: 'active', pendingNotice: 'word-not-found' });
    expect(await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: done.id } }))
      .toMatchObject({ status: 'abandoned', pendingNotice: null });
    expect(await ctx.prisma.practiceSessionItem.count({ where: { sessionId: done.id } })).toBe(0);
  });

  it('an open session whose item of that word was already final gets no notice', async () => {
    const userId = randomUUID();
    const senseId = randomUUID();
    const open = await session(userId, { status: 'active' });
    const final = await item(open.id, userId, 1, { senseId, result: 'wrong' });
    const current = await item(open.id, userId, 2, { result: null });
    await ctx.prisma.$transaction((tx) => ctx.app.get<PrivateSensesCleanup>(PRIVATE_SENSES_CLEANUP)
      .deleteForSenses(tx, userId, [senseId]), transactionOptions);
    expect(await ctx.prisma.practiceSessionItem.count({ where: { id: final.id } })).toBe(0);
    expect(await ctx.prisma.practiceSessionItem.count({ where: { id: current.id } })).toBe(1);
    expect((await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: open.id } })).pendingNotice).toBeNull();
  });

  it('the scheduler lists practice-cleanup', () => {
    expect(ctx.app.get(MaintenanceScheduler).jobNames()).toContain('practice-cleanup');
  });
});
