import { Inject, Injectable } from '@nestjs/common';
import { AiService, type AiOperation } from '../../ai/index.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { ContentService, type Learner } from '../../content/index.js';
import { EntitlementsService, refusalProblem, type EntitlementsSnapshot } from '../../entitlements/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { isAiType, type ClozeSource, type QuestionType } from '../practice.types.js';
import { contentKey } from './ai-inputs.js';
import { aiNeeded, aiPlanned, markAiSenses } from './ai-plan.js';
import { findUnseen } from './unseen-questions.js';
import { WordChecksRepository } from './word-checks.repository.js';

const OPERATION: Partial<Record<QuestionType, AiOperation>> = {
  cloze: 'generate_cloze', meaning_in_sentence: 'generate_meaning_question', mcq_sentence: 'generate_sentence_mcq',
};

const unavailable = (reason?: string, retryAfterSeconds?: number) => new ProblemDetailsException({
  status: 503, title: 'AI unavailable', type: 'ai-unavailable', retryAfterSeconds, ...(reason ? { extensions: { reason } } : {}),
});

export type AiSessionPlan = { aiPlanned: number; aiSenseIds: string[] };

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
   * Step 2, before the words are read: AI types need `ai.practice` (B7E1), AI on and under its caps (B7E5, B7E6), and each
   * chosen operation ready (B7E117). An own-sentence cloze is a rule question open to every plan (đợt cải thiện A C3,
   * changes Bước 7 D11). Null when no AI type is chosen: the snapshot is not read (Bước 4 unchanged).
   */
  async gate(userId: string, types: QuestionType[], clozeSource: ClozeSource | null): Promise<EntitlementsSnapshot | null> {
    if (!types.some((type) => isAiType(type, clozeSource))) return null;
    const snapshot = await this.entitlements.snapshot(userId);
    if (!snapshot || !snapshot.features['ai.practice'].allowed) throw refusalProblem({ reason: 'plan-required' });
    const aiTypes = types.filter((type) => isAiType(type, clozeSource));
    // R19: the snapshot has flags only, so no seconds to wait.
    if (!snapshot.ai_available.enabled || snapshot.ai_available.cap_reached) throw unavailable();
    for (const type of aiTypes) await this.assertReady(OPERATION[type]!);
    return snapshot;
  }

  /**
   * Steps 3–5: marks round-1 words for an AI question (unseen ones first), plans the session's AI questions and checks the
   * units left against what the session needs (B7E2, B7E3, B7E45, B7E46).
   */
  async plan(learner: Learner, input: {
    types: QuestionType[]; clozeSource: ClozeSource | null; count: number; kept: string[]; available: Map<string, QuestionType[]>;
  }, snapshot: EntitlementsSnapshot | null): Promise<AiSessionPlan> {
    const aiTypes = input.types.filter((type) => isAiType(type, input.clozeSource));
    if (aiTypes.length === 0 || snapshot === null) return { aiPlanned: 0, aiSenseIds: [] };
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
    const limit = Math.ceil((input.count * aiTypes.length) / input.types.length);
    const marked = markAiSenses(input.kept, new Set(capable), withUnseen, limit);
    // A marked private word not checked for its current content needs check_private_word too (design §6.1 step 2, §7.6).
    for (const senseId of marked) {
      const key = keys.get(senseId);
      if (key === null || key === undefined || withUnseen.has(senseId)) continue;
      if ((await this.wordChecks.get(userId, senseId))?.contentKey !== key) {
        await this.assertReady('check_private_word');
        break;
      }
    }
    const planned = aiPlanned(input.count, input.types.length, aiTypes.length, marked.length, input.kept.length);
    const needed = aiNeeded(planned, marked.filter((id) => withUnseen.has(id)).length);
    const pool = snapshot.pools.ai_practice;
    if (pool.remaining < needed) {
      throw new ProblemDetailsException({
        status: 403, title: 'Not enough AI units', type: 'ai-quota-insufficient',
        extensions: { remaining: pool.remaining, needed, resets_at: pool.resets_at },
      });
    }
    return { aiPlanned: planned, aiSenseIds: marked };
  }

  private async assertReady(op: AiOperation): Promise<void> {
    const readiness = await this.ai.isReady(op);
    if (!readiness.ready) throw unavailable(readiness.reason, readiness.retry_after_seconds);
  }
}
