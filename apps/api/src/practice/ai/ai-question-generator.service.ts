import { Inject, Injectable } from '@nestjs/common';
import { AiService, type AiOperation, type AiResult } from '../../ai/index.js';
import { Clock } from '../../common/clock/clock.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ContentService, type CandidateSense, type Learner, type PracticeSense } from '../../content/index.js';
import { EntitlementsService } from '../../entitlements/index.js';
import { LearningService } from '../../learning/index.js';
import { SettingsService } from '../../settings/index.js';
import type { AiFailure } from '../practice.types.js';
import { eligibleCandidates } from '../questions/distractors.js';
import { checkCloze, checkMcq, checkMeaning, pickMcqForm, pickWrongMeanings, type McqForm } from './ai-checks.js';
import { clozeInput, contentKey, mcqInput, meaningInput, wordCheckInput } from './ai-inputs.js';
import { aiQuestion, type AiQuestionInput } from './ai-question.js';
import { AiRequestsRepository, type AiRequestRow } from './ai-requests.repository.js';
import { UnknownFormsRepository } from './unknown-forms.repository.js';
import { WordChecksRepository } from './word-checks.repository.js';

export type GenerateOutcome =
  | { state: 'ready'; questionId: string }
  | { state: 'preparing' }
  | { state: 'failed'; failure: AiFailure; resetsAt?: string; retryAfterSeconds?: number };

type ClozeValue = { sentence: string; accepted_answers: string[]; translation_vi: string };
type MeaningValue = { sentence: string; word_in_sentence: string; translation_vi: string };
type McqValue = { sentence: string; distractors: string[]; translation_vi: string };

/**
 * `practice_ai_requests.ai_input` (design §6.5 D): the data sent to AI and what Practice picked with it, so a rerun after a
 * crash sends the same data under the same operation id (B7E32, B7E114) and builds the same question.
 */
export type StoredAiInput = { senseRevisionId: string; contentKey: string | null } & (
  | { type: 'cloze'; data: ReturnType<typeof clozeInput> }
  | { type: 'meaning_in_sentence'; data: ReturnType<typeof meaningInput>; wrong: CandidateSense[] }
  | { type: 'mcq_sentence'; data: ReturnType<typeof mcqInput>; form: McqForm }
);

const OPERATION: Record<StoredAiInput['type'], AiOperation> = {
  cloze: 'generate_cloze', meaning_in_sentence: 'generate_meaning_question', mcq_sentence: 'generate_sentence_mcq',
};
const POOL = 'ai_practice';

type FailOptions = { reason?: string; resetsAt?: string; retryAfterSeconds?: number; stop?: boolean };

/**
 * Makes one AI question for one request (design §6.5 B–H), shared by `next` and `prepare`. No transaction is open while the
 * gateway runs (Bước 6 §4.4); the ledger operation id is the request id (mã gốc), `#2` is used only at the gateway (design §7.7).
 */
