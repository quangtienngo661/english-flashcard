import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentUser } from '../../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import {
  createReasonSchema, patchReasonSchema, REASON_CODE_PATTERN, ReportReasonsService,
} from './report-reasons.service.js';

const params = z.strictObject({ code: z.string().regex(REASON_CODE_PATTERN) });

// Refundable reasons cost AI units, so only the admin manages them (design §9.1). No delete: a reason is turned off.
@Controller('admin/practice/report-reasons')
@RequirePermission('settings.manage')
export class AdminReportReasonsController {
  constructor(@Inject(ReportReasonsService) private readonly reasons: ReportReasonsService) {}

  // Editors read the list (design §5.3); writes keep the class permission.
  @Get()
  @RequirePermission('content.edit')
  list() {
    return this.reasons.adminList();
  }

  @Post()
  @HttpCode(201)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  create(@Body({ schema: createReasonSchema }) body: z.infer<typeof createReasonSchema>, @CurrentUser() actor: RequestUser) {
    return this.reasons.create(actor.userId, body);
  }

  // Setting a field to the same value twice gives the same row, so PATCH needs no Idempotency-Key.
  @Patch(':code')
  @RateLimit('user.write')
  update(
    @Param({ schema: params }) path: z.infer<typeof params>, @Body({ schema: patchReasonSchema }) body: z.infer<typeof patchReasonSchema>,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.reasons.update(actor.userId, path.code, body);
  }
}
