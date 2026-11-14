import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseInterceptors } from '@nestjs/common';
import type { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { AdminOrdersService } from './admin-orders.service.js';
import { adminOrdersQuery, confirmPaymentSchema, orderIdParams, resolveOrderSchema, revokePeriodSchema, type AdminOrdersQuery } from './orders.schemas.js';

/**
 * The staff side of orders (launch prep B design §3.9). Money screens are admin only (`settings.manage`, like the transactions list):
 * an editor gets 403. The two writes that cannot be repeated by their own state (confirm, revoke) take an `Idempotency-Key`.
 */
@Controller('admin')
@RequirePermission('settings.manage')
export class AdminOrdersController {
  constructor(@Inject(AdminOrdersService) private readonly orders: AdminOrdersService) {}

  @Get('orders')
  list(@Query({ schema: adminOrdersQuery }) query: AdminOrdersQuery) {
    return this.orders.list(query);
  }

  @Get('orders/:id')
  get(@Param({ schema: orderIdParams }) params: z.infer<typeof orderIdParams>) {
    return this.orders.get(params.id);
  }

  @Post('orders/:id/confirm-payment')
  @HttpCode(200)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  confirm(
    @Param({ schema: orderIdParams }) params: z.infer<typeof orderIdParams>,
    @Body({ schema: confirmPaymentSchema }) body: z.infer<typeof confirmPaymentSchema>, @Req() req: RequestWithUser,
  ) {
    return this.orders.confirmPayment(req.user!.userId, params.id, body);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  @RateLimit('user.write')
  cancel(@Param({ schema: orderIdParams }) params: z.infer<typeof orderIdParams>, @Req() req: RequestWithUser) {
    return this.orders.cancel(req.user!.userId, params.id);
  }

  @Post('orders/:id/resolve')
  @HttpCode(200)
  @RateLimit('user.write')
  resolve(
    @Param({ schema: orderIdParams }) params: z.infer<typeof orderIdParams>,
    @Body({ schema: resolveOrderSchema }) body: z.infer<typeof resolveOrderSchema>, @Req() req: RequestWithUser,
  ) {
    return this.orders.resolve(req.user!.userId, params.id, body.note);
  }

  @Post('prepaid-periods/:id/revoke')
  @HttpCode(200)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  revoke(
    @Param({ schema: orderIdParams }) params: z.infer<typeof orderIdParams>,
    @Body({ schema: revokePeriodSchema }) body: z.infer<typeof revokePeriodSchema>, @Req() req: RequestWithUser,
  ) {
    return this.orders.revokePeriod(req.user!.userId, params.id, body.reason);
  }
}
