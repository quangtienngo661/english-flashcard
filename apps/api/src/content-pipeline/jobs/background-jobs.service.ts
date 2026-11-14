import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { CANCELLED_SUMMARY, LeaseLostError, type JobContext, type JobQueueName } from './job-types.js';

const EXCLUSIVE_KEY_INDEX = 'background_jobs_exclusive_key_running_key';

function isExclusiveKeyViolation(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const meta = err.meta;
  const cause = (meta?.driverAdapterError as { cause?: {
    originalCode?: string; originalMessage?: string; kind?: string;
    constraint?: { index?: string; fields?: string[] };
  } } | undefined)?.cause;
  const unique = err.code === 'P2002' || (err.code === 'P2010'
    && (meta?.code === '23505' || cause?.originalCode === '23505' || cause?.kind === 'UniqueConstraintViolation'));
  if (!unique) return false;
  const target = meta?.target;
  return target === EXCLUSIVE_KEY_INDEX
    || (Array.isArray(target) && (target.includes(EXCLUSIVE_KEY_INDEX) || target.includes('exclusive_key')))
    || cause?.constraint?.index === EXCLUSIVE_KEY_INDEX
    || (cause?.constraint?.fields?.length === 1 && cause.constraint.fields[0] === 'exclusive_key')
    || (typeof meta?.message === 'string' && meta.message.includes(EXCLUSIVE_KEY_INDEX))
    || (typeof cause?.originalMessage === 'string' && cause.originalMessage.includes(EXCLUSIVE_KEY_INDEX));
}

/** The job row is locked before the callback can acquire any content entry lock. */
export function makeJobContext(prisma: PrismaClient, jobId: string, attempt: number, epoch: number): JobContext {
  return {
    jobId,
    attempt,
    epoch,
    tx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
      return prisma.$transaction(async (tx) => {
        // FOR SHARE holds off acquire/heartbeat UPDATEs until this transaction commits. A waiting
        // reader sees the committed epoch before allowing any writes through the callback.
        const [job] = await tx.$queryRaw<{ lease_epoch: number }[]>`
          SELECT lease_epoch FROM background_jobs WHERE id = ${jobId}::uuid FOR SHARE
        `;
        if (!job || job.lease_epoch !== epoch) throw new LeaseLostError(jobId);
        return fn(tx);
      }, { timeout: 30_000, maxWait: 5_000 });
    },
  };
}

@Injectable()
export class BackgroundJobsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async create(tx: Prisma.TransactionClient, input: {
    id?: string; queue: JobQueueName; createdBy: string; operationId: string; exclusiveKey?: string;
  }): Promise<string> {
    const job = await tx.backgroundJob.create({
      data: { ...input, status: 'queued', attempts: 0, leaseEpoch: 0, createdAt: this.clock.now() },
      select: { id: true },
    });
    return job.id;
  }

  async acquire(jobId: string, owner: string): Promise<{ epoch: number; attempts: number } | null> {
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + this.config.pipeline.leaseSeconds * 1000);
    try {
      const [job] = await this.prisma.$queryRaw<{ epoch: number; attempts: number }[]>`
        UPDATE background_jobs
        SET status = 'running', lease_owner = ${owner}, lease_epoch = lease_epoch + 1,
            attempts = attempts + 1, lease_expires_at = ${expiresAt}, started_at = COALESCE(started_at, ${now})
        WHERE id = ${jobId}::uuid
          AND (status = 'queued' OR (status = 'running' AND lease_expires_at < ${now}))
        RETURNING lease_epoch AS epoch, attempts
      `;
      return job ?? null;
    } catch (err) {
      // This standalone statement has already rolled back on a unique violation. Leave the queued
      // job intact for a later attempt; only the running-exclusive-key collision is an acquire miss.
      if (isExclusiveKeyViolation(err)) return null;
      throw err;
    }
  }

  async extend(jobId: string, epoch: number, owner: string): Promise<boolean> {
    const now = this.clock.now();
    const result = await this.prisma.backgroundJob.updateMany({
      where: { id: jobId, leaseEpoch: epoch, leaseOwner: owner, status: 'running' },
      data: { leaseExpiresAt: new Date(now.getTime() + this.config.pipeline.leaseSeconds * 1000) },
    });
    return result.count > 0;
  }

  async finish(jobId: string, epoch: number, status: 'succeeded' | 'partial' | 'failed', summary?: string): Promise<boolean> {
    const result = await this.prisma.backgroundJob.updateMany({
      where: { id: jobId, leaseEpoch: epoch },
      data: { status, finishedAt: this.clock.now(), errorSummary: summary ?? null },
    });
    return result.count > 0;
  }

  async release(jobId: string, epoch: number): Promise<boolean> {
    const result = await this.prisma.backgroundJob.updateMany({
      where: { id: jobId, leaseEpoch: epoch, status: 'running' },
      data: { status: 'queued', leaseOwner: null, leaseExpiresAt: null },
    });
    return result.count > 0;
  }

  /**
   * Stops a queued or running job for good, in the caller's transaction: `failed` + CANCELLED_SUMMARY (the status CHECK
   * has no `cancelled`). The epoch bump fences a live worker: its next `ctx.tx` throws LeaseLostError, and its
   * finish/release/extend match nothing. No acquire or reconcile pass takes a `failed` job up again.
   * False when the job is not queued/running in that queue (already ended, or no such job).
   */
  async cancel(tx: Prisma.TransactionClient, jobId: string, queue: JobQueueName): Promise<boolean> {
    const result = await tx.backgroundJob.updateMany({
      where: { id: jobId, queue, status: { in: ['queued', 'running'] } },
      data: {
        status: 'failed', errorSummary: CANCELLED_SUMMARY, finishedAt: this.clock.now(),
        leaseOwner: null, leaseExpiresAt: null, leaseEpoch: { increment: 1 },
      },
    });
    return result.count > 0;
  }

  get(jobId: string) {
    return this.prisma.backgroundJob.findUnique({ where: { id: jobId } });
  }
}
