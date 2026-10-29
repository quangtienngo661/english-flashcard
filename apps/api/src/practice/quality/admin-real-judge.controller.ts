import { Body, Controller, Get, HttpCode, Inject, Post, Query, UseInterceptors } from '@nestjs/common';
import type { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentUser } from '../../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { RealJudgeService } from './real-judge.service.js';
import { realJudgeBodySchema, realJudgeQuerySchema } from './real-judge.types.js';

/**
 * Judging real AI questions (nhóm B M4, design §9 row P4). Every route needs `settings.manage` (D19): it spends the day's admin USD cap and shows
 * what learners were asked. Starting is `@Idempotent()`: it only inserts rows and asks the queue, so no provider is called inside the transaction.
 */
@Controller('admin/practice/real-judge')
@RequirePermission('settings.manage')
export class AdminRealJudgeController {
  constructor(@Inject(RealJudgeService) private readonly service: RealJudgeService) {}

  @Get('estimate')
  estimate(@Query({ schema: realJudgeQuerySchema }) query: z.output<typeof realJudgeQuerySchema>, @CurrentUser() actor: RequestUser) {
    return this.service.estimate(actor.userId, query);
  }

  @Post()
  @HttpCode(201)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  start(@Body({ schema: realJudgeBodySchema }) body: z.output<typeof realJudgeBodySchema>, @CurrentUser() actor: RequestUser) {
    return this.service.start(actor.userId, body);
  }
}
