import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { LearningService, type PracticeReviewOutcome } from '../../learning/index.js';
import type { AnswerKey } from '../practice.types.js';
import { AnswersService } from '../answers/answers.service.js';
import type { ItemWithQuestion, SessionView } from '../sessions/session-views.js';
import { SessionsService } from '../sessions/sessions.service.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

export type ReviewAction = 'needs_review' | 'known';
export type SummaryWord = { sense_id: string; lemma: string; meaning: string; item_id: string; action: ReviewAction | null };

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
const conflict = (type: string, title: string) => new ProblemDetailsException({ status: 409, title, type });
const sessionClosed = () => conflict('session-closed', 'Session closed');
const toLearning = (action: ReviewAction) => (action === 'known' ? 'known' : 'review');

/**
 * "Cần ôn tập" / "Đã biết" from a result or the summary, and the summary itself (design §6 rows 6, 9, 10; 7.8; R10, R11).
 * Lock order: session row, Practice items (id order), then Learning items inside practiceReview.
 */
@Injectable()
export class PracticeReviewsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(LearningService) private readonly learning: LearningService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(AnswersService) private readonly answers: AnswersService,
  ) {}

  async review(userId: string, itemId: string, action: ReviewAction):
    Promise<{ action: ReviewAction; item_id: string; level: number; due_date: string; priority: boolean }> {
    const found = await this.prisma.practiceSessionItem.findFirst({ where: { id: itemId, userId }, select: { sessionId: true } });
    if (!found) throw notFound();
    await this.sessions.closeIfIdle(userId, found.sessionId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockReviewable(tx, userId, found.sessionId);
      await tx.$queryRaw`SELECT id FROM practice_session_items WHERE id = ${itemId}::uuid FOR UPDATE`;
      const item = await tx.practiceSessionItem.findUniqueOrThrow({ where: { id: itemId }, include: { question: true } });
      if (item.result === 'void') throw conflict('item-void', 'Item void');
      if (item.result === null) throw conflict('not-answered', 'Not answered');
      if (item.reviewAction !== null && item.reviewAction !== action) throw conflict('review-already-set', 'Review already set');
      if (item.reviewAction === null && action === 'known' && !(await this.answers.resultOf(userId, item, tx)).show_known) {
        throw conflict('known-not-allowed', 'Known not allowed');
      }
      const [outcome] = await this.learning.practiceReview(tx, userId, [{ senseId: item.senseId, action: toLearning(action), reviewId: item.id }]);
      const applied = this.applied(outcome);
      await tx.practiceSessionItem.update({ where: { id: item.id }, data: { reviewAction: action } });
      return { action, item_id: item.id, level: applied.level, due_date: applied.due_date, priority: applied.priority };
    }, transactionOptions);
  }

  async summary(userId: string, sessionId: string):
    Promise<{ session: SessionView; asked: number; correct: number; wrong: number; words: SummaryWord[] }> {
    return this.prisma.$transaction(async (tx) => {
      await this.reviewableSession(tx, userId, sessionId, false);
      const items = await this.items(tx, sessionId);
      const correct = items.filter((item) => item.result === 'correct').length;
      const wrong = items.filter((item) => item.result === 'wrong').length;
      return { session: await this.sessions.view(tx, sessionId), asked: correct + wrong, correct, wrong, words: listed(items) };
    }, transactionOptions);
  }

  /** "Cần ôn tập" for every listed word not pressed yet, keyed by its last final item; words out of learning are skipped. */
  async reviewAll(userId: string, sessionId: string): Promise<{ added: number }> {
    await this.sessions.closeIfIdle(userId, sessionId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockReviewable(tx, userId, sessionId);
      const words = listed(await this.items(tx, sessionId)).filter((word) => word.action === null);
      if (words.length === 0) return { added: 0 };
      await tx.$queryRaw`
        SELECT id FROM practice_session_items WHERE id = ANY(${words.map((w) => w.item_id)}::uuid[]) ORDER BY id FOR UPDATE`;
      const outcomes = await this.learning.practiceReview(tx, userId,
        words.map((word) => ({ senseId: word.sense_id, action: 'review' as const, reviewId: word.item_id })));
      const done = words.filter((_, index) => outcomes[index].outcome === 'applied').map((word) => word.item_id);
      await tx.practiceSessionItem.updateMany({ where: { id: { in: done } }, data: { reviewAction: 'needs_review' } });
      return { added: done.length };
    }, transactionOptions);
  }

  /** The session row lock; "Cần ôn tập" works on a finished session, not on an abandoned one (R11). */
  private lockReviewable(tx: Prisma.TransactionClient, userId: string, sessionId: string) {
    return this.reviewableSession(tx, userId, sessionId, true);
  }

  private async reviewableSession(tx: Prisma.TransactionClient, userId: string, sessionId: string, lock: boolean): Promise<void> {
    const session = lock
      ? await this.sessions.lockSession(tx, userId, sessionId)
      : await tx.practiceSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw notFound();
    if (session.status === 'abandoned') throw sessionClosed();
    if (lock) await this.sessions.touch(tx, session);
  }

  private items(tx: Prisma.TransactionClient, sessionId: string): Promise<ItemWithQuestion[]> {
    return tx.practiceSessionItem.findMany({ where: { sessionId }, include: { question: true }, orderBy: { position: 'asc' } });
  }

  private applied(outcome: PracticeReviewOutcome) {
    if (outcome.outcome === 'not-in-learning') throw conflict('not-in-learning', 'Not in learning');
    if (outcome.outcome === 'known-not-allowed') throw conflict('known-not-allowed', 'Known not allowed');
    return outcome;
  }
}

/**
 * The summary's one list (7.8): words with a wrong final result or a correct one with a hint, in first-asked order; each keyed
 * by its last final item, "pressed" when any of its items was.
 */
function listed(items: ItemWithQuestion[]): SummaryWord[] {
  const words = new Map<string, SummaryWord>();
  const listedSenses = new Set<string>();
  for (const item of items) {
    if (item.result !== 'correct' && item.result !== 'wrong') continue;
    const key = item.question.answerKey as AnswerKey;
    const word = words.get(item.senseId) ?? {
      sense_id: item.senseId, lemma: key.reveal.lemma, meaning: key.reveal.meaning, item_id: item.id, action: null,
    };
    word.item_id = item.id;
    word.lemma = key.reveal.lemma;
    word.meaning = key.reveal.meaning;
    word.action ??= item.reviewAction as ReviewAction | null;
    if (item.result === 'wrong' || item.hintLevel > 0) listedSenses.add(item.senseId);
    words.set(item.senseId, word);
  }
  return [...words.values()].filter((word) => listedSenses.has(word.sense_id));
}
