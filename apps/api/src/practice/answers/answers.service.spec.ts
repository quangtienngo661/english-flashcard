import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { EntitlementsService } from '../../entitlements/index.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import type { LearningService } from '../../learning/index.js';
import type { ItemWithQuestion } from '../sessions/session-views.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import { AnswersService, type FinalWrite } from './answers.service.js';

const userId = '00000000-0000-4000-8000-000000000001';
const item = { id: 'it-1', userId, sessionId: 'sess-1' } as ItemWithQuestion;
const final: FinalWrite = {
  result: 'correct', answerRaw: '1', answerNormalized: '1', answersTried: [], tries: 1, skipped: false,
};

function setup(at: Date, record?: () => Promise<void>) {
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
  const service = new AnswersService({} as PrismaClient, new FakeClock(at), identity as unknown as IdentityService, {} as LearningService,
    {} as SessionsService, entitlements as unknown as EntitlementsService);
  return { service, tx: tx as unknown as Prisma.TransactionClient, rawTx: tx, entitlements, calls, identity };
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

// A mcq item the learner has not answered yet, with the parts `resultOf` and `writeFinal` read.
const mcqItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'it-1', userId, sessionId: 'sess-1', senseId: 'sense-1', result: null, tries: 0, maxRetries: null, answersTried: [],
  hintLevel: 0, skipped: false,
  question: {
    type: 'mcq_definition', prompt: { kind: 'mcq', options: ['cat', 'dog'] }, hints: { level1: null, level2: null },
    answerKey: { kind: 'mcq', correct_index: 0, reveal: { lemma: 'cat', meaning: 'con meo', definition_en: null } },
  },
  ...overrides,
}) as unknown as ItemWithQuestion;

/** The route as the controller calls it, with every Learning / Identity read recorded by the client it was given. */
function route(found: ItemWithQuestion, nativeLanguage: 'vi' | 'en' = 'vi') {
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
    practiceCheck: vi.fn(async (_u: string, _s: string, _g: null, db?: unknown) => {
      reads.push({ read: 'practiceCheck', db });
      return { item: { due_now: true } };
    }),
  };
  const sessions = { closeIfIdle: vi.fn(async () => undefined), lockOpen: vi.fn(async () => undefined) };
  const entitlements = { recordPracticeSession: vi.fn(async () => undefined) };
  const service = new AnswersService(prisma as unknown as PrismaClient, new FakeClock(new Date('2026-10-19T03:00:00Z')),
    identity as unknown as IdentityService, learning as unknown as LearningService, sessions as unknown as SessionsService,
    entitlements as unknown as EntitlementsService);
  return { service, tx, reads, learning, identity };
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
    await expect(wrong.service.answer(userId, 'it-1', { text: 'release' })).resolves.toEqual({ result: 'try_again', tries: 1 });
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
