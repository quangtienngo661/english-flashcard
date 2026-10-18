import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS } from '../../src/identity/identity.types.js';
import { PRIVATE_MEANING_MASK, PRIVATE_WORD_MASK } from '../../src/practice/practice.constants.js';
import type { AnswerKey, Hints, Prompt, QuestionType } from '../../src/practice/practice.types.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { testConfig } from '../support/test-config.js';

const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const now = new Date('2026-11-08T03:00:00Z');
const minute = 60_000;
const reveal = { lemma: 'deploy', meaning: 'triển khai', definition_en: 'to put software into use' };
const noHints: Hints = { level1: null, level2: null };
const mcqPrompt: Prompt = {
  kind: 'mcq', meaning: 'triển khai', meaning_language: 'vi', context_label: null, options: ['release', 'standup', 'deploy', 'merge'],
};
const mcqKey = (privateOption = false): AnswerKey => ({
  reveal, asked_private: false, kind: 'mcq', correct_index: 2, option_private: [false, privateOption, false, false],
});

describe('practice reports (e2e, isolated database)', () => {
  let ctx: TestApp;

  const learner = async () => {
    const { userId, email } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    return { userId, email, token: (await startSession(ctx, userId)).accessToken };
  };
  const staff = async (staffRole: 'admin' | 'editor' = 'admin') => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, staffRole });
    return { userId, token: (await startSession(ctx, userId)).accessToken };
  };
  /** One session, question and item seeded in SQL with Task 8's shapes and answer_raw formats. */
  const seedItem = async (userId: string, opts: {
    type?: QuestionType; prompt?: Prompt; answerKey?: AnswerKey; hints?: Hints; status?: string;
    item?: { answerRaw?: string | null; answersTried?: string[]; result?: string | null; hintLevel?: number };
  } = {}) => {
    const senseId = randomUUID();
    const session = await ctx.prisma.practiceSession.create({ data: {
      userId, source: 'all', sort: 'queue', types: [opts.type ?? 'mcq_definition'], promptStyle: 'meaning', targetCount: 10,
      senseIds: [senseId], status: opts.status ?? 'finished', startedAt: now, lastActivityAt: now,
    } });
    const question = await ctx.prisma.practiceQuestion.create({ data: {
      userId, senseId, type: opts.type ?? 'mcq_definition', promptStyle: 'meaning', schemaVersion: 1,
      prompt: opts.prompt ?? mcqPrompt, answerKey: opts.answerKey ?? mcqKey(), hints: opts.hints ?? noHints,
      distractorSenseIds: [randomUUID(), randomUUID(), randomUUID()], createdAt: now,
    } });
    const answerRaw = opts.item && 'answerRaw' in opts.item ? opts.item.answerRaw : '0';
    const result = opts.item && 'result' in opts.item ? opts.item.result : 'wrong';
    return ctx.prisma.practiceSessionItem.create({ data: {
      sessionId: session.id, userId, questionId: question.id, senseId, round: 1, position: 1, askedAt: now,
      answeredAt: result === null ? null : now, answerRaw, answerNormalized: answerRaw, answersTried: opts.item?.answersTried ?? [],
      tries: answerRaw === null ? 0 : 1, result, hintLevel: opts.item?.hintLevel ?? 0,
    } });
  };
  const report = (token: string, itemId: string, body: object = { reason: 'meaning_wrong' }) =>
    ctx.http().post(`/v1/practice/items/${itemId}/report`).set('Authorization', `Bearer ${token}`).send(body);
  const list = (token: string, query = '') =>
    ctx.http().get(`/v1/admin/practice/reports${query}`).set('Authorization', `Bearer ${token}`);
  const resolve = (token: string, id: string, status: string) => ctx.http().post(`/v1/admin/practice/reports/${id}/resolve`)
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID()).send({ status });
  const seedStoredReports = (userId: string, count: number, createdAt: (i: number) => Date) =>
    ctx.prisma.practiceReport.createMany({ data: Array.from({ length: count }, (_, i) => ({
      userId, itemId: null, senseId: randomUUID(), questionSnapshot: {}, reason: 'other', createdAt: createdAt(i),
    })) });

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config });
  });
  beforeEach(async () => {
    await ctx.prisma.practiceReport.deleteMany();
    await ctx.prisma.practiceSession.deleteMany();
    await ctx.prisma.practiceQuestion.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.appSettingChange.deleteMany();
    await ctx.prisma.appSetting.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(now);
    ctx.rolePermissions.admin = [...ROLE_PERMISSIONS.admin];
    ctx.rolePermissions.editor = [...ROLE_PERMISSIONS.editor];
  });
  afterAll(async () => { await ctx?.close(); });

  it('B4#14 (report flow): report a wrong attempt → staff lists it without the reporter; resolve no_error', async () => {
    const me = await learner();
    const admin = await staff();
    const item = await seedItem(me.userId);
    const created = await report(me.token, item.id, { reason: 'graded_wrong', note: '  release cũng đúng  ' });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(String), item_id: item.id, sense_id: item.senseId, reason: 'graded_wrong', note: 'release cũng đúng',
      status: 'open', created_at: now.toISOString(),
    });

    const open = await list(admin.token, '?status=open');
    expect(open.status).toBe(200);
    expect(open.body).toEqual({ items: [{
      id: created.body.id, sense_id: item.senseId, reason: 'graded_wrong', note: 'release cũng đúng', status: 'open',
      question_snapshot: {
        type: 'mcq_definition', prompt: mcqPrompt, correct: { ...reveal, option_index: 2 }, hints_shown: noHints,
        learner: { answer: 'release', answers_tried: [], result: 'wrong', hint_level: 0 },
      },
      created_at: now.toISOString(), resolved_at: null, resolved_by: null,
    }], next_page_token: null });
    const text = JSON.stringify(open.body);
    expect(text).not.toContain(me.userId);
    expect(text).not.toContain(me.email);

    ctx.clock.advance(minute);
    const resolved = await resolve(admin.token, created.body.id, 'no_error');
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({
      id: created.body.id, status: 'no_error', resolved_by: admin.userId, resolved_at: new Date(now.getTime() + minute).toISOString(),
    });
    expect(await ctx.prisma.practiceReport.findUniqueOrThrow({ where: { id: created.body.id } }))
      .toMatchObject({ status: 'no_error', resolvedBy: admin.userId, resolvedAt: new Date(now.getTime() + minute) });
    expect((await list(admin.token, '?status=open')).body.items).toEqual([]);
    expect((await list(admin.token, '?status=no_error')).body.items).toEqual([expect.objectContaining({ id: created.body.id })]);
  });

  it('the staff list pages by page_size and page_token, newest first; a token from another filter → 400', async () => {
    const me = await learner();
    const admin = await staff();
    const first = await report(me.token, (await seedItem(me.userId)).id);
    ctx.clock.advance(minute);
    const second = await report(me.token, (await seedItem(me.userId)).id);
    const page1 = await list(admin.token, '?page_size=1');
    expect(page1.body.items.map((r: { id: string }) => r.id)).toEqual([second.body.id]);
    expect(page1.body.next_page_token).toEqual(expect.any(String));
    const page2 = await list(admin.token, `?page_size=1&page_token=${page1.body.next_page_token}`);
    expect(page2.body).toEqual({ items: [expect.objectContaining({ id: first.body.id })], next_page_token: null });
    const crossed = await list(admin.token, `?status=open&page_size=1&page_token=${page1.body.next_page_token}`);
    expect(crossed.status).toBe(400);
    expect(crossed.body.type).toBe(problem('validation-failed'));
    expect((await list(admin.token, '?status=closed')).status).toBe(400);
  });

  it('B4#17: a staff member without content.edit → 403', async () => {
    const me = await learner();
    const editor = await staff('editor');
    const created = await report(me.token, (await seedItem(me.userId)).id);
    ctx.rolePermissions.editor = ROLE_PERMISSIONS.editor.filter((permission) => permission !== 'content.edit');
    const listed = await list(editor.token);
    expect(listed.status).toBe(403);
    expect(listed.body.type).toBe(problem('forbidden'));
    const refused = await resolve(editor.token, created.body.id, 'fixed');
    expect(refused.status).toBe(403);
    expect(refused.body.type).toBe(problem('forbidden'));
    // A learner is refused too.
    expect((await list(me.token)).status).toBe(403);
    expect(await ctx.prisma.practiceReport.findUniqueOrThrow({ where: { id: created.body.id } }))
      .toMatchObject({ status: 'open', resolvedBy: null, resolvedAt: null });
    // With content.edit the same editor may resolve.
    ctx.rolePermissions.editor = [...ROLE_PERMISSIONS.editor];
    expect((await resolve(editor.token, created.body.id, 'fixed')).body).toMatchObject({ status: 'fixed', resolved_by: editor.userId });
  });

  it('B4E20: second report → 409 with the first', async () => {
    const me = await learner();
    const item = await seedItem(me.userId);
    const first = await report(me.token, item.id, { reason: 'meaning_wrong', note: 'sai nghĩa' });
    const second = await report(me.token, item.id, { reason: 'other' });
    expect(second.status).toBe(409);
    expect(second.body.type).toBe(problem('report-exists'));
    expect(second.body.report).toEqual(first.body);
    expect(await ctx.prisma.practiceReport.findMany({ where: { userId: me.userId } }))
      .toEqual([expect.objectContaining({ id: first.body.id, reason: 'meaning_wrong', note: 'sai nghĩa' })]);
  });

  it('B4E21: the item cleaned up → the report stays with item_id null and its snapshot', async () => {
    const me = await learner();
    const admin = await staff();
    const item = await seedItem(me.userId);
    const created = await report(me.token, item.id);
    const before = await ctx.prisma.practiceReport.findUniqueOrThrow({ where: { id: created.body.id } });
    await ctx.prisma.practiceSessionItem.delete({ where: { id: item.id } });
    const after = await ctx.prisma.practiceReport.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(after).toEqual({ ...before, itemId: null });
    expect((await list(admin.token)).body.items).toEqual([expect.objectContaining({
      id: created.body.id, status: 'open', question_snapshot: before.questionSnapshot,
    })]);
  });

  it('B4#28 / B4E48: a catalog question with a private option the learner chose → no field of the staff response contains the private lemma', async () => {
    const me = await learner();
    const admin = await staff();
    const item = await seedItem(me.userId, { answerKey: mcqKey(true), item: { answerRaw: '1', result: 'wrong' } });
    expect((await report(me.token, item.id, { reason: 'graded_wrong' })).status).toBe(201);
    const listed = await list(admin.token);
    expect(listed.body.items[0].question_snapshot).toMatchObject({
      prompt: { options: ['release', PRIVATE_WORD_MASK, 'deploy', 'merge'] }, learner: { answer: PRIVATE_WORD_MASK },
    });
    expect(JSON.stringify(listed.body)).not.toContain('standup');
    // The stored row holds no copy of it either, so deleting the private word later changes nothing.
    const stored = await ctx.prisma.practiceReport.findFirstOrThrow({ where: { userId: me.userId } });
    expect(JSON.stringify(stored)).not.toContain('standup');
  });

  it('B4E49: a true/false paired with a private meaning → the meaning is masked', async () => {
    const me = await learner();
    const admin = await staff();
    const item = await seedItem(me.userId, {
      type: 'true_false_definition',
      prompt: { kind: 'true_false', lemma: 'deploy', meaning: 'buổi họp đứng', meaning_language: 'vi', context_label: null },
      answerKey: { reveal, asked_private: false, kind: 'true_false', is_true: false, paired_private: true },
      item: { answerRaw: 'true', result: 'wrong' },
    });
    expect((await report(me.token, item.id)).status).toBe(201);
    const listed = await list(admin.token);
    expect(listed.body.items[0].question_snapshot).toMatchObject({
      prompt: { kind: 'true_false', lemma: 'deploy', meaning: PRIVATE_MEANING_MASK }, learner: { answer: 'true' },
    });
    expect(JSON.stringify(listed.body)).not.toContain('họp đứng');
  });

  it('B4#29 / B4E47: a question whose word is private → 409 report-not-available, nothing stored', async () => {
    const me = await learner();
    const item = await seedItem(me.userId, {
      type: 'type_word', prompt: { kind: 'type_meaning', meaning: 'buổi họp đứng', meaning_language: 'vi', context_label: null },
      answerKey: { reveal: { lemma: 'standup', meaning: 'buổi họp đứng', definition_en: null }, asked_private: true,
        kind: 'type_word', main: 'standup', accepted: ['standup'] },
    });
    const refused = await report(me.token, item.id);
    expect(refused.status).toBe(409);
    expect(refused.body.type).toBe(problem('report-not-available'));
    expect(await ctx.prisma.practiceReport.count()).toBe(0);
  });

  it('B4E40: the 21st report in an hour → 429 and 20 stored', async () => {
    const me = await learner();
    // The oldest counted report is 50 minutes old: it leaves the window in 10 minutes.
    await seedStoredReports(me.userId, 20, (i) => new Date(now.getTime() - (50 - i) * minute));
    // One older than an hour does not count.
    await seedStoredReports(me.userId, 1, () => new Date(now.getTime() - 61 * minute));
    const item = await seedItem(me.userId);
    const refused = await report(me.token, item.id);
    expect(refused.status).toBe(429);
    expect(refused.body.type).toBe(problem('rate-limited'));
    expect(refused.headers['retry-after']).toBe(String(10 * 60));
    expect(await ctx.prisma.practiceReport.count({ where: { userId: me.userId, createdAt: { gt: new Date(now.getTime() - 60 * minute) } } }))
      .toBe(20);
    expect(await ctx.prisma.practiceReport.count({ where: { itemId: item.id } })).toBe(0);
    // Another learner is not limited by it.
    const other = await learner();
    expect((await report(other.token, (await seedItem(other.userId)).id)).status).toBe(201);
    // Once the oldest leaves the window, the report goes through.
    ctx.clock.advance(10 * minute);
    expect((await report(me.token, item.id)).status).toBe(201);
  });

  it('a lower reports_per_hour applies on the next report', async () => {
    const me = await learner();
    const admin = await staff();
    await seedStoredReports(me.userId, 5, () => new Date(now.getTime() - minute));
    expect((await report(me.token, (await seedItem(me.userId)).id)).status).toBe(201);
    const settings = await ctx.http().put('/v1/admin/settings').set('Authorization', `Bearer ${admin.token}`)
      .set('Idempotency-Key', randomUUID()).send({ version: 0, values: { practice: { reports_per_hour: 5 } } });
    expect(settings.status).toBe(200);
    expect((await report(me.token, (await seedItem(me.userId)).id)).status).toBe(429);
  });

  it('two reports at once when 19 are stored → one 201, one 429', async () => {
    const me = await learner();
    await seedStoredReports(me.userId, 19, () => new Date(now.getTime() - minute));
    const [a, b] = [await seedItem(me.userId), await seedItem(me.userId)];
    const statuses = (await Promise.all([report(me.token, a.id), report(me.token, b.id)])).map((r) => r.status).sort();
    expect(statuses).toEqual([201, 429]);
    expect(await ctx.prisma.practiceReport.count({ where: { userId: me.userId } })).toBe(20);
  });

  it('two reports of one item at once → one 201, one 409 report-exists', async () => {
    const me = await learner();
    const item = await seedItem(me.userId);
    const responses = await Promise.all([report(me.token, item.id), report(me.token, item.id, { reason: 'other' })]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const created = responses.find((r) => r.status === 201)!;
    const refused = responses.find((r) => r.status === 409)!;
    expect(refused.body.type).toBe(problem('report-exists'));
    expect(refused.body.report).toEqual(created.body);
    expect(await ctx.prisma.practiceReport.count({ where: { itemId: item.id } })).toBe(1);
  });

  it('a hint_wrong report\'s snapshot carries the hints the learner saw', async () => {
    const me = await learner();
    const admin = await staff();
    const hints: Hints = { level1: { kind: 'example', text: 'We ___ on Friday.' }, level2: { first_letter: 'd', length: 6 } };
    const item = await seedItem(me.userId, {
      type: 'type_word', hints,
      prompt: { kind: 'type_meaning', meaning: 'triển khai', meaning_language: 'vi', context_label: null },
      answerKey: { reveal, asked_private: false, kind: 'type_word', main: 'deploy', accepted: ['deploy', 'deploys'] },
      item: { answerRaw: 'Deplo', answersTried: ['dep'], result: 'wrong', hintLevel: 1 },
    });
    expect((await report(me.token, item.id, { reason: 'hint_wrong' })).status).toBe(201);
    expect((await list(admin.token)).body.items[0]).toMatchObject({ reason: 'hint_wrong', question_snapshot: {
      correct: { main: 'deploy', accepted: ['deploy', 'deploys'] },
      hints_shown: { level1: hints.level1, level2: null },
      learner: { answer: 'Deplo', answers_tried: ['dep'], result: 'wrong', hint_level: 1 },
    } });
  });

  it('an item before its answer, in an abandoned session, can be reported', async () => {
    const me = await learner();
    const item = await seedItem(me.userId, { status: 'abandoned', item: { answerRaw: null, result: null } });
    expect((await report(me.token, item.id)).status).toBe(201);
    expect((await ctx.prisma.practiceReport.findFirstOrThrow({ where: { itemId: item.id } })).questionSnapshot)
      .toMatchObject({ learner: { answer: null, result: null } });
  });

  it('a note of 301 code points → 400; 300 emoji (600 UTF-16 units) after trim are accepted; a bad reason → 400', async () => {
    const me = await learner();
    const item = await seedItem(me.userId);
    for (const body of [{ reason: 'meaning_wrong', note: 'a'.repeat(301) }, { reason: 'typo' }, { reason: 'other', extra: 1 }]) {
      const refused = await report(me.token, item.id, body);
      expect(refused.status).toBe(400);
      expect(refused.body.type).toBe(problem('validation-failed'));
    }
    expect(await ctx.prisma.practiceReport.count()).toBe(0);
    const created = await report(me.token, item.id, { reason: 'other', note: `  ${'😀'.repeat(300)}\t` });
    expect(created.status).toBe(201);
    expect(created.body.note).toBe('😀'.repeat(300));
  });

  it('another learner\'s item → 404', async () => {
    const me = await learner();
    const other = await learner();
    const item = await seedItem(other.userId);
    for (const id of [item.id, randomUUID()]) {
      const refused = await report(me.token, id);
      expect(refused.status).toBe(404);
      expect(refused.body.type).toBe(problem('not-found'));
    }
    expect(await ctx.prisma.practiceReport.count()).toBe(0);
  });

  it('resolve a resolved report → 409 report-not-open; an unknown report → 404', async () => {
    const me = await learner();
    const admin = await staff();
    const created = await report(me.token, (await seedItem(me.userId)).id);
    expect((await resolve(admin.token, created.body.id, 'fixed')).status).toBe(200);
    const again = await resolve(admin.token, created.body.id, 'no_error');
    expect(again.status).toBe(409);
    expect(again.body.type).toBe(problem('report-not-open'));
    expect(await ctx.prisma.practiceReport.findUniqueOrThrow({ where: { id: created.body.id } })).toMatchObject({ status: 'fixed' });
    expect((await resolve(admin.token, randomUUID(), 'fixed')).status).toBe(404);
    expect((await resolve(admin.token, created.body.id, 'open')).status).toBe(400);
  });
});
