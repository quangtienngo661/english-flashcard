import { Body, Controller, HttpCode, Inject, Param, Patch, UseInterceptors } from '@nestjs/common';
import type { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { Learner } from '../learner/learner-content.guard.js';
import { CurrentLearner, LearnerContent } from '../learner/learner.decorator.js';
import { ContentRuleError } from '../senses/revision-content.js';
import { myWordParams, myWordPatch, type MyWordPatch } from './my-words.schemas.js';
import { PrivateWordsService } from './private-words.service.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const conflicts = new Set(['private-word-exists', 'private-word-limit-reached']);

/** Maps private-word rule errors to problem details: missing or not owned is 404, never 403. */
export async function privateWordProblems<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!(error instanceof ContentRuleError)) throw error;
    if (error.code === 'not-found') throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    if (conflicts.has(error.code)) throw new ProblemDetailsException({ status: 409, title: error.code, type: error.code });
    throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
  }
}

@Controller('my-words')
@LearnerContent()
export class MyWordsController {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(PrivateWordsService) private readonly words: PrivateWordsService,
  ) {}

  @Patch(':id')
  @HttpCode(204)
  @Idempotent()
  @RateLimit('user.write')
  @UseInterceptors(IdempotencyInterceptor)
  async update(
    @Param({ schema: myWordParams }) params: z.infer<typeof myWordParams>,
    @Body({ schema: myWordPatch }) body: MyWordPatch, @CurrentLearner() learner: Learner,
  ): Promise<void> {
    await privateWordProblems(() => this.prisma.$transaction((tx) => this.words.updatePrivateWord(tx, learner.userId, params.id, {
      lemma: body.lemma, pos: body.pos, level: body.level, topicCodes: body.topics,
      senses: body.senses?.map(({ sense_id, meaning, examples }) => ({
        senseId: sense_id, meaning: meaning === undefined ? undefined : { text: meaning, language: learner.nativeLanguage }, examples,
      })),
    }), transactionOptions));
  }
}
