import { Body, Controller, HttpCode, Inject, Param, Post, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { answerLength } from '../grading/normalize.js';
import { ANSWER_MAX } from '../practice.constants.js';
import { AnswersService } from './answers.service.js';

const itemParams = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });
// Empty or over ANSWER_MAX code points after NFC + trim → 400 and nothing stored (PRC12).
const answerBody = z.union([
  z.strictObject({ choice: z.int().min(0).max(3) }),
  z.strictObject({ is_true: z.boolean() }),
  z.strictObject({ text: z.string().refine((text) => answerLength(text) >= 1 && answerLength(text) <= ANSWER_MAX) }),
]);
const hintBody = z.strictObject({ level: z.union([z.literal(1), z.literal(2)]) });

@Controller('practice/items')
@LearnerContent()
export class AnswersController {
  constructor(@Inject(AnswersService) private readonly answers: AnswersService) {}

  @Post(':id/answer')
  @HttpCode(200)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('practice.answer')
  answer(
    @Param({ schema: itemParams }) params: z.infer<typeof itemParams>,
    @Body({ schema: answerBody }) body: z.infer<typeof answerBody>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.answers.answer(learner.userId, params.id, body);
  }

  @Post(':id/skip')
  @HttpCode(200)
  @RateLimit('practice.answer')
  skip(@Param({ schema: itemParams }) params: z.infer<typeof itemParams>, @CurrentLearner() learner: Learner) {
    return this.answers.skip(learner.userId, params.id);
  }

  @Post(':id/hint')
  @HttpCode(200)
  @RateLimit('practice.answer')
  hint(
    @Param({ schema: itemParams }) params: z.infer<typeof itemParams>,
    @Body({ schema: hintBody }) body: z.infer<typeof hintBody>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.answers.hint(learner.userId, params.id, body.level);
  }
}
