import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { BatchScope } from '../batch-scope.port.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
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
  const queries = new AdminCatalogQueries(prisma as unknown as PrismaClient, {} as IdentityService, batchScope as BatchScope);
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

describe('AdminCatalogQueries.getSense audit (N3)', () => {
  it('N3: getSense names who reviewed, published and changed the sense', async () => {
    const at = new Date('2026-10-21T08:00:00.000Z');
    const row = {
      id: 's1', entryId: 'e1', contextLabel: null, state: 'unpublished', liveRevisionId: 'r1', replacesSenseId: null,
      stateChangedBy: 'u3', stateChangedAt: at,
      entry: { lemma: 'cat', pos: 'noun', levels: [], functionWordDerived: false, functionWordOverride: null },
      revisions: [{ id: 'r1', revisionNo: 2, status: 'published', texts: [], examples: [], topicCodes: [], acceptedForms: [],
        formKind: null, formOfEntryId: null, reviewedBy: 'u1', reviewedAt: at, publishedBy: 'u2' }],
    };
    const identity = { emailsOf: vi.fn(async () => new Map([['u1', 'a@x.io'], ['u2', 'b@x.io'], ['u3', 'c@x.io']])) };
    const prisma = { sense: { findFirst: vi.fn(async () => row) } };
    const queries = new AdminCatalogQueries(prisma as unknown as PrismaClient, identity as unknown as IdentityService);
    const view = await queries.getSense('s1');
    expect(view).toMatchObject({
      reviewed_by: { id: 'u1', email: 'a@x.io' }, reviewed_at: at.toISOString(), published_by: { id: 'u2', email: 'b@x.io' },
      state_changed_by: { id: 'u3', email: 'c@x.io' }, state_changed_at: at.toISOString(),
    });
  });
});
