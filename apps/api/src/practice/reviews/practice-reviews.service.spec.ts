import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { LearningService } from '../../learning/index.js';
import type { AnswersService } from '../answers/answers.service.js';
import type { ItemWithQuestion } from '../sessions/session-views.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import { PracticeReviewsService } from './practice-reviews.service.js';

const userId = '00000000-0000-4000-8000-000000000001';
const found = {
  id: 'it-1', userId, senseId: 'sense-1', sessionId: 'sess-1', result: 'correct', reviewAction: null,
} as unknown as ItemWithQuestion;

function setup() {
  const tx = {
    $queryRaw: vi.fn(async () => []),
    practiceSessionItem: { findUniqueOrThrow: vi.fn(async () => found), update: vi.fn(async () => found) },
  };
  const prisma = {
    practiceSessionItem: { findFirst: vi.fn(async () => ({ sessionId: 'sess-1' })) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const learning = {
    practiceReview: vi.fn(async () => [{ outcome: 'applied', senseId: 'sense-1', item_id: 'it-1', level: 2, due_date: '2026-10-20', priority: false }]),
  };
  const sessions = {
    closeIfIdle: vi.fn(async () => undefined),
    lockSession: vi.fn(async () => ({ id: 'sess-1', status: 'active' })),
    touch: vi.fn(async () => undefined),
  };
  const answers = { resultOf: vi.fn(async () => ({ show_known: true })) };
  const service = new PracticeReviewsService(prisma as unknown as PrismaClient, learning as unknown as LearningService,
    sessions as unknown as SessionsService, answers as unknown as AnswersService);
  return { service, tx, answers, learning };
}

describe('PracticeReviewsService.review — reads inside the transaction use the transaction (PX4)', () => {
  it('PX4: "Đã biết" works out the buttons with the learning item read through tx', async () => {
    const { service, tx, answers, learning } = setup();
    await expect(service.review(userId, 'it-1', 'known')).resolves.toMatchObject({ action: 'known', item_id: 'it-1', level: 2 });
    expect(answers.resultOf).toHaveBeenCalledExactlyOnceWith(userId, found, tx);
    expect(learning.practiceReview).toHaveBeenCalledWith(tx, userId, expect.any(Array));
  });
});
