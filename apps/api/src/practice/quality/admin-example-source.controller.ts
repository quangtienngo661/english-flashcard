import { Body, Controller, Get, HttpCode, Inject, Post, Query, UseInterceptors } from '@nestjs/common';
import type { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentUser } from '../../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { ExampleSourceService } from './example-source.service.js';
import { addFromSourceBodySchema, sourceQuerySchema } from './real-judge.types.js';

/**
 * "Đưa vào bộ ví dụ" (nhóm B M4, design §7.2, §9 row P4). Admin only (D19, B43): an editor can resolve reports but never sees this button.
 * Adding is `@Idempotent()` so a second click with the same key does not make a second example.
 */
@Controller('admin/practice/eval-examples')
@RequirePermission('settings.manage')
export class AdminExampleSourceController {
  constructor(@Inject(ExampleSourceService) private readonly service: ExampleSourceService) {}

  @Get('from-source')
  preview(@Query({ schema: sourceQuerySchema }) query: z.output<typeof sourceQuerySchema>, @CurrentUser() actor: RequestUser) {
    return this.service.preview(actor.userId, query);
  }

  @Post('from-source')
  @HttpCode(201)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  create(@Body({ schema: addFromSourceBodySchema }) body: z.output<typeof addFromSourceBodySchema>, @CurrentUser() actor: RequestUser) {
    return this.service.create(actor.userId, body);
  }
}
