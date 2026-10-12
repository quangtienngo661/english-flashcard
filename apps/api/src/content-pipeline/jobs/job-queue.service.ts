import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { JobQueueName } from './job-types.js';

const COMMAND_TIMEOUT_MS = 2_000;

@Injectable()
export class JobQueueService implements OnModuleDestroy {
  private connection: Redis | undefined;
  private readonly queues = new Map<JobQueueName, Queue>();
  private closing: Promise<void> | undefined;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  private redis(): Redis {
    if (!this.connection) {
      this.connection = new Redis(this.config.redisUrl, {
        maxRetriesPerRequest: null, lazyConnect: true, connectTimeout: COMMAND_TIMEOUT_MS,
        // null retries are required by BullMQ; a command deadline still bounds an API enqueue
        // during an outage. PING below also bounds readiness before creating a Queue.
        commandTimeout: COMMAND_TIMEOUT_MS,
      });
      this.connection.on('error', (error) => {
        this.logger.warn('job_redis_connection_failed', { error });
      });
    }
    return this.connection;
  }

  /** Shared by the producer and reconciler; BullMQ's prefix supplies the qualified queue name. */
  async getQueue(name: JobQueueName): Promise<Queue> {
    if (this.closing) throw new Error('Job queue service is closing');
    const connection = this.redis();
    await connection.ping();
    let queue = this.queues.get(name);
    if (!queue) {
      // BullMQ rejects ':' in the name. Its Redis identity is `${prefix}:${name}`.
      queue = new Queue(name, {
        connection, prefix: this.config.pipeline.queuePrefix, skipWaitingForReady: true,
      });
      queue.on('error', (error) => { this.logger.warn('job_queue_error', { queue: name, error }); });
      this.queues.set(name, queue);
    }
    try {
      await queue.waitUntilReady();
      return queue;
    } catch (error) {
      // A failed BullMQ initialization promise cannot recover. Retain the shared Redis client,
      // which reconnects, but let the next call construct a fresh Queue after Redis is available.
      if (this.queues.get(name) === queue) this.queues.delete(name);
      await queue.close();
      throw error;
    }
  }

  async enqueue(name: JobQueueName, jobId: string): Promise<boolean> {
    try {
      const queue = await this.getQueue(name);
      await queue.add(name, {}, {
        jobId, attempts: this.config.pipeline.jobAttempts,
        backoff: { type: 'exponential', delay: this.config.pipeline.jobBackoffMs, jitter: 0.5 },
        removeOnComplete: true, removeOnFail: true,
      });
      return true;
    } catch (error) {
      this.logger.warn('job_enqueue_failed', { queue: name, job_id: jobId, error });
      return false;
    }
  }

  onModuleDestroy(): Promise<void> {
    this.closing ??= this.close();
    return this.closing;
  }

  private async close(): Promise<void> {
    try {
      const results = await Promise.allSettled([...this.queues.values()].map((queue) => queue.close()));
      const failures = results.filter((result) => result.status === 'rejected').map((result) => result.reason);
      if (failures.length) throw new AggregateError(failures, 'Job queues failed to close');
    } finally {
      this.queues.clear();
      try {
        if (this.connection?.status === 'ready') await this.connection.quit();
      } finally { this.connection?.disconnect(); }
    }
  }
}
