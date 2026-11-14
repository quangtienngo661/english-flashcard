import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { decodeBoundToken } from '../../common/pagination/page-token.util.js';
import type { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import type { GroupsService } from '../groups/groups.service.js';
import { groupItemsQuery } from './items.schemas.js';
import { ItemsService } from './items.service.js';

// Deck page word list (owner 27/10/2026, option B of docs/research/2026-10-27-pagination-impact.md): the list pages through
// GET /v1/groups/:id/items with an optional `section` filter and the card content, instead of loading the whole queue.
const row = (n: number, over: Partial<{ level: number; priority: boolean; due: string; sense: string }> = {}) => ({
  addedAt: new Date(`2026-10-0${n}T00:00:00Z`), itemId: `i${n}`,
  item: {
    id: `i${n}`, senseId: over.sense ?? `s${n}`, level: over.level ?? 1, dueDate: new Date(`${over.due ?? '2026-10-19'}T00:00:00Z`),
    priority: over.priority ?? false, _count: { groups: 1 },
  },
});

function setup(rows: ReturnType<typeof row>[]) {
  const findMany = vi.fn(async () => rows);
  const prisma = { groupItem: { findMany } } as unknown as PrismaClient;
  const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
  const groups = { assertOwned: vi.fn(async () => ({})) } as unknown as GroupsService;
  const content = {
    visibleSenseIds: vi.fn(async (_v: string, ids: string[]) => new Set(ids)),
    // `gone` has no content any more (hidden between the two reads).
    cardContent: vi.fn(async (_v: string, ids: string[]) => new Map(ids.filter((id) => id !== 'gone').map((id) => [id, {
      lemma: `w-${id}`, pos: 'noun', meaning: { text: `m-${id}`, language: 'vi', translation_missing: false }, examples: [],
    }]))),
    listSentences: vi.fn(async () => new Map([['s1', [{ text: 'I saw it.' }]]])),
  } as unknown as ContentService;
  // 2026-10-19 03:00 UTC = 10:00 on 19/10 in Ho Chi Minh: today is 2026-10-19.
  const service = new ItemsService(prisma, new FakeClock(new Date('2026-10-19T03:00:00Z')), identity, content, groups, settings);
  return { service, findMany, content };
}

describe('GET /v1/groups/:id/items for the deck page', () => {
  it('the query accepts section=priority|due|new and content=true, and still rejects unknown values', () => {
    expect(groupItemsQuery.parse({ section: 'due', content: 'true' })).toMatchObject({ section: 'due', content: true, page_size: 20 });
    expect(groupItemsQuery.safeParse({ section: 'early' }).success).toBe(false);
  });

  it('section=due keeps due, non-priority, not-backlog cards of today in the learner zone', async () => {
    const { service, findMany } = setup([]);
    await service.listGroup('u1', 'g1', { section: 'due', page_size: 20 }, 'vi');
    const where = (findMany.mock.calls[0] as unknown as [{ where: { item: unknown } }])[0].where.item;
    expect(where).toEqual({ AND: [{}, { priority: false, level: { gte: 1 }, dueDate: { lte: new Date('2026-10-19T00:00:00Z'), gte: new Date('2026-08-20T00:00:00Z') } }] });
  });

  it('section=priority leaves out backlog cards; section=new keeps level 0 that is not priority', async () => {
    const { service, findMany } = setup([]);
    await service.listGroup('u1', 'g1', { section: 'priority', page_size: 20 }, 'vi');
    await service.listGroup('u1', 'g1', { section: 'new', page_size: 20 }, 'vi');
    const items = findMany.mock.calls.map((c) => (c as unknown as [{ where: { item: { AND: unknown[] } } }])[0].where.item.AND[1]);
    expect(items[0]).toEqual({ priority: true, OR: [{ level: 0 }, { dueDate: { gte: new Date('2026-08-20T00:00:00Z') } }] });
    expect(items[1]).toEqual({ priority: false, level: 0 });
  });

  it('content=true adds the card content, its saved sentences and the section; a row without content is left out', async () => {
    const { service } = setup([row(1), row(2, { level: 0, sense: 'gone' }), row(3, { level: 0 })]);
    const page = await service.listGroup('u1', 'g1', { content: true, page_size: 20 }, 'vi');
    expect(page.items.map((i) => i.item_id)).toEqual(['i1', 'i3']);
    expect(page.items[0]).toMatchObject({ section: 'due', content: { lemma: 'w-s1', sentences: ['I saw it.'] } });
    expect(page.items[1]).toMatchObject({ section: 'new' });
  });

  it('without content the item shape is unchanged (no content, no section): additive only (SR7)', async () => {
    const { service, content } = setup([row(1)]);
    const page = await service.listGroup('u1', 'g1', { page_size: 20 }, 'vi');
    expect(Object.keys(page.items[0]).sort()).toEqual(['added_at', 'due_date', 'group_count', 'item_id', 'level', 'priority', 'sense_changed', 'sense_id']);
    expect(content.cardContent).not.toHaveBeenCalled();
  });

  it('the page token is bound to the section and to the day, so a token from yesterday or another filter is refused', async () => {
    const { service } = setup([row(1), row(2)]);
    const page = await service.listGroup('u1', 'g1', { section: 'due', page_size: 1 }, 'vi');
    expect(decodeBoundToken(page.next_page_token!, 'g1::due:2026-10-19')).toMatchObject({ id: 'i1' });
    await expect(service.listGroup('u1', 'g1', { section: 'new', page_size: 1, page_token: page.next_page_token! }, 'vi'))
      .rejects.toMatchObject({ status: 400 });
  });
});
