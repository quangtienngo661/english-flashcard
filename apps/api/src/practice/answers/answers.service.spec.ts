import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { ContentService, PracticeSense } from '../../content/index.js';
import type { EntitlementsService } from '../../entitlements/index.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import type { LearningService } from '../../learning/index.js';
import { deploy } from '../testing/ai-senses.js';
import type { ItemWithQuestion } from '../sessions/session-views.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import { AnswersService, type FinalWrite } from './answers.service.js';

const userId = '00000000-0000-4000-8000-000000000001';
const item = { id: 'it-1', userId, sessionId: 'sess-1' } as ItemWithQuestion;
const final: FinalWrite = {
  result: 'correct', answerRaw: '1', answerNormalized: '1', answersTried: [], tries: 1, skipped: false,
};

function setup(at: Date, record?: () => Promise<void>, activity?: () => Promise<void>) {
  const calls: string[] = [];
  const tx = {
    practiceSessionItem: {
      update: vi.fn(async ({ data }: { data: { localDate: Date } }) => {
        calls.push('update');
        return { ...item, localDate: data.localDate };
      }),
    },
  };
  const entitlements = {
    recordPracticeSession: vi.fn(record ?? (async () => { calls.push('record'); })),
  };
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) };
  const learning = { recordActivity: vi.fn(activity ?? (async () => { calls.push('activity'); })) };
  const service = new AnswersService({} as PrismaClient, new FakeClock(at), identity as unknown as IdentityService,
    learning as unknown as LearningService, {} as SessionsService, entitlements as unknown as EntitlementsService, {} as ContentService);
  return { service, tx: tx as unknown as Prisma.TransactionClient, rawTx: tx, entitlements, calls, identity, learning };
}

describe('AnswersService.writeFinal — records the practice session (Bước 5)', () => {
  it('B5E23: writeFinal records the session with the item\'s local_date (answered 00:01 local after a 23:58 start → the new date)', async () => {
    // 00:01 on 20/10 in Asia/Ho_Chi_Minh (UTC+7) = 17:01 UTC on 19/10.
    const { service, tx, rawTx, entitlements } = setup(new Date('2026-10-19T17:01:00Z'));
    await service.writeFinal(tx, item, final);
    expect(entitlements.recordPracticeSession).toHaveBeenCalledWith(tx, userId, 'sess-1', '2026-10-20');
    const written = rawTx.practiceSessionItem.update.mock.calls[0][0].data.localDate;
    expect(written.toISOString().slice(0, 10)).toBe('2026-10-20');
  });

  it('B5E77: a second final write calls recordPracticeSession again (the insert ignores it)', async () => {
    const { service, tx, entitlements } = setup(new Date('2026-10-19T03:00:00Z'));
    await service.writeFinal(tx, item, final);
    await service.writeFinal(tx, { ...item, id: 'it-2' } as ItemWithQuestion, final);
    expect(entitlements.recordPracticeSession).toHaveBeenCalledTimes(2);
    expect(entitlements.recordPracticeSession.mock.calls.map((call) => call.slice(1)))
      .toEqual([[userId, 'sess-1', '2026-10-19'], [userId, 'sess-1', '2026-10-19']]);
  });

  it('B5E27: recordPracticeSession throwing makes writeFinal reject', async () => {
    const boom = new Error('insert failed');
    const { service, tx } = setup(new Date('2026-10-19T03:00:00Z'), async () => { throw boom; });
    await expect(service.writeFinal(tx, item, final)).rejects.toBe(boom);
  });
});

