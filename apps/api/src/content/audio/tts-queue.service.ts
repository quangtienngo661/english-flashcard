import { Inject, Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { DelayedError, type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';

export const TTS_QUEUE = 'content-tts';
/** Recordings made at the same time by one worker process (design §5.5; Google allows 1,000 requests a minute). */
export const TTS_CONCURRENCY = 4;

const COMMAND_TIMEOUT_MS = 2_000;
export type TtsJobHandler = (key: string, attempt: { attemptsMade: number; attempts: number }) => Promise<{ deferUntil: Date } | undefined>;
type Handlers = { speak: TtsJobHandler; sweep: () => Promise<void>; cleanup: () => Promise<void> };
/** Every five minutes the sweep queues lost recordings again; every week the cleanup removes what nothing uses (design §5.5). */
export const TTS_SWEEP_SCHEDULER = 'tts-sweep';
export const TTS_CLEANUP_SCHEDULER = 'tts-cleanup';
export const TTS_SWEEP_EVERY_MS = 5 * 60_000;
export const TTS_CLEANUP_EVERY_MS = 7 * 24 * 3_600_000;
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
  private scheduler: Queue | undefined;
  private workerConnection: Redis | undefined;
  private handlers: Partial<Handlers> = {};
  private closing: Promise<void> | undefined;

  constructor(
    @Inject(APP_CONFIG) protected readonly config: AppConfig,
    @Inject(AppLogger) protected readonly logger: AppLogger,
  ) {}

  get running(): boolean {
    return this.worker !== undefined;
  }

  /** Called by the worker and audio services at module init, so this service does not depend on them. */
  setHandler<K extends keyof Handlers>(name: K, handler: Handlers[K]): void {
    this.handlers[name] = handler;
  }

  /** What the worker does with a job, by name. A speak job that asks to wait (the daily cap) is moved to the delayed set. */
  async process(job: Pick<Job, 'name' | 'data' | 'attemptsMade' | 'opts' | 'moveToDelayed'>, token?: string): Promise<void> {
    const { speak, sweep, cleanup } = this.handlers;
    if (job.name === 'speak' && speak) {
      const result = await speak(job.data.key as string, { attemptsMade: job.attemptsMade, attempts: job.opts.attempts ?? 1 });
      if (result) {
        // The daily cap is used up: wait for midnight UTC without using a try.
        await job.moveToDelayed(result.deferUntil.getTime(), token);
        throw new DelayedError();
      }
      return;
    }
    if (job.name === 'sweep' && sweep) return sweep();
    if (job.name === 'cleanup' && cleanup) return cleanup();
    throw new Error(`No TTS handler for job ${job.name}`);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.pipeline.runWorkers) return;
    this.workerConnection = new Redis(this.config.redisUrl, { maxRetriesPerRequest: null });
    this.workerConnection.on('error', (error) => { this.logger.warn('tts_worker_connection_failed', { error }); });
    // The schedulers go on the worker's own queue object, so the API process never touches them.
    const scheduled = new Queue(TTS_QUEUE, { connection: this.workerConnection, prefix: this.config.pipeline.queuePrefix });
    scheduled.on('error', (error) => { this.logger.warn('tts_queue_error', { error }); });
    this.scheduler = scheduled;
    const options = { removeOnComplete: true, removeOnFail: true };
    await scheduled.upsertJobScheduler(TTS_SWEEP_SCHEDULER, { every: TTS_SWEEP_EVERY_MS }, { name: 'sweep', opts: options });
    await scheduled.upsertJobScheduler(TTS_CLEANUP_SCHEDULER, { every: TTS_CLEANUP_EVERY_MS }, { name: 'cleanup', opts: options });
    this.worker = new Worker(TTS_QUEUE, (job, token) => this.process(job, token), {
      connection: this.workerConnection, prefix: this.config.pipeline.queuePrefix, concurrency: TTS_CONCURRENCY,
    });
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
    const results = await Promise.allSettled([this.worker?.close(), this.scheduler?.close(), this.producer?.close()]);
    this.worker = undefined;
    this.scheduler = undefined;
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
