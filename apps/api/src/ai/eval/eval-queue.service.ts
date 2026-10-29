import { Inject, Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { JudgeJob } from '../judge/judge-job.js';
import { JudgePassesRepository } from '../judge/judge-passes.repository.js';
import { EvalJob } from './eval-job.js';

export const EVAL_QUEUE = 'ai-eval';

const COMMAND_TIMEOUT_MS = 2_000;

/**
 * The dedicated `ai-eval` BullMQ queue (design §10, plan choice 7). The API adds jobs through a bounded Redis client (as
 * `JobQueueService`): Redis down → `enqueue` returns false and the run stays `queued` for the hourly job (B6E91). Only the worker
 * process (`pipeline.runWorkers`) runs a Worker, on its own connection, one job at a time (as `ReminderQueueService`). Every Queue,
 * Worker and connection logs its `error` events: an unhandled one would stop the process (plan review #18).
 * Two kinds of job share the queue (nhóm B M3): `run` (an eval run) and `judge` (a judge pass); the queue depends on the judge job and the
 * passes repository, never on the passes service, which depends on the queue.
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
    @Inject(JudgeJob) private readonly judgeJob: JudgeJob,
    @Inject(JudgePassesRepository) private readonly passes: JudgePassesRepository,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  get running(): boolean {
    return this.worker !== undefined;
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.pipeline.runWorkers) return;
    this.workerConnection = new Redis(this.config.redisUrl, { maxRetriesPerRequest: null });
    this.workerConnection.on('error', (error) => { this.logger.warn('ai_eval_worker_connection_failed', { error }); });
    this.worker = new Worker(EVAL_QUEUE, (job: Job<{ runId?: string; passId?: string }>) => this.process(job), {
      connection: this.workerConnection, prefix: this.config.pipeline.queuePrefix, concurrency: 1,
    });
    this.worker.on('error', (error) => { this.logger.warn('ai_eval_worker_error', { error }); });
    await this.worker.waitUntilReady();
  }

  /**
   * What the worker does with a job. A `judge` job judges its pass. A `run` job runs the run, then releases the judge passes that waited for it
   * (they take their snapshot now, or fail if the run failed) and queues each as a `judge` job. A failed release never fails the run job: the
   * passes stay queued and the hourly job takes them again (B41).
   */
  async process(job: Job<{ runId?: string; passId?: string }>): Promise<void> {
    if (job.name === 'judge') {
      await this.judgeJob.run(job.data.passId as string);
      return;
    }
    const runId = job.data.runId as string;
    await this.job.run(runId);
    try {
      for (const passId of await this.passes.release(runId, this.clock.now())) await this.enqueueJudgePass(passId);
    } catch (error) {
      this.logger.warn('ai_judge_release_failed', { run_id: runId, error });
    }
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

  /**
   * A judge pass is a job named `judge` on the same queue (nhóm B M3, B19); its job id is the pass id, so a pass is never queued twice. False (and a
   * warn) on any error: the pass stays `queued` and the hourly job asks again (B41).
   */
  async enqueueJudgePass(passId: string): Promise<boolean> {
    try {
      const queue = await this.queue();
      await queue.add('judge', { passId }, { jobId: `judge-${passId}`, attempts: 1, removeOnComplete: true, removeOnFail: true });
      return true;
    } catch (error) {
      this.logger.warn('ai_judge_enqueue_failed', { pass_id: passId, error });
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
