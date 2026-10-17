import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { ReviewsService } from './reviews.service.js';

const reviewBody = z.strictObject({
  item_id: z.uuid().transform((value) => value.toLowerCase()),
  group_id: z.uuid().transform((value) => value.toLowerCase()),
  answer: z.enum(['known', 'review']),
  review_id: z.uuid().transform((value) => value.toLowerCase()),
});

// Idempotent by its review_id instead of an Idempotency-Key, and limited by its own rule instead of user.write
// (plan, Global Constraints): a flashcard session answers faster than 30 cards a minute.
@Controller('reviews')
@LearnerContent()
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviews: ReviewsService) {}

  @Post()
  @HttpCode(200)
  @RateLimit('learning.review')
  answer(@Body({ schema: reviewBody }) body: z.infer<typeof reviewBody>, @CurrentLearner() learner: Learner) {
    return this.reviews.answer(learner.userId, {
      itemId: body.item_id, groupId: body.group_id, answer: body.answer, reviewId: body.review_id,
    });
  }
}
