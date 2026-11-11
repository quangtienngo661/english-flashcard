import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Req, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../common/request-user/request-user.js';
import { RequirePermission } from '../identity/staff/require-permission.decorator.js';
import {
  createFaqSchema, faqIdParams, updateFaqSchema, type CreateFaqBody, type FaqIdParams, type UpdateFaqBody,
} from './faq.schemas.js';
import { FaqService } from './faq.service.js';

/** The home page FAQ (giao diện mới §10.7): list, add, edit, delete. Admin only. */
@Controller('admin/faq')
@RequirePermission('settings.manage')
export class AdminFaqController {
  constructor(@Inject(FaqService) private readonly faqService: FaqService) {}

  @Get()
  list() {
    return this.faqService.list();
  }

  @Post()
  @HttpCode(201)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  create(@Body({ schema: createFaqSchema }) body: CreateFaqBody, @Req() req: RequestWithUser) {
    return this.faqService.create(req.user!.userId, body);
  }

  @Patch(':id')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  update(
    @Param({ schema: faqIdParams }) params: FaqIdParams, @Body({ schema: updateFaqSchema }) body: UpdateFaqBody, @Req() req: RequestWithUser,
  ) {
    return this.faqService.update(params.id, req.user!.userId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RateLimit('user.write')
  async remove(@Param({ schema: faqIdParams }) params: FaqIdParams): Promise<void> {
    await this.faqService.remove(params.id);
  }
}
