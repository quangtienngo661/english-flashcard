import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { BackgroundJobsService } from '../jobs/background-jobs.service.js';
import { recountPublishJob } from './publish-counters.js';

@Injectable()
export class PublishJobsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(BackgroundJobsService) private readonly jobs: BackgroundJobsService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Stops a queued or running publish job. Senses it already published stay published (publishing is per sense and is
   * not rolled back); the job ends before its next sense and cannot be resumed. The counters are rewritten from the
   * items in the same transaction, because the worker that stops no longer reports. 409 `job-not-active` when the job
   * already ended (so a second cancel answers 409), 404 when no such publish job exists.
   */
  async cancel(jobId: string, actorId: string): Promise<void> {
    const counts = await this.prisma.$transaction(async (tx) => {
      // The cancel UPDATE waits for a sense being published right now (the worker holds FOR SHARE on the job row),
      // so the recount below sees every outcome that will ever be written.
      if (!(await this.jobs.cancel(tx, jobId, 'content-publish'))) return null;
      return recountPublishJob(tx, jobId);
    }, { timeout: 30_000, maxWait: 5_000 });
    if (!counts) {
      const known = await this.prisma.publishJob.findUnique({ where: { id: jobId }, select: { id: true } });
      throw known
        ? new ProblemDetailsException({ status: 409, title: 'Job not active', type: 'job-not-active' })
        : new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    }
    this.logger.info('publish_job_cancelled', { job_id: jobId, actor_id: actorId, counts });
  }
}
