import { Controller, Get, Inject, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { entriesExportQuery, sensesExportQuery, type EntriesExportFilter, type SenseFilter } from '../../content/index.js';
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

@Controller('admin/content/entries')
@RequirePermission('content.edit')
export class EntriesExportController {
  constructor(@Inject(ExportService) private readonly exports: ExportService) {}

  @Get('export')
  exportEntries(@Query({ schema: entriesExportQuery }) query: EntriesExportFilter, @Res() response: Response): Promise<void> {
    return this.exports.streamEntriesWithoutSense(query, response);
  }
}
