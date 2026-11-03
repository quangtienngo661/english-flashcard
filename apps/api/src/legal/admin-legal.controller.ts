import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, Req, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../common/request-user/request-user.js';
import { RequirePermission } from '../identity/staff/require-permission.decorator.js';
import {
  createSchema, idParams, listQuery, publishSchema, saveSchema,
  type CreateBody, type IdParams, type ListQuery, type PublishBody, type SaveBody,
} from './legal.schemas.js';
import { LegalService } from './legal.service.js';

/** Versions of the Privacy Policy and the Terms of Use (legal documents, 03/11/2026): draft, save, publish. Admin only. */
@Controller('admin/legal/versions')
@RequirePermission('settings.manage')
export class AdminLegalController {
  constructor(@Inject(LegalService) private readonly legal: LegalService) {}

  @Get()
  list(@Query({ schema: listQuery }) query: ListQuery) {
    return this.legal.list(query.page_size, query.page_token);
  }

  @Get(':id')
  get(@Param({ schema: idParams }) params: IdParams) {
    return this.legal.get(params.id);
  }

  @Post()
  @HttpCode(201)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  create(@Body({ schema: createSchema }) body: CreateBody, @Req() req: RequestWithUser) {
    return this.legal.create(req.user!.userId, body.copy_from);
  }

  @Put(':id')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  save(@Param({ schema: idParams }) params: IdParams, @Body({ schema: saveSchema }) body: SaveBody, @Req() req: RequestWithUser) {
    return this.legal.save(params.id, req.user!.userId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RateLimit('user.write')
  async remove(@Param({ schema: idParams }) params: IdParams): Promise<void> {
    await this.legal.remove(params.id);
  }

  /** 200: the version it makes current already exists. 409 `publish-stale` when the page is out of date. */
  @Post(':id/publish')
  @HttpCode(200)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  publish(@Param({ schema: idParams }) params: IdParams, @Body({ schema: publishSchema }) body: PublishBody, @Req() req: RequestWithUser) {
    return this.legal.publish(params.id, req.user!.userId, body);
  }
}