@Injectable()
export class AiQuestionGenerator {
  constructor(
    @Inject(AiService) private readonly ai: AiService,
    @Inject(EntitlementsService) private readonly entitlements: EntitlementsService,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(LearningService) private readonly learning: LearningService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(AiRequestsRepository) private readonly requests: AiRequestsRepository,
    @Inject(WordChecksRepository) private readonly wordChecks: WordChecksRepository,
    @Inject(UnknownFormsRepository) private readonly unknownForms: UnknownFormsRepository,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async run(requestId: string, ctx: { learner: Learner; session: { id: string; aiStopped: string | null };
    random?: () => number }): Promise<GenerateOutcome> {
    const request = await this.requests.get(requestId);
    if (!request) return { state: 'failed', failure: 'ai-failed' };
    if (request.state === 'ready') return { state: 'ready', questionId: request.questionId! };
    if (request.state === 'failed') return { state: 'failed', failure: request.failure ?? 'ai-failed' };
    const { learner } = ctx;
    const random = ctx.random ?? Math.random;
    const type = request.type as StoredAiInput['type'];
    const op = OPERATION[type];
    const userId = learner.userId;

    // B. The operation is ready.
    const readiness = await this.ai.isReady(op);
    if (!readiness.ready) {
      return this.fail(request, 'ai-unavailable', { reason: readiness.reason, retryAfterSeconds: readiness.retry_after_seconds, stop: true });
    }
    const sense = (await this.content.practiceSenses(userId, [request.senseId], learner.nativeLanguage)).get(request.senseId);
    if (!sense) return this.fail(request, 'ai-failed', { reason: 'not-visible' });

    // C. A private word is checked once per content (design §7.6); no unit is held for it (B7E23).
    const key = sense.scope === 'private' ? contentKey(sense.lemma, sense.pos, sense.gloss_vi ?? '') : null;
    if (key !== null) {
      const known = await this.wordChecks.get(userId, sense.sense_id);
      let verdict = known?.contentKey === key ? known.verdict : null;
      if (verdict === null) {
        const check = await this.ai.run('check_private_word', wordCheckInput(sense),
          { operationId: `${request.id}:wc`, userId, purpose: 'learner' });
        if (check.status === 'in_progress') return { state: 'preparing' };
        // B7E99: a failed check stores nothing; the question goes as an AI failure.
        if (check.status !== 'succeeded') return this.fail(request, 'ai-failed', { reason: `word-check-${check.status}` });
        verdict = check.result.verdict === 'not_recognized' ? 'not_recognized' : 'ok';
        await this.wordChecks.put(userId, sense.sense_id, key, verdict, this.clock.now());
      }
      if (verdict === 'not_recognized') return this.fail(request, 'word-not-recognized', {});
    }

    // D. The data sent to AI, saved once.
    let stored = request.aiInput as StoredAiInput | null;
    if (stored === null) {
      stored = await this.buildInput(type, sense, learner, key, random);
      if (stored === null) return this.fail(request, 'ai-failed', { reason: 'no-input' });
      await this.requests.saveInput(request.id, stored, this.clock.now());
    }

    // E. One unit held under the request id.
    const reserved = await this.entitlements.reserve(userId, POOL, request.id);
    if (reserved.state === 'refused') {
      return this.fail(request, reserved.reason, {
        resetsAt: reserved.reason === 'quota-exhausted' ? reserved.resets_at ?? undefined : undefined,
        retryAfterSeconds: reserved.reason === 'ai-unavailable' ? reserved.retry_after_seconds ?? undefined : undefined, stop: true,
      });
    }

    // F. The call, and one rewrite under `#2` when Practice's rules reject the first answer.
    let callId = request.id;
    let result = await this.ai.run(op, stored.data, { operationId: callId, userId, purpose: 'learner' });
    let passed = result.status === 'succeeded' && await this.check(stored, sense, result.result);
    if (result.status === 'succeeded' && !passed) {
      callId = `${request.id}#2`;
      result = await this.ai.run(op, stored.data, { operationId: callId, userId, purpose: 'learner' });
      passed = result.status === 'succeeded' && await this.check(stored, sense, result.result);
    }
    // B7E11: still running elsewhere; the unit stays held.
    if (result.status === 'in_progress') return { state: 'preparing' };
    if (result.status !== 'succeeded' || !passed) {
      await this.entitlements.release(userId, POOL, request.id);
      const [failure, options] = failureOf(result);
      return this.fail(request, failure, options);
    }

    // H. The question, written only while the request is still generating; then the unit is confirmed.
    const built = aiQuestion(questionInput(stored, result.result), sense, learner.nativeLanguage,
      (await this.settings.get()).practice.hintDefinitionMaxChars, random);
    const written = await this.requests.writeQuestion(request.id, {
      built, userId, senseId: sense.sense_id, senseRevisionId: stored.senseRevisionId, contentKey: stored.contentKey,
      aiMeta: { ...result.meta, call_operation_id: callId }, createdAt: this.clock.now(),
    });
    if (!written) {
      await this.entitlements.release(userId, POOL, request.id);
      this.logger.info('ai_request_gone', { ai_request: request.id, ai_op: op });
      return { state: 'failed', failure: 'ai-failed' };
    }
    const confirmed = await this.entitlements.confirm(userId, POOL, request.id);
    if (confirmed.state === 'confirmed') await this.requests.setCharged(written.questionId);
    // B7E12: the question is still given; it is simply free.
    else this.logger.warn('ai_confirm_not_charged', { ai_request: request.id, ai_op: op, ai_state: confirmed.state });
    return { state: 'ready', questionId: written.questionId };
  }

  private async fail(request: AiRequestRow, failure: AiFailure, options: FailOptions): Promise<GenerateOutcome> {
    await this.requests.markFailed(request.id, failure, this.clock.now());
    if (options.stop && request.sessionId !== null
      && (failure === 'ai-unavailable' || failure === 'quota-exhausted' || failure === 'plan-required')) {
      await this.requests.stopSessionAi(request.sessionId, failure);
    }
    // B7E40: a programming error; logged louder, never left generating.
    this.logger[failure === 'input-mismatch' ? 'warn' : 'info']('ai_question_failed', {
      ai_request: request.id, ai_op: OPERATION[request.type as StoredAiInput['type']], ai_state: failure, ai_reason: options.reason ?? failure,
    });
    return {
      state: 'failed', failure,
      ...(options.resetsAt !== undefined ? { resetsAt: options.resetsAt } : {}),
      ...(options.retryAfterSeconds !== undefined ? { retryAfterSeconds: options.retryAfterSeconds } : {}),
    };
  }

  /** Practice's rules on a `succeeded` value (design §7.2, §7.4, §7.5); unknown forms are recorded (design §10). */
  private async check(stored: StoredAiInput, sense: PracticeSense, value: Record<string, unknown>): Promise<boolean> {
    let unknown: string[] = [];
    let ok: boolean;
    if (stored.type === 'cloze') {
      const r = checkCloze(value as ClozeValue, sense);
      ok = r.ok;
      if (!r.ok) unknown = r.unknownForms;
    } else if (stored.type === 'meaning_in_sentence') {
      const r = checkMeaning(value as MeaningValue, sense);
      ok = r.ok;
      if (!r.ok) unknown = r.unknownForms;
    } else {
      ok = checkMcq(value as McqValue, stored.form.answerForm, stored.form.candidates, sense).ok;
    }
    if (unknown.length > 0) await this.unknownForms.record(sense.lemma, unknown, this.clock.now());
    if (!ok) this.logger.info('ai_question_rejected', { ai_op: OPERATION[stored.type], ai_reason: unknown.length > 0 ? 'unknown-form' : 'rule' });
    return ok;
  }

  /** Step D's picks from Content and the learner's groups (design §7.4, §7.5); null when the word no longer has enough. */
  private async buildInput(type: StoredAiInput['type'], sense: PracticeSense, learner: Learner, key: string | null,
    random: () => number): Promise<StoredAiInput | null> {
    const base = { senseRevisionId: sense.live_revision_id, contentKey: key };
    if (type === 'cloze') return { ...base, type, data: clozeInput(sense) };
    const { userId, nativeLanguage } = learner;
    const mateIds = (await this.learning.practiceGroupMates(userId, [sense.sense_id])).get(sense.sense_id) ?? [];
    const candidates = await this.content.practiceCandidates(userId, mateIds, nativeLanguage);
    const mates = mateIds.flatMap((id) => candidates.get(id) ?? []);
    const meanings = await this.content.practiceLemmaMeanings(userId, [sense.lemma, ...mates.map((m) => m.lemma)], nativeLanguage);
    if (type === 'mcq_sentence') {
      const form = pickMcqForm(sense, eligibleCandidates(sense, mates, Infinity, meanings), random);
      return form && { ...base, type, data: mcqInput(sense, form.answerForm, form.candidates), form };
    }
    const others = await this.content.practiceOtherSenses(userId, sense.sense_id, nativeLanguage);
    const randoms = await this.content.practiceRandomMeanings(userId, [sense.lemma, ...mates.map((m) => m.lemma)], 3, nativeLanguage);
    const wrong = pickWrongMeanings(sense, others, mates, randoms, meanings);
    return wrong && { ...base, type, data: meaningInput(sense, wrong.map((w) => w.gloss_vi!)), wrong };
  }
}

function failureOf(result: AiResult): [AiFailure, FailOptions] {
  switch (result.status) {
    // Rejected by Practice's rules twice (B7E9).
    case 'succeeded': return ['rejected', {}];
    case 'permanent_failure':
      return [result.reason === 'input-mismatch' ? 'input-mismatch' : 'ai-failed', { reason: result.reason }];
    case 'unavailable': return ['ai-unavailable', { reason: result.reason, retryAfterSeconds: result.retry_after_seconds, stop: true }];
    case 'transient_failure': return ['ai-failed', { reason: result.reason }];
    default: return ['ai-failed', { reason: result.status }];
  }
}

function questionInput(stored: StoredAiInput, value: Record<string, unknown>): AiQuestionInput {
  if (stored.type === 'cloze') return { type: 'cloze', result: value as ClozeValue };
  if (stored.type === 'meaning_in_sentence') return { type: 'meaning_in_sentence', result: value as MeaningValue, wrong: stored.wrong };
  return { type: 'mcq_sentence', result: value as McqValue, form: stored.form };
}
