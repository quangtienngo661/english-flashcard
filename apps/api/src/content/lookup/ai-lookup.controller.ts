import { Body, Controller, Headers, HttpCode, Inject, Post, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { normalizeText } from '../catalog/normalize.js';
import { LEMMA_MAX, SENTENCE_MAX } from '../content.constants.js';
import type { Learner } from '../learner/learner-content.guard.js';
import { CurrentLearner, LearnerContent } from '../learner/learner.decorator.js';
import { AiLookupService } from './ai-lookup.service.js';

const bounded = (max: number) => z.string().transform(normalizeText)
  .refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= max);
export const aiLookupBody = z.strictObject({
  text: bounded(LEMMA_MAX),
  // Only when the learner ticks "send the sentence" (D20); never logged.
  context_sentence: bounded(SENTENCE_MAX).optional(),
});

/** Bước 7 design §11.1: look a word up with AI when the learner asks. 60 s covers two gateway calls and the queue (B7E110). */
@Controller('lookup')
@LearnerContent()
export class AiLookupController {
  constructor(@Inject(AiLookupService) private readonly lookups: AiLookupService) {}

  @Post('ai')
  @HttpCode(200)
  @Idempotent({ timeoutSeconds: 60 })
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  lookup(
    @Body({ schema: aiLookupBody }) body: z.infer<typeof aiLookupBody>, @CurrentLearner() learner: Learner,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    // The interceptor has already refused a request without the header.
    return this.lookups.lookup(learner, idempotencyKey, body.text, body.context_sentence ?? null);
  }
}
