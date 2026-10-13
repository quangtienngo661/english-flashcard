import { Controller, Get, Inject, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { sensesExportQuery, type SenseFilter } from '../../content/index.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { ExportService } from './export.service.js';

@Controller('admin/content/senses')
@RequirePermission('content.edit')
export class SensesExportController {
  constructor(@Inject(ExportService) private readonly exports: ExportService) {}

  @Get('export')
  exportSenses(@Query({ schema: sensesExportQuery }) query: SenseFilter, @Res() response: Response): Promise<void> {
    return this.exports.streamSenses(query, response);
  }
}
