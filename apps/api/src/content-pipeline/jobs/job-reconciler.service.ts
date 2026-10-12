import { Inject, Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { JobQueueService } from './job-queue.service.js';
import type { JobQueueName } from './job-types.js';

const QUEUES: JobQueueName[] = ['content-import', 'content-publish'];
type ReconcileResult = { requeued: number; failed: number };

@Injectable()
export class JobReconcilerService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;
  private inFlight: Promise<ReconcileResult> | undefined;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(JobQueueService) private readonly queues: JobQueueService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async runOnce(): Promise<ReconcileResult> {
    // Coalesce overlapping timer/manual calls, so one process never reconciles the same scan twice.
    this.inFlight ??= this.reconcile().finally(() => { this.inFlight = undefined; });
    return this.inFlight;
  }

  private async reconcile(): Promise<ReconcileResult> {
    const counts = { requeued: 0, failed: 0 };
    // Recover all supported queues, even before their handlers have been installed (Task 18/23).
    const jobs = await this.prisma.backgroundJob.findMany({ where: {
      queue: { in: QUEUES },
      OR: [{ status: 'queued' }, { status: 'running', leaseExpiresAt: { lt: this.clock.now() } }],
    } });
    for (const job of jobs) {
      try {
        if (job.status === 'running') {
          const now = this.clock.now();
          const failed = job.attempts >= this.config.pipeline.jobAttempts;
          // Recheck expiry AND the attempt-limit branch in the write, so a heartbeat/takeover
          // after our read cannot be undone. Bump the epoch to immediately fence the old ctx.tx.
          const updated = await this.prisma.backgroundJob.updateMany({
            where: {
              id: job.id, status: 'running', leaseExpiresAt: { lt: now },
              attempts: failed ? { gte: this.config.pipeline.jobAttempts } : { lt: this.config.pipeline.jobAttempts },
            },
            data: {
              status: failed ? 'failed' : 'queued', leaseOwner: null, leaseExpiresAt: null,
              leaseEpoch: { increment: 1 },
              ...(failed ? { finishedAt: now, errorSummary: 'lease expired after max attempts' } : {}),
            },
          });
          if (!updated.count) continue;
          this.logger.warn('job_lease_expired', { job_id: job.id, queue: job.queue, attempts: job.attempts });
          if (failed) { counts.failed++; continue; }
        }
        const queue = job.queue as JobQueueName;
        const redisJob = await (await this.queues.getQueue(queue)).getJob(job.id);
        if (redisJob) {
          const state = await redisJob.getState();
          if (state !== 'completed' && state !== 'failed') continue;
          await redisJob.remove();
        }
        if (await this.queues.enqueue(queue, job.id)) counts.requeued++;
      } catch (error) {
        this.logger.warn('job_reconcile_failed', { job_id: job.id, queue: job.queue, error });
      }
    }
    return counts;
  }

  onApplicationBootstrap(): void {
    if (!this.config.pipeline.runWorkers) return;
    this.timer = setInterval(() => { void this.runScheduled(); }, this.config.pipeline.reconcileSeconds * 1000);
    void this.runScheduled();
  }

  private async runScheduled(): Promise<void> {
    try { await this.runOnce(); } catch (error) { this.logger.warn('job_reconciler_failed', { error }); }
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    this.timer = undefined;
    await this.inFlight?.catch(() => {});
  }
}
