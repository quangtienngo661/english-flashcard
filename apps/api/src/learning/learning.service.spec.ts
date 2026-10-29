import { describe, expect, it, vi } from 'vitest';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { LearningService } from './learning.service.js';
import type { PracticeReadsService } from './practice/practice-reads.service.js';
import type { PracticeReviewService } from './practice/practice-review.service.js';
import type { QueueService } from './queue/queue.service.js';

function setup() {
  const clientRows = vi.fn(async () => ({ count: 1 }));
  const txRows = vi.fn(async () => ({ count: 1 }));
  const prisma = { learningActivityDay: { createMany: clientRows } } as unknown as PrismaClient;
  const tx = { learningActivityDay: { createMany: txRows } } as unknown as Prisma.TransactionClient;
  const service = new LearningService({} as QueueService, {} as PracticeReadsService, {} as PracticeReviewService, prisma);
  return { service, tx, clientRows, txRows };
}

describe('LearningService.recordActivity (the façade Practice writes a learning day through)', () => {
  it("uses the caller's transaction when given one, and not the shared client", async () => {
    const { service, tx, clientRows, txRows } = setup();
    await service.recordActivity('u1', '2026-10-20', tx);
    expect(txRows).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId: 'u1', localDate: new Date('2026-10-20T00:00:00.000Z') }], skipDuplicates: true,
    });
    expect(clientRows).not.toHaveBeenCalled();
  });

  it('falls back to the shared client without one', async () => {
    const { service, clientRows, txRows } = setup();
    await service.recordActivity('u1', '2026-10-20');
    expect(clientRows).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId: 'u1', localDate: new Date('2026-10-20T00:00:00.000Z') }], skipDuplicates: true,
    });
    expect(txRows).not.toHaveBeenCalled();
  });
});
