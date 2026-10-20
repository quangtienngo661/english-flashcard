import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../generated/prisma/client.js';
import { SensesService } from './senses.service.js';

const ACTOR = '00000000-0000-4000-8000-0000000000a1';

function fakeTx(sense: object) {
  const tx = {
    sense: { findUnique: vi.fn(async () => sense), update: vi.fn(async () => ({})) },
    senseRevision: { update: vi.fn(async (_args: { where: object; data: Record<string, unknown> }) => ({})) },
  };
  return tx;
}
const draft = (over: object = {}) => ({
  id: 's1', state: 'unpublished', replacesSenseId: null, liveRevisionId: null,
  revisions: [{ id: 'r1', revisionNo: 3, status: 'draft' }], ...over,
});
const service = () => new SensesService();

describe('SensesService.markRevisions audit columns (N3)', () => {
  it('N3: review and reject record reviewed_*', async () => {
    const tx = fakeTx(draft());
    const db = tx as unknown as Prisma.TransactionClient;
    const before = Date.now();
    await service().markRevisions(db, [{ senseId: 's1', revision: 3, action: 'reviewed' }], ACTOR);
    const data = tx.senseRevision.update.mock.calls[0]?.[0].data ?? {};
    expect(data).toMatchObject({ status: 'reviewed', reviewedBy: ACTOR });
    expect((data.reviewedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
    const rej = fakeTx(draft());
    await service().markRevisions(rej as unknown as Prisma.TransactionClient, [{ senseId: 's1', revision: 3, action: 'rejected' }], ACTOR);
    expect(rej.senseRevision.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: expect.objectContaining({
      status: 'rejected', reviewedBy: ACTOR }) });
  });

  it('N3: rejecting a waiting replacement stamps that sense', async () => {
    const tx = fakeTx(draft({ replacesSenseId: 'old' }));
    await service().markRevisions(tx as unknown as Prisma.TransactionClient, [{ senseId: 's1', revision: 3, action: 'rejected' }], ACTOR);
    expect(tx.sense.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: expect.objectContaining({
      state: 'retired', stateChangedBy: ACTOR }) });
  });
});
