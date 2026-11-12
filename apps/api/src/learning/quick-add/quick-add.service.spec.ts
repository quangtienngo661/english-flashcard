import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import type { GroupsService } from '../groups/groups.service.js';
import type { ItemsService } from '../items/items.service.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { QuickAddService } from './quick-add.service.js';

function setup(visible: boolean) {
  const order: string[] = [];
  const tx = { $executeRaw: vi.fn(async () => { order.push('learner-lock'); return 0; }) };
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaClient;
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
  const content = {
    visibleSenseIds: vi.fn(async (_viewer: string, ids: string[]) => { order.push('visible'); return new Set(visible ? ids : []); }),
  } as unknown as ContentService;
  const groups = { assertOwned: vi.fn(async () => ({})) } as unknown as GroupsService;
  const items = { linkInTx: vi.fn(async () => ({ item_id: 'i1', created: true })) } as unknown as ItemsService;
  const service = new QuickAddService(prisma, new FakeClock(new Date('2026-10-19T03:00:00Z')), identity, content, groups, items);
  return { service, tx, order, content, items, groups };
}

describe('QuickAddService with an existing sense (B3-5)', () => {
  it('LA2#4: the sense is checked for visibility through the transaction, after the learner lock', async () => {
    const { service, tx, order, content } = setup(true);
    await service.quickAdd('u1', 'vi', { groupIds: ['g1'], senseId: 's1' });
    expect(content.visibleSenseIds).toHaveBeenCalledExactlyOnceWith('u1', ['s1'], tx);
    expect(order).toEqual(['learner-lock', 'visible']);
  });

  it('LA2#4: a sense she cannot see is not-found, and nothing is linked', async () => {
    const { service, items } = setup(false);
    await expect(service.quickAdd('u1', 'vi', { groupIds: ['g1'], senseId: 's1' })).rejects.toMatchObject({ status: 404 });
    expect(items.linkInTx).not.toHaveBeenCalled();
  });
});

describe('QuickAddService with several groups (QP1)', () => {
  it('two owned groups: both are checked and linked in the same transaction', async () => {
    const { service, items, groups, tx } = setup(true);
    await service.quickAdd('u1', 'vi', { groupIds: ['g1', 'g2'], senseId: 's1' });
    expect(groups.assertOwned).toHaveBeenCalledTimes(2);
    expect(items.linkInTx).toHaveBeenNthCalledWith(1, tx, 'u1', 'g1', 's1', '2026-10-19');
    expect(items.linkInTx).toHaveBeenNthCalledWith(2, tx, 'u1', 'g2', 's1', '2026-10-19');
  });

  it('a group she does not own → 404 and no link', async () => {
    const { service, items, groups } = setup(true);
    vi.mocked(groups.assertOwned).mockImplementation(async (_tx, _user, id) => {
      if (id === 'g2') throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
      return {} as never;
    });
    await expect(service.quickAdd('u1', 'vi', { groupIds: ['g1', 'g2'], senseId: 's1' })).rejects.toMatchObject({ status: 404 });
    expect(items.linkInTx).not.toHaveBeenCalled();
  });

  it('the second group is full → 409 group-full naming that group in detail', async () => {
    const { service, items } = setup(true);
    vi.mocked(items.linkInTx)
      .mockResolvedValueOnce({ item_id: 'i1', created: true } as never)
      .mockRejectedValueOnce(new ProblemDetailsException({ status: 409, title: 'Group full', type: 'group-full' }));
    await expect(service.quickAdd('u1', 'vi', { groupIds: ['g1', 'g2'], senseId: 's1' }))
      .rejects.toMatchObject({ status: 409, problemType: 'group-full', problemDetail: 'g2' });
  });
});
