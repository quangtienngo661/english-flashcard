import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { groupParams } from '../groups/groups.schemas.js';
import { BacklogService } from './backlog.service.js';

const backlogQuery = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20), page_token: z.string().optional(),
});
const relearnBody = z.strictObject({
  item_ids: z.array(z.uuid().transform((value) => value.toLowerCase())).min(1).max(100),
});

@Controller()
@LearnerContent()
export class BacklogController {
  constructor(@Inject(BacklogService) private readonly backlog: BacklogService) {}

  @Get('groups/:id/backlog')
  list(
    @Param({ schema: groupParams }) params: z.infer<typeof groupParams>,
    @Query({ schema: backlogQuery }) query: z.infer<typeof backlogQuery>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.backlog.list(learner.userId, params.id, learner.nativeLanguage, query);
  }

  @Post('items/relearn')
  @HttpCode(200)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  relearn(@Body({ schema: relearnBody }) body: z.infer<typeof relearnBody>, @CurrentLearner() learner: Learner) {
    return this.backlog.relearn(learner.userId, body.item_ids);
  }
}
