import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { ContentService } from '../../content/content.service.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { LearningService } from '../../learning/index.js';
import type { PracticeStats } from '../weak/practice-stats.js';
import { startBody } from '../sessions/sessions.controller.js';
import { HistoryService } from './history.service.js';

// API (b), design §8.2: weak words by deck (GB1–GB5, GB7); GB6 and GB8 are in sessions.service.spec.ts.
const weak = (senseId: string, at: string) => ({ item: { sense_id: senseId, level: 1 }, stats: { wrong: 2, counted: 5, last_wrong_at: at } });
const WEAK = [weak('s1', '2026-10-21T03:00:00.000Z'), weak('s2', '2026-10-20T03:00:00.000Z'), weak('s3', '2026-10-19T03:00:00.000Z'), weak('s4', '2026-10-18T03:00:00.000Z')];
const G = '11111111-1111-4111-8111-111111111111';

function make(groupSenses: Record<string, string[]>, groupsOf: Record<string, Array<{ id: string; name: string }>> = {}) {
  const prisma = { $queryRaw: async () => WEAK.map((w) => ({ sense_id: w.item.sense_id, lemma: `w-${w.item.sense_id}` })) } as unknown as PrismaClient;
  const stats = { weakSenses: async () => WEAK } as unknown as PracticeStats;
  const content = { practiceSenses: async () => new Map() } as unknown as ContentService;
  const learning = {
    practiceItems: vi.fn(async (_u: string, scope: { kind: string; groupId?: string }) => {
      if (scope.kind !== 'group') return [];
      const senses = groupSenses[scope.groupId!];
      if (!senses) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
      return senses.map((sense_id) => ({ sense_id }));
    }),
    groupsOfSenses: vi.fn(async (_u: string, senseIds: string[]) => new Map(senseIds.map((id) => [id, groupsOf[id] ?? []]))),
  };
  return { service: new HistoryService(prisma, stats, content, learning as unknown as LearningService), learning };
}

describe('GET /v1/practice/weak-words?group_id= (API (b))', () => {
  it('GB1: only the weak words in that deck, in the same order as the unfiltered list', async () => {
    const { service, learning } = make({ [G]: ['s3', 's1', 's4', 'x9'] });
    const all = await service.weakWords('u1', 'vi', { page_size: 20 });
    const deck = await service.weakWords('u1', 'vi', { page_size: 20, group_id: G });
    expect(deck.items.map((i) => i.sense_id)).toEqual(all.items.map((i) => i.sense_id).filter((id) => ['s1', 's3', 's4'].includes(id)));
    expect(learning.practiceItems).toHaveBeenCalledWith('u1', { kind: 'group', groupId: G, filter: 'all' });
  });

  it("GB2: another learner's or a deleted deck → 404 not-found", async () => {
    const { service } = make({});
    const error = await service.weakWords('u1', 'vi', { page_size: 20, group_id: G }).catch((e: unknown) => e);
    expect((error as ProblemDetailsException).getStatus()).toBe(404);
  });

  it('GB3: a deck without weak words → 200 with no items', async () => {
    const { service } = make({ [G]: ['x9'] });
    expect((await service.weakWords('u1', 'vi', { page_size: 20, group_id: G })).items).toEqual([]);
  });

  it('GB4: a page token of the unfiltered list is refused with a deck filter (and the other way round)', async () => {
    const { service } = make({ [G]: ['s1', 's2', 's3'] });
    const unfiltered = await service.weakWords('u1', 'vi', { page_size: 1 });
    await expect(service.weakWords('u1', 'vi', { page_size: 1, group_id: G, page_token: unfiltered.next_page_token! })).rejects.toBeInstanceOf(ProblemDetailsException);
    const filtered = await service.weakWords('u1', 'vi', { page_size: 1, group_id: G });
    await expect(service.weakWords('u1', 'vi', { page_size: 1, page_token: filtered.next_page_token! })).rejects.toBeInstanceOf(ProblemDetailsException);
    expect((await service.weakWords('u1', 'vi', { page_size: 1, group_id: G, page_token: filtered.next_page_token! })).items).toHaveLength(1);
  });
});

describe('GET /v1/practice/weak-words/groups (API (b))', () => {
  it('GB5: a word in two decks counts in both; total counts it once; most first, then by name; empty decks absent', async () => {
    const A = { id: 'ga', name: 'Công nghệ' };
    const B = { id: 'gb', name: 'Du lịch' };
    const C = { id: 'gc', name: 'An toàn' };
    const { service } = make({}, { s1: [A, B], s2: [A], s3: [B], s4: [C] });
    expect(await service.weakGroups('u1')).toEqual({
      total: 4,
      items: [{ group_id: 'ga', name: 'Công nghệ', count: 2 }, { group_id: 'gb', name: 'Du lịch', count: 2 }, { group_id: 'gc', name: 'An toàn', count: 1 }],
    });
  });
});

describe('POST /v1/practice/sessions body (API (b))', () => {
  it('group_id is allowed with weak, still required with group, still refused with the others (GB7); group_filter only with group', () => {
    expect(startBody.safeParse({ source: 'weak', group_id: G, types: ['type_word'] }).success).toBe(true);
    expect(startBody.safeParse({ source: 'weak', types: ['type_word'] }).success).toBe(true);
    expect(startBody.safeParse({ source: 'group', types: ['type_word'] }).success).toBe(false);
    expect(startBody.safeParse({ source: 'today', group_id: G, types: ['type_word'] }).success).toBe(false);
    expect(startBody.safeParse({ source: 'weak', group_id: G, group_filter: 'due', types: ['type_word'] }).success).toBe(false);
  });
});
