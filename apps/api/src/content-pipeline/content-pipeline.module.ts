import { Module } from '@nestjs/common';
import { BackgroundJobsService } from './jobs/background-jobs.service.js';
import { JobHandlerRegistry } from './jobs/job-handler.registry.js';
import { JobQueueService } from './jobs/job-queue.service.js';
import { JobReconcilerService } from './jobs/job-reconciler.service.js';
import { JobRunnerService } from './jobs/job-runner.service.js';

@Module({
  providers: [BackgroundJobsService, JobQueueService, JobHandlerRegistry, JobRunnerService, JobReconcilerService],
  exports: [BackgroundJobsService, JobQueueService, JobHandlerRegistry, JobRunnerService, JobReconcilerService],
})
export class ContentPipelineModule {}
