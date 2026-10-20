import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { COST_GROUPS, ReportsService } from '../reports/reports.service.js';

const statusQuery = z.strictObject({});
const costsQuery = z.strictObject({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  group_by: z.enum(COST_GROUPS).default('day'),
});
const callsQuery = z.strictObject({ operation_id: z.string().min(1).max(200) });

/** Status, costs and the calls of one operation id (design §12.1 #1, #16, #17); read-only. */
@Controller('admin/ai')
@RequirePermission('settings.manage')
export class AdminAiReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  @Get('status')
  status(@Query({ schema: statusQuery }) _query: z.infer<typeof statusQuery>) {
    return this.reports.status(this.clock.now());
  }

  @Get('costs')
  costs(@Query({ schema: costsQuery }) query: z.infer<typeof costsQuery>) {
    return this.reports.costs(query, this.clock.now());
  }

  @Get('calls')
  calls(@Query({ schema: callsQuery }) query: z.infer<typeof callsQuery>) {
    return this.reports.calls(query.operation_id, this.clock.now());
  }
}
