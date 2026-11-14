import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Req, UseInterceptors } from '@nestjs/common';
import type { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { createGrantSchema, grantIdParams, listGrantsQuery, revokeGrantSchema, updateGrantSchema } from './grants.schemas.js';
import { GrantsService } from './grants.service.js';

/** Staff grants (design §12.2 rows 2–4 and 3b). Revoke and the date change are idempotent by their own state (D38). */
@Controller('admin/entitlements/grants')
@RequirePermission('entitlements.grant')
export class AdminGrantsController {
  constructor(@Inject(GrantsService) private readonly grants: GrantsService) {}

  @Post()
  @HttpCode(201)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  create(@Body({ schema: createGrantSchema }) body: z.infer<typeof createGrantSchema>, @Req() req: RequestWithUser) {
    return this.grants.create(req.user!.userId, body);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  @RateLimit('user.write')
  revoke(
    @Param({ schema: grantIdParams }) params: z.infer<typeof grantIdParams>,
    @Body({ schema: revokeGrantSchema }) body: z.infer<typeof revokeGrantSchema>, @Req() req: RequestWithUser,
  ) {
    return this.grants.revoke(req.user!.userId, params.id, body.reason);
  }

  @Patch(':id')
  @RateLimit('user.write')
  update(
    @Param({ schema: grantIdParams }) params: z.infer<typeof grantIdParams>,
    @Body({ schema: updateGrantSchema }) body: z.infer<typeof updateGrantSchema>, @Req() req: RequestWithUser,
  ) {
    return this.grants.update(req.user!.userId, params.id, body);
  }

  @Get()
  list(@Query({ schema: listGrantsQuery }) query: z.infer<typeof listGrantsQuery>) {
    return this.grants.list(query);
  }
}
