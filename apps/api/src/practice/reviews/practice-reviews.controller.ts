import { Body, Controller, Get, HttpCode, Inject, Param, Post, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { PracticeReviewsService } from './practice-reviews.service.js';

const idParams = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });
const reviewBody = z.strictObject({ action: z.enum(['needs_review', 'known']) });

@Controller('practice')
@LearnerContent()
export class PracticeReviewsController {
  constructor(@Inject(PracticeReviewsService) private readonly reviews: PracticeReviewsService) {}

  // Idempotent by the item's own review_action (design §6 row 6).
  @Post('items/:id/review')
  @HttpCode(200)
  @RateLimit('practice.answer')
  review(
    @Param({ schema: idParams }) params: z.infer<typeof idParams>,
    @Body({ schema: reviewBody }) body: z.infer<typeof reviewBody>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.reviews.review(learner.userId, params.id, body.action);
  }

  @Get('sessions/:id/summary')
  summary(@Param({ schema: idParams }) params: z.infer<typeof idParams>, @CurrentLearner() learner: Learner) {
    return this.reviews.summary(learner.userId, params.id);
  }

  @Post('sessions/:id/review-all')
  @HttpCode(200)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  reviewAll(@Param({ schema: idParams }) params: z.infer<typeof idParams>, @CurrentLearner() learner: Learner) {
    return this.reviews.reviewAll(learner.userId, params.id);
  }
}
