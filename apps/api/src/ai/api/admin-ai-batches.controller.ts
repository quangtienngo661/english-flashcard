import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { AiBatchesService, batchParamsSchema, batchesQuerySchema } from '../batches/ai-batches.service.js';

@Controller('admin/ai/batches')
@RequirePermission('settings.manage')
export class AdminAiBatchesController {
  constructor(@Inject(AiBatchesService) private readonly batches: AiBatchesService) {}

  @Get()
  list(@Query({ schema: batchesQuerySchema }) query: z.infer<typeof batchesQuerySchema>) {
    return this.batches.list(query);
  }

  @Get(':id')
  get(@Param({ schema: batchParamsSchema }) params: z.infer<typeof batchParamsSchema>) {
    return this.batches.get(params.id);
  }
}
