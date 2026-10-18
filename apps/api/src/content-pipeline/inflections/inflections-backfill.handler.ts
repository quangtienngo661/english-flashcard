import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { runWithOperationId } from '../../common/logging/request-context.js';
import { ContentService, generateInflections } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { BackgroundJobsService } from '../jobs/background-jobs.service.js';
import { JobHandlerRegistry } from '../jobs/job-handler.registry.js';
import type { JobContext, JobHandler } from '../jobs/job-types.js';

export const BACKFILL_CHUNK = 500;

/** D29: library forms for catalog entries that have no inflection rows yet (entries imported before the generator).
 * One pass walks entry ids in order, 500 per transaction; a re-run or a resumed attempt skips entries that already
 * have rows, so a crash between chunks leaves no duplicate and no gap. */
@Injectable()
export class InflectionsBackfillHandler implements JobHandler, OnModuleInit {
  readonly queue = 'content-inflections';

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(BackgroundJobsService) private readonly jobs: BackgroundJobsService,
    @Inject(JobHandlerRegistry) private readonly registry: JobHandlerRegistry,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async run(ctx: JobContext): Promise<'succeeded'> {
    const started = performance.now();
    const job = await this.jobs.get(ctx.jobId);
    if (!job) throw new Error('Inflection backfill job not found');
    return runWithOperationId(job.operationId, async () => {
      const counts = { entries_checked: 0, entries_filled: 0, forms_created: 0 };
      let after: string | undefined;
      for (;;) {
        const chunk = await this.prisma.entry.findMany({
          // Entries with a reviewed decision, the empty one included, are never refilled (M3).
          where: { scope: 'catalog', inflectionsReviewedAt: null, inflections: { none: {} }, pos: { in: ['verb', 'noun'] },
            ...(after ? { id: { gt: after } } : {}) },
          orderBy: { id: 'asc' }, take: BACKFILL_CHUNK, select: { id: true, lemma: true, pos: true },
        });
        if (chunk.length === 0) break;
        await ctx.tx(async (tx) => {
          for (const entry of chunk) {
            counts.entries_checked += 1;
            await this.content.lockEntryKey(tx, entry.lemma, entry.pos);
            // An import or a reviewed upload may have filled it since the chunk was read.
            if (await tx.entryInflection.findFirst({ where: { entryId: entry.id }, select: { id: true } })) continue;
            const forms = generateInflections(entry.lemma, entry.pos);
            if (forms.length === 0) continue;
            await this.content.replaceInflections(tx, entry.id, 'library', forms);
            counts.entries_filled += 1;
            counts.forms_created += forms.length;
          }
        });
        after = chunk[chunk.length - 1].id;
      }
      this.logger.info('inflection_backfill_finished', { job_id: ctx.jobId, counts, duration_ms: performance.now() - started });
      return 'succeeded' as const;
    });
  }
}
