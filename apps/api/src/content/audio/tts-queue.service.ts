import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';

export const TTS_QUEUE = 'content-tts';

const COMMAND_TIMEOUT_MS = 2_000;
/** Three tries, the wait before each doubling from five seconds (design §5.5). */
export const TTS_JOB_OPTIONS = {
  attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: true, removeOnFail: true,
} as const;

/**
 * The dedicated `content-tts` BullMQ queue (round C, design §5.5): one job per recording, job id = its key, so a recording is never
 * queued twice. The API adds jobs through a bounded Redis client (as `EvalQueue`): Redis down → `enqueue` returns false, the row stays
 * `pending` and the sweep asks again.
 */
@Injectable()
export class TtsQueueService implements OnModuleDestroy {
  private producerConnection: Redis | undefined;
  private producer: Queue | undefined;
  private closing: Promise<void> | undefined;

  constructor(
    @Inject(APP_CONFIG) protected readonly config: AppConfig,
    @Inject(AppLogger) protected readonly logger: AppLogger,
  ) {}

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
    const results = await Promise.allSettled([this.producer?.close()]);
    this.producer = undefined;
    const connection = this.producerConnection;
    this.producerConnection = undefined;
    const closed = await Promise.allSettled([(async () => {
      try {
        if (connection?.status === 'ready') await connection.quit();
      } finally { connection?.disconnect(); }
    })()]);
    const failures = [...results, ...closed].filter((result) => result.status === 'rejected').map((result) => result.reason);
    if (failures.length) throw new AggregateError(failures, 'TTS queue failed to close');
  }
}
