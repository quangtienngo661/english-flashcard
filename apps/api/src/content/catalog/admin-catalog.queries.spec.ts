import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { BatchScope } from '../batch-scope.port.js';
import { AdminCatalogQueries } from './admin-catalog.queries.js';

const batchId = '00000000-0000-4000-8000-0000000000b1';

function setup() {
  const tx = { sense: { findMany: vi.fn(async () => []) } };
  const prisma = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    sense: { findMany: vi.fn(async () => []) },
  };
  const batchScope = {
    entryIdsOf: vi.fn(async () => ['e1']),
    senseIdsOf: vi.fn(async () => ['s1']),
  };
  const queries = new AdminCatalogQueries(prisma as unknown as PrismaClient, batchScope as BatchScope);
  return { queries, tx, prisma, batchScope };
}

type Selection = (query: { batch_id?: string }, db: unknown) => Promise<{ where: unknown }>;

describe('AdminCatalogQueries — reads inside an open transaction (PX4)', () => {
  it('PX4: senseSelection reads the batch ids through the client it is given', async () => {
    const { queries, tx, prisma, batchScope } = setup();
    const senseSelection = (queries as unknown as { senseSelection: Selection }).senseSelection.bind(queries);
    await senseSelection({ batch_id: batchId }, tx);
    expect(batchScope.senseIdsOf).toHaveBeenCalledExactlyOnceWith(batchId, tx);
    await senseSelection({ batch_id: batchId }, prisma);
    expect(batchScope.senseIdsOf).toHaveBeenLastCalledWith(batchId, prisma);
  });

  it('PX4: snapshotPublishable reads the candidates through the transaction, not the global client', async () => {
    const { queries, tx, prisma } = setup();
    await expect(queries.snapshotPublishable({ level: 'A1' })).resolves.toEqual({ items: [], notReady: 0 });
    expect(tx.sense.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.sense.findMany).not.toHaveBeenCalled();
  });
});
