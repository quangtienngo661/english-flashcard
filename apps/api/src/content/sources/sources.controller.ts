import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { Public } from '../../identity/sessions/public.decorator.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { createSourceSchema, type CreateSourceBody } from './sources.schemas.js';
import { SourcesService, toPublicView, type PublicSourceView, type SourceView } from './sources.service.js';

@Controller('admin/content/sources')
@RequirePermission('content.import')
export class SourcesController {
  constructor(@Inject(SourcesService) private readonly sources: SourcesService) {}

  @Get()
  list() {
    return this.sources.list();
  }

  @Post()
  @RateLimit('user.write')
  create(@Body({ schema: createSourceSchema }) body: CreateSourceBody): Promise<SourceView> {
    return this.sources.create(body);
  }
}

@Controller('sources')
export class PublicSourcesController {
  constructor(@Inject(SourcesService) private readonly sources: SourcesService) {}

  @Get()
  @Public()
  async list(): Promise<{ items: PublicSourceView[] }> {
    return { items: (await this.sources.list()).items.map(toPublicView) };
  }
}
