import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseInterceptors } from '@nestjs/common';
import type { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { createOrderSchema, orderIdParams } from './orders.schemas.js';
import { OrdersService } from './orders.service.js';

/** A learner's orders (launch prep B design §3.1, §3.8). Signed-in only, without `@LearnerContent()`, like `/me/entitlements`. */
@Controller('me/orders')
export class MeOrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Post()
  @HttpCode(201)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  create(@Body({ schema: createOrderSchema }) body: z.infer<typeof createOrderSchema>, @Req() req: RequestWithUser) {
    return this.orders.create(req.user!.userId, body);
  }

  /** The return page's single ask (design §3.6). Not idempotent by key: asking twice is harmless, and it is limited per order. */
  @Post(':id/check')
  @HttpCode(200)
  @RateLimit('user.write')
  check(@Param({ schema: orderIdParams }) params: z.infer<typeof orderIdParams>, @Req() req: RequestWithUser) {
    return this.orders.check(req.user!.userId, params.id);
  }

  @Get(':id')
  get(@Param({ schema: orderIdParams }) params: z.infer<typeof orderIdParams>, @Req() req: RequestWithUser) {
    return this.orders.get(req.user!.userId, params.id);
  }
}
