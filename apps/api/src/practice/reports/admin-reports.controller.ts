import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentUser } from '../../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { REASON_CODE_PATTERN } from './report-reasons.service.js';
import { ReportsService } from './reports.service.js';

const params = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });
const page = { page_size: z.coerce.number().int().min(1).max(100).default(20), page_token: z.string().optional() };
const listQuery = z.strictObject({
  status: z.enum(['open', 'no_error', 'fixed', 'confirmed']).optional(),
  reason: z.string().regex(REASON_CODE_PATTERN).optional(),
  source: z.enum(['rule', 'ai']).optional(),
  ...page,
});
const resolveBody = z.strictObject({ status: z.enum(['no_error', 'fixed', 'confirmed']) });
const refundsQuery = z.strictObject({
  resolved_by: z.uuid().transform((value) => value.toLowerCase()).optional(),
  from: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
  to: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
  ...page,
});

// Wrong content is fixed by whoever edits content, so no new permission (design §10); the refunds review is the admin's (§9.3).
@Controller('admin/practice')
@RequirePermission('content.edit')
export class AdminReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Get('reports')
  list(@Query({ schema: listQuery }) query: z.infer<typeof listQuery>) {
    return this.reports.list({
      status: query.status, reason: query.reason, source: query.source, pageSize: query.page_size, pageToken: query.page_token,
    });
  }

  @Post('reports/:id/resolve')
  @HttpCode(200)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  resolve(
    @Param({ schema: params }) path: z.infer<typeof params>, @Body({ schema: resolveBody }) body: z.infer<typeof resolveBody>,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.reports.resolve(actor.userId, path.id, body.status);
  }

  @Get('refunds')
  @RequirePermission('settings.manage')
  refunds(@Query({ schema: refundsQuery }) query: z.infer<typeof refundsQuery>) {
    return this.reports.listRefunds({
      resolvedBy: query.resolved_by, from: query.from, to: query.to, pageSize: query.page_size, pageToken: query.page_token,
    });
  }
}
