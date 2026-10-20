import { Body, Controller, Get, Inject, Param, Put, Req } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { AI_OPERATIONS } from '../ai.types.js';
import { OperationSettingsService, putOperationSchema } from '../models/operation-settings.service.js';

const operationParams = z.strictObject({ op: z.enum(AI_OPERATIONS) });

/** Per-operation choices (design §12.1 #7–#8); a PUT is guarded by `expected_version`, not by an Idempotency-Key. */
@Controller('admin/ai/operations')
@RequirePermission('settings.manage')
export class AdminAiOperationsController {
  constructor(@Inject(OperationSettingsService) private readonly operations: OperationSettingsService) {}

  @Get()
  list() {
    return this.operations.list();
  }

  @Put(':op')
  @RateLimit('user.write')
  put(
    @Param({ schema: operationParams }) params: z.infer<typeof operationParams>,
    @Body({ schema: putOperationSchema }) body: z.infer<typeof putOperationSchema>,
    @Req() req: RequestWithUser,
  ) {
    return this.operations.put(req.user!.userId, params.op, body);
  }
}
