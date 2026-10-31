import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { ContentService } from '../../content/index.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import type { GroupsService } from '../groups/groups.service.js';
import { ItemsService } from './items.service.js';

const dueDate = new Date('2026-10-20T00:00:00Z');

function setup(count: number) {
  const settings = structuredClone(SETTINGS_DEFAULTS);
  settings.learning.itemsPerGroup = 150;
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    learningItem: { findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []) },
    groupItem: { count: vi.fn(async () => count) },
  };
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaClient;
  const settingsService = { get: vi.fn(async () => settings) } as unknown as SettingsService;
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
  const groups = { assertOwned: vi.fn(async () => ({})) } as unknown as GroupsService;
  const content = {
    bulkCandidates: vi.fn(async () => ({ senseIds: Array.from({ length: 10 }, (_, i) => `s${i}`), skippedFunctionWords: 0 })),
    // Every id but `hidden` (another learner's private word, or none at all) is visible.
    visibleSenseIds: vi.fn(async (_viewer: string, ids: string[]) => new Set(ids.filter((id) => !id.startsWith('hidden')))),
  } as unknown as ContentService;
  const service = new ItemsService(prisma, new FakeClock(new Date('2026-10-19T03:00:00Z')), identity, content, groups,
    settingsService);
  // ensureItems writes rows; here only the limit check matters, so it returns one fresh item per sense.
  const ensureItems = vi.spyOn(service as unknown as { ensureItems: (...args: unknown[]) => unknown }, 'ensureItems')
    .mockImplementation(async (...args: unknown[]) => (args[3] as string[]).map((senseId) => (
      { id: `i-${senseId}`, level: 0, dueDate, created: true })));
  return { service, tx: tx as unknown as Prisma.TransactionClient, rawTx: tx, ensureItems, settingsService, content };
}

describe('ItemsService limits', () => {
  it('B5E64: linkInTx with count = limit → refused with group-full', async () => {
    const { service, tx, ensureItems } = setup(150);
    await expect(service.linkInTx(tx, 'u1', 'g1', 's1', '2026-10-19'))
      .rejects.toMatchObject({ problemType: 'group-full', status: 409 });
    expect(ensureItems).not.toHaveBeenCalled();
  });

  it('B5E64: linkInTx with count = limit − 1 → passes the check; the setting is read through the caller\'s tx', async () => {
    const { service, tx, ensureItems, settingsService } = setup(149);
    await expect(service.linkInTx(tx, 'u1', 'g1', 's1', '2026-10-19')).resolves.toMatchObject({ item_id: 'i-s1', created: true });
    expect(ensureItems).toHaveBeenCalledOnce();
    expect(settingsService.get).toHaveBeenCalledWith(tx);
  });

  it('B5E64: bulkAdd free slots = itemsPerGroup − count', async () => {
    const { service, ensureItems } = setup(146);
    await expect(service.bulkAdd('u1', 'g1', {})).resolves.toEqual({
      added: 4, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 6, skipped_not_found: 0,
    });
    expect(ensureItems.mock.calls[0][3]).toEqual(['s0', 's1', 's2', 's3']);
  });

  it('B5E64: bulkAdd with count = limit adds nothing; count above a lowered limit adds nothing either', async () => {
    for (const count of [150, 400]) {
      const { service } = setup(count);
      await expect(service.bulkAdd('u1', 'g1', {})).resolves.toMatchObject({ added: 0, skipped_group_full: 10 });
    }
  });
});

describe('ItemsService.bulkAdd by sense_ids (design §8.3)', () => {
  it('GC1: three visible senses not in the deck are all added, in the order sent', async () => {
    const { service, ensureItems, content } = setup(0);
    await expect(service.bulkAdd('u1', 'g1', { sense_ids: ['a', 'b', 'c'] })).resolves.toEqual({
      added: 3, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 0, skipped_not_found: 0,
    });
    expect(ensureItems.mock.calls[0][3]).toEqual(['a', 'b', 'c']);
    expect(content.bulkCandidates).not.toHaveBeenCalled();
  });

  it('GC2: a sense already in the deck is counted, not an error', async () => {
    const { service, rawTx } = setup(0);
    rawTx.learningItem.findMany.mockResolvedValue([{ senseId: 'b' }] as never);
    await expect(service.bulkAdd('u1', 'g1', { sense_ids: ['a', 'b'] })).resolves.toMatchObject({ added: 1, already_in_group: 1 });
  });

  it('GC3: an id the learner cannot see is counted as not found; the others are still added', async () => {
    const { service, ensureItems } = setup(0);
    await expect(service.bulkAdd('u1', 'g1', { sense_ids: ['a', 'hidden-1', 'c'] })).resolves.toMatchObject({
      added: 2, skipped_not_found: 1,
    });
    expect(ensureItems.mock.calls[0][3]).toEqual(['a', 'c']);
  });

  it('GC6: room for 2, five sent → 2 added, 3 skipped as the deck is full', async () => {
    const { service } = setup(148);
    await expect(service.bulkAdd('u1', 'g1', { sense_ids: ['a', 'b', 'c', 'd', 'e'] })).resolves.toMatchObject({
      added: 2, skipped_group_full: 3,
    });
  });

  it('the filter path reports skipped_not_found 0', async () => {
    const { service } = setup(0);
    await expect(service.bulkAdd('u1', 'g1', {})).resolves.toMatchObject({ skipped_not_found: 0 });
  });
});

