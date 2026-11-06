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
    practiceReview: vi.fn(async (..._args: unknown[]) => [{ outcome: 'applied', senseId: 'sense-1', item_id: 'it-1', level: 2, due_date: '2026-10-20', priority: false }]),
  };
  const sessions = {
    closeIfIdle: vi.fn(async () => undefined),
    lockSession: vi.fn(async () => ({ id: 'sess-1', status: 'active' })),
    touch: vi.fn(async () => undefined),
  };
  const answers = { resultOf: vi.fn(async () => ({ show_known: rows === null, alternative: rows === null ? null : { typed: 'Crucial.', rows } })) };
  const service = new PracticeReviewsService(prisma as unknown as PrismaClient, learning as unknown as LearningService,
    sessions as unknown as SessionsService, answers as unknown as AnswersService);
  return { service, tx, answers, learning, prisma, sessions };
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

// The summary and "Review all" with alternative answers (design §3.3). `vital` (sense-1) was asked, `crucial` (sense-2) typed; `habit`
// (sense-3) is an ordinary wrong answer.
describe('PracticeReviewsService — summary and Review all with alternative answers', () => {
  const key = (lemma: string, meaning: string) => ({ answerKey: { reveal: { lemma, meaning, definition_en: null } } });
  const row = (over: Record<string, unknown>) => ({
    id: 'i-x', senseId: 'sense-1', result: 'correct', hintLevel: 0, reviewAction: null, alternative: false, alternativeSenseId: null,
    alternativeReviewAction: null, question: key('vital', 'thiết yếu'), ...over,
  }) as unknown as ItemWithQuestion;
  const alt = (over: Record<string, unknown> = {}) => row({ id: 'a1', alternative: true, alternativeSenseId: 'sense-2', ...over });
  const wrong = (over: Record<string, unknown> = {}) => row({ id: 'w1', senseId: 'sense-3', result: 'wrong', question: key('habit', 'thói quen'), ...over });

  function world(items: ItemWithQuestion[]) {
    const t = setup();
    const tx = t.tx as unknown as Record<string, unknown>;
    tx.practiceSession = { findFirst: vi.fn(async () => ({ id: 'sess-1', status: 'finished' })) };
    (tx.practiceSessionItem as Record<string, unknown>).findMany = vi.fn(async () => items);
    (tx.practiceSessionItem as Record<string, unknown>).updateMany = vi.fn(async () => ({ count: 0 }));
    const sessions = t.sessions as unknown as Record<string, unknown>;
    sessions.view = vi.fn(async () => ({ id: 'sess-1' }));
    (t.answers as unknown as Record<string, unknown>).typedWords = vi.fn(async () => new Map([['sense-2', { lemma: 'crucial', meaning: 'quan trọng' }]]));
    t.learning.practiceReview.mockImplementation(async (_tx: unknown, _user: unknown, inputs: unknown) =>
      (inputs as Array<{ senseId: string }>).map((input) => ({ outcome: 'applied', senseId: input.senseId, item_id: 'x', level: 1, due_date: '2026-11-08', priority: true })) as never);
    return { ...t, tx };
  }

  it('CS9: an alternative answer without a hint lists neither word; the count says 1 and Right includes it', async () => {
    const { service } = world([alt(), row({ id: 'p1', senseId: 'sense-4', question: key('plain', 'đơn giản') })]);
    await expect(service.summary(userId, 'sess-1')).resolves.toMatchObject({ asked: 2, correct: 2, wrong: 0, alternatives: 1, words: [] });
  });

  it('CS8, CSE10: after a hint both words are listed, each keyed by the item, each with its own pressed state', async () => {
    const { service } = world([alt({ hintLevel: 1, alternativeReviewAction: 'known' })]);
    const summary = await service.summary(userId, 'sess-1');
    expect(summary.alternatives).toBe(1);
    expect(summary.words).toEqual([
      { sense_id: 'sense-1', lemma: 'vital', meaning: 'thiết yếu', item_id: 'a1', action: null },
      { sense_id: 'sense-2', lemma: 'crucial', meaning: 'quan trọng', item_id: 'a1', action: 'known' },
    ]);
  });

  it('a word pressed on one of its items stays pressed on the row of its last item', async () => {
    const earlier = alt({ id: 'a0', hintLevel: 1, alternativeReviewAction: 'needs_review' });
    const later = row({ id: 'p2', senseId: 'sense-2', result: 'wrong', question: key('crucial', 'quan trọng') });
    const { service } = world([earlier, later]);
    const crucial = (await service.summary(userId, 'sess-1')).words.find((word) => word.sense_id === 'sense-2');
    expect(crucial).toMatchObject({ item_id: 'p2', action: 'needs_review' });
  });

  it('a plain session lists as today and has no alternatives', async () => {
    const { service } = world([wrong(), row({ id: 'ok', senseId: 'sense-4', question: key('plain', 'đơn giản') })]);
    const summary = await service.summary(userId, 'sess-1');
    expect(summary).toMatchObject({ asked: 2, correct: 1, wrong: 1, alternatives: 0 });
    expect(summary.words).toEqual([{ sense_id: 'sense-3', lemma: 'habit', meaning: 'thói quen', item_id: 'w1', action: null }]);
  });

  it('Review all reviews each listed word with its own id and sets its own column', async () => {
    const { service, learning, tx } = world([alt({ hintLevel: 1 }), wrong()]);
    await expect(service.reviewAll(userId, 'sess-1')).resolves.toEqual({ added: 3 });
    expect(learning.practiceReview).toHaveBeenCalledExactlyOnceWith(tx, userId, [
      { senseId: 'sense-1', action: 'review', reviewId: 'a1' },
      { senseId: 'sense-2', action: 'review', reviewId: reviewIdFor('a1', 'sense-2', 'sense-1') },
      { senseId: 'sense-3', action: 'review', reviewId: 'w1' },
    ]);
    const updates = (tx as unknown as { practiceSessionItem: { updateMany: { mock: { calls: unknown[][] } } } }).practiceSessionItem.updateMany.mock.calls;
    expect(updates).toEqual(expect.arrayContaining([
      [{ where: { id: { in: ['a1', 'w1'] } }, data: { reviewAction: 'needs_review' } }],
      [{ where: { id: { in: ['a1'] } }, data: { alternativeReviewAction: 'needs_review' } }],
    ]));
  });

  it('Review all skips a word whose button was pressed already', async () => {
    const { service, learning } = world([alt({ hintLevel: 1, reviewAction: 'needs_review' }), wrong()]);
    await expect(service.reviewAll(userId, 'sess-1')).resolves.toEqual({ added: 2 });
    const inputs = (learning.practiceReview.mock.calls[0] as unknown as [unknown, string, Array<{ senseId: string }>])[2];
    expect(inputs.map((input) => input.senseId)).toEqual(['sense-2', 'sense-3']);
  });
});
