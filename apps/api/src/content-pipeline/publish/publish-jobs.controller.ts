import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, Res, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import type { RequestWithOperationId } from '../../common/logging/operation-id.middleware.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentUser } from '../../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import { BATCH_SCOPE, ContentService, sensesExportQuery, type BatchScope } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { BackgroundJobsService } from '../jobs/background-jobs.service.js';
import { JobQueueService } from '../jobs/job-queue.service.js';
import { toCsv } from '../upload/csv-writer.js';

const uuid = z.uuid().transform((value) => value.toLowerCase());
const jobParams = z.strictObject({ id: uuid });
const filterSchema = sensesExportQuery.pick({ level: true, topic: true, pos: true, batch_id: true }).extend({
  senseIds: z.array(uuid).transform((ids) => [...new Set(ids)].sort()).optional(),
});
const createSchema = z.strictObject({ filter: filterSchema });

@Controller('admin/content/senses/publish-jobs')
@RequirePermission('content.publish')
export class PublishJobsController {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(BATCH_SCOPE) private readonly batchScope: BatchScope,
    @Inject(BackgroundJobsService) private readonly jobs: BackgroundJobsService,
    @Inject(JobQueueService) private readonly queue: JobQueueService,
  ) {}

  @Post()
  @HttpCode(202)
  @RateLimit('user.write')
  @Idempotent({ timeoutSeconds: 60 })
  @UseInterceptors(IdempotencyInterceptor)
  async create(
    @Body({ schema: createSchema }) body: z.infer<typeof createSchema>,
    @CurrentUser() user: RequestUser,
    @Req() request: RequestWithOperationId,
  ): Promise<{ job_id: string }> {
    const { batch_id: batchId, ...filter } = body.filter;
    if (batchId !== undefined) {
      const batchIds = await this.batchScope.senseIdsOf(batchId);
      const explicit = filter.senseIds === undefined ? undefined : new Set(filter.senseIds);
      filter.senseIds = explicit ? batchIds.filter((id) => explicit.has(id)) : batchIds;
    }
    const snapshot = await this.content.snapshotPublishable(filter);
    // Match upload's validate-before-create ordering: no pipeline rows for an empty snapshot.
    if (snapshot.items.length === 0) throw new ProblemDetailsException({
      status: 400, title: 'Nothing to publish', type: 'nothing-to-publish',
    });
    const jobId = await this.prisma.$transaction(async (tx) => {
      const id = await this.jobs.create(tx, { queue: 'content-publish', createdBy: user.userId, operationId: request.operationId });
      await tx.publishJob.create({ data: { id, filter: body.filter, snapshotCount: snapshot.items.length,
        notReadyCount: snapshot.notReady,
        counters: { processed: 0, pending: snapshot.items.length, published: 0, already_published: 0, refused: 0 },
      } });
      // Chunk database inserts, without imposing a total-item limit on bulk publishing.
      for (let offset = 0; offset < snapshot.items.length; offset += 1_000) {
        await tx.publishJobItem.createMany({ data: snapshot.items.slice(offset, offset + 1_000).map((item) => ({ jobId: id, ...item })) });
      }
      return id;
    }, { timeout: 30_000, maxWait: 5_000 });
    // As with uploads, Postgres is authoritative and the shared reconciler repairs enqueue failure.
    await this.queue.enqueue('content-publish', jobId);
    return { job_id: jobId };
  }

  @Get(':id/report.csv')
  async report(@Param({ schema: jobParams }) params: z.infer<typeof jobParams>, @Res() response: Response): Promise<void> {
    const job = await this.prisma.publishJob.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!job) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    const items = await this.prisma.publishJobItem.findMany({ where: { jobId: params.id }, orderBy: { senseId: 'asc' } });
    const csv = toCsv(['sense_id', 'revision_no', 'outcome', 'reason'], items.map((item) => [
      item.senseId, String(item.revisionNo), item.outcome, item.reason ?? '',
    ]));
    response.type('text/csv').setHeader('Content-Disposition', `attachment; filename="publish-${params.id}.csv"`);
    response.send(csv);
  }

  @Get(':id')
  async get(@Param({ schema: jobParams }) params: z.infer<typeof jobParams>) {
    const job = await this.prisma.publishJob.findUnique({ where: { id: params.id }, select: {
      id: true, snapshotCount: true, notReadyCount: true, counters: true,
      job: { select: { status: true, createdAt: true, startedAt: true, finishedAt: true } },
    } });
    if (!job) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    return { id: job.id, status: job.job.status, snapshot_count: job.snapshotCount, not_ready_count: job.notReadyCount,
      counters: job.counters, created_at: job.job.createdAt.toISOString(),
      started_at: job.job.startedAt?.toISOString() ?? null, finished_at: job.job.finishedAt?.toISOString() ?? null,
    };
  }
}
