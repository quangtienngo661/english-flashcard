import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AiService, type AiResult } from '../../ai/index.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { EntitlementsService, refusalProblem } from '../../entitlements/index.js';
import { normalizeText } from '../catalog/normalize.js';
import type { Learner } from '../learner/learner-content.guard.js';
import { WordsService, type WordSense } from '../words/words.service.js';

export type AiLookupResponse = {
  suggestion: {
    part_of_speech: string; lemma: string; meaning: { text: string; language: 'vi' | 'en' }; definition_en: string; examples: string[];
  };
  catalog_senses: WordSense[];
};

type LookupWordResult = { part_of_speech: string; lemma: string; meaning_vi: string; definition_en: string; examples: string[] };

/** The ledger and gateway id of one lookup: a retry with the same Idempotency-Key reuses it (design §11.1, ER17). */
export function lookupOperationId(idempotencyKey: string): string {
  return `lookup:${createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 32)}`;
}

/**
 * AI lookup on request (Bước 7 design §11.1, D19–D21). No transaction is open while `ai.run` runs; the unit is confirmed only
 * for a valid result. Logs carry ids and states only, never the text or the context sentence (SR10, B7E95).
 */
@Injectable()
export class AiLookupService {
  constructor(
    @Inject(AiService) private readonly ai: AiService,
    @Inject(EntitlementsService) private readonly entitlements: EntitlementsService,
    @Inject(WordsService) private readonly words: WordsService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async lookup(learner: Learner, idempotencyKey: string, text: string, contextSentence: string | null): Promise<AiLookupResponse> {
    const { userId } = learner;
    const decision = await this.entitlements.check(userId, 'ai.lookup');
    if (!decision.allowed) throw refusalProblem(decision);
    const readiness = await this.ai.isReady('lookup_word');
    if (!readiness.ready) {
      throw new ProblemDetailsException({
        status: 503, title: 'AI unavailable', type: 'ai-unavailable', extensions: { reason: readiness.reason },
        retryAfterSeconds: readiness.retry_after_seconds,
      });
    }

    const operationId = lookupOperationId(idempotencyKey);
    const reserved = await this.entitlements.reserve(userId, 'ai_lookup', operationId);
    if (reserved.state === 'refused') throw refusalProblem(reserved);

    let result: AiResult;
    try {
      result = await this.ai.run('lookup_word', { text, context_sentence: contextSentence },
        { operationId, userId, purpose: 'learner' });
    } catch (error) {
      await this.entitlements.release(userId, 'ai_lookup', operationId);
      throw error;
    }
    const reason = 'reason' in result ? result.reason : null;
    this.logger.info('ai_lookup', { user_id: userId, ai_op: operationId, ai_state: result.status, ai_reason: reason });

    if (result.status === 'in_progress') {
      // The first request still runs and will confirm or release this reservation itself.
      throw new ProblemDetailsException({ status: 409, title: 'AI lookup in progress', type: 'ai-in-progress', retryAfterSeconds: 2 });
    }
    if (result.status !== 'succeeded') {
      await this.entitlements.release(userId, 'ai_lookup', operationId);
      throw new ProblemDetailsException({
        status: 503, title: 'AI lookup failed', type: 'ai-lookup-failed',
        extensions: { retryable: result.status !== 'permanent_failure' },
      });
    }
    await this.entitlements.confirm(userId, 'ai_lookup', operationId);

    const value = result.result as LookupWordResult;
    const english = learner.nativeLanguage === 'en';
    const { senses } = await this.words.lookup(userId, normalizeText(value.lemma).toLowerCase(), learner.nativeLanguage);
    return {
      suggestion: {
        part_of_speech: value.part_of_speech, lemma: value.lemma,
        meaning: english ? { text: value.definition_en, language: 'en' } : { text: value.meaning_vi, language: 'vi' },
        definition_en: value.definition_en, examples: value.examples,
      },
      // D21: the catalog's senses of that lemma first, then the learner's own.
      catalog_senses: [...senses.filter(({ scope }) => scope === 'catalog'), ...senses.filter(({ scope }) => scope === 'private')],
    };
  }
}
