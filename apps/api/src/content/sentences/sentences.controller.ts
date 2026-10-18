import { Body, Controller, Delete, HttpCode, Inject, Param, Post, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SENTENCE_MAX } from '../content.constants.js';
import type { Learner } from '../learner/learner-content.guard.js';
import { CurrentLearner, LearnerContent } from '../learner/learner.decorator.js';
import { boundedText } from '../private/my-words.schemas.js';
import { ContentRuleError } from '../senses/revision-content.js';
import { SentencesService } from './sentences.service.js';

const idParams = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });
const sentenceBody = z.strictObject({ text: boundedText(SENTENCE_MAX) });
const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });

@Controller()
@LearnerContent()
export class SentencesController {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(SentencesService) private readonly sentences: SentencesService,
  ) {}

  @Post('senses/:id/sentences')
  @HttpCode(201)
  @Idempotent()
  @RateLimit('user.write')
  @UseInterceptors(IdempotencyInterceptor)
  async add(
    @Param({ schema: idParams }) params: z.infer<typeof idParams>, @Body({ schema: sentenceBody }) body: z.infer<typeof sentenceBody>,
    @CurrentLearner() learner: Learner,
  ) {
    try {
      const sentence = await this.prisma.$transaction((tx) => this.sentences.addSentence(tx,
        { userId: learner.userId, senseId: params.id, text: body.text }), transactionOptions);
      // No text in the response: the idempotency store keeps response bodies (M1, design 7.4).
      return { id: sentence.id, created_at: sentence.createdAt.toISOString() };
    } catch (error) {
      if (!(error instanceof ContentRuleError)) throw error;
      if (error.code === 'not-found') throw notFound();
      if (error.code === 'sentence-limit-reached') {
        throw new ProblemDetailsException({ status: 409, title: 'Sentence limit reached', type: 'sentence-limit-reached' });
      }
      throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
    }
  }

  @Delete('sentences/:id')
  @HttpCode(204)
  @Idempotent()
  @RateLimit('user.write')
  @UseInterceptors(IdempotencyInterceptor)
  async remove(@Param({ schema: idParams }) params: z.infer<typeof idParams>, @CurrentLearner() learner: Learner): Promise<void> {
    if (!await this.sentences.deleteSentence(learner.userId, params.id)) throw notFound();
  }
}