describe('AnswersService.writeFinal — records a learning activity day (nhóm B M6, D39, B51)', () => {
  it('Review focus 1: an answer at 00:01 learner-local after a 23:58 start records the new date through the same tx, as the last write', async () => {
    const { service, tx, rawTx, learning, calls } = setup(new Date('2026-10-19T17:01:00Z'));
    await service.writeFinal(tx, item, final);
    expect(learning.recordActivity).toHaveBeenCalledExactlyOnceWith(userId, '2026-10-20', tx);
    // The date is the one written on the practice item.
    expect(rawTx.practiceSessionItem.update.mock.calls[0][0].data.localDate.toISOString().slice(0, 10)).toBe('2026-10-20');
    expect(calls).toEqual(['update', 'record', 'activity']);
  });

  it('a skip is a final result too: the same call, and a wrong answer counts as well', async () => {
    const { service, tx, learning } = setup(new Date('2026-10-19T03:00:00Z'));
    await service.writeFinal(tx, item, { result: 'wrong', answerRaw: null, answerNormalized: null, answersTried: [], tries: 0, skipped: true });
    await service.writeFinal(tx, item, { ...final, result: 'wrong' });
    expect(learning.recordActivity.mock.calls).toEqual([[userId, '2026-10-19', tx], [userId, '2026-10-19', tx]]);
  });

  it('recordActivity throwing makes writeFinal reject with that error', async () => {
    const boom = new Error('activity insert failed');
    const { service, tx } = setup(new Date('2026-10-19T03:00:00Z'), undefined, async () => { throw boom; });
    await expect(service.writeFinal(tx, item, final)).rejects.toBe(boom);
  });
});

// A mcq item the learner has not answered yet, with the parts `resultOf` and `writeFinal` read.
const mcqItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'it-1', userId, sessionId: 'sess-1', senseId: 'sense-1', result: null, tries: 0, sessionWordTries: 0, maxRetries: null, answersTried: [],
  hintLevel: 0, skipped: false,
  question: {
    type: 'mcq_definition', prompt: { kind: 'mcq', options: ['cat', 'dog'] }, hints: { level1: null, level2: null },
    answerKey: { kind: 'mcq', correct_index: 0, reveal: { lemma: 'cat', meaning: 'con meo', definition_en: null } },
  },
  ...overrides,
}) as unknown as ItemWithQuestion;

