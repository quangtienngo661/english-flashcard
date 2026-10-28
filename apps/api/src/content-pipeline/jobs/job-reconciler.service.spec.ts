import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppConfig } from '../../common/config/app-config.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { JobReconcilerService } from './job-reconciler.service.js';
import type { JobQueueService } from './job-queue.service.js';

const NOW = new Date('2026-10-28T08:00:00.000Z');
const EXPIRED = new Date('2026-10-28T07:59:00.000Z');
type Row = { id: string; queue: string; status: string; attempts: number; leaseExpiresAt: Date | null; leaseEpoch: number; errorSummary: string | null };
const row = (id: string, over: Partial<Row>): Row => ({
  id, queue: 'content-publish', status: 'queued', attempts: 0, leaseExpiresAt: null, leaseEpoch: 0, errorSummary: null, ...over,
});
const QUEUED = row('queued', {});
const EXPIRED_RUNNING = row('expired-running', { status: 'running', attempts: 1, leaseExpiresAt: EXPIRED, leaseEpoch: 1 });
const CANCELLED_QUEUED = row('cancelled-queued', { status: 'failed', errorSummary: 'cancelled', leaseEpoch: 1 });
const CANCELLED_RUNNING = row('cancelled-running', { status: 'failed', errorSummary: 'cancelled', attempts: 1, leaseEpoch: 2 });

/** Just the `where` operators the reconciler uses, applied to in-memory rows (the real filtering is Postgres's). */
function matches(record: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'OR') return (condition as Record<string, unknown>[]).some((sub) => matches(record, sub));
    const value = (record as Record<string, unknown>)[key] as Date | number | null;
    if (condition !== null && typeof condition === 'object' && !(condition instanceof Date)) {
      const c = condition as { in?: unknown[]; lt?: Date | number; gte?: number };
      if (c.in) return c.in.includes(value as never);
      if (c.lt !== undefined) return value !== null && value < c.lt;
      if (c.gte !== undefined) return value !== null && (value as number) >= c.gte;
    }
    return value === condition;
  });
}

function setup(rows: Row[], afterRead?: () => void) {
  const stored = new Map(rows.map((r) => [r.id, { ...r }]));
  const prisma = { backgroundJob: {
    findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      const found = [...stored.values()].filter((r) => matches(r, where)).map((r) => ({ ...r }));
      afterRead?.(); // something commits between the reconciler's read and its write
      return found;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> & { leaseEpoch?: unknown } }) => {
      const hits = [...stored.values()].filter((r) => matches(r, where));
      for (const hit of hits) Object.assign(hit, { ...data, leaseEpoch: hit.leaseEpoch + 1 });
      return { count: hits.length };
    }),
  } } as unknown as PrismaClient;
  const enqueue = vi.fn(async () => true);
  const queues = { getQueue: vi.fn(async () => ({ getJob: vi.fn(async () => undefined) })), enqueue } as unknown as JobQueueService;
  const config = { pipeline: { jobAttempts: 3, reconcileSeconds: 3600 } } as unknown as AppConfig;
  const reconciler = new JobReconcilerService(config, new FakeClock(NOW), prisma, queues,
    { warn: vi.fn(), info: vi.fn() } as unknown as AppLogger);
  return { reconciler, stored, enqueue, prisma };
}
const enqueued = (enqueue: ReturnType<typeof vi.fn>) => enqueue.mock.calls.map((call) => call[1]).sort();

describe('JobReconciler and a cancelled job', () => {
  it('control: a queued job and a running job with an expired lease are put back on the queue', async () => {
    const { reconciler, enqueue } = setup([QUEUED, EXPIRED_RUNNING]);

    await expect(reconciler.runOnce()).resolves.toEqual({ requeued: 2, failed: 0 });

    expect(enqueued(enqueue)).toEqual(['expired-running', 'queued']);
  });

  it('a cancelled job (queued or running when it was stopped) is neither read, written nor enqueued', async () => {
    const { reconciler, enqueue, prisma, stored } = setup([QUEUED, CANCELLED_QUEUED, CANCELLED_RUNNING]);

    await expect(reconciler.runOnce()).resolves.toEqual({ requeued: 1, failed: 0 });

    expect(enqueued(enqueue)).toEqual(['queued']);
    expect(prisma.backgroundJob.updateMany).not.toHaveBeenCalled();
    expect(stored.get('cancelled-queued')).toMatchObject({ status: 'failed', errorSummary: 'cancelled', leaseEpoch: 1 });
    expect(stored.get('cancelled-running')).toMatchObject({ status: 'failed', errorSummary: 'cancelled', leaseEpoch: 2 });
  });

  it('a cancel that commits after the reconciler read the job as running with an expired lease still wins: the write is guarded by status', async () => {
    const { reconciler, enqueue, stored } = setup([EXPIRED_RUNNING], () => {
      Object.assign(stored.get('expired-running')!, { status: 'failed', errorSummary: 'cancelled', leaseExpiresAt: null, leaseEpoch: 2 });
    });

    await expect(reconciler.runOnce()).resolves.toEqual({ requeued: 0, failed: 0 });

    expect(enqueue).not.toHaveBeenCalled();
    expect(stored.get('expired-running')).toMatchObject({ status: 'failed', errorSummary: 'cancelled', leaseEpoch: 2 });
  });
});
