import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import type { GroupsService } from '../groups/groups.service.js';
import { QueueService } from './queue.service.js';

// Deck page (owner 27/10/2026): GET /v1/groups also gives the due and new counts before the daily caps, for the word list filters.
describe('GET /v1/groups available counts', () => {
  it('adds available.due and available.new from the uncapped counts, next to the capped today counts', async () => {
    const row = {
      group_id: 'g1', name: 'A', version: 1, total: 300, priority: 0, due_available: 150, due_done: 0, new_available: 40, new_done: 0,
      backlog: 2, cell_total: [40, 260, 0, 0, 0, 0], cell_due: [0, 150, 0, 0, 0, 0],
    };
    const prisma = { $queryRaw: vi.fn(async () => [row]) } as unknown as PrismaClient;
    const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
    const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
    const service = new QueueService(prisma, new FakeClock(new Date('2026-10-19T03:00:00Z')), identity, settings,
      {} as ContentService, {} as GroupsService);
    const { items } = await service.list('u1');
    expect(items[0]).toMatchObject({ today: { due: 100, new: 20 }, available: { due: 150, new: 40 } });
  });
});