/** The route as the controller calls it, with every Learning / Identity read recorded by the client it was given. */
/** `session`: the senses of the session's words (`practiceSenses` returns them) and, when fewer, the ids that are still usable. */
function route(found: ItemWithQuestion, nativeLanguage: 'vi' | 'en' = 'vi',
  session: { senses: PracticeSense[]; usable?: string[]; due?: Record<string, boolean>; gone?: boolean } = { senses: [] }) {
  const reads: Array<{ read: string; db: unknown }> = [];
  const tx = {
    $queryRaw: vi.fn(async () => []),
    practiceSessionItem: {
      findUniqueOrThrow: vi.fn(async () => found),
      update: vi.fn(async () => ({ ...found, result: 'correct', tries: 1 })),
    },
  };
  const prisma = {
    practiceSessionItem: { findFirst: vi.fn(async () => ({ sessionId: 'sess-1' })) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const identity = { getProfile: vi.fn(async (_id: string, db?: unknown) => { reads.push({ read: 'getProfile', db }); return { timezone: 'UTC', native_language: nativeLanguage }; }) };
  const learning = {
    practiceCheck: vi.fn(async (_u: string, senseId: string, _g: null, db?: unknown) => {
      reads.push({ read: 'practiceCheck', db });
      return { item: { due_now: session.due?.[senseId] ?? true } };
    }),
    recordActivity: vi.fn(async () => undefined),
  };
  const sessions = {
    closeIfIdle: vi.fn(async () => undefined),
    lockOpen: vi.fn(async () => ({ id: 'sess-1', senseIds: session.senses.map((s) => s.sense_id) })),
    sessionWordIds: vi.fn(async () => {
      // The session's group was deleted in another tab: reading its items is a 404.
      if (session.gone) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
      return session.usable ?? session.senses.map((s) => s.sense_id);
    }),
  };
  const content = {
    practiceSenses: vi.fn(async (_user: string, ids: string[]) => new Map(session.senses.filter((s) => ids.includes(s.sense_id)).map((s) => [s.sense_id, s]))),
  };
  const entitlements = { recordPracticeSession: vi.fn(async () => undefined) };
  const service = new AnswersService(prisma as unknown as PrismaClient, new FakeClock(new Date('2026-10-19T03:00:00Z')),
    identity as unknown as IdentityService, learning as unknown as LearningService, sessions as unknown as SessionsService,
    entitlements as unknown as EntitlementsService, content as unknown as ContentService);
  return { service, tx, reads, learning, identity, sessions, content };
}

describe('AnswersService — reads inside the answer transaction use the transaction (PX4)', () => {
  it('PX4: writeFinal reads the profile through the transaction', async () => {
    const { service, tx, identity } = setup(new Date('2026-10-19T03:00:00Z'));
    await service.writeFinal(tx, item, final);
    expect(identity.getProfile).toHaveBeenCalledExactlyOnceWith(userId, tx);
  });

  it('PX4: a final answer reads the profile and the learning item through tx, never the global client', async () => {
    const found = mcqItem();
    const { service, tx, reads, learning } = route(found);
    await expect(service.answer(userId, 'it-1', { choice: 0 })).resolves.toMatchObject({ result: 'correct', show_known: true });
    expect(reads.map(({ read }) => read)).toEqual(['getProfile', 'practiceCheck']);
    expect(reads.every(({ db }) => db === tx)).toBe(true);
    expect(learning.practiceCheck).toHaveBeenCalledWith(userId, 'sense-1', null, tx);
  });

  it('PX4: answering an item that is already answered reads the learning item through tx for the 409 body', async () => {
    const { service, tx, learning } = route(mcqItem({ result: 'wrong' }));
    await expect(service.answer(userId, 'it-1', { choice: 0 })).rejects.toMatchObject({
      status: 409, problemType: 'already-answered', extensions: { result: { result: 'wrong' } },
    });
    expect(learning.practiceCheck).toHaveBeenCalledWith(userId, 'sense-1', null, tx);
  });
});

// Bước 7 question kinds (design §7.8, §8).
const aiItem = (question: Record<string, unknown>, overrides: Record<string, unknown> = {}) => mcqItem({
  question: { hints: { level1: null, level2: null }, ...question }, ...overrides,
});
const meaningQuestion = {
  type: 'meaning_in_sentence', prompt: { kind: 'meaning_in_sentence', sentence: 'We deployed it.', highlight: 'deployed',
    options: ['phát hành', 'triển khai', 'đăng', 'mỏ'], meaning_language: 'vi' },
  answerKey: { kind: 'mcq', correct_index: 1, option_private: [false, false, false, false], translation_vi: 'Chúng tôi đã triển khai.',
    reveal: { lemma: 'deploy', meaning: 'triển khai', definition_en: 'to move software' }, asked_private: false },
};
const clozeQuestion = (hints: Record<string, unknown> = { level1: { kind: 'first_letter', text: 'd' }, level2: null, level3: null }) => ({
  type: 'cloze', prompt: { kind: 'cloze', sentence: 'We ___ it.' }, hints,
  answerKey: { kind: 'type_word', main: 'deployed', accepted: ['deployed'], translation_vi: 'Chúng tôi triển khai.',
    reveal: { lemma: 'deploy', meaning: 'triển khai', definition_en: null }, asked_private: false },
});

// Session synonyms (design §3.1, §4.1): Lan's session holds `vital` (asked, "Sleep is ___ for good health.", crucial declared),
// `crucial` and `habit`.
describe('AnswersService — session words and alternative answers', () => {
  const crucial = deploy({ sense_id: 'sense-crucial', lemma: 'crucial', pos: 'adjective', inflections: [] });
  const habit = deploy({ sense_id: 'sense-habit', lemma: 'habit', pos: 'noun', inflections: [] });
  const words = { senses: [crucial, habit] };
  const vitalQuestion = (alsoAccepted: unknown[] = [{ form: 'crucial', private: false }]) => {
    const base = clozeQuestion();
    return {
      ...base,
      answerKey: {
        ...base.answerKey, main: 'vital', accepted: ['vital'], also_accepted: alsoAccepted, session_private: false,
        reveal: { lemma: 'vital', meaning: 'thiết yếu', definition_en: null },
      },
    };
  };
  const finalData = (t: ReturnType<typeof route>) =>
    (t.tx.practiceSessionItem.update.mock.calls as unknown as Array<[{ data: Record<string, unknown> }]>).at(-1)![0];

  it('CS2: a declared session word is a final right marked alternative, credited to the typed word', async () => {
    const t = route(aiItem(vitalQuestion()), 'vi', words);
    await expect(t.service.answer(userId, 'it-1', { text: 'Crucial.' })).resolves.toMatchObject({ result: 'correct' });
    expect(finalData(t).data).toMatchObject({
      result: 'correct', alternative: true, alternativeSenseId: 'sense-crucial', answerRaw: 'Crucial.', answerNormalized: 'crucial', tries: 1,
    });
  });

  it('CS1: the sentence\'s own answer is a plain right answer: no session word is read and no alternative is written', async () => {
    const t = route(aiItem(vitalQuestion()), 'vi', words);
    await t.service.answer(userId, 'it-1', { text: 'vital' });
    expect(t.sessions.sessionWordIds).not.toHaveBeenCalled();
    expect(t.content.practiceSenses).not.toHaveBeenCalled();
    expect(finalData(t).data).not.toHaveProperty('alternative');
  });

  it('CS3: another session word is a try-again with reason session_word and does not use up a try', async () => {
    const t = route(aiItem(vitalQuestion()), 'vi', words);
    await expect(t.service.answer(userId, 'it-1', { text: 'habit' })).resolves.toEqual({ result: 'try_again', tries: 1, reason: 'session_word' });
    expect(t.tx.practiceSessionItem.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'it-1' }, data: { answersTried: ['habit'], tries: 1, sessionWordTries: 1 },
    });
    expect(t.sessions.sessionWordIds).toHaveBeenCalledWith(t.tx, userId, expect.objectContaining({ id: 'sess-1' }));
  });

  it('CS12: with max_retries 3 and two tries used, a session word on the third is still a try-again', async () => {
    const t = route(aiItem(vitalQuestion(), { maxRetries: 3, tries: 2, answersTried: ['a', 'b'] }), 'vi', words);
    await expect(t.service.answer(userId, 'it-1', { text: 'habit' })).resolves.toEqual({ result: 'try_again', tries: 3, reason: 'session_word' });
    const capped = route(aiItem(vitalQuestion(), { maxRetries: 3, tries: 3, answersTried: ['a', 'b', 'c'] }), 'vi', words);
    await capped.service.answer(userId, 'it-1', { text: 'zzz' });
    expect(finalData(capped).data).toMatchObject({ result: 'wrong', tries: 4 });
  });

  it('with max_retries 1, one session-word try then one other wrong try is still a try-again; the next is final wrong', async () => {
    const afterSessionWord = route(aiItem(vitalQuestion(), { maxRetries: 1, tries: 1, sessionWordTries: 1, answersTried: ['habit'] }), 'vi', words);
    await expect(afterSessionWord.service.answer(userId, 'it-1', { text: 'zzz' })).resolves.toEqual({ result: 'try_again', tries: 2, reason: null });
    expect(afterSessionWord.tx.practiceSessionItem.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'it-1' }, data: { answersTried: ['habit', 'zzz'], tries: 2 },
    });
    const next = route(aiItem(vitalQuestion(), { maxRetries: 1, tries: 2, sessionWordTries: 1, answersTried: ['habit', 'zzz'] }), 'vi', words);
    await next.service.answer(userId, 'it-1', { text: 'yyy' });
    expect(finalData(next).data).toMatchObject({ result: 'wrong', tries: 3 });
  });

  it('CS4: an outside word keeps today\'s try-again with reason null', async () => {
    const t = route(aiItem(vitalQuestion()), 'vi', words);
    await expect(t.service.answer(userId, 'it-1', { text: 'important' })).resolves.toEqual({ result: 'try_again', tries: 1, reason: null });
    expect(t.tx.practiceSessionItem.update).toHaveBeenCalledExactlyOnceWith({ where: { id: 'it-1' }, data: { answersTried: ['important'], tries: 1 } });
  });

  it('CS19: a Bước 4 type_word question gets the session-word try-again too', async () => {
    const plain = { ...clozeQuestion(), type: 'type_word', prompt: { kind: 'type_sentence', sentence: 'We ___ it.' } };
    const t = route(aiItem(plain), 'vi', words);
    await expect(t.service.answer(userId, 'it-1', { text: 'habit' })).resolves.toEqual({ result: 'try_again', tries: 1, reason: 'session_word' });
    await expect(route(aiItem(plain), 'vi', words).service.answer(userId, 'it-1', { text: 'crucial' })).resolves
      .toEqual({ result: 'try_again', tries: 1, reason: 'session_word' });
  });

  it('CSE7: a word no longer usable in the session is an outside word', async () => {
    const t = route(aiItem(vitalQuestion()), 'vi', { senses: [crucial, habit], usable: [crucial.sense_id] });
    await expect(t.service.answer(userId, 'it-1', { text: 'habit' })).resolves.toEqual({ result: 'try_again', tries: 1, reason: null });
    const declared = route(aiItem(vitalQuestion()), 'vi', { senses: [crucial, habit], usable: [habit.sense_id] });
    await expect(declared.service.answer(userId, 'it-1', { text: 'crucial' })).resolves.toEqual({ result: 'try_again', tries: 1, reason: null });
  });

  it('CSE1: a declared word that is not in this session is an outside word', async () => {
    const t = route(aiItem(vitalQuestion()), 'vi', { senses: [habit] });
    await expect(t.service.answer(userId, 'it-1', { text: 'crucial' })).resolves.toEqual({ result: 'try_again', tries: 1, reason: null });
  });

  it('CSE3: a form of two session words is an alternative that credits nobody', async () => {
    const find = deploy({ sense_id: 'sense-find', lemma: 'find', pos: 'verb', inflections: [{ form: 'found', kind: 'past' }] });
    const found = deploy({ sense_id: 'sense-found', lemma: 'found', pos: 'verb', inflections: [] });
    const t = route(aiItem(vitalQuestion([{ form: 'found', private: false }])), 'vi', { senses: [find, found] });
    await t.service.answer(userId, 'it-1', { text: 'found' });
    expect(finalData(t).data).toMatchObject({ result: 'correct', alternative: true, alternativeSenseId: null });
  });

  describe('the reply of an alternative answer (design §3.2, §4.1)', () => {
    const typedCrucial = { ...crucial, meaning: { text: 'quan trọng', language: 'vi' as const, translation_missing: false } };
    const answered = (over: Record<string, unknown> = {}) => aiItem(vitalQuestion(), {
      result: 'correct', tries: 1, alternative: true, alternativeSenseId: 'sense-crucial', answerRaw: 'Crucial.', answerNormalized: 'crucial',
      reviewAction: null, alternativeReviewAction: null, ...over,
    });
    const context = { senses: [typedCrucial, habit], due: { 'sense-crucial': true, 'sense-1': false } };

    it('CS2: rows typed then asked, each with its own show_known and action; the card-level buttons stay off', async () => {
      const found = answered({ alternativeReviewAction: 'known' });
      const t = route(found, 'vi', context);
      const result = await t.service.resultOf(userId, found, t.tx as never);
      expect(result).toMatchObject({
        result: 'correct', show_known: false, highlight_needs_review: false, correct: { lemma: 'vital', text: 'vital' }, meaning: 'thiết yếu',
        alternative: {
          typed: 'Crucial.',
          rows: [
            { sense_id: 'sense-crucial', lemma: 'crucial', meaning: 'quan trọng', role: 'typed', show_known: true, action: 'known' },
            { sense_id: 'sense-1', lemma: 'vital', meaning: 'thiết yếu', role: 'asked', show_known: false, action: null },
          ],
        },
      });
    });

    it('the asked row reports its own review action', async () => {
      const found = answered({ reviewAction: 'needs_review' });
      const t = route(found, 'vi', context);
      const result = await t.service.resultOf(userId, found, t.tx as never) as { alternative: { rows: Array<{ role: string; action: string | null }> } };
      expect(result.alternative.rows.map((row) => [row.role, row.action])).toEqual([['typed', null], ['asked', 'needs_review']]);
    });

    it('CSE3: no credited word → only the asked row', async () => {
      const found = answered({ alternativeSenseId: null });
      const t = route(found, 'vi', context);
      const result = await t.service.resultOf(userId, found, t.tx as never) as { alternative: { typed: string; rows: Array<{ role: string }> } };
      expect(result.alternative.rows.map((row) => row.role)).toEqual(['asked']);
      expect(result.alternative.typed).toBe('Crucial.');
    });

    it('CSE10: after a hint neither row shows Know', async () => {
      const found = answered({ hintLevel: 1 });
      const t = route(found, 'vi', { senses: [typedCrucial], due: { 'sense-crucial': true, 'sense-1': true } });
      const result = await t.service.resultOf(userId, found, t.tx as never) as { alternative: { rows: Array<{ show_known: boolean }> } };
      expect(result.alternative.rows.map((row) => row.show_known)).toEqual([false, false]);
    });

    it('a word that is not in learning has no Know either', async () => {
      const found = answered();
      const t = route(found, 'vi', context);
      t.learning.practiceCheck.mockImplementation(async (_u: string, senseId: string) => ({ item: senseId === 'sense-crucial' ? null : { due_now: true } } as never));
      const result = await t.service.resultOf(userId, found, t.tx as never) as { alternative: { rows: Array<{ show_known: boolean }> } };
      expect(result.alternative.rows.map((row) => row.show_known)).toEqual([false, true]);
    });

    it('a typed word that is no longer visible leaves only the asked row', async () => {
      const found = answered();
      const t = route(found, 'vi', { senses: [], due: {} });
      const result = await t.service.resultOf(userId, found, t.tx as never) as { alternative: { rows: Array<{ role: string }> } };
      expect(result.alternative.rows.map((row) => row.role)).toEqual(['asked']);
    });

    it('a plain reply has alternative: null', async () => {
      const t = route(aiItem(vitalQuestion()), 'vi', context);
      await expect(t.service.answer(userId, 'it-1', { text: 'vital' })).resolves.toMatchObject({ result: 'correct', alternative: null });
      await expect(route(mcqItem(), 'vi', context).service.answer(userId, 'it-1', { choice: 0 })).resolves.toMatchObject({ alternative: null });
    });

    it('already-answered carries the same alternative', async () => {
      const t = route(answered(), 'vi', context);
      const rejected = await t.service.answer(userId, 'it-1', { text: 'Crucial.' }).catch((error: unknown) => error) as {
        status: number; extensions: { result: { alternative: { typed: string; rows: unknown[] } } };
      };
      expect(rejected.status).toBe(409);
      expect(rejected.extensions.result.alternative.typed).toBe('Crucial.');
      expect(rejected.extensions.result.alternative.rows).toHaveLength(2);
    });
  });

  it('a group deleted in another tab: a wrong typed answer is today\'s try-again or final wrong, never a 404', async () => {
    const t = route(aiItem(vitalQuestion()), 'vi', { senses: [crucial, habit], gone: true });
    await expect(t.service.answer(userId, 'it-1', { text: 'habit' })).resolves.toEqual({ result: 'try_again', tries: 1, reason: null });
    expect(t.tx.practiceSessionItem.update).toHaveBeenCalledExactlyOnceWith({ where: { id: 'it-1' }, data: { answersTried: ['habit'], tries: 1 } });
    const capped = route(aiItem(vitalQuestion(), { maxRetries: 1, tries: 1, answersTried: ['a'] }), 'vi', { senses: [crucial, habit], gone: true });
    await capped.service.answer(userId, 'it-1', { text: 'habit' });
    expect(finalData(capped).data).toMatchObject({ result: 'wrong', tries: 2 });
    // The right answer never reads the group at all.
    await expect(route(aiItem(vitalQuestion()), 'vi', { senses: [], gone: true }).service.answer(userId, 'it-1', { text: 'vital' })).resolves.toMatchObject({ result: 'correct' });
  });

  it('only a missing group is forgiven: any other failure of reading the session words still fails the answer', async () => {
    const t = route(aiItem(vitalQuestion()), 'vi', words);
    t.sessions.sessionWordIds.mockRejectedValueOnce(new Error('database down'));
    await expect(t.service.answer(userId, 'it-1', { text: 'habit' })).rejects.toThrow('database down');
  });

  it('a choice question reads no session words', async () => {
    const t = route(mcqItem(), 'vi', words);
    await t.service.answer(userId, 'it-1', { choice: 1 });
    expect(t.sessions.sessionWordIds).not.toHaveBeenCalled();
  });
});

