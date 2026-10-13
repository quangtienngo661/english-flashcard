import { Inject, Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { type Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { BackgroundJobsService, makeJobContext } from './background-jobs.service.js';
import { JobHandlerRegistry } from './job-handler.registry.js';
import { LeaseLostError, type JobHandler } from './job-types.js';

function errorSummary(error: unknown): string {
  // Only a bounded first line of the name/message, never a stack or the thrown payload.
  if (!(error instanceof Error)) return 'UnknownError';
  return `${error.name}: ${error.message.split(/[\r\n]/, 1)[0]}`.slice(0, 240);
}

@Injectable()
export class JobRunnerService implements OnApplicationBootstrap, OnModuleDestroy {
  // One UUID per service/process instance, shared by all its workers and heartbeats.
  private readonly owner = randomUUID();
  private readonly workers: Worker[] = [];
  private readonly connections: Redis[] = [];
  private closing: Promise<void> | undefined;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(BackgroundJobsService) private readonly backgroundJobs: BackgroundJobsService,
    @Inject(JobHandlerRegistry) private readonly registry: JobHandlerRegistry,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.pipeline.runWorkers) return;
    const queues = this.registry.queues();
    if (!queues.length) return;
    for (const queue of queues) {
      const handler = this.registry.get(queue)!;
      // Each Worker needs its own connection: BullMQ Workers hold a blocking read on their
      // connection while waiting for jobs, so sharing one connection across multiple Workers
      // starves every Worker after the first (only one blocking reader can ever be served).
      const connection = new Redis(this.config.redisUrl, { maxRetriesPerRequest: null });
      connection.on('error', (error) => { this.logger.warn('job_worker_connection_failed', { queue, error }); });
      this.connections.push(connection);
      const worker = new Worker(queue, (job) => this.process(job, handler), {
        connection, prefix: this.config.pipeline.queuePrefix, concurrency: 1,
      });
      worker.on('error', (error) => { this.logger.warn('job_worker_error', { queue, error }); });
      this.workers.push(worker);
      await worker.waitUntilReady();
    }
  }

  private async process(job: Job, handler: JobHandler): Promise<void> {
    const jobId = job.id!;
    const lease = await this.backgroundJobs.acquire(jobId, this.owner);
    if (!lease) return;
    let heartbeatInFlight: Promise<void> | undefined;
    const heartbeat = setInterval(() => {
      if (heartbeatInFlight) return;
      heartbeatInFlight = this.backgroundJobs.extend(jobId, lease.epoch, this.owner)
        .then(() => {})
        .catch((error: unknown) => { this.logger.warn('job_heartbeat_failed', { job_id: jobId, error }); })
        .finally(() => { heartbeatInFlight = undefined; });
    }, this.config.pipeline.heartbeatSeconds * 1000);
    try {
      const ctx = makeJobContext(this.prisma, jobId, lease.attempts, lease.epoch);
      let result: 'succeeded' | 'partial';
      try {
        result = await handler.run(ctx);
      } catch (error) {
        if (error instanceof LeaseLostError) return;
        try {
          // BullMQ job.d.ts: attemptsMade counts failed attempts, opts.attempts is the total.
          // job.js shouldRetryJob() checks this same +1 BEFORE moveToFailed increments it.
          if (job.attemptsMade + 1 < (job.opts.attempts ?? 1)) {
            await this.backgroundJobs.release(jobId, lease.epoch);
          } else {
            await this.backgroundJobs.finish(jobId, lease.epoch, 'failed', errorSummary(error));
          }
        } catch (stateError) {
          this.logger.warn('job_state_update_failed', { job_id: jobId, error: stateError });
        }
        throw error;
      }
      await this.backgroundJobs.finish(jobId, lease.epoch, result);
    } finally {
      clearInterval(heartbeat);
      await heartbeatInFlight;
    }
  }

  onModuleDestroy(): Promise<void> {
    this.closing ??= this.close();
    return this.closing;
  }

  private async close(): Promise<void> {
    const workerResults = await Promise.allSettled(this.workers.map((worker) => worker.close()));
    this.workers.length = 0;
    const connectionResults = await Promise.allSettled(this.connections.map(async (connection) => {
      try {
        if (connection.status === 'ready') await connection.quit();
      } finally { connection.disconnect(); }
    }));
    this.connections.length = 0;
    const failures = [...workerResults, ...connectionResults]
      .filter((result) => result.status === 'rejected').map((result) => result.reason);
    if (failures.length) throw new AggregateError(failures, 'Job workers or connections failed to close');
  }
}
