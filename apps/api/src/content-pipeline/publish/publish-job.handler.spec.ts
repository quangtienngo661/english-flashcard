import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../common/config/app-config.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import type { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { BackgroundJobsService } from '../jobs/background-jobs.service.js';
import type { JobHandlerRegistry } from '../jobs/job-handler.registry.js';
import { LeaseLostError, type JobContext } from '../jobs/job-types.js';
import { PublishJobHandler } from './publish-job.handler.js';

const JOB = '00000000-0000-4000-8000-0000000000c1';
const ACTOR = '00000000-0000-4000-8000-0000000000a1';

describe('PublishJobHandler', () => {
  it('FE21: the job publishes each item with skipUnpublished, so a sense staff hid stays hidden', async () => {
    const item = { jobId: JOB, senseId: 's1', revisionNo: 3, outcome: 'pending' };
    const tx = {
      publishJobItem: {
        findUniqueOrThrow: vi.fn(async () => item),
        update: vi.fn(async () => ({})),
        groupBy: vi.fn(async () => [{ outcome: 'published', _count: { _all: 1 } }]),
      },
      backgroundJob: { findUniqueOrThrow: vi.fn(async () => ({ createdBy: ACTOR })) },
      publishJob: { update: vi.fn(async () => ({})) },
    };
    const prisma = {
      publishJob: { findUniqueOrThrow: vi.fn(async () => ({ id: JOB })) },
      publishJobItem: { findMany: vi.fn(async () => [{ senseId: 's1' }]) },
    } as unknown as PrismaClient;
    const content = { publishItem: vi.fn(async () => ({ outcome: 'published' })) } as unknown as ContentService;
    const jobs = { get: vi.fn(async () => ({ operationId: '00000000-0000-4000-8000-0000000000d1' })) } as unknown as BackgroundJobsService;
    const config = { pipeline: { rowRetries: 0, rowRetryBaseMs: 1 } } as unknown as AppConfig;
    const logger = { info: vi.fn(), warn: vi.fn() } as unknown as AppLogger;
    const handler = new PublishJobHandler(prisma, config, content, jobs, {} as JobHandlerRegistry, logger);
    const ctx: JobContext = { jobId: JOB, attempt: 1, epoch: 1, tx: (fn) => fn(tx as never) };

    await expect(handler.run(ctx)).resolves.toBe('succeeded');
    expect(content.publishItem).toHaveBeenCalledWith({ senseId: 's1', revision: 3 }, ACTOR, { skipUnpublished: true });
  });
});

describe('PublishJobHandler when staff cancel the job', () => {
  // Cancelling bumps the job's lease epoch, so the next ctx.tx (its FOR SHARE epoch check) throws LeaseLostError.
  function setup(txCallThatFindsTheEpochBumped: number) {
    const tx = {
      publishJobItem: {
        findUniqueOrThrow: vi.fn(async ({ where }: { where: { jobId_senseId: { senseId: string } } }) => ({
          jobId: JOB, senseId: where.jobId_senseId.senseId, revisionNo: 1, outcome: 'pending',
        })),
        update: vi.fn(async () => ({})),
        groupBy: vi.fn(async () => []),
      },
      backgroundJob: { findUniqueOrThrow: vi.fn(async () => ({ createdBy: ACTOR })) },
      publishJob: { update: vi.fn(async () => ({})) },
    };
    const prisma = {
      publishJob: { findUniqueOrThrow: vi.fn(async () => ({ id: JOB })) },
      publishJobItem: { findMany: vi.fn(async () => [{ senseId: 's1' }, { senseId: 's2' }, { senseId: 's3' }]) },
    } as unknown as PrismaClient;
    const content = { publishItem: vi.fn(async () => ({ outcome: 'published' })) } as unknown as ContentService;
    const jobs = { get: vi.fn(async () => ({ operationId: '00000000-0000-4000-8000-0000000000d1' })) } as unknown as BackgroundJobsService;
    const config = { pipeline: { rowRetries: 3, rowRetryBaseMs: 1 } } as unknown as AppConfig;
    const logger = { info: vi.fn(), warn: vi.fn() } as unknown as AppLogger;
    const handler = new PublishJobHandler(prisma, config, content, jobs, {} as JobHandlerRegistry, logger);
    let calls = 0;
    const ctx: JobContext = { jobId: JOB, attempt: 1, epoch: 1, tx: async (fn) => {
      if (++calls >= txCallThatFindsTheEpochBumped) throw new LeaseLostError(JOB);
      return fn(tx as never);
    } };
    return { handler, ctx, tx, content, logger, txCalls: () => calls };
  }

  it('stops before the next sense: the senses already published stay, the rest are never touched, no report and no log line', async () => {
    const { handler, ctx, tx, content, logger, txCalls } = setup(2); // the 2nd sense's transaction sees the new epoch

    await expect(handler.run(ctx)).rejects.toBeInstanceOf(LeaseLostError);

    expect(content.publishItem).toHaveBeenCalledTimes(1);
    expect(content.publishItem).toHaveBeenCalledWith({ senseId: 's1', revision: 1 }, ACTOR, { skipUnpublished: true });
    expect(tx.publishJobItem.update).toHaveBeenCalledTimes(1);
    // LeaseLostError is not retried (not a transient database error) and does not run the failure path.
    expect(txCalls()).toBe(2);
    expect(tx.publishJob.update).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('cancelled before the first sense: nothing is published', async () => {
    const { handler, ctx, content, logger } = setup(1);

    await expect(handler.run(ctx)).rejects.toBeInstanceOf(LeaseLostError);

    expect(content.publishItem).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('cancelled after the last sense, before the final report: stops quietly; the cancel already rewrote the counters', async () => {
    const { handler, ctx, content, tx, logger } = setup(4); // 3 senses, then saveReport is the 4th transaction

    await expect(handler.run(ctx)).rejects.toBeInstanceOf(LeaseLostError);

    expect(content.publishItem).toHaveBeenCalledTimes(3);
    expect(tx.publishJob.update).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});