describe('AnswersService — Bước 7 kinds', () => {
  it('B7E56: a choice kind answered → the right option as correct text; the translation for a vi learner only', async () => {
    const vi = route(aiItem(meaningQuestion));
    await expect(vi.service.answer(userId, 'it-1', { choice: 1 })).resolves.toMatchObject({
      result: 'correct', correct: { text: 'triển khai', choice_index: 1 }, translation: 'Chúng tôi đã triển khai.',
      definition_en: 'to move software',
    });
    const en = route(aiItem(meaningQuestion), 'en');
    await expect(en.service.answer(userId, 'it-1', { choice: 1 })).resolves.toMatchObject({ translation: null });
  });

  it('mcq_sentence: the right option is the answer form', async () => {
    const { service } = route(aiItem({
      type: 'mcq_sentence', prompt: { kind: 'mcq_sentence', sentence: 'We ___ it.', options: ['released', 'deployed', 'posted', 'built'] },
      answerKey: { ...meaningQuestion.answerKey, correct_index: 1 },
    }));
    await expect(service.answer(userId, 'it-1', { choice: 1 })).resolves.toMatchObject({ correct: { text: 'deployed' } });
  });

  it('B7E51: cloze takes "Deployed." for deployed; B7E50: "release" asks to try again, never correct', async () => {
    const right = route(aiItem(clozeQuestion()));
    await expect(right.service.answer(userId, 'it-1', { text: 'Deployed.' })).resolves.toMatchObject({ result: 'correct' });
    const wrong = route(aiItem(clozeQuestion()));
    await expect(wrong.service.answer(userId, 'it-1', { text: 'release' })).resolves.toEqual({ result: 'try_again', tries: 1, reason: null });
  });

  it('nhóm B M6: "try again" records no learning activity, the final answer and a skip each record one through tx; an answered item records none', async () => {
    const retry = route(aiItem(clozeQuestion()));
    await expect(retry.service.answer(userId, 'it-1', { text: 'release' })).resolves.toEqual({ result: 'try_again', tries: 1, reason: null });
    expect(retry.learning.recordActivity).not.toHaveBeenCalled();
    const final = route(aiItem(clozeQuestion()));
    await final.service.answer(userId, 'it-1', { text: 'deployed' });
    expect(final.learning.recordActivity).toHaveBeenCalledExactlyOnceWith(userId, '2026-10-19', final.tx);
    const skipped = route(aiItem(clozeQuestion(), { tries: 0, answersTried: [] }));
    await skipped.service.skip(userId, 'it-1');
    expect(skipped.learning.recordActivity).toHaveBeenCalledExactlyOnceWith(userId, '2026-10-19', skipped.tx);
    const done = route(mcqItem({ result: 'wrong' }));
    await expect(done.service.answer(userId, 'it-1', { choice: 0 })).rejects.toMatchObject({ status: 409 });
    expect(done.learning.recordActivity).not.toHaveBeenCalled();
  });

  it('skip is allowed for cloze in try_again, still refused for a choice kind', async () => {
    const cloze = route(aiItem(clozeQuestion(), { tries: 1, answersTried: ['release'] }));
    await cloze.service.skip(userId, 'it-1');
    expect(cloze.tx.practiceSessionItem.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ skipped: true, result: 'wrong', answerRaw: 'release' }),
    }));
    const choice = route(aiItem(meaningQuestion, { tries: 1, answersTried: ['x'] }));
    await expect(choice.service.skip(userId, 'it-1')).rejects.toMatchObject({ status: 409, problemType: 'skip-not-allowed' });
  });

  it('cloze skipped before any try → wrong result with the answer shown (K/78a)', async () => {
    const found = aiItem(clozeQuestion(), { tries: 0, answersTried: [] });
    const { service, tx } = route(found);
    tx.practiceSessionItem.update.mockResolvedValueOnce({
      ...found, result: 'wrong', skipped: true, answerRaw: null, answerNormalized: null,
    });
    await expect(service.skip(userId, 'it-1')).resolves.toMatchObject({
      result: 'wrong', skipped: true, tries: 0, correct: { lemma: 'deploy', text: 'deployed' },
    });
    expect(tx.practiceSessionItem.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        skipped: true, result: 'wrong', answerRaw: null, answerNormalized: null, answersTried: [], tries: 0,
      }),
    }));
  });

  it('type_word skipped before any try → 409 skip-not-allowed', async () => {
    const { service, tx } = route(aiItem({
      ...clozeQuestion(), type: 'type_word', prompt: { kind: 'type_sentence', sentence: 'We ___ it.' },
    }, { tries: 0, answersTried: [] }));
    await expect(service.skip(userId, 'it-1')).rejects.toMatchObject({ status: 409, problemType: 'skip-not-allowed' });
    expect(tx.practiceSessionItem.update).not.toHaveBeenCalled();
  });

  it('hint level 3 is served when stored; B7E53: missing → 409 hint-unavailable; a Bước 4 level 2 keeps its shape', async () => {
    const meaning = { kind: 'meaning', text: 'triển khai' };
    const three = route(aiItem(clozeQuestion({ level1: { kind: 'first_letter', text: 'd' }, level2: null, level3: meaning })));
    await expect(three.service.hint(userId, 'it-1', 3)).resolves.toEqual({ level: 3, hint: meaning });
    const none = route(aiItem(clozeQuestion()));
    await expect(none.service.hint(userId, 'it-1', 3)).rejects.toMatchObject({ status: 409, problemType: 'hint-unavailable' });
    const legacyQuestion = { ...mcqItem().question, type: 'type_word', hints: { level1: null, level2: { first_letter: 'c', length: 3 } } };
    const legacy = route(mcqItem({ question: legacyQuestion }));
    await expect(legacy.service.hint(userId, 'it-1', 2)).resolves.toEqual({ level: 2, hint: { first_letter: 'c', length: 3 } });
    await expect(legacy.service.hint(userId, 'it-1', 3)).rejects.toMatchObject({ problemType: 'hint-unavailable' });
  });
});
