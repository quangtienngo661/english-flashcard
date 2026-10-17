import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, UseInterceptors } from '@nestjs/common';
import type { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { createGroupBody, groupParams, renameGroupBody } from './groups.schemas.js';
import { GroupsService } from './groups.service.js';

@Controller('groups')
@LearnerContent()
export class GroupsController {
  constructor(@Inject(GroupsService) private readonly groups: GroupsService) {}

  @Post()
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  create(@Body({ schema: createGroupBody }) body: z.infer<typeof createGroupBody>, @CurrentLearner() learner: Learner) {
    return this.groups.create(learner.userId, body.name);
  }

  @Get(':id')
  get(@Param({ schema: groupParams }) params: z.infer<typeof groupParams>, @CurrentLearner() learner: Learner) {
    return this.groups.get(learner.userId, params.id);
  }

  @Patch(':id')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  rename(
    @Param({ schema: groupParams }) params: z.infer<typeof groupParams>,
    @Body({ schema: renameGroupBody }) body: z.infer<typeof renameGroupBody>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.groups.rename(learner.userId, params.id, body.name, body.version);
  }

  @Delete(':id')
  @HttpCode(204)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  async delete(@Param({ schema: groupParams }) params: z.infer<typeof groupParams>, @CurrentLearner() learner: Learner) {
    await this.groups.delete(learner.userId, params.id);
  }
}
