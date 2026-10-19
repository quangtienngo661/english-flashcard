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
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
  const service = new AnswersService({} as PrismaClient, new FakeClock(at), identity, {} as LearningService,
    {} as SessionsService, entitlements as unknown as EntitlementsService);
  return { service, tx: tx as unknown as Prisma.TransactionClient, rawTx: tx, entitlements, calls };
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
