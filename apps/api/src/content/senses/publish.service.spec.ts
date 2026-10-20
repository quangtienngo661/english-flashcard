import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { EntriesService } from '../catalog/entries.service.js';
import { PublishService } from './publish.service.js';

const NOW = new Date('2026-10-21T08:00:00.000Z');
const ACTOR = '00000000-0000-4000-8000-0000000000a1';

type SenseRow = {
  id: string; entryId: string; state: string; liveRevisionId: string | null; replacesSenseId: string | null;
  revisions: Array<{ id: string; revisionNo: number; publishedAt: Date | null; texts: unknown[]; examples: string[] }>;
};

function setup(sense: SenseRow | null) {
  const tx = {
    sense: { findUnique: vi.fn(async () => sense), update: vi.fn(async () => ({})) },
    senseRevision: { update: vi.fn(async () => ({})) },
    entryLevel: { findFirst: vi.fn(async () => ({ id: 'l1' })) },
  };
  const prisma = {
    sense: { findFirst: vi.fn(async () => sense && { entry: { lemma: 'cat', pos: 'noun' } }) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const entries = { lockEntryKey: vi.fn(async () => undefined) };
  const service = new PublishService(prisma as unknown as PrismaClient, entries as unknown as EntriesService, new FakeClock(NOW));
  return { service, tx };
}

const ready = (over: Partial<SenseRow> = {}): SenseRow => ({
  id: 's1', entryId: 'e1', state: 'unpublished', liveRevisionId: null, replacesSenseId: null, ...over,
  revisions: [{ id: 'r1', revisionNo: 2, publishedAt: null, examples: ['A cat sat.'],
    texts: [{ language: 'vi', kind: 'gloss', text: 'con mèo' }] }],
});

describe('PublishService audit columns (N3)', () => {
  it('N3: publish records published_by and state_changed_*', async () => {
    const { service, tx } = setup(ready());
    await expect(service.publishItem({ senseId: 's1', revision: 2 }, ACTOR)).resolves.toEqual({ outcome: 'published' });
    expect(tx.senseRevision.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: expect.objectContaining({
      status: 'published', publishedBy: ACTOR }) });
    expect(tx.sense.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: {
      state: 'open', liveRevisionId: 'r1', stateChangedBy: ACTOR, stateChangedAt: NOW } });
  });

  it('N3: unpublish/retire record the actor only when the state changes', async () => {
    const open = setup({ ...ready(), state: 'open', liveRevisionId: 'r1' });
    await open.service.unpublish(['s1'], ACTOR);
    expect(open.tx.sense.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: {
      state: 'unpublished', stateChangedBy: ACTOR, stateChangedAt: NOW } });
    const same = setup({ ...ready(), state: 'unpublished' });
    await same.service.unpublish(['s1'], ACTOR);
    expect(same.tx.sense.update).not.toHaveBeenCalled();
    const retired = setup({ ...ready(), state: 'unpublished' });
    await retired.service.retire(['s1'], ACTOR);
    expect(retired.tx.sense.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: {
      state: 'retired', stateChangedBy: ACTOR, stateChangedAt: NOW } });
  });

  it('N3: publishing a replacement stamps the retired old sense with the publisher', async () => {
    const { service, tx } = setup(ready({ replacesSenseId: 'old' }));
    await service.publishItem({ senseId: 's1', revision: 2 }, ACTOR);
    expect(tx.sense.update).toHaveBeenCalledWith({ where: { id: 'old' }, data: {
      state: 'retired', stateChangedBy: ACTOR, stateChangedAt: NOW } });
  });
});
