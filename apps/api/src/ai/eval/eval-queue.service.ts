import { Inject, Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { EvalJob } from './eval-job.js';

export const EVAL_QUEUE = 'ai-eval';

const COMMAND_TIMEOUT_MS = 2_000;

/**
 * The dedicated `ai-eval` BullMQ queue (design §10, plan choice 7). The API adds jobs through a bounded Redis client (as
 * `JobQueueService`): Redis down → `enqueue` returns false and the run stays `queued` for the hourly job (B6E91). Only the worker
 * process (`pipeline.runWorkers`) runs a Worker, on its own connection, one job at a time (as `ReminderQueueService`). Every Queue,
 * Worker and connection logs its `error` events: an unhandled one would stop the process (plan review #18).
 */
@Injectable()
export class EvalQueue implements OnApplicationBootstrap, OnModuleDestroy {
  private producerConnection: Redis | undefined;
  private producer: Queue | undefined;
  private worker: Worker | undefined;
  private workerConnection: Redis | undefined;
  private closing: Promise<void> | undefined;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(AppLogger) private readonly logger: AppLogger,
    @Inject(EvalJob) private readonly job: EvalJob,
  ) {}

  get running(): boolean {
    return this.worker !== undefined;
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.pipeline.runWorkers) return;
    this.workerConnection = new Redis(this.config.redisUrl, { maxRetriesPerRequest: null });
    this.workerConnection.on('error', (error) => { this.logger.warn('ai_eval_worker_connection_failed', { error }); });
    this.worker = new Worker(EVAL_QUEUE, (job: Job<{ runId: string }>) => this.job.run(job.data.runId), {
      connection: this.workerConnection, prefix: this.config.pipeline.queuePrefix, concurrency: 1,
    });
    this.worker.on('error', (error) => { this.logger.warn('ai_eval_worker_error', { error }); });
    await this.worker.waitUntilReady();
  }

  /** Job id = run id, so a run is never queued twice; false (and a warn) on any error. */
  async enqueue(runId: string): Promise<boolean> {
    try {
      const queue = await this.queue();
      await queue.add('run', { runId }, { jobId: runId, attempts: 1, removeOnComplete: true, removeOnFail: true });
      return true;
    } catch (error) {
      this.logger.warn('ai_eval_enqueue_failed', { run_id: runId, error });
      return false;
    }
  }

  private async queue(): Promise<Queue> {
    if (this.closing) throw new Error('Eval queue is closing');
    if (!this.producerConnection) {
      this.producerConnection = new Redis(this.config.redisUrl, {
        maxRetriesPerRequest: null, lazyConnect: true, connectTimeout: COMMAND_TIMEOUT_MS, commandTimeout: COMMAND_TIMEOUT_MS,
      });
      this.producerConnection.on('error', (error) => { this.logger.warn('ai_eval_queue_connection_failed', { error }); });
    }
    await this.producerConnection.ping();
    if (!this.producer) {
      this.producer = new Queue(EVAL_QUEUE, {
        connection: this.producerConnection, prefix: this.config.pipeline.queuePrefix, skipWaitingForReady: true,
      });
      this.producer.on('error', (error) => { this.logger.warn('ai_eval_queue_error', { error }); });
    }
    return this.producer;
  }

  onModuleDestroy(): Promise<void> {
    this.closing ??= this.close();
    return this.closing;
  }

  private async close(): Promise<void> {
    const results = await Promise.allSettled([this.worker?.close(), this.producer?.close()]);
    this.worker = undefined;
    this.producer = undefined;
    const connections = [this.producerConnection, this.workerConnection].filter((c): c is Redis => c !== undefined);
    const closed = await Promise.allSettled(connections.map(async (connection) => {
      try {
        if (connection.status === 'ready') await connection.quit();
      } finally { connection.disconnect(); }
    }));
    const failures = [...results, ...closed].filter((result) => result.status === 'rejected').map((result) => result.reason);
    if (failures.length) throw new AggregateError(failures, 'Eval queue failed to close');
  }
}
