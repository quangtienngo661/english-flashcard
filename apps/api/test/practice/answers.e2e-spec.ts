import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntitlementsService } from '../../src/entitlements/index.js';
import { AnswersService } from '../../src/practice/answers/answers.service.js';
import { SettingsService } from '../../src/settings/index.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { nextItem, practiceRequest, seedPracticeGroup, seedPracticeUser, startPractice } from '../support/practice-helpers.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedPracticeSense, type SeedPracticeSenseOptions } from '../support/seed-practice.js';

const now = new Date('2026-11-08T03:00:00Z');

describe('practice answers (e2e, isolated database)', () => {
  let ctx: TestApp;
  let counter = 0;
  const entitlement = { allowed: true };

  /** A learner practising `lemma` (plus `extra` group mates) with the given types; returns the first item. */
  const itemFor = async (
    types: string[], opts: Partial<SeedPracticeSenseOptions> & { extra?: number; level?: number; dueDate?: string } = {},
  ) => {
    const userId = await seedPracticeUser(ctx.prisma);
    const lemma = opts.lemma ?? `word${(counter += 1)}`;
    const { senseId } = await seedPracticeSense(ctx.prisma, { glossVi: `nghĩa ${lemma}`, definitionEn: `meaning of ${lemma}`, ...opts, lemma });
    const mates: string[] = [];
    for (let i = 0; i < (opts.extra ?? 0); i++) {
      mates.push((await seedPracticeSense(ctx.prisma, { lemma: `mate${(counter += 1)}`, glossVi: `khác ${counter}` })).senseId);
    }
    const groupId = await seedPracticeGroup(ctx.prisma, userId, 'G', [senseId, ...mates],
      (i) => (i === 0 ? { level: opts.level ?? 0, dueDate: opts.dueDate } : {}));
    const start = await startPractice(ctx, userId, { source: 'group', group_id: groupId, types, prompt_style: 'meaning', sort: 'queue' });
    expect(start.status, JSON.stringify(start.body)).toBe(201);
    const sessionId = start.body.session.id as string;
    const next = await nextItem(ctx, userId, sessionId);
    expect(next.body.state).toBe('question');
    return { userId, senseId, sessionId, groupId, itemId: next.body.item.item_id as string, item: next.body.item };
  };
  const answer = (userId: string, itemId: string, body: object, key?: string) =>
    practiceRequest(ctx, userId, 'post', `/items/${itemId}/answer`, body, key);
  const row = (itemId: string) => ctx.prisma.practiceSessionItem.findUniqueOrThrow({ where: { id: itemId } });
  const setPractice = async (values: Record<string, number | null>) => {
    const settings = ctx.app.get(SettingsService);
    const { version } = await settings.current();
    await settings.update(randomUUID(), version, { practice: values });
  };
  const expectProblem = (response: { status: number; body: { type?: string } }, status: number, slug: string) => {
    expect(response.status, JSON.stringify(response.body)).toBe(status);
    expect(response.body.type).toMatch(new RegExp(`${slug}$`));
  };

  beforeAll(async () => {
    ctx = await createTestApp({
      databaseUrl: await createIsolatedDatabase(),
      providers: [{ provide: EntitlementsService, useValue: { check: async () => ({ allowed: entitlement.allowed }) } }],
    });
  });
  beforeEach(async () => {
    await ctx.prisma.practiceSession.deleteMany();
    await ctx.prisma.practiceQuestion.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.appSettingChange.deleteMany();
    await ctx.prisma.appSetting.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    ctx.clock.set(now);
    entitlement.allowed = true;
    vi.restoreAllMocks();
  });
  afterAll(async () => { await ctx?.close(); });

  it('B4#5, B4#6: "  Analyse " → correct; analyzed with default settings → try_again without the answer, then skip → wrong, skipped, with lemma, meaning and definition', async () => {
    const opts = { lemma: 'analyze', variants: ['analyse'], glossVi: 'phân tích', definitionEn: 'to examine in detail' };
    const first = await itemFor(['type_word'], opts);
    const right = await answer(first.userId, first.itemId, { text: '  Analyse ' });
    expect(right.status).toBe(200);
    expect(right.body).toMatchObject({ result: 'correct', skipped: false, tries: 1, hint_level: 0, correct: { lemma: 'analyze', text: 'analyze' } });
    expect(await row(first.itemId)).toMatchObject({ result: 'correct', answerRaw: '  Analyse ', answerNormalized: 'analyse', tries: 1 });

    await resetCatalog(ctx.prisma);
    const second = await itemFor(['type_word'], opts);
    const wrong = await answer(second.userId, second.itemId, { text: 'analyzed' });
    expect(wrong.status).toBe(200);
    expect(wrong.body).toEqual({ result: 'try_again', tries: 1 });
    expect(await row(second.itemId)).toMatchObject({ result: null, answeredAt: null, tries: 1, answersTried: ['analyzed'] });
    const skip = await practiceRequest(ctx, second.userId, 'post', `/items/${second.itemId}/skip`);
    expect(skip.status).toBe(200);
    expect(skip.body).toMatchObject({
      result: 'wrong', skipped: true, tries: 1, correct: { lemma: 'analyze', text: 'analyze', choice_index: null, is_true: null },
      meaning: 'phân tích', definition_en: 'to examine in detail', show_known: false, highlight_needs_review: true,
    });
    expect(await row(second.itemId)).toMatchObject({ result: 'wrong', skipped: true, answerRaw: 'analyzed', answersTried: [] });
  });

  it('B4#7: "" and 101 code points → 400, no tries recorded', async () => {
    const { userId, itemId } = await itemFor(['type_word']);
    for (const text of ['', '   ', 'a'.repeat(101)]) {
      const response = await answer(userId, itemId, { text });
      expectProblem(response, 400, 'validation-failed');
    }
    expect(await row(itemId)).toMatchObject({ tries: 0, result: null, answersTried: [] });
    // Exactly 100 code points is accepted (and wrong).
    expect((await answer(userId, itemId, { text: '😀'.repeat(100) })).body).toEqual({ result: 'try_again', tries: 1 });
  });

  it('B4#8: max_retries 2 → try_again, try_again, then wrong with the answer and highlight_needs_review; B4#8b: wrong then right → correct, tries 2', async () => {
    await setPractice({ type_word_max_retries: 2 });
    const a = await itemFor(['type_word'], { lemma: 'deploy' });
    expect((await answer(a.userId, a.itemId, { text: 'deplyo' })).body).toEqual({ result: 'try_again', tries: 1 });
    expect((await answer(a.userId, a.itemId, { text: 'deplou' })).body).toEqual({ result: 'try_again', tries: 2 });
    const last = await answer(a.userId, a.itemId, { text: 'deplot' });
    expect(last.body).toMatchObject({ result: 'wrong', tries: 3, skipped: false, correct: { text: 'deploy' }, highlight_needs_review: true, show_known: false });
    expect(await row(a.itemId)).toMatchObject({ answersTried: ['deplyo', 'deplou'], answerRaw: 'deplot', maxRetries: 2 });

    await resetCatalog(ctx.prisma);
    const b = await itemFor(['type_word'], { lemma: 'deploy' });
    await answer(b.userId, b.itemId, { text: 'deplyo' });
    expect((await answer(b.userId, b.itemId, { text: 'Deploy' })).body).toMatchObject({ result: 'correct', tries: 2 });
  });

  it('B4E25: changing type_word_max_retries mid-item keeps the item\'s copy', async () => {
    await setPractice({ type_word_max_retries: 1 });
    const { userId, itemId } = await itemFor(['type_word'], { lemma: 'deploy' });
    await setPractice({ type_word_max_retries: null });
    expect((await answer(userId, itemId, { text: 'x' })).body).toEqual({ result: 'try_again', tries: 1 });
    expect((await answer(userId, itemId, { text: 'y' })).body).toMatchObject({ result: 'wrong', tries: 2 });
  });

  it('B4E2: two concurrent answers with different keys → one stored, the other 409 already-answered with the stored result', async () => {
    const { userId, itemId } = await itemFor(['true_false_definition'], { extra: 1 });
    const [a, b] = await Promise.all([answer(userId, itemId, { is_true: true }), answer(userId, itemId, { is_true: false })]);
    const ok = [a, b].find((r) => r.status === 200)!;
    const refused = [a, b].find((r) => r.status === 409)!;
    expect(ok).toBeDefined();
    expectProblem(refused, 409, 'already-answered');
    expect(refused.body.result).toEqual(ok.body);
    expect((await row(itemId)).answerRaw).toBe(ok === a ? 'true' : 'false');
  });

  it('B4E3: the same key and body → the same response, graded once; B4E4: the same key, another body → 400', async () => {
    const { userId, itemId } = await itemFor(['type_word'], { lemma: 'deploy' });
    const key = randomUUID();
    const first = await answer(userId, itemId, { text: 'wrong' }, key);
    const again = await answer(userId, itemId, { text: 'wrong' }, key);
    expect(again.status).toBe(first.status);
    expect(again.body).toEqual(first.body);
    expect((await row(itemId)).tries).toBe(1);
    expect((await answer(userId, itemId, { text: 'other' }, key)).status).toBe(400);
  });

  it('B4E28: in try_again, two concurrent tries where one is the right word → processed in turn', async () => {
    const { userId, itemId } = await itemFor(['type_word'], { lemma: 'deploy' });
    await answer(userId, itemId, { text: 'x' });
    const [right, wrong] = await Promise.all([answer(userId, itemId, { text: 'deploy' }), answer(userId, itemId, { text: 'y' })]);
    expect(right.status).toBe(200);
    expect(right.body.result).toBe('correct');
    if (wrong.status === 409) {
      expectProblem(wrong, 409, 'already-answered');
      expect(right.body.tries).toBe(2);
    } else {
      expect(wrong.body).toEqual({ result: 'try_again', tries: 2 });
      expect(right.body.tries).toBe(3);
    }
    expect(await row(itemId)).toMatchObject({ result: 'correct', answerRaw: 'deploy' });
  });

  it('B4#25: a reload while in try_again → current shows state try_again and tries, no answer', async () => {
    const { userId, itemId } = await itemFor(['type_word'], { lemma: 'deploy', glossVi: 'triển khai', definitionEn: 'to put into use' });
    await answer(userId, itemId, { text: 'x' });
    const current = await practiceRequest(ctx, userId, 'get', '/sessions/current');
    expect(current.body.item).toMatchObject({ item_id: itemId, state: 'try_again', tries: 1 });
    expect(JSON.stringify(current.body)).not.toContain('deploy');
  });

  it('session-closed: after the session was abandoned (B4E5), answer, hint and skip on its pending item → 409 session-closed, nothing stored', async () => {
    const { userId, itemId, groupId } = await itemFor(['type_word'], { lemma: 'deploy' });
    await answer(userId, itemId, { text: 'x' });
    expect((await startPractice(ctx, userId, { source: 'group', group_id: groupId, types: ['type_word'] })).status).toBe(201);
    expectProblem(await answer(userId, itemId, { text: 'deploy' }), 409, 'session-closed');
    expectProblem(await practiceRequest(ctx, userId, 'post', `/items/${itemId}/hint`, { level: 1 }), 409, 'session-closed');
    expectProblem(await practiceRequest(ctx, userId, 'post', `/items/${itemId}/skip`), 409, 'session-closed');
    expect(await row(itemId)).toMatchObject({ result: null, tries: 1, hintLevel: 0 });
  });

  it('idle: 25 h after the last activity an item route → 409 session-closed and the session reads abandoned', async () => {
    const { userId, itemId, sessionId } = await itemFor(['type_word'], { lemma: 'deploy' });
    ctx.clock.set(new Date(now.getTime() + 25 * 3_600_000));
    expectProblem(await answer(userId, itemId, { text: 'deploy' }), 409, 'session-closed');
    expect((await ctx.prisma.practiceSession.findUniqueOrThrow({ where: { id: sessionId } })).status).toBe('abandoned');
  });

  it('item-void: answer, hint and skip on a voided item → 409 item-void', async () => {
    const { userId, itemId, senseId, sessionId } = await itemFor(['type_word'], { lemma: 'deploy', extra: 1 });
    await ctx.prisma.sense.update({ where: { id: senseId }, data: { state: 'retired' } });
    expect((await nextItem(ctx, userId, sessionId)).body.notice).toBe('word-not-found');
    expectProblem(await answer(userId, itemId, { text: 'deploy' }), 409, 'item-void');
    expectProblem(await practiceRequest(ctx, userId, 'post', `/items/${itemId}/hint`, { level: 1 }), 409, 'item-void');
    expectProblem(await practiceRequest(ctx, userId, 'post', `/items/${itemId}/skip`), 409, 'item-void');
  });

  it('another learner\'s item → 404 on answer, hint and skip', async () => {
    const { itemId } = await itemFor(['type_word']);
    const other = await seedPracticeUser(ctx.prisma);
    expect((await answer(other, itemId, { text: 'x' })).status).toBe(404);
    expect((await practiceRequest(ctx, other, 'post', `/items/${itemId}/hint`, { level: 1 })).status).toBe(404);
    expect((await practiceRequest(ctx, other, 'post', `/items/${itemId}/skip`)).status).toBe(404);
  });

  it('a body that does not fit the item\'s type → 400', async () => {
    const { userId, itemId } = await itemFor(['type_word']);
    expectProblem(await answer(userId, itemId, { choice: 1 }), 400, 'validation-failed');
    expectProblem(await answer(userId, itemId, { is_true: true }), 400, 'validation-failed');
    expectProblem(await answer(userId, itemId, { text: 'a', choice: 1 }), 400, 'validation-failed');
    expect((await row(itemId)).tries).toBe(0);
  });

  it('B4E12, B4E13: hint after the final result → 409 already-answered; level 2 on multiple choice → 409 hint-unavailable', async () => {
    const mcq = await itemFor(['mcq_definition'], { extra: 3 });
    expectProblem(await practiceRequest(ctx, mcq.userId, 'post', `/items/${mcq.itemId}/hint`, { level: 2 }), 409, 'hint-unavailable');
    const hint = await practiceRequest(ctx, mcq.userId, 'post', `/items/${mcq.itemId}/hint`, { level: 1 });
    expect(hint.status).toBe(200);
    expect(hint.body).toMatchObject({ level: 1, hint: { kind: 'definition' } });
    await answer(mcq.userId, mcq.itemId, { choice: 0 });
    expectProblem(await practiceRequest(ctx, mcq.userId, 'post', `/items/${mcq.itemId}/hint`, { level: 1 }), 409, 'already-answered');
    expect((await row(mcq.itemId)).hintLevel).toBe(1);
  });

  it('B4E27: a hint between two tries, then correct → correct with hint_level 1 and show_known false', async () => {
    const { userId, itemId } = await itemFor(['type_word'], { lemma: 'deploy' });
    await answer(userId, itemId, { text: 'x' });
    const level2 = await practiceRequest(ctx, userId, 'post', `/items/${itemId}/hint`, { level: 2 });
    expect(level2.body).toEqual({ level: 2, hint: { first_letter: 'd', length: 6 } });
    // Asking level 1 afterwards keeps the highest level seen.
    await practiceRequest(ctx, userId, 'post', `/items/${itemId}/hint`, { level: 1 });
    const right = await answer(userId, itemId, { text: 'deploy' });
    expect(right.body).toMatchObject({ result: 'correct', hint_level: 2, show_known: false, highlight_needs_review: false });
  });

  it('B4E26: skip after the final result, on multiple choice, or before the first try → 409', async () => {
    const typing = await itemFor(['type_word'], { lemma: 'deploy' });
    expectProblem(await practiceRequest(ctx, typing.userId, 'post', `/items/${typing.itemId}/skip`), 409, 'skip-not-allowed');
    await answer(typing.userId, typing.itemId, { text: 'deploy' });
    expectProblem(await practiceRequest(ctx, typing.userId, 'post', `/items/${typing.itemId}/skip`), 409, 'already-answered');
    await resetCatalog(ctx.prisma);
    const mcq = await itemFor(['mcq_definition'], { extra: 3 });
    expectProblem(await practiceRequest(ctx, mcq.userId, 'post', `/items/${mcq.itemId}/skip`), 409, 'skip-not-allowed');
  });

  it('B4#9 (flag): correct without hint on a due word → show_known true; a word not yet due → false; removed from learning → no button', async () => {
    const due = await itemFor(['type_word'], { lemma: 'deploy' });
    expect((await answer(due.userId, due.itemId, { text: 'deploy' })).body).toMatchObject({ show_known: true, highlight_needs_review: false });
    await resetCatalog(ctx.prisma);
    const early = await itemFor(['type_word'], { lemma: 'deploy', level: 2, dueDate: '2026-11-20' });
    expect((await answer(early.userId, early.itemId, { text: 'deploy' })).body).toMatchObject({ show_known: false });
    await resetCatalog(ctx.prisma);
    const gone = await itemFor(['type_word'], { lemma: 'deploy' });
    await ctx.prisma.learningItem.deleteMany({ where: { userId: gone.userId } });
    expect((await answer(gone.userId, gone.itemId, { text: 'nope' })).body).toEqual({ result: 'try_again', tries: 1 });
    expect((await practiceRequest(ctx, gone.userId, 'post', `/items/${gone.itemId}/skip`)).body)
      .toMatchObject({ result: 'wrong', show_known: false, highlight_needs_review: false });
  });

  it('B4E17: an answer after a zone change gets the new zone\'s local_date', async () => {
    const at = new Date('2026-11-08T12:00:00Z'); // 19:00 in Ho Chi Minh City, 02:00 on 9 Nov in Kiritimati
    ctx.clock.set(at);
    const { userId, itemId } = await itemFor(['type_word'], { lemma: 'deploy' });
    await ctx.prisma.user.update({ where: { id: userId }, data: { timezone: 'Pacific/Kiritimati' } });
    await answer(userId, itemId, { text: 'deploy' });
    expect(await row(itemId)).toMatchObject({ localDate: new Date('2026-11-09T00:00:00Z'), answeredAt: at });
  });

  it('Review Focus 4: a sense retired between next and answer → still graded', async () => {
    const { userId, itemId, senseId } = await itemFor(['type_word'], { lemma: 'deploy' });
    await ctx.prisma.sense.update({ where: { id: senseId }, data: { state: 'retired' } });
    expect((await answer(userId, itemId, { text: 'deploy' })).body).toMatchObject({ result: 'correct', correct: { lemma: 'deploy' } });
  });

  it('B4E39: a 101-code-point answer leaves no log line containing it', async () => {
    const { userId, itemId } = await itemFor(['type_word']);
    const secret = `zq${'x'.repeat(99)}`;
    expect((await answer(userId, itemId, { text: secret })).status).toBe(400);
    expect(JSON.stringify(ctx.logs)).not.toContain(secret);
  });

  it('B4E23: writeFinal throws once → 500 for that call, nothing stored, not a wrong answer; the same key then grades once', async () => {
    const { userId, itemId } = await itemFor(['type_word'], { lemma: 'deploy' });
    vi.spyOn(ctx.app.get(AnswersService), 'writeFinal').mockRejectedValueOnce(new Error('boom'));
    const key = randomUUID();
    expect((await answer(userId, itemId, { text: 'deploy' }, key)).status).toBe(500);
    expect(await row(itemId)).toMatchObject({ result: null, tries: 0 });
    expect((await answer(userId, itemId, { text: 'deploy' }, key)).body).toMatchObject({ result: 'correct', tries: 1 });
  });

  it('ER4 / D25: with the entitlement fake answering allowed:false after the question was built, the answer is still graded', async () => {
    const { userId, itemId } = await itemFor(['type_word'], { lemma: 'deploy' });
    entitlement.allowed = false;
    expect((await answer(userId, itemId, { text: 'deploy' })).body).toMatchObject({ result: 'correct' });
  });

  it('answer_raw is "2" for the third option, "false" for true/false, and the typed text for typing', async () => {
    const mcq = await itemFor(['mcq_definition'], { extra: 3 });
    const picked = await answer(mcq.userId, mcq.itemId, { choice: 2 });
    expect(picked.status).toBe(200);
    expect(picked.body.correct.choice_index).toEqual(expect.any(Number));
    expect(picked.body.result).toBe(picked.body.correct.choice_index === 2 ? 'correct' : 'wrong');
    expect(await row(mcq.itemId)).toMatchObject({ answerRaw: '2', answerNormalized: '2' });
    await resetCatalog(ctx.prisma);
    const tf = await itemFor(['true_false_definition'], { extra: 1 });
    await answer(tf.userId, tf.itemId, { is_true: false });
    expect(await row(tf.itemId)).toMatchObject({ answerRaw: 'false', answerNormalized: 'false' });
    await resetCatalog(ctx.prisma);
    const typing = await itemFor(['type_word'], { lemma: 'deploy' });
    await answer(typing.userId, typing.itemId, { text: ' DEPLOY ' });
    expect(await row(typing.itemId)).toMatchObject({ answerRaw: ' DEPLOY ', answerNormalized: 'deploy' });
  });
});
