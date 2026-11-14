import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import type { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import {
  addItemBody, bulkAddBody, groupItemParams, groupItemsQuery, groupParams, itemParams, statesQuery,
} from './items.schemas.js';
import { ItemsService } from './items.service.js';

@Controller()
@LearnerContent()
export class ItemsController {
  constructor(@Inject(ItemsService) private readonly items: ItemsService) {}

  // The literal bulk route must precede any :itemId route.
  @Post('groups/:id/items/bulk')
  @HttpCode(200)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  bulkAdd(
    @Param({ schema: groupParams }) params: z.infer<typeof groupParams>,
    @Body({ schema: bulkAddBody }) body: z.infer<typeof bulkAddBody>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.items.bulkAdd(learner.userId, params.id, body);
  }

  @Post('groups/:id/items')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  add(
    @Param({ schema: groupParams }) params: z.infer<typeof groupParams>,
    @Body({ schema: addItemBody }) body: z.infer<typeof addItemBody>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.items.add(learner.userId, params.id, body.sense_id);
  }

  @Get('groups/:id/items')
  listGroup(
    @Param({ schema: groupParams }) params: z.infer<typeof groupParams>,
    @Query({ schema: groupItemsQuery }) query: z.infer<typeof groupItemsQuery>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.items.listGroup(learner.userId, params.id, query, learner.nativeLanguage);
  }

  @Delete('groups/:id/items/:itemId')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  removeFromGroup(@Param({ schema: groupItemParams }) params: z.infer<typeof groupItemParams>, @CurrentLearner() learner: Learner) {
    return this.items.removeFromGroup(learner.userId, params.id, params.itemId);
  }

  @Get('items')
  states(@Query({ schema: statesQuery }) query: z.infer<typeof statesQuery>, @CurrentLearner() learner: Learner) {
    return this.items.states(learner.userId, query.sense_ids);
  }

  @Delete('items/:id')
  @HttpCode(204)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  async forget(@Param({ schema: itemParams }) params: z.infer<typeof itemParams>, @CurrentLearner() learner: Learner) {
    await this.items.forget(learner.userId, params.id);
  }
}
