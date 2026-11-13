import { describe, expect, it } from 'vitest';
import { calendarDayParam, calendarDayQuery, calendarMonthQuery } from './calendar.schemas.js';

describe('calendarMonthQuery (giao diện mới §10.3)', () => {
  it.each(['2026-11', '2100-12', '2026-01'])('accepts %s', (month) => {
    expect(calendarMonthQuery.parse({ month })).toEqual({ month });
  });

  it.each(['2026-13', '26-11', '', '2025-12', '2101-01', '0001-01'])('rejects %s with an issue on month', (month) => {
    const result = calendarMonthQuery.safeParse({ month });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((p) => p.length === 1 && p[0] === 'month')).toBe(true);
  });

  it('rejects a missing month', () => {
    const result = calendarMonthQuery.safeParse({});
    expect(result.error!.issues.map((i) => i.path)).toEqual([['month']]);
  });
});

describe('calendarDayParam and calendarDayQuery', () => {
  it('accepts a real date and rejects 2026-02-30 on date', () => {
    expect(calendarDayParam.parse({ date: '2026-11-08' })).toEqual({ date: '2026-11-08' });
    const result = calendarDayParam.safeParse({ date: '2026-02-30' });
    expect(result.success).toBe(false);
    expect(result.error!.issues.every((i) => i.path.length === 1 && i.path[0] === 'date')).toBe(true);
  });

  it('defaults kind to all and page_size to 20, caps page_size at 100', () => {
    expect(calendarDayQuery.parse({})).toEqual({ kind: 'all', page_size: 20 });
    expect(calendarDayQuery.safeParse({ page_size: '101' }).success).toBe(false);
    expect(calendarDayQuery.safeParse({ kind: 'other' }).success).toBe(false);
  });
});
