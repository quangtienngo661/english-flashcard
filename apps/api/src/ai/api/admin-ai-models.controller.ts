import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { AI_PROVIDERS } from '../ai.types.js';
import { addModelSchema, ModelsService, patchModelSchema } from '../models/models.service.js';

const modelIdParams = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });
const listQuery = z.strictObject({ provider: z.enum(AI_PROVIDERS).optional() });

/**
 * The model list (design §12.1 #2–#6). No `@Idempotent()`: adding and refreshing call a provider, which must not run inside the
 * idempotency transaction (design §4.4); a repeated add answers 409 `model-exists`.
 */
@Controller('admin/ai/models')
@RequirePermission('settings.manage')
export class AdminAiModelsController {
  constructor(@Inject(ModelsService) private readonly models: ModelsService) {}

  @Get()
  list(@Query({ schema: listQuery }) query: z.infer<typeof listQuery>) {
    return this.models.list(query.provider);
  }

  @Post()
  @HttpCode(201)
  @RateLimit('user.write')
  add(@Body({ schema: addModelSchema }) body: z.infer<typeof addModelSchema>, @Req() req: RequestWithUser) {
    return this.models.add(req.user!.userId, body);
  }

  @Patch(':id')
  @RateLimit('user.write')
  update(@Param({ schema: modelIdParams }) params: z.infer<typeof modelIdParams>,
    @Body({ schema: patchModelSchema }) body: z.infer<typeof patchModelSchema>) {
    return this.models.update(params.id, body);
  }

  @Post(':id/refresh')
  @HttpCode(200)
  @RateLimit('user.write')
  refresh(@Param({ schema: modelIdParams }) params: z.infer<typeof modelIdParams>) {
    return this.models.refresh(params.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RateLimit('user.write')
  async remove(@Param({ schema: modelIdParams }) params: z.infer<typeof modelIdParams>): Promise<void> {
    await this.models.remove(params.id);
  }
}
