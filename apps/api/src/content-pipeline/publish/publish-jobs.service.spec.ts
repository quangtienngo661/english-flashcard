import { describe, expect, it, vi } from 'vitest';
import type { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { BackgroundJobsService } from '../jobs/background-jobs.service.js';
import { PublishJobsService } from './publish-jobs.service.js';

const JOB = '00000000-0000-4000-8000-0000000000c1';
const ACTOR = '00000000-0000-4000-8000-0000000000a1';

function setup(options: { cancelled: boolean; known?: boolean; outcomes?: { outcome: string; _count: { _all: number } }[] }) {
  const tx = {
    publishJobItem: { groupBy: vi.fn(async () => options.outcomes ?? []) },
    publishJob: { update: vi.fn(async () => ({})) },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    publishJob: { findUnique: vi.fn(async () => (options.known === false ? null : { id: JOB })) },
  } as unknown as PrismaClient;
  const jobs = { cancel: vi.fn(async () => options.cancelled) } as unknown as BackgroundJobsService;
  const logger = { info: vi.fn(), warn: vi.fn() } as unknown as AppLogger;
  return { service: new PublishJobsService(prisma, jobs, logger), prisma, jobs, tx, logger };
}

const problem = async (promise: Promise<unknown>) => {
  const error = await promise.then(() => undefined, (e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  return error as ProblemDetailsException;
};

describe('PublishJobsService.cancel', () => {
  it('stops the job and rewrites its counters from the items in the same transaction, so the report shows how far it got', async () => {
    const { service, prisma, jobs, tx, logger } = setup({ cancelled: true, outcomes: [
      { outcome: 'published', _count: { _all: 3 } }, { outcome: 'already_published', _count: { _all: 1 } },
      { outcome: 'refused', _count: { _all: 1 } }, { outcome: 'pending', _count: { _all: 5 } },
    ] });

    await service.cancel(JOB, ACTOR);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(jobs.cancel).toHaveBeenCalledWith(tx, JOB, 'content-publish');
    expect(tx.publishJobItem.groupBy).toHaveBeenCalledWith({ by: ['outcome'], where: { jobId: JOB }, _count: { _all: true } });
    expect(tx.publishJob.update).toHaveBeenCalledWith({
      where: { id: JOB },
      data: { counters: { processed: 5, pending: 5, published: 3, already_published: 1, refused: 1 } },
    });
    expect(logger.info).toHaveBeenCalledWith('publish_job_cancelled', expect.objectContaining({ job_id: JOB, actor_id: ACTOR }));
  });

  it('a job that already ended (finished, failed or cancelled before) → 409 job-not-active, and its counters stay as they were', async () => {
    const { service, tx, logger } = setup({ cancelled: false });

    const error = await problem(service.cancel(JOB, ACTOR));

    expect(error.getStatus()).toBe(409);
    expect(error.problemType).toBe('job-not-active');
    expect(tx.publishJobItem.groupBy).not.toHaveBeenCalled();
    expect(tx.publishJob.update).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('cancelling twice: the second call finds nothing active → 409 job-not-active', async () => {
    const { service, jobs } = setup({ cancelled: true });
    await service.cancel(JOB, ACTOR);
    vi.mocked(jobs.cancel).mockResolvedValue(false);

    const error = await problem(service.cancel(JOB, ACTOR));

    expect(error.getStatus()).toBe(409);
    expect(error.problemType).toBe('job-not-active');
  });

  it('an id that is no publish job (unknown, or another queue\'s job) → 404 not-found', async () => {
    const { service, prisma } = setup({ cancelled: false, known: false });

    const error = await problem(service.cancel(JOB, ACTOR));

    expect(error.getStatus()).toBe(404);
    expect(error.problemType).toBe('not-found');
    expect(prisma.publishJob.findUnique).toHaveBeenCalledWith({ where: { id: JOB }, select: { id: true } });
  });

  it('a failure while rewriting the counters leaves the transaction (which rolls the cancel back) and nothing is logged', async () => {
    const { service, tx, logger } = setup({ cancelled: true });
    tx.publishJob.update.mockRejectedValue(new Error('db down'));

    await expect(service.cancel(JOB, ACTOR)).rejects.toThrow('db down');
    expect(logger.info).not.toHaveBeenCalled();
  });
});
