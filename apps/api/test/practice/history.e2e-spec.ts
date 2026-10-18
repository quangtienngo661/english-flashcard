import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { practiceRequest, seedPracticeGroup, seedPracticeUser } from '../support/practice-helpers.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedPracticeSense } from '../support/seed-practice.js';

const base = new Date('2026-11-08T03:00:00Z');
// ASSUMPTION (plan, Task 17): the threshold is the owner's to confirm; the duration is printed for that.
const WEAK_THRESHOLD_MS = 500;

type Code = 'S' | 'D' | 'H';
type Report = 'open' | 'fixed' | 'no_error' | null;

describe('weak words and history (e2e, isolated database)', () => {
  let ctx: TestApp;
  let counter = 0;

  const learnerWith = async (count: number, level = 2) => {
    const userId = await seedPracticeUser(ctx.prisma);
    const senses: Array<{ senseId: string; lemma: string }> = [];
    for (let i = 0; i < count; i++) {
      const lemma = `word${(counter += 1)}`;
      senses.push({ lemma, ...(await seedPracticeSense(ctx.prisma, { lemma, glossVi: `nghĩa ${lemma}` })) });
    }
    await seedPracticeGroup(ctx.prisma, userId, 'G', senses.map((s) => s.senseId), () => ({ level }));
    return { userId, senses };
  };
  /**
   * Final attempts of one sense, oldest first, one minute apart from `from`: S = wrong, D = correct, H = correct with a hint;
   * a report status per attempt. One finished session holds them; returns the item ids.
   */
  const attempts = async (userId: string, sense: { senseId: string; lemma: string }, codes: Code[], reports: Report[] = [], from = base) => {
    const session = await ctx.prisma.practiceSession.create({ data: {
      userId, source: 'all', sort: 'queue', types: ['type_word'], promptStyle: 'meaning', targetCount: codes.length,
      senseIds: [sense.senseId], status: 'finished', startedAt: from, lastActivityAt: from, endedAt: from,
    } });
    const ids: string[] = [];
    for (const [i, code] of codes.entries()) {
      const at = new Date(from.getTime() + i * 60_000);
      const question = await ctx.prisma.practiceQuestion.create({ data: {
        userId, senseId: sense.senseId, type: 'type_word', promptStyle: 'meaning', schemaVersion: 1,
        prompt: { kind: 'type_meaning', meaning: `nghĩa ${sense.lemma}`, meaning_language: 'vi', context_label: null },
        answerKey: { kind: 'type_word', main: sense.lemma, accepted: [sense.lemma], asked_private: false,
          reveal: { lemma: sense.lemma, meaning: `nghĩa ${sense.lemma}`, definition_en: null } },
        hints: { level1: null, level2: null }, createdAt: at,
      } });
      const item = await ctx.prisma.practiceSessionItem.create({ data: {
        sessionId: session.id, userId, questionId: question.id, senseId: sense.senseId, round: 1, position: i + 1, askedAt: at,
        answeredAt: at, result: code === 'S' ? 'wrong' : 'correct', hintLevel: code === 'H' ? 1 : 0, tries: 1,
        answerRaw: code === 'S' ? 'zzz' : sense.lemma, answerNormalized: code === 'S' ? 'zzz' : sense.lemma,
        localDate: new Date(`${at.toISOString().slice(0, 10)}T00:00:00Z`),
      } });
      if (reports[i]) {
        await ctx.prisma.practiceReport.create({ data: {
          userId, itemId: item.id, senseId: sense.senseId, questionSnapshot: {}, reason: 'graded_wrong', status: reports[i]!, createdAt: at,
        } });
      }
      ids.push(item.id);
    }
    return { sessionId: session.id, ids };
  };
  const weakWords = async (userId: string, query = '') => {
    const response = await practiceRequest(ctx, userId, 'get', `/weak-words${query}`);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return response.body as { items: Array<{ sense_id: string; lemma: string; wrong: number; counted: number; level: number; last_wrong_at: string }>; next_page_token: string | null };
  };
  const history = async (userId: string, query: string) => {
    const response = await practiceRequest(ctx, userId, 'get', `/history${query}`);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return response.body as { items: Array<Record<string, unknown>>; next_page_token: string | null };
  };

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  beforeEach(async () => {
    await ctx.prisma.practiceReport.deleteMany();
    await ctx.prisma.practiceSession.deleteMany();
    await ctx.prisma.practiceQuestion.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await resetCatalog(ctx.prisma);
    ctx.clock.set(new Date('2026-11-09T03:00:00Z'));
  });
  afterAll(async () => { await ctx?.close(); });

  it('design §8 table over HTTP: the five rows plus a fixed report give the same weak / not weak as Task 12; B4#12, B4#13', async () => {
    const { userId, senses } = await learnerWith(6);
    const rows: Array<{ codes: Code[]; reports?: Report[]; weak: boolean; wrong: number; counted: number }> = [
      { codes: ['S', 'S'], weak: true, wrong: 2, counted: 2 },
      { codes: ['S', 'S', 'D', 'D', 'D'], weak: true, wrong: 2, counted: 5 },
      { codes: ['S', 'S', 'D', 'D', 'D', 'D'], weak: false, wrong: 1, counted: 5 },
      { codes: ['S', 'S', 'H', 'H', 'H', 'H'], weak: true, wrong: 2, counted: 2 },
      { codes: ['S', 'S'], reports: ['open', null], weak: false, wrong: 1, counted: 1 },
      { codes: ['S', 'S'], reports: ['fixed', null], weak: false, wrong: 1, counted: 1 },
    ];
    for (const [i, row] of rows.entries()) await attempts(userId, senses[i], row.codes, row.reports);
    const { items } = await weakWords(userId);
    const expected = rows.flatMap((row, i) => (row.weak ? [{ sense_id: senses[i].senseId, wrong: row.wrong, counted: row.counted }] : []));
    expect(items.map(({ sense_id, wrong, counted }) => ({ sense_id, wrong, counted })).sort((a, b) => a.sense_id.localeCompare(b.sense_id)))
      .toEqual(expected.sort((a, b) => a.sense_id.localeCompare(b.sense_id)));
    expect(items[0]).toMatchObject({ lemma: expect.any(String), level: 2, last_wrong_at: '2026-11-08T03:01:00.000Z' });
  });

  it('B4#14: a reported wrong attempt is not counted while open, counted after no_error', async () => {
    const { userId, senses } = await learnerWith(1);
    const { ids } = await attempts(userId, senses[0], ['S', 'S'], ['open', null]);
    expect((await weakWords(userId)).items).toEqual([]);
    await ctx.prisma.practiceReport.updateMany({ where: { itemId: ids[0] }, data: { status: 'no_error' } });
    expect((await weakWords(userId)).items).toEqual([expect.objectContaining({ sense_id: senses[0].senseId, wrong: 2, counted: 2 })]);
  });

  it('weak words leave out words removed from learning or retired; the reason reads "wrong 3 of the last 5" as numbers', async () => {
    const { userId, senses } = await learnerWith(3);
    await attempts(userId, senses[0], ['S', 'D', 'S', 'D', 'S']);
    await attempts(userId, senses[1], ['S', 'S']);
    await attempts(userId, senses[2], ['S', 'S']);
    await ctx.prisma.learningItem.deleteMany({ where: { userId, senseId: senses[1].senseId } });
    await ctx.prisma.sense.update({ where: { id: senses[2].senseId }, data: { state: 'retired' } });
    expect((await weakWords(userId)).items).toEqual([
      { sense_id: senses[0].senseId, lemma: senses[0].lemma, wrong: 3, counted: 5, level: 2, last_wrong_at: '2026-11-08T03:04:00.000Z' },
    ]);
  });

  it('weak words: newest last_wrong_at first, paged with page_token', async () => {
    const { userId, senses } = await learnerWith(3);
    await attempts(userId, senses[0], ['S', 'S'], [], new Date('2026-11-01T03:00:00Z'));
    await attempts(userId, senses[1], ['S', 'S'], [], new Date('2026-11-05T03:00:00Z'));
    await attempts(userId, senses[2], ['S', 'S'], [], new Date('2026-11-03T03:00:00Z'));
    const first = await weakWords(userId, '?page_size=2');
    expect(first.items.map((i) => i.sense_id)).toEqual([senses[1].senseId, senses[2].senseId]);
    const second = await weakWords(userId, `?page_size=2&page_token=${first.next_page_token}`);
    expect(second).toEqual({ items: [expect.objectContaining({ sense_id: senses[0].senseId })], next_page_token: null });
    expect((await practiceRequest(ctx, userId, 'get', '/weak-words?page_token=garbage')).status).toBe(400);
  });

  it('B4#15: history?date=2026-11-08 returns only that local date\'s items of the caller', async () => {
    const { userId, senses } = await learnerWith(1);
    await attempts(userId, senses[0], ['D'], [], new Date('2026-11-07T20:00:00Z')); // 03:00 on 8 Nov in Ho Chi Minh City
    const day = await attempts(userId, senses[0], ['S', 'D'], [], new Date('2026-11-08T03:00:00Z'));
    await ctx.prisma.practiceSessionItem.updateMany({ where: { userId, answeredAt: new Date('2026-11-07T20:00:00Z') }, data: { localDate: new Date('2026-11-07T00:00:00Z') } });
    const { items } = await history(userId, '?date=2026-11-08');
    expect(items.map((i) => i.item_id)).toEqual([...day.ids].reverse());
    expect(items[1]).toMatchObject({
      session_id: day.sessionId, sense_id: senses[0].senseId, lemma: senses[0].lemma, type: 'type_word', prompt_style: 'meaning',
      prompt: { kind: 'type_meaning' }, answer: 'zzz', correct: { lemma: senses[0].lemma, text: senses[0].lemma, choice_index: null, is_true: null },
      result: 'wrong', skipped: false, tries: 1, hint_level: 0, review_action: null, answered_at: '2026-11-08T03:00:00.000Z',
      local_date: '2026-11-08',
    });
  });

  it('history filters by sense_id and pages with page_token; void and unanswered items are absent', async () => {
    const { userId, senses } = await learnerWith(2);
    const a = await attempts(userId, senses[0], ['S', 'D', 'D']);
    await attempts(userId, senses[1], ['S']);
    await ctx.prisma.practiceSessionItem.update({ where: { id: a.ids[1] }, data: { result: 'void' } });
    await ctx.prisma.practiceSessionItem.update({ where: { id: a.ids[2] }, data: { result: null, answeredAt: null } });
    const extra = await attempts(userId, senses[0], ['D', 'S'], [], new Date('2026-11-08T04:00:00Z'));
    const first = await history(userId, `?sense_id=${senses[0].senseId}&page_size=2`);
    expect(first.items.map((i) => i.item_id)).toEqual([extra.ids[1], extra.ids[0]]);
    const second = await history(userId, `?sense_id=${senses[0].senseId}&page_size=2&page_token=${first.next_page_token}`);
    expect(second).toEqual({ items: [expect.objectContaining({ item_id: a.ids[0] })], next_page_token: null });
    // A token is bound to its filters.
    expect((await practiceRequest(ctx, userId, 'get', `/history?page_token=${first.next_page_token}`)).status).toBe(400);
    expect((await practiceRequest(ctx, userId, 'get', '/history?date=2026-13-01')).status).toBe(400);
  });

  it('Review Focus 5: another learner\'s items never appear in weak words or history', async () => {
    const mine = await learnerWith(1);
    const theirs = await learnerWith(1);
    await attempts(theirs.userId, theirs.senses[0], ['S', 'S']);
    await attempts(theirs.userId, mine.senses[0], ['S', 'S']);
    expect((await weakWords(mine.userId)).items).toEqual([]);
    expect((await history(mine.userId, '')).items).toEqual([]);
    expect((await history(mine.userId, `?sense_id=${mine.senses[0].senseId}`)).items).toEqual([]);
  });

  it('measurement: 6 months of 20 items a day for one learner → weak-words time printed', async () => {
    const { userId, senses } = await learnerWith(200);
    const start = new Date('2026-05-12T03:00:00Z');
    const session = await ctx.prisma.practiceSession.create({ data: {
      userId, source: 'all', sort: 'queue', types: ['type_word'], promptStyle: 'meaning', targetCount: 20,
      senseIds: [senses[0].senseId], status: 'finished', startedAt: start, lastActivityAt: start, endedAt: start,
    } });
    const question = await ctx.prisma.practiceQuestion.create({ data: {
      userId, senseId: senses[0].senseId, type: 'type_word', promptStyle: 'meaning', schemaVersion: 1, prompt: {},
      answerKey: { reveal: { lemma: senses[0].lemma } }, hints: {}, createdAt: start,
    } });
    const days = 180;
    const data = Array.from({ length: days * 20 }, (_, n) => {
      const at = new Date(start.getTime() + Math.floor(n / 20) * 86_400_000 + (n % 20) * 60_000);
      return {
        id: randomUUID(), sessionId: session.id, userId, questionId: question.id, senseId: senses[n % senses.length].senseId,
        round: 1, position: n + 1, askedAt: at, answeredAt: at, result: n % 3 === 0 ? 'wrong' : 'correct', tries: 1,
        localDate: new Date(`${at.toISOString().slice(0, 10)}T00:00:00Z`),
      };
    });
    await ctx.prisma.practiceSessionItem.createMany({ data });
    await ctx.prisma.$executeRaw`ANALYZE practice_session_items`;
    await weakWords(userId); // warm-up
    const timings: number[] = [];
    for (let i = 0; i < 3; i++) {
      const started = performance.now();
      await weakWords(userId);
      timings.push(performance.now() - started);
    }
    const median = [...timings].sort((a, b) => a - b)[1];
    console.log(`[Task 17] GET /v1/practice/weak-words, ${days * 20} items over 6 months: ${timings.map((t) => t.toFixed(0)).join(' / ')} ms (median ${median.toFixed(0)} ms, ASSUMPTION threshold ${WEAK_THRESHOLD_MS} ms)`);
    expect(median).toBeLessThan(WEAK_THRESHOLD_MS);
  }, 120_000);
});
