import { describe, expect, it } from 'vitest';
import { calendarMonthQuery } from './calendar.schemas.js';

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
