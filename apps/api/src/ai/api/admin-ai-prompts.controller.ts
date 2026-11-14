import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { AI_OPERATIONS } from '../ai.types.js';
import { PromptsService, testPromptSchema } from '../prompts/prompts.service.js';

const operationParams = z.strictObject({ op: z.enum(AI_OPERATIONS) });
const revisionsQuery = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
});

/**
 * Prompts (design §12.1 #9–#12). The text in use is the live config's and changes by publishing a config, so `PUT /prompts/:op` is
 * gone (nhóm B design §6.6); a test run calls providers in the request, so it takes an `ai.test` slot itself and has no `@Idempotent()`
 * (design §4.4: no provider call from an idempotent handler).
 */
@Controller('admin/ai/prompts')
@RequirePermission('settings.manage')
export class AdminAiPromptsController {
  constructor(@Inject(PromptsService) private readonly prompts: PromptsService) {}

  @Get(':op')
  get(@Param({ schema: operationParams }) params: z.infer<typeof operationParams>) {
    return this.prompts.get(params.op);
  }

  @Get(':op/revisions')
  revisions(
    @Param({ schema: operationParams }) params: z.infer<typeof operationParams>,
    @Query({ schema: revisionsQuery }) query: z.infer<typeof revisionsQuery>,
  ) {
    return this.prompts.revisions(params.op, query.page_size, query.page_token);
  }

  @Post(':op/test')
  @HttpCode(200)
  test(
    @Param({ schema: operationParams }) params: z.infer<typeof operationParams>,
    @Body({ schema: testPromptSchema }) body: z.infer<typeof testPromptSchema>,
    @Req() req: RequestWithUser,
  ) {
    return this.prompts.test(req.user!.userId, params.op, body);
  }
}
