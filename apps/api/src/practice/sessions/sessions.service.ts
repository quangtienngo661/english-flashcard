import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { ContentService, type Learner } from '../../content/index.js';
import { EntitlementsService, refusalProblem } from '../../entitlements/index.js';
import type { PracticeSession, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { LearningService, type PracticeItem, type PracticeScope } from '../../learning/index.js';
import { SettingsService } from '../../settings/index.js';
import { contentKey } from '../ai/ai-inputs.js';
import { aiBudget, aiChanceInLaterRound } from '../ai/ai-plan.js';
import { AiQuestionGenerator } from '../ai/ai-question-generator.service.js';
import { AiRequestsRepository, type AiRequestRow } from '../ai/ai-requests.repository.js';
import { AiSessionPlanner } from '../ai/ai-session-planner.service.js';
import { findUnseen, pickUnseen } from '../ai/unseen-questions.js';
import { withPracticeLock } from '../practice-lock.js';
import { PREPARING_RETRY_SECONDS } from '../practice.constants.js';
import { isAiType, type AiFailure, type ClozeSource, type QuestionType } from '../practice.types.js';
import { shuffle } from '../questions/distractors.js';
import { QuestionBuilder } from '../questions/question-builder.service.js';
import { chooseType } from '../questions/question-types.js';
import { PracticeStats } from '../weak/practice-stats.js';
import { defaultSort, nextRoundOrder, sortWords, type SortKey, type SortableWord, type Source } from './order.js';
import { itemView, sessionView, type ItemView, type ItemWithQuestion, type SessionView } from './session-views.js';

const transactionOptions = { timeout: 15_000, maxWait: 10_000 };
const AVAILABILITY_BATCH = 50;
const OPEN = ['active', 'waiting_continue'];

export type GroupFilter = 'all' | 'due' | 'priority' | '0' | '1' | '2' | '3' | '4' | '5';
export type StartInput = {
  source: Source; group_id?: string; group_filter?: GroupFilter; sort?: SortKey; types: QuestionType[];
  prompt_style?: 'meaning' | 'sentence' | 'mixed'; count?: number;
  /** Bước 7 (design §6.1): only with `cloze`; default 'ai'. */
  cloze_source?: ClozeSource;
};
type Notice = 'word-not-found';
/** The reasons the app sees (design §6.6); the detail stays in `practice_ai_requests.failure`. */
type PublicAiReason = 'ai-failed' | 'quota-exhausted' | 'plan-required' | 'ai-unavailable';
const publicReason = (failure: AiFailure): PublicAiReason =>
  failure === 'quota-exhausted' || failure === 'plan-required' || failure === 'ai-unavailable' ? failure : 'ai-failed';
/** Bước 7 (design §6.6): shown with the question that replaced an AI one, or with `ai_unavailable` (row 4). */
type AiNotice = { notice: 'ai-fallback'; ai_reason: PublicAiReason } | { notice: 'word-not-recognized'; sense_id: string };
type NoticeFields = { notice?: Notice | 'group-not-found' | AiNotice['notice']; ai_reason?: PublicAiReason; resets_at?: string;
  sense_id?: string };
export type NextResult =
  | ({ state: 'question'; session: SessionView; item: ItemView } & NoticeFields)
  | ({ state: 'waiting_continue'; session: SessionView } & NoticeFields)
  | ({ state: 'finished'; session: SessionView } & NoticeFields)
  | { state: 'preparing'; session: SessionView; retry_after_seconds: number }
  | ({ state: 'ai_unavailable'; session: SessionView; reason: PublicAiReason; resets_at?: string; retry_after_seconds?: number }
    & Pick<NoticeFields, 'notice' | 'sense_id'>);
type Advance =
  | { state: 'question'; item: ItemWithQuestion; notice?: Notice; ai?: AiNotice;
    /** G attached a question not yet charged: confirm it after commit (B7E33). */
    confirmRequestId?: string }
  | { state: 'waiting_continue'; notice?: Notice }
  | { state: 'finished'; notice?: Notice | 'group-not-found' }
  | { state: 'none' }
  /** A slot waits for an AI request: `fresh` = created now, run it; else run it only after taking it over as stale. */
  | { state: 'pending'; requestId: string; fresh: boolean }
  | { state: 'preparing' }
  | { state: 'ai_unavailable'; reason: PublicAiReason; ai?: AiNotice };

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
const sessionClosed = () => new ProblemDetailsException({ status: 409, title: 'Session closed', type: 'session-closed' });
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
    @Inject(AiSessionPlanner) private readonly aiPlanner: AiSessionPlanner,
    @Inject(AiQuestionGenerator) private readonly generator: AiQuestionGenerator,
    @Inject(AiRequestsRepository) private readonly aiRequests: AiRequestsRepository,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  async start(learner: Learner, input: StartInput): Promise<{ session: SessionView }> {
    const { practice } = await this.settings.get();
    const count = input.count ?? practice.defaultQuestionsPerSession;
    if (count > practice.maxQuestionsPerSession) {
      throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
    }
    const sort = input.sort ?? defaultSort(input.source);
    // Early answer for a learner with no session left, before the availability walk (plan review #15); the check that
    // counts runs again inside the transaction, after the open session is closed.
    const early = await this.entitlements.checkQuota(learner.userId, 'practice_sessions');
    if (!early.allowed) throw refusalProblem(early);
    // Every read below goes through the global client, so it runs before the transaction: inside it each would borrow a
    // second connection while the transaction holds one (PX4). A word that stops being visible before the transaction
    // commits is dropped later, when `build` skips it as not visible.
    await this.assertEntitled(learner.userId);
    const clozeSource = input.types.includes('cloze') ? input.cloze_source ?? 'ai' : null;
    // Bước 7 (design §6.1 step 2); null when no Bước 7 type is chosen.
    const snapshot = await this.aiPlanner.gate(learner.userId, input.types, clozeSource);
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
    const availableBySense = new Map<string, QuestionType[]>();
    // Each batch asks only for the words still missing (each word loads all its group mates), at most AVAILABILITY_BATCH.
    for (let at = 0; at < order.length && kept.length < count;) {
      const batch = order.slice(at, at + Math.min(AVAILABILITY_BATCH, count - kept.length));
      at += batch.length;
      const available = await this.builder.availability({
        userId: learner.userId, nativeLanguage: learner.nativeLanguage, senseIds: batch, chosenTypes: input.types, clozeSource,
      });
      for (const senseId of batch) {
        if (kept.length < count && (available.get(senseId)?.length ?? 0) > 0) {
          kept.push(senseId);
          availableBySense.set(senseId, available.get(senseId)!);
        }
      }
    }
    if (kept.length === 0) throw noWords('no-word-fits-types');
    // Steps 3–5: words marked for AI, the session's AI questions, units left (design §6.1).
    const ai = await this.aiPlanner.plan(learner, { types: input.types, clozeSource, count, kept, available: availableBySense }, snapshot);
    return this.prisma.$transaction(async (tx) => {
      await withPracticeLock(tx, learner.userId);
      const now = this.clock.now();
      await tx.practiceSession.updateMany({
        where: { userId: learner.userId, status: { in: OPEN } }, data: { status: 'abandoned', endedAt: now },
      });
      // After the close (R4, B5E73): it waits for the old session's row, so a first answer being written there commits
      // first and is counted. A refusal rolls back, so the open session stays.
      const quota = await this.entitlements.checkQuota(learner.userId, 'practice_sessions', tx);
      if (!quota.allowed) throw refusalProblem(quota);
      const session = await tx.practiceSession.create({ data: {
        userId: learner.userId, source: input.source, groupId: input.group_id ?? null,
        groupFilter: input.source === 'group' ? input.group_filter ?? 'all' : null, sort, types: input.types,
        promptStyle: input.prompt_style ?? 'mixed', targetCount: count, senseIds: kept, status: 'active', startedAt: now,
        lastActivityAt: now, clozeSource, aiPlanned: ai.aiPlanned, aiSenseIds: ai.aiSenseIds,
      } });
      return { session: sessionView(session, []) };
    }, transactionOptions);
  }

  /** Never calls AI (design §6.8): a slot still waiting for its AI question is `preparing`; a ready one is attached (G). */
  async current(learner: Learner): Promise<{ session: SessionView; item: ItemView | null; notice?: Notice; preparing: boolean }> {
    await this.closeIfIdle(learner.userId, null);
    const open = await this.prisma.practiceSession.findFirst({ where: { userId: learner.userId, status: { in: OPEN } } });
    if (!open) throw notFound();
    const { result, view } = await this.prisma.$transaction(async (tx) => {
      const session = await this.lockOpen(tx, learner.userId, open.id);
      const advanced = await this.advance(tx, learner, session, false, false);
      return { result: advanced, view: await this.view(tx, session.id) };
    }, transactionOptions);
    if (result.state === 'question' && result.confirmRequestId) await this.lateConfirm(learner.userId, result.confirmRequestId, result.item.questionId);
    const item = result.state === 'question' ? itemView(result.item) : null;
    const notice = 'notice' in result && result.notice === 'word-not-found' ? result.notice : undefined;
    return { session: view, item, ...(notice ? { notice } : {}), preparing: result.state === 'preparing' };
  }

  /**
   * Design §6.5, §6.8: A in a short transaction (the pending slot first), the generator (B–H) outside any transaction, then A
   * again, which attaches the question (G) or applies the fallback of §6.6. `retryAi` makes a new request for a slot whose AI
   * failed in an AI-only session (B7E48).
   */
  async next(learner: Learner, sessionId: string, retryAi = false): Promise<NextResult> {
    await this.closeIfIdle(learner.userId, sessionId);
    let retry = retryAi;
    let failure: { resetsAt?: string; retryAfterSeconds?: number } = {};
    for (let attempt = 0; ; attempt++) {
      const { result, view } = await this.prisma.$transaction(async (tx) => {
        const session = await this.lockOpen(tx, learner.userId, sessionId);
        const advanced = await this.advance(tx, learner, session, true, retry);
        return { result: advanced, view: await this.view(tx, session.id) };
      }, transactionOptions);
      retry = false;
      if (result.state === 'pending') {
        const preparing: NextResult = { state: 'preparing', session: view, retry_after_seconds: PREPARING_RETRY_SECONDS };
        // B7E16, B7E111: someone else is making it; at most one run of the generator per call.
        if (attempt > 0 || (!result.fresh && !(await this.aiRequests.claimStale(result.requestId, this.clock.now())))) return preparing;
        const outcome = await this.generator.run(result.requestId, { learner, session: { id: sessionId, aiStopped: null } });
        if (outcome.state === 'preparing') return preparing;
        if (outcome.state === 'failed') failure = { resetsAt: outcome.resetsAt, retryAfterSeconds: outcome.retryAfterSeconds };
        continue;
      }
      if (result.state === 'question' && result.confirmRequestId) {
        await this.lateConfirm(learner.userId, result.confirmRequestId, result.item.questionId);
      }
      return this.nextResult(result, view, failure);
    }
  }

  /**
   * Makes AI questions ahead (design §6.4): the next `ai_prefetch_count` round-1 words marked for AI after the current position,
   * while the session's budget lasts. Requests are created in a short transaction, then run in parallel; the pending pointer is
   * never set, so `next` finds them through the session's requests. Nothing when AI has stopped for the session.
   */
  async prepare(learner: Learner, sessionId: string): Promise<{ prepared: number; already_ready: number; failed: number }> {
    await this.closeIfIdle(learner.userId, sessionId);
    const { requestIds, already } = await this.prisma.$transaction(async (tx) => {
      const session = await this.lockOpen(tx, learner.userId, sessionId);
      const { practice } = await this.settings.get(tx);
      const aiTypes = this.aiTypesOf(session);
      const none = { requestIds: [] as string[], already: 0 };
      if (session.aiStopped !== null || aiTypes.length === 0 || practice.aiPrefetchCount === 0 || session.continued === true) return none;
      const items: ItemWithQuestion[] = await tx.practiceSessionItem.findMany({
        where: { sessionId: session.id }, include: { question: true }, orderBy: { position: 'asc' },
      });
      // Round 1 only (design §6.4).
      if (items.some((item) => item.round > 1)) return none;
      const cursor = Math.max(-1, ...items.map((item) => session.senseIds.indexOf(item.senseId)));
      const window = session.senseIds.slice(cursor + 1).filter((id) => session.aiSenseIds.includes(id)).slice(0, practice.aiPrefetchCount);
      let budget = await this.aiBudgetOf(tx, session, items);
      const pointed = session.pendingAiRequestId ? (await this.aiRequests.get(session.pendingAiRequestId, tx))?.senseId : undefined;
      const result = { requestIds: [] as string[], already: 0 };
      for (const senseId of window) {
        if (budget <= 0) break;
        if (senseId === pointed || (await this.aiRequests.findForSession(tx, session.id, senseId))?.round === 1) {
          result.already++;
          continue;
        }
        const available = (await this.builder.availability({
          userId: learner.userId, nativeLanguage: learner.nativeLanguage, senseIds: [senseId], chosenTypes: aiTypes,
          clozeSource: session.clozeSource as ClozeSource | null, db: tx,
        })).get(senseId) ?? [];
        if (available.length === 0) continue;
        const sense = (await this.content.practiceSenses(learner.userId, [senseId], learner.nativeLanguage, tx)).get(senseId);
        if (!sense) continue;
        const key = sense.scope === 'private' ? contentKey(sense.lemma, sense.pos, sense.gloss_vi ?? '') : null;
        const unseen = await findUnseen(tx, this.content,
          { userId: learner.userId, senseId, types: available, liveRevisionId: sense.live_revision_id, contentKey: key });
        const running = await tx.practiceAiRequest.findFirst({ where: { userId: learner.userId, senseId, state: 'generating' } });
        if (unseen.length > 0 || running) {
          result.already++;
          continue;
        }
        const request = await this.aiRequests.create(tx, {
          userId: learner.userId, sessionId: session.id, senseId, type: chooseType(available, null, Math.random), round: 1,
        });
        result.requestIds.push(request.id);
        budget--;
      }
      return result;
    }, transactionOptions);
    // B7E126: a session closed meanwhile only leaves unseen questions behind.
    const outcomes = await Promise.all(requestIds.map((id) =>
      this.generator.run(id, { learner, session: { id: sessionId, aiStopped: null } })));
    return {
      prepared: outcomes.filter((o) => o.state === 'ready').length,
      already_ready: already + outcomes.filter((o) => o.state === 'preparing').length,
      failed: outcomes.filter((o) => o.state === 'failed').length,
    };
  }

  private nextResult(result: Advance, view: SessionView, failure: { resetsAt?: string; retryAfterSeconds?: number }): NextResult {
    switch (result.state) {
      case 'question': {
        const ai: NoticeFields = !result.ai ? {} : result.ai.notice === 'ai-fallback'
          ? { notice: 'ai-fallback', ai_reason: result.ai.ai_reason, ...(failure.resetsAt ? { resets_at: failure.resetsAt } : {}) }
          : { notice: 'word-not-recognized', sense_id: result.ai.sense_id };
        return { state: 'question', session: view, item: itemView(result.item), ...(result.notice ? { notice: result.notice } : {}), ...ai };
      }
      case 'ai_unavailable':
        return {
          state: 'ai_unavailable', session: view, reason: result.reason, ...(failure.resetsAt ? { resets_at: failure.resetsAt } : {}),
          ...(result.ai?.notice === 'word-not-recognized' ? { notice: 'word-not-recognized', sense_id: result.ai.sense_id } : {}),
          ...(failure.retryAfterSeconds !== undefined ? { retry_after_seconds: failure.retryAfterSeconds } : {}),
        };
      case 'preparing':
        return { state: 'preparing', session: view, retry_after_seconds: PREPARING_RETRY_SECONDS };
      case 'waiting_continue':
        return { state: 'waiting_continue', session: view, ...(result.notice ? { notice: result.notice } : {}) };
      default:
        return { state: 'finished', session: view, ...('notice' in result && result.notice ? { notice: result.notice } : {}) };
    }
  }

  /** G's late confirmation (design §6.5, R7 Bước 5): units left → charged; else the question stays free (B7E33). */
  private async lateConfirm(userId: string, requestId: string, questionId: string): Promise<void> {
    const confirmed = await this.entitlements.confirm(userId, 'ai_practice', requestId);
    if (confirmed.state === 'confirmed') await this.aiRequests.setCharged(questionId);
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
    return this.touch(tx, session);
  }

  /** Every session and item route counts as activity (idle rule, design §11). */
  touch(tx: Prisma.TransactionClient, session: PracticeSession): Promise<PracticeSession> {
    return tx.practiceSession.update({ where: { id: session.id }, data: { lastActivityAt: this.clock.now() } });
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

  private async assertEntitled(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const result = await this.entitlements.check(userId, 'practice.basic', tx);
    if (!result.allowed) throw refusalProblem(result);
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
  private async usable(tx: Prisma.TransactionClient, userId: string, session: PracticeSession): Promise<Set<string>> {
    const items = session.source === 'group'
      ? await this.learning.practiceItems(userId, { kind: 'group', groupId: session.groupId!, filter: 'all' }, tx)
      : await this.learning.practiceItems(userId, { kind: 'senses', senseIds: session.senseIds }, tx);
    const inSession = new Set(session.senseIds);
    return new Set(items.map(({ sense_id }) => sense_id).filter((id) => inSession.has(id)));
  }

  /**
   * The rules of `next` (plan Task 14), in order: pending notice, group gone, pending item (kept or voided), end rule, round
   * rule, then a new question. `build` false (current) stops before building unless an item was just voided or a notice set.
   * Every read goes through `tx`: a read on the global client would borrow a second connection while `tx` holds one (PX4).
   */
  private async advance(tx: Prisma.TransactionClient, learner: Learner, session: PracticeSession, build: boolean,
    retryAi: boolean): Promise<Advance> {
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
      const { groupExists } = await this.learning.practiceCheck(userId, session.senseIds[0], session.groupId, tx);
      if (!groupExists) {
        if (pending) await this.voidItem(tx, pending);
        await this.finishRow(tx, session.id);
        return { state: 'finished', notice: 'group-not-found' };
      }
    }
    const usable = await this.usable(tx, userId, session);
    if (pending) {
      if (usable.has(pending.senseId)) return { state: 'question', item: pending, notice };
      await this.voidItem(tx, pending);
      notice = 'word-not-found';
    } else {
      // Design §6.5 A: the slot decided earlier is read before any planning, so a second call never plans again (B7E111).
      if (session.pendingAiRequestId !== null) {
        const slot = await this.pendingSlot(tx, learner, session, items, usable, build, retryAi);
        if (slot) return slot.state === 'question' ? { ...slot, notice: slot.notice ?? notice } : slot;
      }
      if (!build && notice === undefined) return { state: 'none' };
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

    if (plan.length > 0) await this.assertEntitled(userId, tx);
    const aiTypes = this.aiTypesOf(session);
    const ruleTypes = plan.length > 0 ? await this.ruleTypesOf(tx, userId, session) : [];
    const budget = aiTypes.length > 0 ? await this.aiBudgetOf(tx, session, items) : 0;
    for (const { senseId, round } of plan) {
      const previous = items.filter((item) => item.senseId === senseId).at(-1);
      if (aiTypes.length > 0 && session.aiStopped === null && this.wantsAi(session, senseId, round, budget,
        session.targetCount - answered, ruleTypes.length)) {
        const slot = await this.aiSlot(tx, learner, session, items, senseId, round, aiTypes, retryAi,
          (previous?.question.type as QuestionType | undefined) ?? null);
        if (slot) return slot.state === 'question' ? { ...slot, notice } : slot;
        // B7E47: the word no longer takes an AI type; a rule type if chosen, else the word is skipped.
      } else if (ruleTypes.length === 0 && session.aiStopped !== null) {
        return { state: 'ai_unavailable', reason: publicReason(session.aiStopped as AiFailure) };
      }
      const item = await this.ruleItem(tx, learner, session, items, senseId, round, ruleTypes, previous);
      if (item) return { state: 'question', item, notice };
    }
    // Round 1 done short of the target: ask once whether to go on, unless no word is left at all (B4E31).
    if (lastRound === 1 && session.continued === null && usable.size > 0) {
      await tx.practiceSession.update({ where: { id: session.id }, data: { status: 'waiting_continue' } });
      return { state: 'waiting_continue', notice };
    }
    await this.finishRow(tx, session.id);
    return { state: 'finished', notice };
  }

  /** Types the generator makes (design §5): meaning_in_sentence, mcq_sentence, and cloze when its source is AI. */
  private aiTypesOf(session: PracticeSession): QuestionType[] {
    return (session.types as QuestionType[]).filter((type) => isAiType(type, session.clozeSource as ClozeSource | null));
  }

  /** The other chosen types; cloze from saved sentences needs `ai.practice` at each question (B7E123, Bước 4 §12). */
  private async ruleTypesOf(tx: Prisma.TransactionClient, userId: string, session: PracticeSession): Promise<QuestionType[]> {
    const types = (session.types as QuestionType[]).filter((type) => !isAiType(type, session.clozeSource as ClozeSource | null));
    if (!types.includes('cloze') || (await this.entitlements.check(userId, 'ai.practice', tx)).allowed) return types;
    return types.filter((type) => type !== 'cloze');
  }

  /** r of design §6.3 (R9): planned − asked AI items (void included) − requests of the session not yet asked. */
  private async aiBudgetOf(tx: Prisma.TransactionClient, session: PracticeSession, items: ItemWithQuestion[]): Promise<number> {
    const asked = new Set(items.map((item) => item.questionId));
    const open = await tx.practiceAiRequest.findMany({
      where: { sessionId: session.id, state: { in: ['generating', 'ready'] } }, select: { questionId: true },
    });
    return aiBudget(session.aiPlanned, items.filter((item) => item.question.source === 'ai').length,
      open.filter((request) => request.questionId === null || !asked.has(request.questionId)).length);
  }

  /** Round 1: the words marked at start; round ≥ 2: with chance r ÷ q, or always while r > 0 in an AI-only session (design §6.3). */
  private wantsAi(session: PracticeSession, senseId: string, round: number, budget: number, left: number, ruleCount: number): boolean {
    if (round === 1) return session.aiSenseIds.includes(senseId);
    if (budget <= 0) return false;
    return ruleCount === 0 || Math.random() < aiChanceInLaterRound(budget, left);
  }

  /**
   * An AI slot (design §6.5 A): the session's request for this word and round when it failed (made by prepare; §6.6 as a
   * failed pending slot, B7E113), else an unseen AI question (0 units), else that request when generating or ready, else
   * another generating request of the learner for the word, else a new request. The pointer is set in this transaction. Null
   * when the word cannot take an AI type now.
   */
  private async aiSlot(tx: Prisma.TransactionClient, learner: Learner, session: PracticeSession, items: ItemWithQuestion[],
    senseId: string, round: number, aiTypes: QuestionType[], retryAi: boolean, previousType: QuestionType | null): Promise<Advance | null> {
    const { userId, nativeLanguage } = learner;
    const point = (requestId: string) =>
      tx.practiceSession.update({ where: { id: session.id }, data: { pendingAiRequestId: requestId } });
    const existing = await this.aiRequests.findForSession(tx, session.id, senseId);
    // B7E113: made ahead by prepare and failed → §6.6 at once, as a failed pending slot. Read before availability, which drops
    // the AI types of a private word checked as not recognized (B7E98).
    if (existing && existing.round === round && existing.state === 'failed') {
      await point(existing.id);
      return this.failedSlot(tx, learner, { ...session, pendingAiRequestId: existing.id }, items, existing, retryAi);
    }
    const available = (await this.builder.availability({
      userId, nativeLanguage, senseIds: [senseId], chosenTypes: aiTypes, clozeSource: session.clozeSource as ClozeSource | null, db: tx,
    })).get(senseId) ?? [];
    if (available.length === 0) return null;
    if (existing && existing.round === round) {
      const asked = items.some((item) => item.questionId === existing.questionId);
      if (existing.state === 'generating' || !asked) {
        await point(existing.id);
        if (existing.state === 'generating') return { state: 'pending', requestId: existing.id, fresh: false };
        return this.attach(tx, session, items, existing.id, existing.questionId!, senseId, round);
      }
    }
    const sense = (await this.content.practiceSenses(userId, [senseId], nativeLanguage, tx)).get(senseId);
    if (!sense) return null;
    const key = sense.scope === 'private' ? contentKey(sense.lemma, sense.pos, sense.gloss_vi ?? '') : null;
    const unseen = pickUnseen(await findUnseen(tx, this.content,
      { userId, senseId, types: available, liveRevisionId: sense.live_revision_id, contentKey: key }));
    if (unseen) return { state: 'question', item: await this.createItem(tx, session, items, unseen.id, senseId, round) };
    const other = await tx.practiceAiRequest.findFirst({ where: { userId, senseId, state: 'generating' } });
    if (other) {
      await point(other.id);
      return { state: 'pending', requestId: other.id, fresh: false };
    }
    const request = await this.aiRequests.create(tx, {
      userId, sessionId: session.id, senseId, type: chooseType(available, previousType, Math.random), round,
    });
    await point(request.id);
    return { state: 'pending', requestId: request.id, fresh: true };
  }

  /**
   * The slot of `pending_ai_request_id` (design §6.5 A): generating → preparing (or run when taken over); ready → G; failed →
   * §6.6 once. Null when the pointer was cleared and planning goes on.
   */
  private async pendingSlot(tx: Prisma.TransactionClient, learner: Learner, session: PracticeSession, items: ItemWithQuestion[],
    usable: Set<string>, build: boolean, retryAi: boolean): Promise<Advance | null> {
    const request = await this.aiRequests.get(session.pendingAiRequestId!, tx);
    const clear = () => tx.practiceSession.update({ where: { id: session.id }, data: { pendingAiRequestId: null } });
    if (!request || !usable.has(request.senseId)) {
      await clear();
      return null;
    }
    if (request.state === 'generating') return build ? { state: 'pending', requestId: request.id, fresh: false } : { state: 'preparing' };
    if (request.state === 'ready') return this.attach(tx, session, items, request.id, request.questionId!, request.senseId, request.round);
    // current never applies the fallback: the app calls next.
    if (!build) return { state: 'none' };
    return this.failedSlot(tx, learner, session, items, request, retryAi);
  }

  /**
   * §6.6 for a failed request the session's pointer names: a mixed session gets a rule type for the same word, with
   * `ai-fallback` the first time or `word-not-recognized`; an AI-only one gets `ai_unavailable` (with the same notice for a word
   * not recognized) until `retry_ai`. Null when no rule type fits the word; planning goes on.
   */
  private async failedSlot(tx: Prisma.TransactionClient, learner: Learner, session: PracticeSession, items: ItemWithQuestion[],
    request: AiRequestRow, retryAi: boolean): Promise<Advance | null> {
    const failure = request.failure ?? 'ai-failed';
    const notRecognized: AiNotice | undefined = failure === 'word-not-recognized'
      ? { notice: 'word-not-recognized', sense_id: request.senseId } : undefined;
    const ruleTypes = await this.ruleTypesOf(tx, learner.userId, session);
    if (ruleTypes.length > 0) {
      await tx.practiceSession.update({ where: { id: session.id }, data: { pendingAiRequestId: null } });
      const previous = items.filter((item) => item.senseId === request.senseId).at(-1);
      const item = await this.ruleItem(tx, learner, session, items, request.senseId, request.round, ruleTypes, previous);
      if (!item) return null;
      let ai: AiNotice | undefined = notRecognized;
      if (!ai && !session.aiNoticeShown) {
        ai = { notice: 'ai-fallback', ai_reason: publicReason(failure) };
        await tx.practiceSession.update({ where: { id: session.id }, data: { aiNoticeShown: true } });
      }
      return { state: 'question', item, ai };
    }
    if (!retryAi) return { state: 'ai_unavailable', reason: publicReason(failure), ai: notRecognized };
    const retry = await this.aiRequests.create(tx, {
      userId: learner.userId, sessionId: session.id, senseId: request.senseId, type: request.type, round: request.round,
    });
    await tx.practiceSession.update({ where: { id: session.id }, data: { pendingAiRequestId: retry.id } });
    return { state: 'pending', requestId: retry.id, fresh: true };
  }

  /** G (design §6.5): the item only while the pointer still names this request (B7E112), then the pointer is cleared. */
  private async attach(tx: Prisma.TransactionClient, session: PracticeSession, items: ItemWithQuestion[], requestId: string,
    questionId: string, senseId: string, round: number): Promise<Advance | null> {
    const { count } = await tx.practiceSession.updateMany({
      where: { id: session.id, pendingAiRequestId: requestId }, data: { pendingAiRequestId: null },
    });
    if (count === 0) return null;
    const item = await this.createItem(tx, session, items, questionId, senseId, round);
    return { state: 'question', item, ...(item.question.aiCharged ? {} : { confirmRequestId: requestId }) };
  }

  private async createItem(tx: Prisma.TransactionClient, session: PracticeSession, items: ItemWithQuestion[], questionId: string,
    senseId: string, round: number): Promise<ItemWithQuestion> {
    const { practice } = await this.settings.get(tx);
    return tx.practiceSessionItem.create({
      data: {
        sessionId: session.id, userId: session.userId, questionId, senseId, round, position: (items.at(-1)?.position ?? 0) + 1,
        askedAt: this.clock.now(), maxRetries: practice.typeWordMaxRetries,
      },
      include: { question: true },
    });
  }

  /** A question of a rule type, built and asked now (Bước 4, plus cloze from saved sentences); null when none fits. */
  private async ruleItem(tx: Prisma.TransactionClient, learner: Learner, session: PracticeSession, items: ItemWithQuestion[],
    senseId: string, round: number, types: QuestionType[], previous: ItemWithQuestion | undefined): Promise<ItemWithQuestion | null> {
    if (types.length === 0) return null;
    const { practice } = await this.settings.get(tx);
    const built = await this.builder.build({
      userId: learner.userId, nativeLanguage: learner.nativeLanguage, senseId, chosenTypes: types,
      promptStyle: session.promptStyle as 'meaning' | 'sentence' | 'mixed',
      previousType: (previous?.question.type as QuestionType | undefined) ?? null,
      avoidDistractors: previous?.question.distractorSenseIds ?? [], settings: practice, random: Math.random, db: tx,
      clozeSource: session.clozeSource as ClozeSource | null,
    });
    if ('skip' in built) return null;
    const question = await tx.practiceQuestion.create({ data: {
      userId: learner.userId, senseId, type: built.type, promptStyle: built.promptStyle, blank: built.blank ?? undefined, schemaVersion: 1,
      prompt: built.prompt, answerKey: built.answerKey, hints: built.hints, distractorSenseIds: built.distractorSenseIds,
      createdAt: this.clock.now(), source: built.type === 'cloze' ? 'own_sentence' : 'rule',
    } });
    return this.createItem(tx, session, items, question.id, senseId, round);
  }

  private async voidItem(tx: Prisma.TransactionClient, item: ItemWithQuestion): Promise<void> {
    // An item becomes void only while it has no final result.
    await tx.practiceSessionItem.updateMany({ where: { id: item.id, result: null }, data: { result: 'void' } });
  }

  private async finishRow(tx: Prisma.TransactionClient, sessionId: string): Promise<void> {
    await tx.practiceSession.update({ where: { id: sessionId }, data: { status: 'finished', endedAt: this.clock.now() } });
  }
}
