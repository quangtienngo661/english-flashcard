import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

const day = 86_400_000;

@Injectable()
export class ImportFileCleanupService implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('import-file-cleanup', (now) => this.runOnce(now));
  }

  async runOnce(now: Date = this.clock.now()): Promise<{ files: number }> {
    // Retention starts at upload, including queued batches; finishing later does not extend it.
    // Deleting a child file cannot cascade toward its batch, counters, records or reports.
    const cutoff = new Date(now.getTime() - this.config.pipeline.fileRetentionDays * day);
    const result = await this.prisma.importBatchFile.deleteMany({ where: { batch: { job: { createdAt: { lt: cutoff } } } } });
    return { files: result.count };
  }
}
