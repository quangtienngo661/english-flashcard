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

// nhóm B M6 (D39): deleting a group writes one activity day, only when it removed an item from learning.
function deleting(removable: number) {
  const events: string[] = [];
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    $queryRaw: vi.fn(async () => []),
    learningGroup: { findFirst: vi.fn(async () => ({ id: 'g1' })), delete: vi.fn(async () => { events.push('group'); }) },
    groupItem: { findMany: vi.fn(async () => []) },
    learningItem: {
      findMany: vi.fn(async () => Array.from({ length: removable }, (_, index) => (
        { id: `i${index}`, senseId: `s${index}`, level: 2, dueDate: new Date('2026-10-20T00:00:00Z') }))),
      deleteMany: vi.fn(async () => { events.push('items'); }),
    },
    learningLogEntry: { createMany: vi.fn(async (_args: { data: unknown[] }) => { events.push('log'); }) },
    learningActivityDay: { createMany: vi.fn(async () => { events.push('activity'); return { count: 1 }; }) },
  };
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaClient;
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
  const service = new GroupsService(prisma, new FakeClock(new Date('2026-10-19T17:01:00Z')), identity, {} as SettingsService);
  return { service, tx, events };
}

describe('GroupsService.delete — records a learning activity day (nhóm B M6, D39)', () => {
  it("a group with two removable items writes the log rows, then one activity statement with the learner's date", async () => {
    const { service, tx, events } = deleting(2);
    await service.delete('u1', 'g1');
    expect(tx.learningLogEntry.createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(tx.learningActivityDay.createMany).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId: 'u1', localDate: new Date('2026-10-20T00:00:00.000Z') }], skipDuplicates: true,
    });
    expect(events).toEqual(['group', 'items', 'log', 'activity']);
  });

  it('a group with no removable item (every word is in another group, or it is empty) writes none', async () => {
    const { service, tx, events } = deleting(0);
    await service.delete('u1', 'g1');
    expect(tx.learningActivityDay.createMany).not.toHaveBeenCalled();
    expect(events).toEqual(['group', 'items', 'log']);
  });
});
