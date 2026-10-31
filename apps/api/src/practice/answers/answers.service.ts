import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateValue, localDate } from '../../common/time/local-date.js';
import { EntitlementsService } from '../../entitlements/index.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { LearningService } from '../../learning/index.js';
import { matchesAnswer, normalizeAnswer } from '../grading/normalize.js';
import type { AnswerKey, Hints, Prompt } from '../practice.types.js';
import type { ItemWithQuestion } from '../sessions/session-views.js';
import { SessionsService } from '../sessions/sessions.service.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

export type AnswerBody = { choice: number } | { is_true: boolean } | { text: string };
export type AnswerResult = {
  result: 'correct' | 'wrong'; skipped: boolean; tries: number; hint_level: number;
  correct: { lemma: string; text: string; choice_index: number | null; is_true: boolean | null };
  meaning: string; definition_en: string | null; show_known: boolean; highlight_needs_review: boolean;
  /** Bước 7 (PRC22): the Vietnamese translation of an AI sentence, for a `vi` learner only; else null. */
  translation: string | null;
};
export type FinalWrite = {
  result: 'correct' | 'wrong'; answerRaw: string | null; answerNormalized: string | null; answersTried: string[]; tries: number; skipped: boolean;
};

/**
 * The right answer as shown after a final result and in history: the main word, the right option (multiple choice and both
 * Bước 7 choice kinds, design §7.8), or the word's own meaning.
 */
export function correctOf(key: AnswerKey, prompt: Prompt): AnswerResult['correct'] {
  const text = key.kind === 'type_word' ? key.main
    : key.kind === 'mcq' && 'options' in prompt ? prompt.options[key.correct_index] : key.reveal.meaning;
  return {
    lemma: key.reveal.lemma, text, choice_index: key.kind === 'mcq' ? key.correct_index : null,
    is_true: key.kind === 'true_false' ? key.is_true : null,
  };
}

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
const validationFailed = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
const conflict = (type: string, title: string, extensions?: Record<string, unknown>) =>
  new ProblemDetailsException({ status: 409, title, type, extensions });

