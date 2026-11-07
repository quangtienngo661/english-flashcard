import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateValue, localDate } from '../../common/time/local-date.js';
import { ContentService } from '../../content/index.js';
import { EntitlementsService } from '../../entitlements/index.js';
import type { PracticeSession, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { LearningService } from '../../learning/index.js';
import { matchesAnswer, normalizeAnswer } from '../grading/normalize.js';
import type { AnswerKey, Hints, Prompt } from '../practice.types.js';
import type { ItemWithQuestion } from '../sessions/session-views.js';
import type { ReviewAction } from '../reviews/practice-reviews.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { matchTyped, sessionWordForms, type SessionWordForms, type TypeWordKey } from './typed-match.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

export type AnswerBody = { choice: number } | { is_true: boolean } | { text: string };
export type AnswerResult = {
  result: 'correct' | 'wrong'; skipped: boolean; tries: number; hint_level: number;
  correct: { lemma: string; text: string; choice_index: number | null; is_true: boolean | null };
  meaning: string; definition_en: string | null; show_known: boolean; highlight_needs_review: boolean;
  /** Bước 7 (PRC22): the Vietnamese translation of an AI sentence, for a `vi` learner only; else null. */
  translation: string | null;
  /** Session synonyms: set for an AI fill-in answered with a declared session word; null for every other result. */
  alternative: { typed: string; rows: AlternativeRow[] } | null;
  /** Round C (H6): what the final answer did to the schedule; set only in a recall session (and only on the answer itself, not on a read of it). */
  schedule: { level: number; due_date: string; outcome: 'leveled_up' | 'kept' } | null;
};
/** What `writeFinal` leaves behind: the stored item, the schedule change of a recall session and whether the session was one. */
export type FinalOutcome = { item: ItemWithQuestion; schedule: AnswerResult['schedule']; recall: boolean };
/** One word of an alternative answer: the word typed (credited) or the word asked, each with its own review state. */
export type AlternativeRow = {
  sense_id: string; lemma: string; meaning: string; role: 'typed' | 'asked'; show_known: boolean; action: ReviewAction | null;
};
/** `reason: 'session_word'`: the typed word is another word of the session (it does not use up a try); null for any other wrong word. */
export type TryAgainReply = { result: 'try_again'; tries: number; reason: 'session_word' | null };
export type FinalWrite = {
  result: 'correct' | 'wrong'; answerRaw: string | null; answerNormalized: string | null; answersTried: string[]; tries: number; skipped: boolean;
  /** An AI fill-in answered with a declared session word, and the word credited (null when the form belongs to more than one). */
  alternative?: boolean; alternativeSenseId?: string | null;
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
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  answer(userId: string, itemId: string, body: AnswerBody): Promise<AnswerResult | TryAgainReply> {
    return this.locked(userId, itemId, async (tx, item, session) => {
      await this.assertUnanswered(tx, userId, item, true, session);
      const key = item.question.answerKey as AnswerKey;
      let correct: boolean;
      let raw: string;
      let normalized: string;
      let alternative: { senseId: string | null } | null = null;
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
        if (!correct) {
          // Not the sentence's own answer: is it another word of the current session (design §3.1)? Read only now, never for a right answer.
          const match = matchTyped(body.text, key, await this.sessionWords(tx, userId, item, key, session));
          if (match.kind === 'alternative') {
            correct = true;
            alternative = { senseId: match.senseId };
          } else if (match.kind === 'session_word') {
            // Always a try-again, and not counted against max_retries: the learner typed a word of her own session, not a misspelling.
            await tx.practiceSessionItem.update({
              where: { id: item.id },
              data: { answersTried: [...item.answersTried, raw], tries: item.tries + 1, sessionWordTries: item.sessionWordTries + 1 },
            });
            return { result: 'try_again', tries: item.tries + 1, reason: 'session_word' };
          } else if (item.maxRetries === null || item.tries - item.sessionWordTries < item.maxRetries) {
            await tx.practiceSessionItem.update({
              where: { id: item.id }, data: { answersTried: [...item.answersTried, raw], tries: item.tries + 1 },
            });
            return { result: 'try_again', tries: item.tries + 1, reason: null };
          }
        }
      } else {
        throw validationFailed();
      }
      const final = await this.writeFinal(tx, item, {
        result: correct ? 'correct' : 'wrong', answerRaw: raw, answerNormalized: normalized, answersTried: item.answersTried,
        tries: item.tries + 1, skipped: false,
        ...(alternative ? { alternative: true, alternativeSenseId: alternative.senseId } : {}),
      });
      return this.resultOf(userId, final.item, tx, final);
    });
  }

  /**
   * "Bỏ qua": cloze may be skipped before any try (K/78a, design đợt cải thiện A §6.1); typing only after one try.
   * After a try, the last typed text becomes the stored answer.
   */
  skip(userId: string, itemId: string): Promise<AnswerResult> {
    return this.locked(userId, itemId, async (tx, item, session) => {
      await this.assertUnanswered(tx, userId, item, false, session);
      if (!['type_word', 'cloze'].includes(item.question.type) || (item.question.type === 'type_word' && item.tries === 0)) {
        throw conflict('skip-not-allowed', 'Skip not allowed');
      }
      if (item.tries === 0) {
        const final = await this.writeFinal(tx, item, {
          result: 'wrong', answerRaw: null, answerNormalized: null, answersTried: [], tries: 0, skipped: true,
        });
        return this.resultOf(userId, final.item, tx, final);
      }
      const last = item.answersTried.at(-1)!;
      const final = await this.writeFinal(tx, item, {
        result: 'wrong', answerRaw: last, answerNormalized: normalizeAnswer(last), answersTried: item.answersTried.slice(0, -1),
        tries: item.tries, skipped: true,
      });
      return this.resultOf(userId, final.item, tx, final);
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

  /**
   * The one place a final result is written (a test makes it throw, B4E23). In a recall session the answer also moves the word's
   * schedule, in this transaction and before the item is written (round C DC4/DC26): "right" there is a right answer without a
   * hint, and a skip is wrong; a practice session is not touched and spends a session of the day as before.
   */
  async writeFinal(tx: Prisma.TransactionClient, item: ItemWithQuestion, final: FinalWrite): Promise<FinalOutcome> {
    const profile = await this.identity.getProfile(item.userId, tx);
    if (!profile) throw notFound();
    const now = this.clock.now();
    const date = localDate(profile.timezone, now);
    const session = await tx.practiceSession.findUniqueOrThrow({ where: { id: item.sessionId }, select: { kind: true, groupId: true } });
    const recall = session.kind === 'recall';
    let schedule: AnswerResult['schedule'] = null;
    if (recall) {
      const outcome = await this.learning.recallAnswer(tx, item.userId, {
        senseId: item.senseId, groupId: session.groupId!, correct: final.result === 'correct' && item.hintLevel === 0,
      });
      if (outcome.outcome !== 'not-in-learning') schedule = { level: outcome.level, due_date: outcome.due_date, outcome: outcome.outcome };
    }
    const written = await tx.practiceSessionItem.update({
      where: { id: item.id },
      data: { ...final, answeredAt: now, localDate: dateValue(date), ...(schedule ? { recallOutcome: schedule.outcome } : {}) },
      include: { question: true },
    });
    // The session's first final result spends one session of the day (design §7.4); later calls are ignored by the insert.
    // A recall session is not a practice session: it spends none.
    if (!recall) await this.entitlements.recordPracticeSession(tx, item.userId, item.sessionId, date);
    // A final result, a skip included, is a "lần học" of the learner's local day (nhóm B D39, B51); a "try again" never gets here.
    await this.learning.recordActivity(item.userId, date, { studied: true }, tx);
    return { item: written, schedule, recall };
  }

  /**
   * The stored result as the app sees it; the buttons are worked out now (design 7.8). A caller inside an open transaction
   * passes its `tx` as `db`, so the learning item is read without a second connection.
   */
  async resultOf(userId: string, item: ItemWithQuestion, db?: Prisma.TransactionClient | PrismaClient,
    recall: Pick<FinalOutcome, 'schedule' | 'recall'> = { schedule: null, recall: false }): Promise<AnswerResult> {
    const key = item.question.answerKey as AnswerKey;
    const prompt = item.question.prompt as Prompt;
    const { item: learningItem } = await this.learning.practiceCheck(userId, item.senseId, null, db);
    const correct = item.result === 'correct';
    const translation = key.translation_vi
      ? ((await this.identity.getProfile(userId, db))?.native_language === 'vi' ? key.translation_vi : null) : null;
    const alternative = item.alternative ? await this.alternativeOf(userId, item, key, learningItem?.due_now ?? null, db) : null;
    return {
      result: correct ? 'correct' : 'wrong', skipped: item.skipped, tries: item.tries, hint_level: item.hintLevel,
      correct: correctOf(key, prompt),
      meaning: key.reveal.meaning, definition_en: key.reveal.definition_en,
      // On an alternative card the buttons belong to the two rows; an older web build shows today's card and must not review the asked word.
      // A recall session already moved the word (round C): "Đã biết" is never offered there.
      show_known: !recall.recall && alternative === null && learningItem !== null && correct && item.hintLevel === 0 && learningItem.due_now,
      highlight_needs_review: alternative === null && learningItem !== null && !correct, translation, alternative,
      schedule: recall.schedule,
    };
  }

  /**
   * The two rows of an alternative answer, typed word first (design §3.2). Each row's Know follows today's rule for that word on its own:
   * a right answer, no hint, and the word in learning and due now.
   */
  private async alternativeOf(userId: string, item: ItemWithQuestion, key: AnswerKey, askedDue: boolean | null,
    db?: Prisma.TransactionClient | PrismaClient): Promise<NonNullable<AnswerResult['alternative']>> {
    const knowable = (due: boolean | null) => due === true && item.result === 'correct' && item.hintLevel === 0;
    const rows: AlternativeRow[] = [];
    if (item.alternativeSenseId !== null) {
      const typed = (await this.typedWords(userId, [item.alternativeSenseId], db)).get(item.alternativeSenseId);
      if (typed) {
        const { item: learningItem } = await this.learning.practiceCheck(userId, item.alternativeSenseId, null, db);
        rows.push({
          sense_id: item.alternativeSenseId, lemma: typed.lemma, meaning: typed.meaning, role: 'typed',
          show_known: knowable(learningItem?.due_now ?? null), action: item.alternativeReviewAction as ReviewAction | null,
        });
      }
    }
    rows.push({
      sense_id: item.senseId, lemma: key.reveal.lemma, meaning: key.reveal.meaning, role: 'asked',
      show_known: knowable(askedDue), action: item.reviewAction as ReviewAction | null,
    });
    return { typed: item.answerRaw ?? '', rows };
  }

  /** The lemma and the meaning (in the learner's language) of words the learner typed; a word that is not visible any more is left out. */
  async typedWords(userId: string, senseIds: string[], db?: Prisma.TransactionClient | PrismaClient):
    Promise<Map<string, { lemma: string; meaning: string }>> {
    if (senseIds.length === 0) return new Map();
    const language = (await this.identity.getProfile(userId, db))?.native_language === 'en' ? 'en' : 'vi';
    const senses = await this.content.practiceSenses(userId, senseIds, language, db);
    return new Map([...senses].map(([id, sense]) => [id, { lemma: sense.lemma, meaning: sense.meaning.text }]));
  }

  /**
   * Lock order (plan, Global Constraints): the idle close in its own statement, then the session row (404, session-closed,
   * last_activity_at), then the item row; a void item is 409 item-void.
   */
  private async locked<T>(userId: string, itemId: string,
    work: (tx: Prisma.TransactionClient, item: ItemWithQuestion, session: PracticeSession) => Promise<T>): Promise<T> {
    const found = await this.prisma.practiceSessionItem.findFirst({ where: { id: itemId, userId }, select: { sessionId: true } });
    if (!found) throw notFound();
    await this.sessions.closeIfIdle(userId, found.sessionId);
    return this.prisma.$transaction(async (tx) => {
      const session = await this.sessions.lockOpen(tx, userId, found.sessionId);
      await tx.$queryRaw`SELECT id FROM practice_session_items WHERE id = ${itemId}::uuid FOR UPDATE`;
      const item = await tx.practiceSessionItem.findUniqueOrThrow({ where: { id: itemId }, include: { question: true } });
      if (item.result === 'void') throw conflict('item-void', 'Item void');
      return work(tx, item, session);
    }, transactionOptions);
  }

  /** The current session's words as the matching needs them: usable now, so a word deleted or taken out of the group is an outside word. */
  private async sessionWords(tx: Prisma.TransactionClient, userId: string, item: ItemWithQuestion, key: TypeWordKey,
    session: PracticeSession): Promise<SessionWordForms[]> {
    let ids: string[];
    try {
      ids = await this.sessions.sessionWordIds(tx, userId, session);
    } catch (error) {
      // The session's group was deleted in another tab: its items cannot be read (404). Before session synonyms an answer never read the group,
      // so it is judged as it was: no session words, today's try-again or final wrong. The next `next` call ends the session as it always did.
      if (error instanceof ProblemDetailsException && error.getStatus() === 404) return [];
      throw error;
    }
    // The forms of a word do not depend on the language of its meaning.
    const found = ids.length === 0 ? new Map() : await this.content.practiceSenses(userId, ids, 'vi', tx);
    return sessionWordForms({ senseId: item.senseId, lemma: key.reveal.lemma }, ids.flatMap((id) => found.get(id) ?? []));
  }

  private async assertUnanswered(tx: Prisma.TransactionClient, userId: string, item: ItemWithQuestion, withResult: boolean,
    session?: PracticeSession): Promise<void> {
    if (item.result === null) return;
    const recall = { schedule: null, recall: session?.kind === 'recall' };
    throw conflict('already-answered', 'Already answered', withResult ? { result: await this.resultOf(userId, item, tx, recall) } : undefined);
  }
}
