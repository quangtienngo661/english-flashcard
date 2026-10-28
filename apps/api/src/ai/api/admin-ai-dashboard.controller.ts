import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { ReportsService } from '../reports/reports.service.js';

const dashboardQuery = z.strictObject({ from: z.iso.date().optional(), to: z.iso.date().optional() });

/** The AI dashboard (owner 28/10/2026): totals only, so editors read it too (`ai.view`); read-only. */
@Controller('admin/ai/dashboard')
@RequirePermission('ai.view')
export class AdminAiDashboardController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  @Get()
  dashboard(@Query({ schema: dashboardQuery }) query: z.infer<typeof dashboardQuery>) {
    return this.reports.dashboard(query, this.clock.now());
  }
}
