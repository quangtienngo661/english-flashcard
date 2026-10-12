import { Module } from '@nestjs/common';
import { BackgroundJobsService } from './jobs/background-jobs.service.js';

@Module({
  providers: [BackgroundJobsService],
  exports: [BackgroundJobsService],
})
export class ContentPipelineModule {}
