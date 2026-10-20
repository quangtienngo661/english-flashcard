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
function route(found: ItemWithQuestion) {
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
  const identity = { getProfile: vi.fn(async (_id: string, db?: unknown) => { reads.push({ read: 'getProfile', db }); return { timezone: 'UTC' }; }) };
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
