import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { GroupsService } from './groups.service.js';

function setup(count: number) {
  const settings = structuredClone(SETTINGS_DEFAULTS);
  settings.learning.groupsPerUser = 2;
  const now = new Date('2026-10-19T03:00:00Z');
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    learningGroup: {
      count: vi.fn(async () => count),
      create: vi.fn(async ({ data }: { data: { name: string } }) => ({
        id: 'g1', name: data.name, version: 0, createdAt: now, updatedAt: now,
      })),
    },
  };
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaClient;
  const settingsService = { get: vi.fn(async () => settings) } as unknown as SettingsService;
  const service = new GroupsService(prisma, new FakeClock(now), {} as IdentityService, settingsService);
  return { service, tx, settingsService };
}

describe('GroupsService.create', () => {
  it('B5E64: count = limit → refused with group-limit-reached', async () => {
    const { service, tx } = setup(2);
    await expect(service.create('u1', 'Travel')).rejects.toMatchObject({ problemType: 'group-limit-reached', status: 409 });
    expect(tx.learningGroup.create).not.toHaveBeenCalled();
  });

  it('B5E64: count = limit − 1 → passes the check', async () => {
    const { service, tx, settingsService } = setup(1);
    await expect(service.create('u1', 'Travel')).resolves.toMatchObject({ id: 'g1', name: 'Travel', item_count: 0 });
    expect(tx.learningGroup.create).toHaveBeenCalledOnce();
    // Read before the transaction opens: the shared client, not the locked tx.
    expect(settingsService.get).toHaveBeenCalledWith();
  });
});
