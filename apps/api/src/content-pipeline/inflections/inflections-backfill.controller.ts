import { Controller, Get, HttpCode, Inject, Param, Post, Req, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import type { RequestWithOperationId } from '../../common/logging/operation-id.middleware.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentUser } from '../../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { BackgroundJobsService } from '../jobs/background-jobs.service.js';
import { JobQueueService } from '../jobs/job-queue.service.js';

const jobParams = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });

@Controller('admin/content/inflections/backfill')
@RequirePermission('content.import')
export class InflectionsBackfillController {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(BackgroundJobsService) private readonly jobs: BackgroundJobsService,
    @Inject(JobQueueService) private readonly queue: JobQueueService,
  ) {}

  @Post()
  @HttpCode(202)
  @RateLimit('user.write')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  async start(@CurrentUser() user: RequestUser, @Req() request: RequestWithOperationId): Promise<{ job_id: string }> {
    // exclusiveKey: two backfills never run at the same time (the second waits until the first finishes).
    const jobId = await this.prisma.$transaction((tx) => this.jobs.create(tx, {
      queue: 'content-inflections', createdBy: user.userId, operationId: request.operationId, exclusiveKey: 'content-inflections',
    }));
    // Postgres is authoritative; the shared reconciler repairs an enqueue failure.
    await this.queue.enqueue('content-inflections', jobId);
    return { job_id: jobId };
  }

  @Get(':id')
  async status(@Param({ schema: jobParams }) params: z.infer<typeof jobParams>) {
    const job = await this.prisma.backgroundJob.findFirst({ where: { id: params.id, queue: 'content-inflections' } });
    if (!job) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    return { id: job.id, status: job.status, created_at: job.createdAt.toISOString(),
      started_at: job.startedAt?.toISOString() ?? null, finished_at: job.finishedAt?.toISOString() ?? null,
      error_summary: job.errorSummary };
  }
}
