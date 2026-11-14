import { Controller, HttpCode, Inject, Param, Post, Req, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { SubscriptionCancelService } from './subscription-cancel.service.js';

const params = z.strictObject({ id: z.uuid() });

/** Signed-in only, without `@LearnerContent()`, like `/me/entitlements`: a learner with no profile yet can still cancel. */
@Controller('me/subscriptions')
export class MeSubscriptionsController {
  constructor(@Inject(SubscriptionCancelService) private readonly cancellation: SubscriptionCancelService) {}

  @Post(':id/cancel')
  @HttpCode(202)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  cancel(@Param({ schema: params }) p: z.infer<typeof params>, @Req() req: RequestWithUser) {
    return this.cancellation.cancel(req.user!.userId, p.id);
  }
}
