import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { LearningService } from '../../learning/index.js';
import type { AnswersService } from '../answers/answers.service.js';
import type { ItemWithQuestion } from '../sessions/session-views.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import { PracticeReviewsService } from './practice-reviews.service.js';
import { reviewIdFor } from './review-id.js';

const userId = '00000000-0000-4000-8000-000000000001';
const found = {
  id: 'it-1', userId, senseId: 'sense-1', sessionId: 'sess-1', result: 'correct', reviewAction: null,
} as unknown as ItemWithQuestion;

function setup(row: ItemWithQuestion = found, rows: Array<{ sense_id: string; show_known: boolean }> | null = null) {
  const tx = {
    $queryRaw: vi.fn(async () => []),
    practiceSessionItem: { findUniqueOrThrow: vi.fn(async () => row), update: vi.fn(async () => row) },
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
  const answers = { resultOf: vi.fn(async () => ({ show_known: rows === null, alternative: rows === null ? null : { typed: 'Crucial.', rows } })) };
  const service = new PracticeReviewsService(prisma as unknown as PrismaClient, learning as unknown as LearningService,
    sessions as unknown as SessionsService, answers as unknown as AnswersService);
  return { service, tx, answers, learning, prisma };
}

// An alternative item: `vital` was asked (sense-1), `crucial` (sense-2) was typed. Each row has its own review button.
const alternative = (over: Record<string, unknown> = {}) => ({
  ...found, alternative: true, alternativeSenseId: 'sense-2', reviewAction: null, alternativeReviewAction: null, hintLevel: 0, ...over,
}) as unknown as ItemWithQuestion;
const ROWS = [{ sense_id: 'sense-2', show_known: true }, { sense_id: 'sense-1', show_known: false }];

describe('PracticeReviewsService.review — an alternative item names its word (design §3.2)', () => {
  it('CS7, CSE12: an alternative item reviewed without a word, or with a third word → 409 review-word-required, nothing written', async () => {
    for (const senseId of [undefined, 'sense-9']) {
      const { service, tx, learning } = setup(alternative(), ROWS);
      await expect(service.review(userId, 'it-1', 'needs_review', senseId)).rejects.toMatchObject({ status: 409, problemType: 'review-word-required' });
      expect(learning.practiceReview).not.toHaveBeenCalled();
      expect(tx.practiceSessionItem.update).not.toHaveBeenCalled();
    }
  });

  it('CS6: Know on the typed row reviews the typed word with its derived id and sets alternative_review_action only', async () => {
    const { service, tx, learning } = setup(alternative(), ROWS);
    await expect(service.review(userId, 'it-1', 'known', 'sense-2')).resolves.toMatchObject({ action: 'known', item_id: 'it-1', sense_id: 'sense-2' });
    expect(learning.practiceReview).toHaveBeenCalledExactlyOnceWith(tx, userId,
      [{ senseId: 'sense-2', action: 'known', reviewId: reviewIdFor('it-1', 'sense-2', 'sense-1') }]);
    expect(tx.practiceSessionItem.update).toHaveBeenCalledExactlyOnceWith({ where: { id: 'it-1' }, data: { alternativeReviewAction: 'known' } });
  });

  it('the asked row reviews the asked word with the item id and sets review_action only', async () => {
    const { service, tx, learning } = setup(alternative(), ROWS);
    await service.review(userId, 'it-1', 'needs_review', 'sense-1');
    expect(learning.practiceReview).toHaveBeenCalledExactlyOnceWith(tx, userId, [{ senseId: 'sense-1', action: 'review', reviewId: 'it-1' }]);
    expect(tx.practiceSessionItem.update).toHaveBeenCalledExactlyOnceWith({ where: { id: 'it-1' }, data: { reviewAction: 'needs_review' } });
  });

  it('CSE14: pressing the same row twice sends the same review id, and the second press is not refused', async () => {
    const first = setup(alternative(), ROWS);
    await first.service.review(userId, 'it-1', 'needs_review', 'sense-2');
    const again = setup(alternative({ alternativeReviewAction: 'needs_review' }), ROWS);
    await expect(again.service.review(userId, 'it-1', 'needs_review', 'sense-2')).resolves.toMatchObject({ action: 'needs_review' });
    const sent = (t: typeof first) => (t.learning.practiceReview.mock.calls[0] as unknown as [unknown, string, Array<{ reviewId: string }>])[2][0].reviewId;
    expect(sent(again)).toBe(sent(first));
  });

  it('each row keeps its own pressed state: the other row is not "already set"', async () => {
    const typedKnown = setup(alternative({ alternativeReviewAction: 'known' }), ROWS);
    await expect(typedKnown.service.review(userId, 'it-1', 'needs_review', 'sense-1')).resolves.toMatchObject({ action: 'needs_review', sense_id: 'sense-1' });
    const sameRow = setup(alternative({ alternativeReviewAction: 'known' }), ROWS);
    await expect(sameRow.service.review(userId, 'it-1', 'needs_review', 'sense-2')).rejects.toMatchObject({ status: 409, problemType: 'review-already-set' });
  });

  it('known on a row whose show_known is false → 409 known-not-allowed', async () => {
    const { service, learning } = setup(alternative(), ROWS);
    await expect(service.review(userId, 'it-1', 'known', 'sense-1')).rejects.toMatchObject({ status: 409, problemType: 'known-not-allowed' });
    expect(learning.practiceReview).not.toHaveBeenCalled();
  });

  it('a plain item without a word reviews as today; with its own word too; with another word → 409', async () => {
    const plain = setup();
    await expect(plain.service.review(userId, 'it-1', 'needs_review')).resolves.toMatchObject({ item_id: 'it-1', sense_id: 'sense-1' });
    expect(plain.learning.practiceReview).toHaveBeenCalledExactlyOnceWith(plain.tx, userId, [{ senseId: 'sense-1', action: 'review', reviewId: 'it-1' }]);
    await expect(setup().service.review(userId, 'it-1', 'needs_review', 'sense-1')).resolves.toMatchObject({ sense_id: 'sense-1' });
    await expect(setup().service.review(userId, 'it-1', 'needs_review', 'sense-2')).rejects.toMatchObject({ status: 409, problemType: 'review-word-required' });
  });

  it('an alternative that credits nobody has only the asked word', async () => {
    const { service } = setup(alternative({ alternativeSenseId: null }), [{ sense_id: 'sense-1', show_known: false }]);
    await expect(service.review(userId, 'it-1', 'needs_review', 'sense-1')).resolves.toMatchObject({ sense_id: 'sense-1' });
    await expect(setup(alternative({ alternativeSenseId: null }), []).service.review(userId, 'it-1', 'needs_review', 'sense-2'))
      .rejects.toMatchObject({ problemType: 'review-word-required' });
  });
});

describe('PracticeReviewsService.review — reads inside the transaction use the transaction (PX4)', () => {
  it('PX4: "Đã biết" works out the buttons with the learning item read through tx', async () => {
    const { service, tx, answers, learning } = setup();
    await expect(service.review(userId, 'it-1', 'known')).resolves.toMatchObject({ action: 'known', item_id: 'it-1', level: 2 });
    expect(answers.resultOf).toHaveBeenCalledExactlyOnceWith(userId, found, tx);
    expect(learning.practiceReview).toHaveBeenCalledWith(tx, userId, expect.any(Array));
  });
});