/** Answers, retries, skip and hints (design §6 rows 4, 5, 5b; 7.6; 7.8). Typed answers are never logged (SR9). */
@Injectable()
export class AnswersService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(LearningService) private readonly learning: LearningService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(EntitlementsService) private readonly entitlements: EntitlementsService,
  ) {}

  answer(userId: string, itemId: string, body: AnswerBody): Promise<AnswerResult | { result: 'try_again'; tries: number }> {
    return this.locked(userId, itemId, async (tx, item) => {
      await this.assertUnanswered(tx, userId, item, true);
      const key = item.question.answerKey as AnswerKey;
      let correct: boolean;
      let raw: string;
      let normalized: string;
      if (key.kind === 'mcq' && 'choice' in body) {
        correct = body.choice === key.correct_index;
        raw = normalized = String(body.choice);
      } else if (key.kind === 'true_false' && 'is_true' in body) {
        correct = body.is_true === key.is_true;
        raw = normalized = String(body.is_true);
      } else if (key.kind === 'type_word' && 'text' in body) {
        correct = matchesAnswer(body.text, key.accepted);
        raw = body.text;
        normalized = normalizeAnswer(body.text);
        if (!correct && (item.maxRetries === null || item.tries < item.maxRetries)) {
          await tx.practiceSessionItem.update({
            where: { id: item.id }, data: { answersTried: [...item.answersTried, raw], tries: item.tries + 1 },
          });
          return { result: 'try_again', tries: item.tries + 1 };
        }
      } else {
        throw validationFailed();
      }
      const final = await this.writeFinal(tx, item, {
        result: correct ? 'correct' : 'wrong', answerRaw: raw, answerNormalized: normalized, answersTried: item.answersTried,
        tries: item.tries + 1, skipped: false,
      });
      return this.resultOf(userId, final, tx);
    });
  }

  /**
   * "Bỏ qua": cloze may be skipped before any try (K/78a, design đợt cải thiện A §6.1); typing only after one try.
   * After a try, the last typed text becomes the stored answer.
   */
  skip(userId: string, itemId: string): Promise<AnswerResult> {
    return this.locked(userId, itemId, async (tx, item) => {
      await this.assertUnanswered(tx, userId, item, false);
      if (!['type_word', 'cloze'].includes(item.question.type) || (item.question.type === 'type_word' && item.tries === 0)) {
        throw conflict('skip-not-allowed', 'Skip not allowed');
      }
      if (item.tries === 0) {
        const final = await this.writeFinal(tx, item, {
          result: 'wrong', answerRaw: null, answerNormalized: null, answersTried: [], tries: 0, skipped: true,
        });
        return this.resultOf(userId, final, tx);
      }
      const last = item.answersTried.at(-1)!;
      const final = await this.writeFinal(tx, item, {
        result: 'wrong', answerRaw: last, answerNormalized: normalizeAnswer(last), answersTried: item.answersTried.slice(0, -1),
        tries: item.tries, skipped: true,
      });
      return this.resultOf(userId, final, tx);
    });
  }

  /** Levels 1–3 (Bước 7 design §8); a Bước 4 question keeps its stored level-2 shape and has no level 3 (B7E53). */
  hint(userId: string, itemId: string, level: 1 | 2 | 3):
    Promise<{ level: 1 | 2 | 3; hint: Hints['level1'] | Hints['level2'] }> {
    return this.locked(userId, itemId, async (tx, item) => {
      await this.assertUnanswered(tx, userId, item, false);
      const hints = item.question.hints as Hints;
      const hint = level === 1 ? hints.level1 : level === 2 ? hints.level2 : hints.level3 ?? null;
      if (hint === null) throw conflict('hint-unavailable', 'Hint unavailable');
      await tx.practiceSessionItem.update({ where: { id: item.id }, data: { hintLevel: Math.max(item.hintLevel, level) } });
      return { level, hint };
    });
  }

  /** The one place a final result is written (a test makes it throw, B4E23). */
  async writeFinal(tx: Prisma.TransactionClient, item: ItemWithQuestion, final: FinalWrite): Promise<ItemWithQuestion> {
    const profile = await this.identity.getProfile(item.userId, tx);
    if (!profile) throw notFound();
    const now = this.clock.now();
    const date = localDate(profile.timezone, now);
    const written = await tx.practiceSessionItem.update({
      where: { id: item.id },
      data: { ...final, answeredAt: now, localDate: dateValue(date) },
      include: { question: true },
    });
    // The session's first final result spends one session of the day (design §7.4); later calls are ignored by the insert.
    await this.entitlements.recordPracticeSession(tx, item.userId, item.sessionId, date);
    // A final result, a skip included, is a "lần học" of the learner's local day (nhóm B D39, B51); a "try again" never gets here.
    await this.learning.recordActivity(item.userId, date, tx);
    return written;
  }

  /**
   * The stored result as the app sees it; the buttons are worked out now (design 7.8). A caller inside an open transaction
   * passes its `tx` as `db`, so the learning item is read without a second connection.
   */
  async resultOf(userId: string, item: ItemWithQuestion, db?: Prisma.TransactionClient | PrismaClient): Promise<AnswerResult> {
    const key = item.question.answerKey as AnswerKey;
    const prompt = item.question.prompt as Prompt;
    const { item: learningItem } = await this.learning.practiceCheck(userId, item.senseId, null, db);
    const correct = item.result === 'correct';
    const translation = key.translation_vi
      ? ((await this.identity.getProfile(userId, db))?.native_language === 'vi' ? key.translation_vi : null) : null;
    return {
      result: correct ? 'correct' : 'wrong', skipped: item.skipped, tries: item.tries, hint_level: item.hintLevel,
      correct: correctOf(key, prompt),
      meaning: key.reveal.meaning, definition_en: key.reveal.definition_en,
      show_known: learningItem !== null && correct && item.hintLevel === 0 && learningItem.due_now,
      highlight_needs_review: learningItem !== null && !correct, translation,
    };
  }

  /**
   * Lock order (plan, Global Constraints): the idle close in its own statement, then the session row (404, session-closed,
   * last_activity_at), then the item row; a void item is 409 item-void.
   */
  private async locked<T>(userId: string, itemId: string, work: (tx: Prisma.TransactionClient, item: ItemWithQuestion) => Promise<T>):
    Promise<T> {
    const found = await this.prisma.practiceSessionItem.findFirst({ where: { id: itemId, userId }, select: { sessionId: true } });
    if (!found) throw notFound();
    await this.sessions.closeIfIdle(userId, found.sessionId);
    return this.prisma.$transaction(async (tx) => {
      await this.sessions.lockOpen(tx, userId, found.sessionId);
      await tx.$queryRaw`SELECT id FROM practice_session_items WHERE id = ${itemId}::uuid FOR UPDATE`;
      const item = await tx.practiceSessionItem.findUniqueOrThrow({ where: { id: itemId }, include: { question: true } });
      if (item.result === 'void') throw conflict('item-void', 'Item void');
      return work(tx, item);
    }, transactionOptions);
  }

  private async assertUnanswered(tx: Prisma.TransactionClient, userId: string, item: ItemWithQuestion, withResult: boolean): Promise<void> {
    if (item.result === null) return;
    throw conflict('already-answered', 'Already answered', withResult ? { result: await this.resultOf(userId, item, tx) } : undefined);
  }
}
