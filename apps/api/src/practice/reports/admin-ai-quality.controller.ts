import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { AiQualityService } from './ai-quality.service.js';

const rangeQuery = z.strictObject({ from: z.iso.date().optional(), to: z.iso.date().optional() });

/** Practice's part of the AI dashboard (owner 28/10/2026, `ai.view`); read-only totals. */
@Controller('admin/practice/ai-quality')
@RequirePermission('ai.view')
export class AdminAiQualityController {
  constructor(
    @Inject(AiQualityService) private readonly quality: AiQualityService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  @Get()
  report(@Query({ schema: rangeQuery }) query: z.infer<typeof rangeQuery>) {
    return this.quality.report(query, this.clock.now());
  }
}
