import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import type { GroupsService } from '../groups/groups.service.js';
import { ItemsService } from './items.service.js';

// B3-5: the "can this learner see the sense?" read and the delete of a learning item both happen under the learner's own lock,
// in the same transaction that writes.
const dueDate = new Date('2026-10-20T00:00:00Z');

function setup(visible: (id: string) => boolean = () => true) {
  const order: string[] = [];
  const tx = {
    $executeRaw: vi.fn(async () => { order.push('learner-lock'); return 0; }),
    $queryRaw: vi.fn(async () => { order.push('lock-items'); return []; }),
    learningItem: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => ({ id: 'item-1' })),
      delete: vi.fn(async () => { order.push('delete'); return { senseId: 's1', level: 2, dueDate }; }),
    },
    groupItem: { count: vi.fn(async () => 0), deleteMany: vi.fn(async () => ({ count: 1 })) },
    learningLogEntry: { create: vi.fn(async () => ({})) },
    learningActivityDay: { createMany: vi.fn(async () => ({})) },
  };
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaClient;
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
  const content = {
    visibleSenseIds: vi.fn(async (_viewer: string, ids: string[]) => { order.push('visible'); return new Set(ids.filter(visible)); }),
  } as unknown as ContentService;
  const groups = { assertOwned: vi.fn(async () => ({})) } as unknown as GroupsService;
  const settings = { get: vi.fn(async () => structuredClone(SETTINGS_DEFAULTS)) } as unknown as SettingsService;
  const service = new ItemsService(prisma, new FakeClock(new Date('2026-10-19T03:00:00Z')), identity, content, groups, settings);
  const ensureItems = vi.spyOn(service as unknown as { ensureItems: (...args: unknown[]) => unknown }, 'ensureItems')
    .mockImplementation(async (...args: unknown[]) => (args[3] as string[]).map((senseId) => ({ id: `i-${senseId}`, level: 0, dueDate, created: true })));
  return { service, tx, order, content, ensureItems };
}

describe('ItemsService.add reads the visible senses under the learner lock', () => {
  it('LA2#4: the read goes through the transaction and comes after the learner lock', async () => {
    const { service, tx, order, content } = setup();
    await service.add('u1', 'g1', 's1');
    expect(content.visibleSenseIds).toHaveBeenCalledExactlyOnceWith('u1', ['s1'], tx);
    expect(order.slice(0, 2)).toEqual(['learner-lock', 'visible']);
  });

  it('LA2#4: a sense she cannot see is still not-found, and nothing is written', async () => {
    const { service, ensureItems } = setup((id) => !id.startsWith('hidden'));
    await expect(service.add('u1', 'g1', 'hidden-1')).rejects.toMatchObject({ status: 404 });
    expect(ensureItems).not.toHaveBeenCalled();
  });
});

describe('deleting a learning item locks its row first', () => {
  it('LA2#5: forget takes lockItems before the delete', async () => {
    const { service, tx, order } = setup();
    await service.forget('u1', 'item-1');
    expect(order).toEqual(['learner-lock', 'lock-items', 'delete']);
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
  });

  it('LA2#5: leaving the last group takes lockItems before the delete as well', async () => {
    const { service, order } = setup();
    await expect(service.removeFromGroup('u1', 'g1', 'item-1')).resolves.toEqual({ removed_from_learning: true });
    expect(order).toEqual(['learner-lock', 'lock-items', 'delete']);
  });
});
