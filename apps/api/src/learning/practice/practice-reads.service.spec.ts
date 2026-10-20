import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import type { GroupsService } from '../groups/groups.service.js';
import { PracticeReadsService } from './practice-reads.service.js';

const userId = '00000000-0000-4000-8000-000000000001';
const senseId = '00000000-0000-4000-8000-0000000000a1';
const groupId = '00000000-0000-4000-8000-0000000000c1';

const clientWith = () => ({
  $queryRaw: vi.fn(async (): Promise<unknown[]> => []),
  learningGroup: { findFirst: vi.fn(async () => ({ id: groupId })) },
  groupItem: { count: vi.fn(async () => 0) },
});

function setup() {
  const prisma = clientWith();
  const tx = clientWith();
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'UTC' })) };
  const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) };
  const groups = { assertOwned: vi.fn(async () => ({ id: groupId })) };
  const service = new PracticeReadsService(prisma as unknown as PrismaClient, new FakeClock(new Date('2026-10-19T03:00:00Z')),
    identity as unknown as IdentityService, settings as unknown as SettingsService, groups as unknown as GroupsService);
  return { service, prisma, tx: tx as unknown as Prisma.TransactionClient, rawTx: tx, identity, settings, groups };
}

describe('PracticeReadsService — reads through the client it is given (PX4)', () => {
  it('PX4: items reads the profile, the settings, the group and the rows through the given client', async () => {
    const { service, prisma, tx, rawTx, identity, settings, groups } = setup();
    await service.items(userId, { kind: 'group', groupId, filter: 'all' }, tx);
    expect(identity.getProfile).toHaveBeenCalledExactlyOnceWith(userId, tx);
    expect(settings.get).toHaveBeenCalledExactlyOnceWith(tx);
    expect(groups.assertOwned).toHaveBeenCalledExactlyOnceWith(tx, userId, groupId);
    expect(rawTx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('PX4: items without a client reads through the global client', async () => {
    const { service, prisma, identity, groups } = setup();
    await service.items(userId, { kind: 'group', groupId, filter: 'all' });
    expect(identity.getProfile).toHaveBeenCalledExactlyOnceWith(userId, prisma);
    expect(groups.assertOwned).toHaveBeenCalledExactlyOnceWith(prisma, userId, groupId);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('PX4: groupMates reads through the given client', async () => {
    const { service, prisma, tx, rawTx } = setup();
    await service.groupMates(userId, [senseId], tx);
    expect(rawTx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('PX4: check reads the profile, the settings, the item and the group through the given client', async () => {
    const { service, prisma, tx, rawTx, identity, settings } = setup();
    rawTx.$queryRaw.mockResolvedValueOnce([{
      item_id: 'i1', sense_id: senseId, level: 1, due_date: new Date('2026-10-19'), priority: false,
      added_at: new Date('2026-10-01'), last_needs_review_at: null,
    }]);
    await expect(service.check(userId, senseId, groupId, tx)).resolves.toMatchObject({ groupExists: true });
    expect(identity.getProfile).toHaveBeenCalledExactlyOnceWith(userId, tx);
    expect(settings.get).toHaveBeenCalledExactlyOnceWith(tx);
    expect(rawTx.learningGroup.findFirst).toHaveBeenCalledTimes(1);
    expect(rawTx.groupItem.count).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.learningGroup.findFirst).not.toHaveBeenCalled();
    expect(prisma.groupItem.count).not.toHaveBeenCalled();
  });
});
