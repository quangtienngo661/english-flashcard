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

describe('AdminCatalogQueries.listSenses missing parts (Task 37)', () => {
  const level = { id: 'l1', level: 'A1', sourceId: 'src', basis: 'editorial', sourceExtra: null, createdAt: new Date('2026-10-01T00:00:00Z'),
    source: { id: 'src', kind: 'editorial', name: 'n', version: null, url: null, license: null, attribution: null, displayPriority: 1 } };
  function senseRow(id: string, revision: { status: string; texts: unknown[]; examples: string[] } | null) {
    return {
      id, entryId: 'e1', contextLabel: null, state: 'open', liveRevisionId: null, replacesSenseId: null,
      entry: { lemma: 'cat', pos: 'noun', levels: [level], functionWordDerived: false, functionWordOverride: null, variants: [] },
      revisions: revision ? [{ id: `r-${id}`, revisionNo: 1, topicCodes: [], acceptedForms: [], formKind: null, formOfEntryId: null, ...revision }] : [],
    };
  }
  const gloss = [{ language: 'vi', kind: 'gloss', text: 'mèo' }];
  async function list(rows: unknown[], status?: 'open_draft' | 'published' | 'unpublishable') {
    const { queries, prisma } = setup();
    prisma.sense.findMany.mockResolvedValueOnce(rows as never);
    return queries.listSenses({ page_size: 20, ...(status ? { status } : {}) } as never);
  }

  it('open_draft: a draft without a gloss lists gloss-missing', async () => {
    const page = await list([senseRow('s1', { status: 'draft', texts: [], examples: ['A cat.'] })], 'open_draft');
    expect(page.items.map((item) => (item as { missing: unknown }).missing)).toEqual([['gloss-missing']]);
  });

  it('no filter: a published row, a rejected row and a row with no revision list missing []', async () => {
    const page = await list([
      senseRow('s1', { status: 'published', texts: [], examples: [] }),
      senseRow('s2', { status: 'rejected', texts: [], examples: [] }),
      senseRow('s3', null),
      senseRow('s4', { status: 'reviewed', texts: gloss, examples: ['A cat.'] }),
    ]);
    expect(page.items.map((item) => (item as { missing: unknown }).missing)).toEqual([[], [], [], []]);
  });

  it('unpublishable: unchanged, only incomplete drafts with their missing parts', async () => {
    const page = await list([
      senseRow('s1', { status: 'draft', texts: gloss, examples: [] }),
      senseRow('s2', { status: 'reviewed', texts: gloss, examples: ['A cat.'] }),
    ], 'unpublishable');
    expect(page.items.map((item) => [(item as { sense_id: string }).sense_id, (item as { missing: unknown }).missing]))
      .toEqual([['s1', ['example-missing']]]);
  });
});
