import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { PilotMetricsService } from './pilot-metrics.service.js';
import { RetentionService } from './retention.service.js';

const rangeQuery = z.strictObject({ from: z.iso.date().optional(), to: z.iso.date().optional() });

/** Learning's part of the AI dashboard (nhóm B design §9 row P6, E18): retention and pilot metrics. Counts only, read-only, `ai.view`. */
@Controller('admin/learning')
@RequirePermission('ai.view')
export class AdminRetentionController {
  constructor(
    @Inject(RetentionService) private readonly retention: RetentionService,
    @Inject(PilotMetricsService) private readonly pilotMetrics: PilotMetricsService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  @Get('retention')
  report(@Query({ schema: rangeQuery }) query: z.infer<typeof rangeQuery>) {
    return this.retention.report(query, this.clock.now());
  }

  @Get('pilot-metrics')
  pilot(@Query({ schema: rangeQuery }) query: z.infer<typeof rangeQuery>) {
    return this.pilotMetrics.report(query, this.clock.now());
  }
}
