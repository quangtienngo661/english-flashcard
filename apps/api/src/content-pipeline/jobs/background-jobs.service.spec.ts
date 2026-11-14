import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppConfig } from '../../common/config/app-config.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { BackgroundJobsService } from './background-jobs.service.js';

const JOB = '00000000-0000-4000-8000-0000000000c1';
const NOW = new Date('2026-10-28T08:00:00.000Z');

function setup(count: number) {
  const updateMany = vi.fn(async () => ({ count }));
  const tx = { backgroundJob: { updateMany } } as unknown as Prisma.TransactionClient;
  const service = new BackgroundJobsService({} as PrismaClient, new FakeClock(NOW), {} as AppConfig);
  return { service, tx, updateMany };
}

describe('BackgroundJobsService.cancel', () => {
  it('stops a queued or running job of that queue in one conditional UPDATE: failed, "cancelled", lease cleared, epoch bumped', async () => {
    const { service, tx, updateMany } = setup(1);

    await expect(service.cancel(tx, JOB, 'content-publish')).resolves.toBe(true);

    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: JOB, queue: 'content-publish', status: { in: ['queued', 'running'] } },
      data: {
        status: 'failed', errorSummary: 'cancelled', finishedAt: NOW,
        leaseOwner: null, leaseExpiresAt: null, leaseEpoch: { increment: 1 },
      },
    });
  });

  it('a job that already ended, or does not exist in that queue, matches nothing: false', async () => {
    const { service, tx } = setup(0);

    await expect(service.cancel(tx, JOB, 'content-publish')).resolves.toBe(false);
  });
});
