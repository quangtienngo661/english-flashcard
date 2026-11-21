import { Inject, Injectable } from '@nestjs/common';
import { AiService, type AiOperation } from '../../ai/index.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { ContentService, type Learner } from '../../content/index.js';
import { EntitlementsService, refusalProblem, type EntitlementsSnapshot } from '../../entitlements/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { isAiType, type ClozeSource, type QuestionType } from '../practice.types.js';
import { contentKey } from './ai-inputs.js';
import { aiNeeded, aiPlanned, markAiSenses, markAiSensesRandom, plannedFromCount, roundOneAiLimit } from './ai-plan.js';
import { findUnseen } from './unseen-questions.js';
import { WordChecksRepository } from './word-checks.repository.js';

const OPERATION: Partial<Record<QuestionType, AiOperation>> = {
  cloze: 'generate_cloze', meaning_in_sentence: 'generate_meaning_question', mcq_sentence: 'generate_sentence_mcq',
};

export type AiGateResult = {
  snapshot: EntitlementsSnapshot;
  availableAiTypes: QuestionType[];
  fallbackReason: 'ai-unavailable' | null;
};

export type AiSessionPlan = { aiPlanned: number; aiSenseIds: string[]; fallbackReason?: 'ai-unavailable' | null };

/** The AI part of opening a session (design §6.1 steps 2–5); reads only, nothing is reserved or held (B7E2). */
@Injectable()
export class AiSessionPlanner {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(AiService) private readonly ai: AiService,
    @Inject(EntitlementsService) private readonly entitlements: EntitlementsService,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(WordChecksRepository) private readonly wordChecks: WordChecksRepository,
  ) {}

  /**
   * Step 2, before the words are read: AI types need `ai.practice` (B7E1). System-level unavailability (AI off, cap reached,
   * or an operation lacking a model) returns `fallbackReason: 'ai-unavailable'` with only the ready AI types (F-08, D7)
   * instead of failing with 503. An own-sentence cloze is a rule question open to every plan. Null when no AI type is chosen.
   */
  async gate(userId: string, types: QuestionType[], clozeSource: ClozeSource | null): Promise<AiGateResult | null> {
    if (!types.some((type) => isAiType(type, clozeSource))) return null;
    const snapshot = await this.entitlements.snapshot(userId);
    if (!snapshot || !snapshot.features['ai.practice'].allowed) throw refusalProblem({ reason: 'plan-required' });
    const aiTypes = types.filter((type) => isAiType(type, clozeSource));
    if (!snapshot.ai_available.enabled || snapshot.ai_available.cap_reached) {
      return { snapshot, availableAiTypes: [], fallbackReason: 'ai-unavailable' };
    }
    const availableAiTypes: QuestionType[] = [];
    let fallbackReason: 'ai-unavailable' | null = null;
    for (const type of aiTypes) {
      const readiness = await this.ai.isReady(OPERATION[type]!);
      if (readiness.ready) availableAiTypes.push(type);
      else fallbackReason = 'ai-unavailable';
    }
    return { snapshot, availableAiTypes, fallbackReason };
  }

  /**
   * Steps 3–5: marks round-1 words for an AI question (unseen ones first), plans the session's AI questions and checks the
   * units left against what the session needs (B7E2, B7E3, B7E45, B7E46). `count` is the session's target count.
   * `aiCount` (practice AI count, 09/11/2026) is the learner's K, already capped: undefined keeps the old split by type ratio;
   * otherwise round 1 gets its share of K, marked evenly or at random (`random` defaults to Math.random).
   */
  async plan(learner: Learner, input: {
    types: QuestionType[]; clozeSource: ClozeSource | null; count: number; kept: string[]; available: Map<string, QuestionType[]>;
    aiCount?: number; placement?: 'even' | 'random'; random?: () => number;
  }, snapshot: EntitlementsSnapshot | null): Promise<AiSessionPlan & { fallbackReason: 'ai-unavailable' | null }> {
    const aiTypes = input.types.filter((type) => isAiType(type, input.clozeSource));
    if (aiTypes.length === 0 || snapshot === null) return { aiPlanned: 0, aiSenseIds: [], fallbackReason: null };
    // K = 0: nothing to mark, so no unseen question is looked up (review M14).
    if (input.aiCount === 0) return { aiPlanned: 0, aiSenseIds: [], fallbackReason: null };
    const { userId, nativeLanguage } = learner;
    const capable = input.kept.filter((id) => (input.available.get(id) ?? []).some((type) => aiTypes.includes(type)));
    const senses = await this.content.practiceSenses(userId, capable, nativeLanguage);
    const keys = new Map<string, string | null>();
    const withUnseen = new Set<string>();
    for (const senseId of capable) {
      const sense = senses.get(senseId);
      if (!sense) continue;
      const key = sense.scope === 'private' ? contentKey(sense.lemma, sense.pos, sense.gloss_vi ?? '') : null;
      keys.set(senseId, key);
      const unseen = await findUnseen(this.prisma, this.content,
        { userId, senseId, types: aiTypes, liveRevisionId: sense.live_revision_id, contentKey: key });
      if (unseen.length > 0) withUnseen.add(senseId);
    }
    const byCount = input.aiCount !== undefined;
    const limit = byCount
      ? roundOneAiLimit(input.aiCount!, input.count, input.kept.length)
      : Math.ceil((input.count * aiTypes.length) / input.types.length);
    let marked = byCount && input.placement === 'random'
      ? markAiSensesRandom(input.kept, new Set(capable), withUnseen, limit, input.random ?? Math.random)
      : markAiSenses(input.kept, new Set(capable), withUnseen, limit);
    // A marked private word not checked for its current content needs check_private_word too (design §6.1 step 2, §7.6).
    // When check_private_word is unavailable, drop unchecked private words from AI planning instead of failing with 503 (F-08).
    let fallbackReason: 'ai-unavailable' | null = null;
    const uncheckedPrivate = new Set<string>();
    for (const senseId of marked) {
      const key = keys.get(senseId);
      if (key === null || key === undefined || withUnseen.has(senseId)) continue;
      if ((await this.wordChecks.get(userId, senseId))?.contentKey !== key) uncheckedPrivate.add(senseId);
    }
    let capableCount = capable.length;
    if (uncheckedPrivate.size > 0) {
      const readiness = await this.ai.isReady('check_private_word');
      if (!readiness.ready) {
        marked = marked.filter((id) => !uncheckedPrivate.has(id));
        capableCount = Math.max(0, capable.length - uncheckedPrivate.size);
        fallbackReason = 'ai-unavailable';
      }
    }
    const planned = capableCount === 0
      ? 0
      : byCount
        ? plannedFromCount(input.aiCount!, marked.length, input.kept.length, input.count, capableCount)
        : aiPlanned(input.count, input.types.length, aiTypes.length, marked.length, input.kept.length);
    const needed = aiNeeded(planned, marked.filter((id) => withUnseen.has(id)).length);
    const pool = snapshot.pools.ai_practice;
    if (pool.remaining < needed) {
      throw new ProblemDetailsException({
        status: 403, title: 'Not enough AI units', type: 'ai-quota-insufficient',
        extensions: { remaining: pool.remaining, needed, resets_at: pool.resets_at },
      });
    }
    return { aiPlanned: planned, aiSenseIds: marked, fallbackReason };
  }
}
