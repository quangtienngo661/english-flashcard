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
