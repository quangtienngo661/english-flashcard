import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { AI_OPERATIONS } from '../ai.types.js';
import { ConfigsService, createDraftSchema, saveDraftSchema, testDraftSchema } from '../configs/configs.service.js';

const operationParams = z.strictObject({ op: z.enum(AI_OPERATIONS) });

/**
 * Configs of an operation (nhóm B design §6, §9 row P3). The draft is kept on the server and saved with `expected_version`; a draft test
 * calls a provider in the request, so it takes an `ai.test` slot itself and has no `@Idempotent()` (design §4.4).
 */
@Controller('admin/ai/configs')
@RequirePermission('settings.manage')
export class AdminAiConfigsController {
  constructor(@Inject(ConfigsService) private readonly configs: ConfigsService) {}

  @Get(':op')
  get(@Param({ schema: operationParams }) params: z.infer<typeof operationParams>) {
    return this.configs.get(params.op);
  }

  @Post(':op/draft')
  @HttpCode(201)
  @RateLimit('user.write')
  createDraft(
    @Param({ schema: operationParams }) params: z.infer<typeof operationParams>,
    @Body({ schema: createDraftSchema }) body: z.infer<typeof createDraftSchema>,
    @Req() req: RequestWithUser,
  ) {
    return this.configs.createDraft(req.user!.userId, params.op, body);
  }

  @Put(':op/draft')
  @RateLimit('user.write')
  saveDraft(
    @Param({ schema: operationParams }) params: z.infer<typeof operationParams>,
    @Body({ schema: saveDraftSchema }) body: z.infer<typeof saveDraftSchema>,
    @Req() req: RequestWithUser,
  ) {
    return this.configs.saveDraft(req.user!.userId, params.op, body);
  }

  @Delete(':op/draft')
  @HttpCode(204)
  @RateLimit('user.write')
  async deleteDraft(@Param({ schema: operationParams }) params: z.infer<typeof operationParams>): Promise<void> {
    await this.configs.deleteDraft(params.op);
  }

  @Post(':op/draft/test')
  @HttpCode(200)
  testDraft(
    @Param({ schema: operationParams }) params: z.infer<typeof operationParams>,
    @Body({ schema: testDraftSchema }) body: z.infer<typeof testDraftSchema>,
    @Req() req: RequestWithUser,
  ) {
    return this.configs.testDraft(req.user!.userId, params.op, body);
  }
}
