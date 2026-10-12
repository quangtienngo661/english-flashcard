import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { APP_CONFIG, type AppConfig } from '../common/config/app-config.js';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { ContentModule } from '../content/content.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ImportBatchHandler } from './import/import-batch.handler.js';
import { ImportFileCleanupService } from './import/import-file-cleanup.service.js';
import { ImportRowProcessor } from './import/row-processor.js';
import { BackgroundJobsService } from './jobs/background-jobs.service.js';
import { JobHandlerRegistry } from './jobs/job-handler.registry.js';
import { JobQueueService } from './jobs/job-queue.service.js';
import { JobReconcilerService } from './jobs/job-reconciler.service.js';
import { JobRunnerService } from './jobs/job-runner.service.js';
import { MulterExceptionFilter } from './upload/multer-exception.filter.js';
import { UploadsController } from './upload/uploads.controller.js';
import { UploadsService } from './upload/uploads.service.js';

@Module({
  imports: [
    ContentModule,
    IdentityModule,
    MulterModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        // Multer defaults to memoryStorage() when neither storage nor dest is supplied.
        limits: { fileSize: config.pipeline.importMaxBytes, files: 1 },
      }),
    }),
  ],
  controllers: [UploadsController],
  providers: [
    BackgroundJobsService, JobQueueService, JobHandlerRegistry, JobRunnerService, JobReconcilerService,
    UploadsService, MulterExceptionFilter, IdempotencyInterceptor,
    ImportRowProcessor, ImportBatchHandler, ImportFileCleanupService,
  ],
  exports: [BackgroundJobsService, JobQueueService, JobHandlerRegistry, JobRunnerService, JobReconcilerService],
})
export class ContentPipelineModule {}
