import { describe, expect, it, vi } from 'vitest';
import { OPTIONAL_DEPS_METADATA, PARAMTYPES_METADATA } from '@nestjs/common/constants.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { PracticeDayCounts } from '../practice-day-counts.port.js';
import { CalendarService } from './calendar.service.js';

const at = (iso: string) => new Date(iso);
const day = (d: string) => new Date(`${d}T00:00:00Z`);

function build(rows: Array<Record<string, unknown>>, studyDays = 2) {
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
    sessionsOfDay: vi.fn(async () => []),
  };
  return { service: new CalendarService(prisma, practice), prisma, practice, sql };
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
    expect(params).toHaveLength(2);
    expect(optional).not.toContain(1);
  });
});
