import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { runWithOperationId } from '../../common/logging/request-context.js';
import { normalizeText, splitHeadword } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { BackgroundJobsService } from '../jobs/background-jobs.service.js';
import { JobHandlerRegistry } from '../jobs/job-handler.registry.js';
import { LeaseLostError, type JobContext, type JobHandler } from '../jobs/job-types.js';
import { withTransientRetry } from '../jobs/transient-retry.js';
import { classifyColumns } from '../upload/columns.js';
import { parseUploadFile } from '../upload/csv-file.js';
import { contentKey, normalizeRow } from '../upload/row-normalizer.js';
import { prefilterRows, type ImportFileRow } from './prefilter.js';
import { ImportRowProcessor, recordRejected } from './row-processor.js';

function emptyCounters() {
  return { processed: 0, created: 0, updated: 0, unchanged: 0, rejected: 0,
    entries_created: 0, variants_created: 0, levels_created: 0, senses_created: 0, revisions_created: 0 };
}

@Injectable()
export class ImportBatchHandler implements JobHandler, OnModuleInit {
  readonly queue = 'content-import';

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(BackgroundJobsService) private readonly jobs: BackgroundJobsService,
    @Inject(ImportRowProcessor) private readonly rowProcessor: ImportRowProcessor,
    @Inject(JobHandlerRegistry) private readonly registry: JobHandlerRegistry,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async run(ctx: JobContext): Promise<'succeeded' | 'partial'> {
    const started = performance.now();
    const job = await this.jobs.get(ctx.jobId);
    if (!job) throw new Error('Import job not found');
    // AppLogger deliberately discards operation_id fields in favor of its async context.
    return runWithOperationId(job.operationId, async () => {
      const batch = await this.prisma.importBatch.findUniqueOrThrow({ where: { id: ctx.jobId }, include: { file: true } });
      if (!batch.file) {
        // Permanently missing bytes must become terminal before BullMQ tries to release the lease.
        // release's running-status predicate then misses; a subsequent acquire also misses. On a
        // last attempt the runner may only cosmetically replace the summary with Error: file-purged.
        await this.jobs.finish(ctx.jobId, ctx.epoch, 'failed', 'file-purged');
        this.logger.warn('import_batch_file_purged', { batch_id: ctx.jobId, duration_ms: performance.now() - started });
        throw new Error('file-purged');
      }

      const warnings = new Set(Array.isArray(batch.warnings)
        ? batch.warnings.filter((warning): warning is string => typeof warning === 'string') : []);
      let counts = emptyCounters();
      try {
        const parsed = parseUploadFile(Buffer.from(batch.file.content), {
          maxRows: this.config.pipeline.importMaxRows, maxBytes: this.config.pipeline.importMaxBytes,
        });
        const columns = classifyColumns(parsed.headers);
        const existing = await this.prisma.importRowOutcome.findMany({ where: { batchId: batch.id },
          select: { rowNumber: true, outcome: true } });
        const finished = new Map(existing.map((outcome) => [outcome.rowNumber, outcome.outcome]));
        const rows: ImportFileRow[] = [];
        const settledContentKeys = new Map<string, number>();
        for (const row of parsed.rows) {
          const cells = Object.fromEntries(parsed.headers.map((header, index) => [header, row.cells[index]]));
          if (finished.has(row.rowNumber)) {
            // Only reconstruct identity for a successful earlier row, never validate or process it
            // again. Duplicate outcomes are persisted BEFORE processing, so settled rejections need
            // no reconstruction. This preserves file identity across a crash between row writes.
            if (finished.get(row.rowNumber) !== 'rejected' && columns.contentColumns.some((column) => cells[column].trim())) {
              const key = contentKey({ lemma: splitHeadword(cells.headword ?? cells.lemma ?? '').lemma,
                pos: normalizeText(cells.pos).toLowerCase(), senseId: normalizeText(cells.sense_id ?? '') || null,
                contextLabel: normalizeText(cells.context_label ?? '') || null }).key;
              if (!settledContentKeys.has(key)) settledContentKeys.set(key, row.rowNumber);
            }
            continue;
          }
          const normalized = normalizeRow(row.rowNumber, cells, { hasLevelColumn: columns.hasLevelColumn });
          if (!normalized.ok) {
            await recordRejected(ctx, batch.id, { rowNumber: row.rowNumber, raw: row.cells }, normalized.errors);
            continue;
          }
          rows.push({ normalized: normalized.row, raw: row.cells });
        }
        const filtered = await prefilterRows(this.prisma, rows, {
          batchId: batch.id, levelSourceId: batch.levelSourceId, fileSha256: batch.fileSha256,
        }, settledContentKeys);
        for (const { row, errors } of filtered.duplicateRows) {
          await recordRejected(ctx, batch.id, { rowNumber: row.normalized.rowNumber, raw: row.raw }, errors);
        }
        if (filtered.unchangedRows.length > 0) {
          // One bulk, lease-fenced write instead of a transaction for each unchanged row.
          await ctx.tx(async (tx) => {
            await tx.importRowOutcome.createMany({ data: filtered.unchangedRows.map(({ normalized }) => ({
              batchId: batch.id, rowNumber: normalized.rowNumber, outcome: 'unchanged',
            })), skipDuplicates: true });
          });
        }
        for (const row of filtered.toProcess) {
          const result = await withTransientRetry(() => this.rowProcessor.process(ctx, {
            id: batch.id, levelSourceId: batch.levelSourceId,
          }, row.normalized), { retries: this.config.pipeline.rowRetries, baseMs: this.config.pipeline.rowRetryBaseMs });
          if (result.outcome === 'rejected') {
            await recordRejected(ctx, batch.id, { rowNumber: row.normalized.rowNumber, raw: row.raw }, result.errors);
          } else {
            for (const warning of result.warnings ?? []) warnings.add(warning);
          }
        }
        counts = await this.saveReport(ctx, warnings);
      } catch (error) {
        if (error instanceof LeaseLostError) throw error;
        // An exhausted row retry fails the attempt. Retain the durable counts so far for the final
        // framework failure report, and let the runner own release/retry/finish without interference.
        try { counts = await this.saveReport(ctx, warnings); } catch {
          this.logger.warn('import_batch_report_update_failed', { batch_id: ctx.jobId });
        }
        // Never log the error, warning, rejection message, header, lemma or any other file value.
        this.logger.warn('import_batch_attempt_failed', { batch_id: ctx.jobId, attempt: ctx.attempt,
          counts, duration_ms: performance.now() - started });
        throw error;
      }
      const fields = { batch_id: ctx.jobId, counts, duration_ms: performance.now() - started };
      this.logger.info('import_batch_finished', fields);
      if (counts.rejected > 0) {
        this.logger.warn('import_batch_partial', fields);
        return 'partial';
      }
      return 'succeeded';
    });
  }

  private saveReport(ctx: JobContext, warnings: Set<string>) {
    return ctx.tx(async (tx) => {
      const outcomes = await tx.importRowOutcome.groupBy({ by: ['outcome'], where: { batchId: ctx.jobId }, _count: { _all: true } });
      const records = await tx.batchRecord.groupBy({ by: ['recordType'], where: { batchId: ctx.jobId }, _count: { _all: true } });
      const counts = emptyCounters();
      for (const { outcome, _count } of outcomes) {
        if (outcome === 'created' || outcome === 'updated' || outcome === 'unchanged' || outcome === 'rejected') {
          counts[outcome] = _count._all;
        }
      }
      counts.processed = counts.created + counts.updated + counts.unchanged + counts.rejected;
      const recordFields = { entry: 'entries_created', variant: 'variants_created', level: 'levels_created',
        sense: 'senses_created', revision: 'revisions_created' } as const;
      for (const { recordType, _count } of records) {
        if (Object.hasOwn(recordFields, recordType)) counts[recordFields[recordType as keyof typeof recordFields]] = _count._all;
      }
      await tx.importBatch.update({ where: { id: ctx.jobId }, data: { counters: counts, warnings: [...warnings] } });
      return counts;
    });
  }
}
