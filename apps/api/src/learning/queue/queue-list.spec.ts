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

describe('GET /v1/groups/:id/queue?mode=new', () => {
  function build(rows: Array<Record<string, unknown>>, newDone: number) {
    const sections: string[] = [];
    const prisma = {
      $queryRaw: vi.fn(async (query: { sql?: string; strings?: string[]; values?: unknown[] }) => {
        const text = (query.sql ?? query.strings?.join('?') ?? '');
        if (/new_done|due_done/.test(text)) return [{ due_done: 0, new_done: newDone }];
        sections.push(text);
        return rows;
      }),
    } as unknown as PrismaClient;
    const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
    const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
    const content = {
      cardContent: vi.fn(async (_u: string, ids: string[]) => new Map(ids.map((id) => [id, { word: id }]))),
      listSentences: vi.fn(async () => new Map()),
    } as unknown as ContentService;
    const groups = { assertOwned: vi.fn(async () => undefined) } as unknown as GroupsService;
    const service = new QueueService(prisma, new FakeClock(new Date('2026-11-07T03:00:00Z')), identity, settings, content, groups);
    return { service, prisma, sections };
  }

  it('reads only the new section (no priority, no due) and returns level-0 cards', async () => {
    const row = { item_id: 'i1', sense_id: 's1', level: 0, due_date: new Date('2026-11-07T00:00:00Z'), priority: false };
    const { service, sections } = build([row], 5);
    const { cards } = await service.queue('u1', 'g1', 'new', 'vi');
    expect(cards.map((c) => c.item_id)).toEqual(['i1']);
    expect(cards[0]).toMatchObject({ level: 0, section: 'new' });
    expect(sections).toHaveLength(1);
    expect(sections[0]).toContain('NOT i.priority AND i.level = 0');
    expect(sections[0]).not.toContain('due_date <=');
  });

  it('reads nothing once the daily new-word cap is used up', async () => {
    const { service, sections } = build([], SETTINGS_DEFAULTS.learning.newPerGroupPerDay);
    expect((await service.queue('u1', 'g1', 'new', 'vi')).cards).toEqual([]);
    expect(sections).toHaveLength(0);
  });
});
