import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { LearningService, type PracticeReviewOutcome } from '../../learning/index.js';
import type { AnswerKey } from '../practice.types.js';
import { AnswersService } from '../answers/answers.service.js';
import type { ItemWithQuestion, SessionView } from '../sessions/session-views.js';
import { reviewIdFor } from './review-id.js';
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

  /**
   * `senseId` names the word of an alternative answer (design §3.2): required there and refused when it is neither the asked nor the typed
   * word, so an older web build or a stray shortcut cannot change the asked word by default. Any other item: absent, or its own word.
   */
  async review(userId: string, itemId: string, action: ReviewAction, senseId?: string):
    Promise<{ action: ReviewAction; item_id: string; sense_id: string; level: number; due_date: string; priority: boolean }> {
    const found = await this.prisma.practiceSessionItem.findFirst({ where: { id: itemId, userId }, select: { sessionId: true } });
    if (!found) throw notFound();
    await this.sessions.closeIfIdle(userId, found.sessionId);
    return this.prisma.$transaction(async (tx) => {
      const session = await this.lockReviewable(tx, userId, found.sessionId);
      await tx.$queryRaw`SELECT id FROM practice_session_items WHERE id = ${itemId}::uuid FOR UPDATE`;
      const item = await tx.practiceSessionItem.findUniqueOrThrow({ where: { id: itemId }, include: { question: true } });
      if (item.result === 'void') throw conflict('item-void', 'Item void');
      if (item.result === null) throw conflict('not-answered', 'Not answered');
      const typedWord = item.alternative && item.alternativeSenseId !== null && senseId === item.alternativeSenseId;
      // An alternative answer needs the word named (the asked one or the typed one); any other item takes none or its own.
      const word = item.alternative ? (typedWord || senseId === item.senseId ? senseId : undefined)
        : (senseId === undefined || senseId === item.senseId ? item.senseId : undefined);
      if (word === undefined) throw conflict('review-word-required', 'Review word required');
      const pressed = typedWord ? item.alternativeReviewAction : item.reviewAction;
      if (pressed !== null && pressed !== action) throw conflict('review-already-set', 'Review already set');
      if (pressed === null && action === 'known') {
        // Know follows today's rule for the word of the button: an alternative answer carries it per row.
        // A recall session never offers "Đã biết": the answer already moved the word (round C).
        const result = await this.answers.resultOf(userId, item, tx, { schedule: null, recall: session.kind === 'recall' });
        const knowable = result.alternative ? result.alternative.rows.find((row) => row.sense_id === word)?.show_known === true : result.show_known;
        if (!knowable) throw conflict('known-not-allowed', 'Known not allowed');
      }
      const [outcome] = await this.learning.practiceReview(tx, userId,
        [{ senseId: word, action: toLearning(action), reviewId: reviewIdFor(item.id, word, item.senseId) }]);
      const applied = this.applied(outcome);
      await tx.practiceSessionItem.update({ where: { id: item.id }, data: typedWord ? { alternativeReviewAction: action } : { reviewAction: action } });
      return { action, item_id: item.id, sense_id: word, level: applied.level, due_date: applied.due_date, priority: applied.priority };
    }, transactionOptions);
  }

  /** `alternatives`: how many of the right answers were alternative answers (design §3.3). */
  async summary(userId: string, sessionId: string):
    Promise<{
      session: SessionView; asked: number; correct: number; wrong: number; alternatives: number; words: SummaryWord[];
      /** Round C (H7): only a recall session. "Wrong" is `wrong`; "Cần ôn lại" is the count of `words[].action === 'needs_review'`. */
      recall: { leveled_up: number; correct_kept: number } | null;
    }> {
    return this.prisma.$transaction(async (tx) => {
      await this.reviewableSession(tx, userId, sessionId, false);
      const items = await this.items(tx, sessionId);
      const correct = items.filter((item) => item.result === 'correct').length;
      const wrong = items.filter((item) => item.result === 'wrong').length;
      const alternatives = items.filter((item) => item.result === 'correct' && item.alternative).length;
      const words = (await this.listedWords(userId, items, tx)).map(({ sense_id, lemma, meaning, item_id, action }) => ({ sense_id, lemma, meaning, item_id, action }));
      const session = await this.sessions.view(tx, sessionId);
      const recall = session.kind === 'recall' ? {
        leveled_up: items.filter((item) => item.recallOutcome === 'leveled_up').length,
        correct_kept: items.filter((item) => item.result === 'correct' && item.recallOutcome === 'kept').length,
      } : null;
      return { session, asked: correct + wrong, correct, wrong, alternatives, words, recall };
    }, transactionOptions);
  }

  /** "Cần ôn tập" for every listed word not pressed yet, keyed by its last final item; words out of learning are skipped. */
  async reviewAll(userId: string, sessionId: string): Promise<{ added: number }> {
    await this.sessions.closeIfIdle(userId, sessionId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockReviewable(tx, userId, sessionId);
      const words = (await this.listedWords(userId, await this.items(tx, sessionId), tx)).filter((word) => word.action === null);
      if (words.length === 0) return { added: 0 };
      await tx.$queryRaw`
        SELECT id FROM practice_session_items WHERE id = ANY(${words.map((w) => w.item_id)}::uuid[]) ORDER BY id FOR UPDATE`;
      const outcomes = await this.learning.practiceReview(tx, userId,
        words.map((word) => ({ senseId: word.sense_id, action: 'review' as const, reviewId: reviewIdFor(word.item_id, word.sense_id, word.asked_sense_id) })));
      const done = words.filter((_, index) => outcomes[index].outcome === 'applied');
      // Each word sets its own button: the asked word's on review_action, the word typed in an alternative answer on alternative_review_action.
      const idsOf = (typed: boolean) => done.filter((word) => word.typed === typed).map((word) => word.item_id);
      if (idsOf(false).length > 0) await tx.practiceSessionItem.updateMany({ where: { id: { in: idsOf(false) } }, data: { reviewAction: 'needs_review' } });
      if (idsOf(true).length > 0) await tx.practiceSessionItem.updateMany({ where: { id: { in: idsOf(true) } }, data: { alternativeReviewAction: 'needs_review' } });
      return { added: done.length };
    }, transactionOptions);
  }

  /** The session row lock; "Cần ôn tập" works on a finished session, not on an abandoned one (R11). */
  private lockReviewable(tx: Prisma.TransactionClient, userId: string, sessionId: string): Promise<{ kind: string }> {
    return this.reviewableSession(tx, userId, sessionId, true);
  }

  private async reviewableSession(tx: Prisma.TransactionClient, userId: string, sessionId: string, lock: boolean): Promise<{ kind: string }> {
    const session = lock
      ? await this.sessions.lockSession(tx, userId, sessionId)
      : await tx.practiceSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw notFound();
    if (session.status === 'abandoned') throw sessionClosed();
    if (lock) await this.sessions.touch(tx, session);
    return session;
  }

  /** The summary's list with the typed words of alternative answers named (one read for all of them). */
  private async listedWords(userId: string, items: ItemWithQuestion[], tx: Prisma.TransactionClient): Promise<ListedWord[]> {
    const typedIds = [...new Set(items.flatMap((item) => (item.alternative && item.alternativeSenseId !== null ? [item.alternativeSenseId] : [])))];
    return listed(items, await this.answers.typedWords(userId, typedIds, tx));
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

/** A summary row with what "Review all" needs: the asked word of its item and whether the row is the word typed in an alternative answer. */
type ListedWord = SummaryWord & { asked_sense_id: string; typed: boolean };

/**
 * The summary's one list (7.8): words with a wrong final result or a correct one with a hint, in first-asked order; each keyed
 * by its last final item, "pressed" when any of its items was. An alternative answer adds the word typed beside the word asked: both
 * are listed after a hint, never otherwise (design §3.3), and each keeps its own pressed state.
 */
function listed(items: ItemWithQuestion[], typedWords: Map<string, { lemma: string; meaning: string }>): ListedWord[] {
  const words = new Map<string, ListedWord>();
  const listedSenses = new Set<string>();
  const take = (item: ItemWithQuestion, senseId: string, lemma: string, meaning: string, action: ReviewAction | null, typed: boolean) => {
    const word = words.get(senseId) ?? { sense_id: senseId, lemma, meaning, item_id: item.id, action: null, asked_sense_id: item.senseId, typed };
    word.item_id = item.id;
    word.lemma = lemma;
    word.meaning = meaning;
    word.asked_sense_id = item.senseId;
    word.typed = typed;
    word.action ??= action;
    if (item.result === 'wrong' || item.hintLevel > 0) listedSenses.add(senseId);
    words.set(senseId, word);
  };
  for (const item of items) {
    if (item.result !== 'correct' && item.result !== 'wrong') continue;
    const key = item.question.answerKey as AnswerKey;
    take(item, item.senseId, key.reveal.lemma, key.reveal.meaning, item.reviewAction as ReviewAction | null, false);
    const typed = item.alternative && item.alternativeSenseId !== null ? typedWords.get(item.alternativeSenseId) : undefined;
    if (typed) take(item, item.alternativeSenseId!, typed.lemma, typed.meaning, item.alternativeReviewAction as ReviewAction | null, true);
  }
  return [...words.values()].filter((word) => listedSenses.has(word.sense_id));
}
