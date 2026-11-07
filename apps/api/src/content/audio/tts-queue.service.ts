import { Inject, Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { DelayedError, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';

export const TTS_QUEUE = 'content-tts';
/** Recordings made at the same time by one worker process (design §5.5; Google allows 1,000 requests a minute). */
export const TTS_CONCURRENCY = 4;

const COMMAND_TIMEOUT_MS = 2_000;
export type TtsJobHandler = (key: string, attempt: { attemptsMade: number; attempts: number }) => Promise<{ deferUntil: Date } | undefined>;
/** Three tries, the wait before each doubling from five seconds (design §5.5). */
export const TTS_JOB_OPTIONS = {
  attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: true, removeOnFail: true,
} as const;

/**
 * The dedicated `content-tts` BullMQ queue (round C, design §5.5): one job per recording, job id = its key, so a recording is never
 * queued twice. The API adds jobs through a bounded Redis client (as `EvalQueue`): Redis down → `enqueue` returns false, the row stays
 * `pending` and the sweep asks again. Only the worker process (`pipeline.runWorkers`) runs a Worker, on its own connection; the work itself
 * is `TtsWorkerService.run`, handed over with `setHandler` (as `ReminderQueueService`).
 */
@Injectable()
export class TtsQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private producerConnection: Redis | undefined;
  private producer: Queue | undefined;
  private worker: Worker | undefined;
  private workerConnection: Redis | undefined;
  private handler: TtsJobHandler | undefined;
  private closing: Promise<void> | undefined;

  constructor(
    @Inject(APP_CONFIG) protected readonly config: AppConfig,
    @Inject(AppLogger) protected readonly logger: AppLogger,
  ) {}

  get running(): boolean {
    return this.worker !== undefined;
  }

  setHandler(handler: TtsJobHandler): void {
    this.handler = handler;
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.pipeline.runWorkers) return;
    this.workerConnection = new Redis(this.config.redisUrl, { maxRetriesPerRequest: null });
    this.workerConnection.on('error', (error) => { this.logger.warn('tts_worker_connection_failed', { error }); });
    this.worker = new Worker(TTS_QUEUE, async (job, token) => {
      const result = await this.handler?.(job.data.key as string, { attemptsMade: job.attemptsMade, attempts: job.opts.attempts ?? 1 });
      if (result) {
        // The daily cap is used up: wait for midnight UTC without using a try.
        await job.moveToDelayed(result.deferUntil.getTime(), token);
        throw new DelayedError();
      }
    }, { connection: this.workerConnection, prefix: this.config.pipeline.queuePrefix, concurrency: TTS_CONCURRENCY });
    this.worker.on('error', (error) => { this.logger.warn('tts_worker_error', { error }); });
    await this.worker.waitUntilReady();
  }

  /** Adds a job per key; false (and a warn) on any error. `delayMs` waits that long before the job may run. */
  async enqueue(keys: string[], opts: { delayMs?: number } = {}): Promise<boolean> {
    if (keys.length === 0) return true;
    try {
      const queue = await this.queue();
      await queue.addBulk(keys.map((key) => ({
        name: 'speak', data: { key }, opts: { ...TTS_JOB_OPTIONS, jobId: key, ...(opts.delayMs ? { delay: opts.delayMs } : {}) },
      })));
      return true;
    } catch (error) {
      this.logger.warn('tts_enqueue_failed', { count: keys.length, error });
      return false;
    }
  }

  protected async queue(): Promise<Queue> {
    if (this.closing) throw new Error('TTS queue is closing');
    if (!this.producerConnection) {
      this.producerConnection = new Redis(this.config.redisUrl, {
        maxRetriesPerRequest: null, lazyConnect: true, connectTimeout: COMMAND_TIMEOUT_MS, commandTimeout: COMMAND_TIMEOUT_MS,
      });
      this.producerConnection.on('error', (error) => { this.logger.warn('tts_queue_connection_failed', { error }); });
    }
    await this.producerConnection.ping();
    if (!this.producer) {
      this.producer = new Queue(TTS_QUEUE, {
        connection: this.producerConnection, prefix: this.config.pipeline.queuePrefix, skipWaitingForReady: true,
      });
      this.producer.on('error', (error) => { this.logger.warn('tts_queue_error', { error }); });
    }
    return this.producer;
  }

  onModuleDestroy(): Promise<void> {
    this.closing ??= this.close();
    return this.closing;
  }

  protected async close(): Promise<void> {
    const results = await Promise.allSettled([this.worker?.close(), this.producer?.close()]);
    this.worker = undefined;
    this.producer = undefined;
    const connections = [this.producerConnection, this.workerConnection].filter((c): c is Redis => c !== undefined);
    this.producerConnection = undefined;
    this.workerConnection = undefined;
    const closed = await Promise.allSettled(connections.map(async (connection) => {
      try {
        if (connection.status === 'ready') await connection.quit();
      } finally { connection.disconnect(); }
    }));
    const failures = [...results, ...closed].filter((result) => result.status === 'rejected').map((result) => result.reason);
    if (failures.length) throw new AggregateError(failures, 'TTS queue failed to close');
  }
}
