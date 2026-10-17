import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { ContentService, type EntriesExportFilter, type ExportRow, type SenseFilter } from '../../content/index.js';
import { csvRow, toCsv } from '../upload/csv-writer.js';

const columns: Array<keyof ExportRow> = [
  'headword', 'pos', 'gloss_vi', 'definition_en', 'example_en_1', 'example_en_2', 'example_en_3',
  'topics', 'accepted_forms', 'context_label', 'form_of', 'inflections', 'sense_id', 'revision', '_status', '_level',
  '_inflections',
];
// Same content columns as the sense export, left empty for staff to fill; no sense_id, so uploads create senses.
const entryColumns = [
  'headword', 'pos', 'gloss_vi', 'definition_en', 'example_en_1', 'example_en_2', 'example_en_3',
  'topics', 'accepted_forms', 'context_label', 'form_of', 'inflections', '_level', '_inflections',
] as const;

/** Respect writable backpressure and stop if the client disconnects while waiting. */
async function writeChunk(response: Response, chunk: string): Promise<boolean> {
  if (response.destroyed) return false;
  if (response.write(chunk)) return true;
  return new Promise((resolve) => {
    const cleanup = () => {
      response.off('drain', drained);
      response.off('close', closed);
    };
    const drained = () => { cleanup(); resolve(true); };
    const closed = () => { cleanup(); resolve(false); };
    response.once('drain', drained);
    response.once('close', closed);
  });
}

@Injectable()
export class ExportService {
  constructor(
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async streamSenses(filter: SenseFilter, response: Response): Promise<void> {
    const result = await this.content.listExportRows(filter, this.config.pipeline.exportMaxRows);
    if ('tooMany' in result) throw this.tooLarge('senses');
    // All selection/count work completes before setting CSV headers or writing a byte.
    const headers = filter.status === 'unpublishable' ? [...columns, '_missing' as const] : columns;
    await this.stream(response, 'senses.csv', headers, result.rows);
  }

  async streamEntriesWithoutSense(filter: EntriesExportFilter, response: Response): Promise<void> {
    const result = await this.content.listEntriesWithoutSense({ level: filter.level }, this.config.pipeline.exportMaxRows);
    if ('tooMany' in result) throw this.tooLarge('entries');
    await this.stream(response, 'entries-without-sense.csv', entryColumns, result.rows);
  }

  private tooLarge(what: 'senses' | 'entries'): ProblemDetailsException {
    return new ProblemDetailsException({
      status: 400, title: 'Export too large', type: 'export-too-large',
      detail: `Export is limited to ${this.config.pipeline.exportMaxRows} ${what}. Narrow the selected ${what} or filters and try again.`,
    });
  }

  private async stream<Column extends string>(
    response: Response, fileName: string, headers: readonly Column[], rows: ReadonlyArray<Partial<Record<Column, unknown>>>,
  ): Promise<void> {
    response.type('text/csv').setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    // toCsv writes the sole BOM and header. csvRow shares its exact cell encoding/CRLF.
    if (!await writeChunk(response, toCsv([...headers], []))) return;
    for (let offset = 0; offset < rows.length; offset += 500) {
      const chunk = rows.slice(offset, offset + 500)
        .map((row) => csvRow(headers.map((column) => String(row[column] ?? '')))).join('');
      if (!await writeChunk(response, chunk)) return;
    }
    response.end();
  }
}
