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
    const prisma = {
      $queryRaw: vi.fn(async (query: { sql?: string; strings?: string[] }) =>
        /AS rank|DISTINCT ON/.test(query.sql ?? query.strings?.join('?') ?? '') ? [] : [row]),
    } as unknown as PrismaClient;
    const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
    const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
    const service = new QueueService(prisma, new FakeClock(new Date('2026-10-19T03:00:00Z')), identity, settings,
      {} as ContentService, {} as GroupsService);
    const { items } = await service.list({ userId: 'u1', nativeLanguage: 'vi' });
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

// Giao diện mới §10.5: each group gains next_lemma (first visible card of mode=due) and last_reviewed.
describe('GET /v1/groups next_lemma and last_reviewed', () => {
  const stat = (id: string, name: string) => ({
    group_id: id, name, version: 1, total: 5, priority: 0, due_available: 0, due_done: 0, new_available: 0, new_done: 0,
    backlog: 0, cell_total: [0, 0, 0, 0, 0, 0], cell_due: [0, 0, 0, 0, 0, 0],
  });
  function build(visible: Record<string, string>) {
    const prisma = {
      $queryRaw: vi.fn(async (query: { sql?: string; strings?: string[] }) => {
        const text = query.sql ?? query.strings?.join('?') ?? '';
        if (/DISTINCT ON \(group_id\)/.test(text)) {
          return [
            { group_id: 'g1', sense_id: 's3', at: new Date('2026-11-08T03:00:00Z') },
            { group_id: 'g2', sense_id: 'sh', at: new Date('2026-11-07T03:00:00Z') },
          ];
        }
        if (/AS rank/.test(text)) {
          return [
            { group_id: 'g1', sense_id: 's1', rank: 1 },
            { group_id: 'g1', sense_id: 's2', rank: 2 },
            ...['h1', 'h2', 'h3', 'h4', 'h5'].map((s, n) => ({ group_id: 'g3', sense_id: s, rank: n + 1 })),
          ];
        }
        return [stat('g1', 'A'), stat('g2', 'B'), stat('g3', 'C')];
      }),
    } as unknown as PrismaClient;
    const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
    const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
    const cardContent = vi.fn(async (_u: string, ids: string[], _lang: string) =>
      new Map(ids.filter((id) => id in visible).map((id) => [id, { lemma: visible[id] }])));
    const content = { cardContent } as unknown as ContentService;
    const service = new QueueService(prisma, new FakeClock(new Date('2026-11-08T03:00:00Z')), identity, settings,
      content, {} as GroupsService);
    return { service, cardContent };
  }

  it('skips hidden senses for next_lemma, maps last_reviewed, and reads lemmas in one cardContent call', async () => {
    const { service, cardContent } = build({ s2: 'mitigate', s3: 'allocate' });
    const { items } = await service.list({ userId: 'u1', nativeLanguage: 'vi' });
    const byId = new Map(items.map((g) => [g.id, g]));
    expect(byId.get('g1')).toMatchObject({
      next_lemma: 'mitigate', last_reviewed: { lemma: 'allocate', at: '2026-11-08T03:00:00.000Z' },
    });
    expect(byId.get('g2')).toMatchObject({ next_lemma: null, last_reviewed: { lemma: null, at: '2026-11-07T03:00:00.000Z' } });
    expect(byId.get('g3')).toMatchObject({ next_lemma: null, last_reviewed: null });
    expect(cardContent).toHaveBeenCalledOnce();
    expect([...cardContent.mock.calls[0]![1]].sort()).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 's1', 's2', 's3', 'sh']);
    expect(cardContent.mock.calls[0]![2]).toBe('vi');
  });
});
