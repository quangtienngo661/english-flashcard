import { describe, expect, it, vi } from 'vitest';
import { OPTIONAL_DEPS_METADATA, PARAMTYPES_METADATA } from '@nestjs/common/constants.js';
import { encodeBoundToken } from '../../common/pagination/page-token.util.js';
import type { ContentService } from '../../content/content.service.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { PracticeDayCounts } from '../practice-day-counts.port.js';
import { CalendarService } from './calendar.service.js';

const at = (iso: string) => new Date(iso);
const day = (d: string) => new Date(`${d}T00:00:00Z`);

function build(rows: Array<Record<string, unknown>>, studyDays = 2, visible: Record<string, string> = {}) {
  const sql: Array<{ text: string; values: unknown[] }> = [];
  const prisma = {
    $queryRaw: vi.fn(async (query: { sql?: string; strings?: string[]; values?: unknown[] }) => {
      sql.push({ text: query.sql ?? query.strings?.join('?') ?? '', values: query.values ?? [] });
      return rows;
    }),
    learningActivityDay: { count: vi.fn(async () => studyDays) },
  } as unknown as PrismaClient & { learningActivityDay: { count: ReturnType<typeof vi.fn> } };
  const practice: PracticeDayCounts = {
    countByLocalDate: vi.fn(async () => [{ date: '2026-11-09', sessions: 1, questions: 6, correct: 4 }]),
    sessionsOfDay: vi.fn(async () => [
      { sessionId: 'p1', firstPosition: 1, lastPosition: 10, questions: 10, correct: 7 },
      { sessionId: 'p2', firstPosition: 11, lastPosition: 18, questions: 8, correct: 6 },
    ]),
  };
  const content = {
    cardContent: vi.fn(async (_u: string, ids: string[]) =>
      new Map(ids.filter((id) => id in visible).map((id) => [id, { lemma: visible[id] }]))),
  } as unknown as ContentService & { cardContent: ReturnType<typeof vi.fn> };
  return { service: new CalendarService(prisma, practice, content), prisma, practice, content, sql };
}

describe('CalendarService.month', () => {
  it('reads the month bounds from the month string and returns the exact view', async () => {
    const rows = [
      { local_date: day('2026-11-08'), item_id: 'i1', sense_id: 's1', group_id: 'g1', level_before: 0, level_after: 1, rating: 'Good', at: at('2026-11-08T03:00:00Z') },
      { local_date: day('2026-11-08'), item_id: 'i2', sense_id: 's2', group_id: 'g1', level_before: 2, level_after: 3, rating: 'Again', at: at('2026-11-08T03:01:00Z') },
    ];
    const { service, prisma, practice, sql } = build(rows);
    const view = await service.month('u1', '2026-11');
    expect(practice.countByLocalDate).toHaveBeenCalledExactlyOnceWith('u1', '2026-11-01', '2026-11-30');
    expect(sql).toHaveLength(1);
    expect(sql[0]!.text).toContain("kind = 'review'");
    expect(sql[0]!.values).toEqual(['u1', '2026-11-01', '2026-11-30']);
    expect(prisma.learningActivityDay.count).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 'u1', studied: true, localDate: { gte: day('2026-11-01'), lte: day('2026-11-30') } },
    });
    expect(view).toEqual({
      month: '2026-11',
      days: [
        { date: '2026-11-08', learned: 1, reviewed: 1, practice_sessions: 0 },
        { date: '2026-11-09', learned: 0, reviewed: 0, practice_sessions: 1 },
      ],
      totals: { study_days: 2, learned: 1, reviewed: 1, practice_sessions: 1 },
    });
  });

  it('injects the practice port without @Optional(), so a missing provider fails at boot', () => {
    const optional: number[] = Reflect.getMetadata(OPTIONAL_DEPS_METADATA, CalendarService) ?? [];
    const params = Reflect.getMetadata(PARAMTYPES_METADATA, CalendarService) as unknown[];
    expect(params).toHaveLength(3);
    expect(optional).not.toContain(1);
  });
});

const isBadToken = (e: unknown) => {
  const err = e as { getStatus(): number; problemType: string; extensions?: unknown };
  return err.getStatus() === 400 && err.problemType === 'validation-failed' && err.extensions === undefined;
};

