import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { runWithOperationId } from '../../common/logging/request-context.js';
import { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { BackgroundJobsService } from '../jobs/background-jobs.service.js';
import { JobHandlerRegistry } from '../jobs/job-handler.registry.js';
import { LeaseLostError, type JobContext, type JobHandler } from '../jobs/job-types.js';
import { withTransientRetry } from '../jobs/transient-retry.js';
import { recountPublishJob } from './publish-counters.js';

@Injectable()
export class PublishJobHandler implements JobHandler, OnModuleInit {
  readonly queue = 'content-publish';

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(BackgroundJobsService) private readonly jobs: BackgroundJobsService,
    @Inject(JobHandlerRegistry) private readonly registry: JobHandlerRegistry,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async run(ctx: JobContext): Promise<'succeeded' | 'partial'> {
    const started = performance.now();
    const job = await this.jobs.get(ctx.jobId);
    if (!job) throw new Error('Publish job not found');
    return runWithOperationId(job.operationId, async () => {
      await this.prisma.publishJob.findUniqueOrThrow({ where: { id: ctx.jobId } });
      try {
        const pending = await this.prisma.publishJobItem.findMany({
          where: { jobId: ctx.jobId, outcome: 'pending' }, orderBy: { senseId: 'asc' }, select: { senseId: true },
        });
        for (const { senseId } of pending) {
          // A cancel bumps the lease epoch, so this ctx.tx throws LeaseLostError before the next sense: the loop ends
          // there (rethrown below, swallowed by the runner). Senses already published stay published.
          await withTransientRetry(() => ctx.tx(async (tx) => {
            const where = { jobId_senseId: { jobId: ctx.jobId, senseId } };
            const item = await tx.publishJobItem.findUniqueOrThrow({ where });
            if (item.outcome !== 'pending') return;
            const actor = await tx.backgroundJob.findUniqueOrThrow({ where: { id: ctx.jobId }, select: { createdBy: true } });
            // The job's FOR SHARE fence stays held throughout Content's existing entry transaction.
            // If a crash occurs after publication but before this outcome commits, Content's
            // idempotent publishItem returns already_published on recovery.
            const result = await this.content.publishItem({ senseId, revision: item.revisionNo }, actor.createdBy, {
              skipUnpublished: true,
            });
            await tx.publishJobItem.update({ where, data: {
              outcome: result.outcome, reason: result.outcome === 'refused' ? result.reason : null,
            } });
          }), { retries: this.config.pipeline.rowRetries, baseMs: this.config.pipeline.rowRetryBaseMs });
        }
      } catch (error) {
        if (error instanceof LeaseLostError) throw error;
        // Preserve durable counts on failed attempts; release/retry/final failure belong to the runner.
        try { await this.saveReport(ctx); } catch {
          this.logger.warn('publish_job_report_update_failed', { job_id: ctx.jobId });
        }
        this.logger.warn('publish_job_attempt_failed', { job_id: ctx.jobId, attempt: ctx.attempt,
          duration_ms: performance.now() - started });
        throw error;
      }
      const counts = await this.saveReport(ctx);
      const fields = { job_id: ctx.jobId, counts, duration_ms: performance.now() - started };
      this.logger.info('publish_job_finished', fields);
      if (counts.refused > 0) {
        this.logger.warn('publish_job_partial', fields);
        return 'partial';
      }
      return 'succeeded';
    });
  }

  private saveReport(ctx: JobContext) {
    return ctx.tx((tx) => recountPublishJob(tx, ctx.jobId));
  }
}
