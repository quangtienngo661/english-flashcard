import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { revertBatch } from './revert.service.js';

const BATCH = '00000000-0000-4000-8000-0000000000b1';
const FINISHED = new Date('2026-10-20T10:00:00.000Z');

describe('revertBatch', () => {
  it('passes Content the batch finish time and the revisions this batch recorded, as plain values', async () => {
    const batch = { revertedAt: null, job: { status: 'succeeded', finishedAt: FINISHED } };
    const tx = {
      $queryRaw: vi.fn(async () => []),
      importBatch: { findUnique: vi.fn(async () => batch), update: vi.fn(async () => ({})) },
      importRowKey: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    };
    const prisma = {
      importBatch: { findUnique: vi.fn(async () => batch), findUniqueOrThrow: vi.fn(async () => ({ rawHeaders: ['lemma'] })) },
      batchRecord: { findMany: vi.fn(async () => [
        { recordType: 'entry', recordId: 'e1', meta: null },
        { recordType: 'revision', recordId: 'r1', meta: null },
        { recordType: 'revision', recordId: 'r2', meta: null },
      ]) },
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaClient;
    const report = { removed: { entry: 0, variant: 0, level: 0, sense: 0, revision: 0 }, skipped: [] };
    const content = { revertRecords: vi.fn(async () => report) } as unknown as ContentService;

    await revertBatch(prisma, content, new FakeClock(FINISHED), BATCH);

    expect(content.revertRecords).toHaveBeenCalledWith(
      [{ type: 'entry', id: 'e1' }, { type: 'revision', id: 'r1' }, { type: 'revision', id: 'r2' }],
      { batchFinishedAt: FINISHED, ownRevisionIds: new Set(['r1', 'r2']) },
    );
  });
});