describe('CalendarService.day', () => {
  const learner = { userId: 'u1', nativeLanguage: 'vi' as const };
  const r = (item: string, before: number, after: number, rating: 'Good' | 'Again', sec: number, group: string | null = 'g1') => ({
    local_date: day('2026-11-08'), item_id: item, sense_id: `s-${item}`, group_id: group, level_before: before,
    level_after: after, rating, at: at(`2026-11-08T03:00:${String(sec).padStart(2, '0')}Z`),
  });
  // i1 learned then reviewed (Again); i2 reviewed twice (Good); i3 learned in a group g2; i4 reviewed, its sense hidden.
  const rows = [r('i1', 0, 1, 'Good', 1), r('i2', 2, 3, 'Good', 2), r('i3', 0, 1, 'Good', 3, 'g2'), r('i1', 1, 1, 'Again', 4),
    r('i2', 3, 4, 'Good', 5), r('i4', 1, 2, 'Good', 6)];
  const visible = { 's-i1': 'allocate', 's-i2': 'mitigate', 's-i3': 'yield' };
  const counts = { learned: 2, reviewed: 4, reviewed_known: 3, reviewed_again: 1, learned_groups: 2, practice_questions: 18 };

  it('returns whole-day counts for kind=all and kind=reviewed alike, and snake_case practice sessions', async () => {
    const { service, sql, practice } = build(rows, 1, visible);
    const all = await service.day(learner, '2026-11-08', { kind: 'all', page_size: 20 });
    const reviewed = await service.day(learner, '2026-11-08', { kind: 'reviewed', page_size: 20 });
    expect(all.counts).toEqual(counts);
    expect(reviewed.counts).toEqual(counts);
    expect(sql[0]!.values).toEqual(['u1', '2026-11-08', '2026-11-08']);
    expect(practice.sessionsOfDay).toHaveBeenCalledWith('u1', '2026-11-08');
    expect(all.practice_sessions).toEqual([
      { session_id: 'p1', first_position: 1, last_position: 10, questions: 10, correct: 7 },
      { session_id: 'p2', first_position: 11, last_position: 18, questions: 8, correct: 6 },
    ]);
    expect(reviewed.items.map((i) => [i.kind, i.item_id])).toEqual([['reviewed', 'i4'], ['reviewed', 'i2'], ['reviewed', 'i1']]);
    expect(all.date).toBe('2026-11-08');
    expect(all.next_page_token).toBeNull();
  });

  it('calls cardContent once with the page sense ids; a hidden sense gives lemma null', async () => {
    const { service, content } = build(rows, 1, visible);
    const view = await service.day(learner, '2026-11-08', { kind: 'all', page_size: 2 });
    expect(content.cardContent).toHaveBeenCalledExactlyOnceWith('u1', ['s-i4', 's-i2'], 'vi');
    expect(view.items).toEqual([
      { kind: 'reviewed', item_id: 'i4', lemma: null, group_id: 'g1', result: 'known', times: 1 },
      { kind: 'reviewed', item_id: 'i2', lemma: 'mitigate', group_id: 'g1', result: 'known', times: 2 },
    ]);
    expect(view.next_page_token).not.toBeNull();
    const next = await service.day(learner, '2026-11-08', { kind: 'all', page_size: 2, page_token: view.next_page_token! });
    expect(next.items.map((i) => [i.kind, i.item_id])).toEqual([['reviewed', 'i1'], ['learned', 'i3']]);
  });

  it('a token minted for another kind or another date is a 400 validation-failed', async () => {
    const { service } = build(rows, 1, visible);
    const learnedToken = encodeBoundToken({ at: '2026-11-08T03:00:03.000Z', id: 'i3', k: 'learned' }, '2026-11-08|learned');
    await expect(service.day(learner, '2026-11-08', { kind: 'reviewed', page_size: 20, page_token: learnedToken }))
      .rejects.toSatisfy(isBadToken);
    const otherDay = encodeBoundToken({ at: '2026-11-08T03:00:03.000Z', id: 'i3', k: 'learned' }, '2026-11-08|all');
    await expect(service.day(learner, '2026-11-09', { kind: 'all', page_size: 20, page_token: otherDay }))
      .rejects.toSatisfy(isBadToken);
  });
});
