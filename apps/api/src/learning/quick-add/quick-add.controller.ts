import { Body, Controller, HttpCode, Inject, Post, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import {
  CurrentLearner, INFLECTION_KINDS, LEMMA_MAX, LEVELS, LearnerContent, MEANING_MAX, PRIVATE_EXAMPLES_MAX, SENTENCE_MAX, VALID_POS,
  normalizeText, ownIpa,
  type Learner,
} from '../../content/index.js';
import { QuickAddService } from './quick-add.service.js';

const uuid = z.uuid().transform((value) => value.toLowerCase());
/** Content's normalisation (NFC, trimmed, single spaces), then 1..max code points. */
const bounded = (max: number) => z.string().transform(normalizeText)
  .refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= max);

/** QP1: a word can join up to this many groups in one request. */
export const QUICK_ADD_GROUPS_MAX = 10;

export const quickAddBody = z.strictObject({
  // Either the old single `group_id` or `group_ids` (additive within v1); both together are refused.
  group_id: uuid.optional(),
  group_ids: z.array(uuid).min(1).max(QUICK_ADD_GROUPS_MAX).transform((ids) => [...new Set(ids)]).optional(),
  sense_id: uuid.optional(),
  new_word: z.strictObject({
    lemma: bounded(LEMMA_MAX),
    pos: z.enum(VALID_POS).nullable().optional(),
    meaning: bounded(MEANING_MAX),
    level: z.enum(LEVELS).nullable().optional(),
    topics: z.array(z.string().transform((value) => normalizeText(value).toLowerCase())
      .pipe(z.string().min(1).regex(/^[a-z0-9-]+$/))).max(20).optional(),
    form_of: z.strictObject({ entry_id: uuid, kind: z.enum(INFLECTION_KINDS) }).optional(),
    // Bước 7 design §11.2 (D22): the examples of an AI suggestion, as the learner edited them, and where the word came from.
    examples: z.array(bounded(SENTENCE_MAX)).max(PRIVATE_EXAMPLES_MAX).optional(),
    ai_suggestion: z.boolean().optional(),
    // Round C (H10): the learner's own pronunciation note.
    ipa: ownIpa.nullable().optional(),
  }).optional(),
  sentence: bounded(SENTENCE_MAX).optional(),
}).refine((body) => (body.sense_id === undefined) !== (body.new_word === undefined))
  .refine((body) => (body.group_id === undefined) !== (body.group_ids === undefined));

@Controller('quick-add')
@LearnerContent()
export class QuickAddController {
  constructor(@Inject(QuickAddService) private readonly quickAdd: QuickAddService) {}

  @Post()
  @HttpCode(201)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  add(@Body({ schema: quickAddBody }) body: z.infer<typeof quickAddBody>, @CurrentLearner() learner: Learner) {
    return this.quickAdd.quickAdd(learner.userId, learner.nativeLanguage, {
      groupIds: body.group_ids ?? [body.group_id!], senseId: body.sense_id, newWord: body.new_word, sentence: body.sentence,
    });
  }
}
