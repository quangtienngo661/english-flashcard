import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Learner } from '../../content/index.js';
import { EntitlementsService } from '../../entitlements/index.js';
import type { PracticeSession, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { LearningService, type PracticeItem, type PracticeScope } from '../../learning/index.js';
import { SettingsService } from '../../settings/index.js';
import { withPracticeLock } from '../practice-lock.js';
import type { QuestionType } from '../practice.types.js';
import { shuffle } from '../questions/distractors.js';
import { QuestionBuilder } from '../questions/question-builder.service.js';
import { PracticeStats } from '../weak/practice-stats.js';
import { defaultSort, nextRoundOrder, sortWords, type SortKey, type SortableWord, type Source } from './order.js';
import { itemView, sessionView, type ItemView, type ItemWithQuestion, type SessionView } from './session-views.js';

// Session start walks a large source in batches; it holds the learner's practice lock meanwhile.
const startTransaction = { timeout: 30_000, maxWait: 10_000 };
const transactionOptions = { timeout: 15_000, maxWait: 10_000 };
const AVAILABILITY_BATCH = 50;
const OPEN = ['active', 'waiting_continue'];

export type GroupFilter = 'all' | 'due' | 'priority' | '0' | '1' | '2' | '3' | '4' | '5';
export type StartInput = {
  source: Source; group_id?: string; group_filter?: GroupFilter; sort?: SortKey; types: QuestionType[];
  prompt_style?: 'meaning' | 'sentence' | 'mixed'; count?: number;
};
type Notice = 'word-not-found';
export type NextResult =
  | { state: 'question'; session: SessionView; item: ItemView; notice?: Notice }
  | { state: 'waiting_continue'; session: SessionView; notice?: Notice }
  | { state: 'finished'; session: SessionView; notice?: Notice | 'group-not-found' };
type Advance =
  | { state: 'question'; item: ItemWithQuestion; notice?: Notice }
  | { state: 'waiting_continue'; notice?: Notice }
  | { state: 'finished'; notice?: Notice | 'group-not-found' }
  | { state: 'none' };

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
const sessionClosed = () => new ProblemDetailsException({ status: 409, title: 'Session closed', type: 'session-closed' });
const entitlementRequired = () =>
  new ProblemDetailsException({ status: 403, title: 'Entitlement required', type: 'entitlement-required' });
const noWords = (reason: 'group-empty' | 'no-word-fits-types' | 'source-empty') => new ProblemDetailsException({
  status: 409, title: 'No words to practise', type: 'practice-no-words', extensions: { reason },
});

@Injectable()
export class SessionsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(EntitlementsService) private readonly entitlements: EntitlementsService,
    @Inject(LearningService) private readonly learning: LearningService,
    @Inject(QuestionBuilder) private readonly builder: QuestionBuilder,
    @Inject(PracticeStats) private readonly stats: PracticeStats,
  ) {}

  async start(learner: Learner, input: StartInput): Promise<{ session: SessionView }> {
    const { practice } = await this.settings.get();
    const count = input.count ?? practice.defaultQuestionsPerSession;
    if (count > practice.maxQuestionsPerSession) {
      throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
    }
    const sort = input.sort ?? defaultSort(input.source);
    return this.prisma.$transaction(async (tx) => {
      await withPracticeLock(tx, learner.userId);
      await this.assertEntitled(learner.userId);
      const items = await this.sourceItems(learner.userId, input);
      if (items.length === 0) throw noWords(input.source === 'group' ? 'group-empty' : 'source-empty');
      const statsBySense = sort === 'least_practiced' || sort === 'most_wrong'
        ? await this.stats.statsFor(learner.userId) : new Map();
      const words: SortableWord[] = items.map((item) => ({
        sense_id: item.sense_id, level: item.level, due_date: item.due_date, priority: item.priority, section: item.section,
        added_at: item.added_at, last_needs_review_at: item.last_needs_review_at,
        last_practiced_at: statsBySense.get(item.sense_id)?.last_practiced_at ?? null,
        recent_wrong: statsBySense.get(item.sense_id)?.wrong ?? 0,
      }));
      const order = sortWords(words, sort, Math.random);
      const kept: string[] = [];
      // Each batch asks only for the words still missing (each word loads all its group mates), at most AVAILABILITY_BATCH.
      for (let at = 0; at < order.length && kept.length < count;) {
        const batch = order.slice(at, at + Math.min(AVAILABILITY_BATCH, count - kept.length));
        at += batch.length;
        const available = await this.builder.availability({
          userId: learner.userId, nativeLanguage: learner.nativeLanguage, senseIds: batch, chosenTypes: input.types,
        });
        for (const senseId of batch) {
          if (kept.length < count && (available.get(senseId)?.length ?? 0) > 0) kept.push(senseId);
        }
      }
      if (kept.length === 0) throw noWords('no-word-fits-types');
      const now = this.clock.now();
      await tx.practiceSession.updateMany({
        where: { userId: learner.userId, status: { in: OPEN } }, data: { status: 'abandoned', endedAt: now },
      });
      const session = await tx.practiceSession.create({ data: {
        userId: learner.userId, source: input.source, groupId: input.group_id ?? null,
        groupFilter: input.source === 'group' ? input.group_filter ?? 'all' : null, sort, types: input.types,
        promptStyle: input.prompt_style ?? 'mixed', targetCount: count, senseIds: kept, status: 'active', startedAt: now,
        lastActivityAt: now,
      } });
      return { session: sessionView(session, []) };
    }, startTransaction);
  }

  async current(learner: Learner): Promise<{ session: SessionView; item: ItemView | null; notice?: Notice }> {
    await this.closeIfIdle(learner.userId, null);
    const open = await this.prisma.practiceSession.findFirst({ where: { userId: learner.userId, status: { in: OPEN } } });
    if (!open) throw notFound();
    return this.prisma.$transaction(async (tx) => {
      const session = await this.lockOpen(tx, learner.userId, open.id);
      const result = await this.advance(tx, learner, session, false);
      const view = await this.view(tx, session.id);
      const item = result.state === 'question' ? itemView(result.item) : null;
      const notice = result.state !== 'none' && result.notice === 'word-not-found' ? result.notice : undefined;
      return { session: view, item, ...(notice ? { notice } : {}) };
    }, transactionOptions);
  }

  async next(learner: Learner, sessionId: string): Promise<NextResult> {
    await this.closeIfIdle(learner.userId, sessionId);
    return this.prisma.$transaction(async (tx) => {
      const session = await this.lockOpen(tx, learner.userId, sessionId);
      const result = await this.advance(tx, learner, session, true);
      const view = await this.view(tx, session.id);
      const notice = result.state !== 'none' && result.notice ? { notice: result.notice } : {};
      if (result.state === 'question') return { state: 'question', session: view, item: itemView(result.item), ...notice } as NextResult;
      if (result.state === 'waiting_continue') return { state: 'waiting_continue', session: view, ...notice } as NextResult;
      return { state: 'finished', session: view, ...notice } as NextResult;
    }, transactionOptions);
  }

  async continue(userId: string, sessionId: string, go: boolean): Promise<{ session: SessionView }> {
    await this.closeIfIdle(userId, sessionId);
    return this.prisma.$transaction(async (tx) => {
      const session = await this.lockOpen(tx, userId, sessionId);
      if (session.status !== 'waiting_continue') {
        throw new ProblemDetailsException({ status: 409, title: 'Session not waiting', type: 'session-not-waiting' });
      }
      await tx.practiceSession.update({ where: { id: sessionId }, data: go
        ? { status: 'active', continued: true } : { status: 'finished', continued: false, endedAt: this.clock.now() } });
      return { session: await this.view(tx, sessionId) };
    }, transactionOptions);
  }

  async finish(userId: string, sessionId: string): Promise<{ session: SessionView }> {
    await this.closeIfIdle(userId, sessionId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockOpen(tx, userId, sessionId);
      await tx.practiceSession.update({ where: { id: sessionId }, data: { status: 'finished', endedAt: this.clock.now() } });
      return { session: await this.view(tx, sessionId) };
    }, transactionOptions);
  }

  /**
   * Abandons the session (or the learner's open one) when idle past idle_session_close_hours (design §11). A statement of its
   * own, committed before the route's transaction, so the route's 409 never rolls the close back.
   */
  async closeIfIdle(userId: string, sessionId: string | null): Promise<void> {
    const { practice } = await this.settings.get();
    const now = this.clock.now();
    await this.prisma.practiceSession.updateMany({
      where: {
        userId, ...(sessionId === null ? {} : { id: sessionId }), status: { in: OPEN },
        lastActivityAt: { lt: new Date(now.getTime() - practice.idleSessionCloseHours * 3_600_000) },
      },
      data: { status: 'abandoned', endedAt: now },
    });
  }

  /** Lock order step 2: the session row; another learner's is 404, a closed one 409; touches last_activity_at. */
  async lockOpen(tx: Prisma.TransactionClient, userId: string, sessionId: string): Promise<PracticeSession> {
    const session = await this.lockSession(tx, userId, sessionId);
    if (!OPEN.includes(session.status)) throw sessionClosed();
    return tx.practiceSession.update({ where: { id: sessionId }, data: { lastActivityAt: this.clock.now() } });
  }

  async lockSession(tx: Prisma.TransactionClient, userId: string, sessionId: string): Promise<PracticeSession> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM practice_sessions WHERE id = ${sessionId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
    if (rows.length === 0) throw notFound();
    return tx.practiceSession.findUniqueOrThrow({ where: { id: sessionId } });
  }

  async view(tx: Prisma.TransactionClient, sessionId: string): Promise<SessionView> {
    const session = await tx.practiceSession.findUniqueOrThrow({ where: { id: sessionId } });
    const items = await tx.practiceSessionItem.findMany({ where: { sessionId }, select: { round: true, result: true } });
    return sessionView(session, items);
  }

  private async assertEntitled(userId: string): Promise<void> {
    if (!(await this.entitlements.check(userId, 'practice.basic')).allowed) throw entitlementRequired();
  }

  private async sourceItems(userId: string, input: StartInput): Promise<PracticeItem[]> {
    if (input.source === 'weak') return (await this.stats.weakSenses(userId)).map(({ item }) => item);
    const filter = input.group_filter ?? 'all';
    // Stored as text ('0'…'5'); Learning takes a level as a number.
    const scope: PracticeScope = input.source === 'group'
      ? { kind: 'group', groupId: input.group_id!, filter: /^\d$/.test(filter) ? (Number(filter) as 0 | 1 | 2 | 3 | 4 | 5) : filter as 'all' | 'due' | 'priority' }
      : { kind: input.source };
    return this.learning.practiceItems(userId, scope);
  }

  /** Senses of the session still usable: visible, in learning and, for a group source, still in that group (design 7.2). */
  private async usable(userId: string, session: PracticeSession): Promise<Set<string>> {
    const items = session.source === 'group'
      ? await this.learning.practiceItems(userId, { kind: 'group', groupId: session.groupId!, filter: 'all' })
      : await this.learning.practiceItems(userId, { kind: 'senses', senseIds: session.senseIds });
    const inSession = new Set(session.senseIds);
    return new Set(items.map(({ sense_id }) => sense_id).filter((id) => inSession.has(id)));
  }

  /**
   * The rules of `next` (plan Task 14), in order: pending notice, group gone, pending item (kept or voided), end rule, round
   * rule, then a new question. `build` false (current) stops before building unless an item was just voided or a notice set.
   */
  private async advance(tx: Prisma.TransactionClient, learner: Learner, session: PracticeSession, build: boolean): Promise<Advance> {
    const { userId } = learner;
    let notice: Notice | undefined;
    if (session.pendingNotice !== null) {
      notice = 'word-not-found';
      await tx.practiceSession.update({ where: { id: session.id }, data: { pendingNotice: null } });
    }
    if (session.status === 'waiting_continue') return { state: 'waiting_continue', notice };
    const items: ItemWithQuestion[] = await tx.practiceSessionItem.findMany({
      where: { sessionId: session.id }, include: { question: true }, orderBy: { position: 'asc' },
    });
    const pending = items.find((item) => item.result === null);
    if (session.source === 'group') {
      const { groupExists } = await this.learning.practiceCheck(userId, session.senseIds[0], session.groupId);
      if (!groupExists) {
        if (pending) await this.voidItem(tx, pending);
        await this.finishRow(tx, session.id);
        return { state: 'finished', notice: 'group-not-found' };
      }
    }
    const usable = await this.usable(userId, session);
    if (pending) {
      if (usable.has(pending.senseId)) return { state: 'question', item: pending, notice };
      await this.voidItem(tx, pending);
      notice = 'word-not-found';
    } else if (!build && notice === undefined) {
      return { state: 'none' };
    }

    const answered = items.filter((item) => item.result === 'correct' || item.result === 'wrong').length;
    if (answered >= session.targetCount) {
      await this.finishRow(tx, session.id);
      return { state: 'finished', notice };
    }
    const lastRound = Math.max(1, ...items.map((item) => item.round));
    const last = items.at(-1);
    let plan: Array<{ senseId: string; round: number }>;
    if (lastRound === 1 && session.continued !== true) {
      // Round 1 walks sense_ids once, forward from the last asked word; a word that fails here is dropped (design 7.2).
      const cursor = Math.max(-1, ...items.map((item) => session.senseIds.indexOf(item.senseId)));
      plan = session.senseIds.slice(cursor + 1).filter((id) => usable.has(id)).map((senseId) => ({ senseId, round: 1 }));
    } else {
      const words = session.senseIds.filter((id) => usable.has(id));
      const inRound = new Set(lastRound >= 2 ? items.filter((item) => item.round === lastRound).map((item) => item.senseId) : []);
      const remaining = lastRound >= 2 ? words.filter((id) => !inRound.has(id)) : [];
      const nextRound = Math.max(2, lastRound + (lastRound >= 2 ? 1 : 0));
      plan = [
        ...shuffle(remaining, Math.random).map((senseId) => ({ senseId, round: lastRound })),
        ...nextRoundOrder(words, last?.senseId ?? null, Math.random).map((senseId) => ({ senseId, round: nextRound })),
      ];
    }

    if (plan.length > 0) await this.assertEntitled(userId);
    const { practice } = await this.settings.get();
    for (const { senseId, round } of plan) {
      const previous = items.filter((item) => item.senseId === senseId).at(-1);
      const built = await this.builder.build({
        userId, nativeLanguage: learner.nativeLanguage, senseId, chosenTypes: session.types as QuestionType[],
        promptStyle: session.promptStyle as 'meaning' | 'sentence' | 'mixed',
        previousType: (previous?.question.type as QuestionType | undefined) ?? null,
        avoidDistractors: previous?.question.distractorSenseIds ?? [], settings: practice, random: Math.random,
      });
      if ('skip' in built) continue;
      const now = this.clock.now();
      const question = await tx.practiceQuestion.create({ data: {
        userId, senseId, type: built.type, promptStyle: built.promptStyle, blank: built.blank ?? undefined, schemaVersion: 1,
        prompt: built.prompt, answerKey: built.answerKey, hints: built.hints, distractorSenseIds: built.distractorSenseIds,
        createdAt: now,
      } });
      const item = await tx.practiceSessionItem.create({
        data: {
          sessionId: session.id, userId, questionId: question.id, senseId, round, position: (last?.position ?? 0) + 1, askedAt: now,
          maxRetries: practice.typeWordMaxRetries,
        },
        include: { question: true },
      });
      return { state: 'question', item, notice };
    }
    // Round 1 done short of the target: ask once whether to go on, unless no word is left at all (B4E31).
    if (lastRound === 1 && session.continued === null && usable.size > 0) {
      await tx.practiceSession.update({ where: { id: session.id }, data: { status: 'waiting_continue' } });
      return { state: 'waiting_continue', notice };
    }
    await this.finishRow(tx, session.id);
    return { state: 'finished', notice };
  }

  private async voidItem(tx: Prisma.TransactionClient, item: ItemWithQuestion): Promise<void> {
    // An item becomes void only while it has no final result.
    await tx.practiceSessionItem.updateMany({ where: { id: item.id, result: null }, data: { result: 'void' } });
  }

  private async finishRow(tx: Prisma.TransactionClient, sessionId: string): Promise<void> {
    await tx.practiceSession.update({ where: { id: sessionId }, data: { status: 'finished', endedAt: this.clock.now() } });
  }
}
