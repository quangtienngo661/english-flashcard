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
  } as unknown as ContentService;
  const service = new ItemsService(prisma, new FakeClock(new Date('2026-10-19T03:00:00Z')), identity, content, groups,
    settingsService);
  // ensureItems writes rows; here only the limit check matters, so it returns one fresh item per sense.
  const ensureItems = vi.spyOn(service as unknown as { ensureItems: (...args: unknown[]) => unknown }, 'ensureItems')
    .mockImplementation(async (...args: unknown[]) => (args[3] as string[]).map((senseId) => (
      { id: `i-${senseId}`, level: 0, dueDate, created: true })));
  return { service, tx: tx as unknown as Prisma.TransactionClient, ensureItems, settingsService };
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
      added: 4, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 6,
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