// nhóm B M6 (D39): the real ensureItems / deleteItem, one activity day per call that wrote at least one log row.
function writing(at = '2026-10-19T17:01:00Z') {
  const events: string[] = [];
  const row = (senseId: string) => ({ id: `i-${senseId}`, userId: 'u1', senseId, level: 0, dueDate: new Date('2026-10-20T00:00:00Z') });
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    learningItem: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => ({ id: 'i-a' })),
      findMany: vi.fn(async () => [] as Array<ReturnType<typeof row>>),
      createManyAndReturn: vi.fn(async () => { events.push('items'); return [] as Array<{ id: string }>; }),
      delete: vi.fn(async () => ({ ...row('a'), level: 2 })),
    },
    groupItem: {
      count: vi.fn(async () => 0), createMany: vi.fn(async () => { events.push('links'); }),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    learningLogEntry: {
      createMany: vi.fn(async (_args: { data: Array<{ senseId: string }> }) => { events.push('log'); }),
      create: vi.fn(async (_args: { data: { localDate: Date } }) => { events.push('log'); }),
    },
    learningActivityDay: { createMany: vi.fn(async () => { events.push('activity'); return { count: 1 }; }) },
  };
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaClient;
  const content = {
    visibleSenseIds: vi.fn(async (_viewer: string, ids: string[]) => new Set(ids)),
  } as unknown as ContentService;
  const service = new ItemsService(prisma, new FakeClock(new Date(at)),
    { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService, content,
    { assertOwned: vi.fn(async () => ({})) } as unknown as GroupsService,
    { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService);
  return { service, tx, events, row };
}

describe('ItemsService — records a learning activity day (nhóm B M6, D39)', () => {
  it('adding two new senses and one already learning writes the log rows, then ONE activity statement with the local date', async () => {
    const { service, tx, events, row } = writing();
    tx.learningItem.findMany
      .mockResolvedValueOnce([]) // the senses already in this group
      .mockResolvedValueOnce([row('a'), row('b'), row('c')]); // read back after the insert
    tx.learningItem.createManyAndReturn.mockImplementationOnce(async () => { events.push('items'); return [{ id: 'i-a' }, { id: 'i-b' }]; });
    await expect(service.bulkAdd('u1', 'g1', { sense_ids: ['a', 'b', 'c'] })).resolves.toMatchObject({ added: 3 });
    expect(tx.learningLogEntry.createMany.mock.calls[0][0].data.map((entry) => entry.senseId)).toEqual(['a', 'b']);
    expect(tx.learningActivityDay.createMany).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId: 'u1', localDate: new Date('2026-10-20T00:00:00.000Z') }], skipDuplicates: true,
    });
    expect(events).toEqual(['items', 'links', 'log', 'activity']);
  });

  it('adding only senses that are already learning (in another group) writes no activity statement', async () => {
    const { service, tx, row } = writing();
    tx.learningItem.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([row('a'), row('b')]);
    await expect(service.bulkAdd('u1', 'g1', { sense_ids: ['a', 'b'] })).resolves.toMatchObject({ added: 2 });
    expect(tx.learningActivityDay.createMany).not.toHaveBeenCalled();
  });

  it('adding nothing (every sense is already in the group) writes no activity statement', async () => {
    const { service, tx, row } = writing();
    tx.learningItem.findMany.mockResolvedValueOnce([row('a')]);
    await expect(service.bulkAdd('u1', 'g1', { sense_ids: ['a'] })).resolves.toMatchObject({ added: 0, already_in_group: 1 });
    expect(tx.learningActivityDay.createMany).not.toHaveBeenCalled();
  });

  it('adding one new sense through add() writes one activity statement', async () => {
    const { service, tx, events, row } = writing();
    tx.learningItem.findMany.mockResolvedValueOnce([row('a')]);
    tx.learningItem.createManyAndReturn.mockImplementationOnce(async () => { events.push('items'); return [{ id: 'i-a' }]; });
    await expect(service.add('u1', 'g1', 'a')).resolves.toMatchObject({ item_id: 'i-a', created: true });
    expect(tx.learningActivityDay.createMany).toHaveBeenCalledOnce();
    expect(events).toEqual(['items', 'links', 'log', 'activity']);
  });

  it('forgetting an item writes the log row, then one activity statement (the date is the learner\'s, not UTC)', async () => {
    const { service, tx, events } = writing('2026-10-19T17:01:00Z');
    await service.forget('u1', 'i-a');
    expect(tx.learningLogEntry.create.mock.calls[0][0].data.localDate).toEqual(new Date('2026-10-20T00:00:00.000Z'));
    expect(tx.learningActivityDay.createMany).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId: 'u1', localDate: new Date('2026-10-20T00:00:00.000Z') }], skipDuplicates: true,
    });
    expect(events).toEqual(['log', 'activity']);
  });

  it('leaving a group that another group still holds removes nothing from learning, so no log row and no activity', async () => {
    const { service, tx } = writing();
    tx.groupItem.count.mockResolvedValueOnce(1);
    await expect(service.removeFromGroup('u1', 'g1', 'i-a')).resolves.toEqual({ removed_from_learning: false });
    expect(tx.learningActivityDay.createMany).not.toHaveBeenCalled();
  });

  it('leaving the last group removes the item: one activity statement', async () => {
    const { service, tx } = writing();
    tx.groupItem.count.mockResolvedValueOnce(0);
    await expect(service.removeFromGroup('u1', 'g1', 'i-a')).resolves.toEqual({ removed_from_learning: true });
    expect(tx.learningActivityDay.createMany).toHaveBeenCalledOnce();
  });
});
