import { Inject, Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { ReminderKind } from '../provider/notification-provider.js';
import type { ReminderLanguage } from '../provider/reminder-message.js';

export const REMINDER_QUEUE = 'reminders';
export const REMINDER_TICK_SCHEDULER = 'reminder-tick';
export const REMINDER_SEND_ATTEMPTS = 3;

export type ReminderSendData = { userId: string; localDate: string; kind: ReminderKind; language: ReminderLanguage };
export type ReminderSendAttempt = { lastAttempt: boolean };

type Handlers = {
  tick(): Promise<void>;
  send(data: ReminderSendData, attempt: ReminderSendAttempt): Promise<void>;
};

/** One job per learner per local day; no ':' in the id (BullMQ rejects it in custom ids). */
export function reminderJobId(userId: string, localDate: string): string {
  return `reminder-${userId}-${localDate}`;
}

/**
 * The `reminders` BullMQ queue (design 8.1, 8.3): a Job Scheduler adds a `tick` job every `reminders.tickSeconds`;
 * a tick adds one `send` job per learner per local day. Only the worker process (`pipeline.runWorkers`) creates the
 * scheduler and the Worker (unless `reminders.runScheduler` is off, as in tests); the API process touches nothing here.
 */
@Injectable()
export class ReminderQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly handlers: Partial<Handlers> = {};
  private queue: Queue | undefined;
  private worker: Worker | undefined;
  private readonly connections: Redis[] = [];
  private closing: Promise<void> | undefined;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /** Called by the tick and send services at module init, so this service does not depend on them. */
  setHandler<K extends keyof Handlers>(name: K, handler: Handlers[K]): void {
    this.handlers[name] = handler;
  }

  get running(): boolean {
    return this.worker !== undefined;
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.pipeline.runWorkers || !this.config.reminders.runScheduler) return;
    const prefix = this.config.pipeline.queuePrefix;
    this.queue = new Queue(REMINDER_QUEUE, { connection: this.connection('reminder_queue_connection_failed'), prefix });
    this.queue.on('error', (error) => { this.logger.warn('reminder_queue_error', { error }); });
    await this.queue.upsertJobScheduler(
      REMINDER_TICK_SCHEDULER, { every: this.config.reminders.tickSeconds * 1000 },
      { name: 'tick', opts: { removeOnComplete: true, removeOnFail: true } },
    );
    // A Worker holds a blocking read on its connection, so it gets its own (see JobRunnerService).
    this.worker = new Worker(REMINDER_QUEUE, (job) => this.process(job), {
      connection: this.connection('reminder_worker_connection_failed'), prefix, concurrency: 1,
    });
    this.worker.on('error', (error) => { this.logger.warn('reminder_worker_error', { error }); });
    await this.worker.waitUntilReady();
  }

  /** Adds the day's send job; a job with the same id already waiting makes this a no-op (B3E27). */
  async enqueueSend(data: ReminderSendData): Promise<void> {
    if (!this.queue) throw new Error('Reminder queue is not running in this process');
    await this.queue.add('send', data, {
      jobId: reminderJobId(data.userId, data.localDate), attempts: REMINDER_SEND_ATTEMPTS,
      backoff: { type: 'exponential', delay: this.config.pipeline.jobBackoffMs },
      removeOnComplete: true, removeOnFail: true,
    });
  }

  private async process(job: Job): Promise<void> {
    const { tick, send } = this.handlers;
    if (job.name === 'tick' && tick) return tick();
    if (job.name === 'send' && send) {
      // attemptsMade counts failed attempts before this one (same rule as JobRunnerService).
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      return send(job.data as ReminderSendData, { lastAttempt });
    }
    throw new Error(`No reminder handler for job ${job.name}`);
  }

  private connection(event: string): Redis {
    const connection = new Redis(this.config.redisUrl, { maxRetriesPerRequest: null });
    connection.on('error', (error) => { this.logger.warn(event, { error }); });
    this.connections.push(connection);
    return connection;
  }

  onModuleDestroy(): Promise<void> {
    this.closing ??= this.close();
    return this.closing;
  }

  private async close(): Promise<void> {
    const results = await Promise.allSettled([this.worker?.close(), this.queue?.close()]);
    this.worker = undefined;
    this.queue = undefined;
    const connectionResults = await Promise.allSettled(this.connections.map(async (connection) => {
      try {
        if (connection.status === 'ready') await connection.quit();
      } finally { connection.disconnect(); }
    }));
    this.connections.length = 0;
    const failures = [...results, ...connectionResults]
      .filter((result) => result.status === 'rejected').map((result) => result.reason);
    if (failures.length) throw new AggregateError(failures, 'Reminder queue failed to close');
  }
}
