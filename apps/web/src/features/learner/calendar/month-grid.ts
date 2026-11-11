import { addDays, daysInMonth, weekdayMon0 } from '@/lib/learner-date';
import type { CalendarDay } from './calendar-api';

export type Band = 'none' | 'start' | 'middle' | 'end' | 'single';
export type GridCell = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  dots: { learn: boolean; review: boolean; practice: boolean };
  band: Band;
};

const NO_DOTS = { learn: false, review: false, practice: false };

/**
 * The weeks of `month`, Monday first, 4–6 rows as the month needs (Figma 102:3546). Dots come from that date's `days[]` row. A band joins
 * consecutive dates present in `days[]` and is cut at the row edges. Days of the adjacent months are a ghost number only: one request per
 * month (Part 6 decisions).
 */
export function monthGrid(month: string, today: string, days: CalendarDay[]): GridCell[][] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
  const start = addDays(first, -weekdayMon0(first));
  const rows = Math.ceil((weekdayMon0(first) + daysInMonth(month)) / 7);
  const studied = (date: string) => date >= first && date <= last && byDate.has(date);
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: 7 }, (_, column): GridCell => {
      const date = addDays(start, row * 7 + column);
      const inMonth = date >= first && date <= last;
      const counts = inMonth ? byDate.get(date) : undefined;
      let band: Band = 'none';
      if (studied(date)) {
        const before = column > 0 && studied(addDays(date, -1));
        const after = column < 6 && studied(addDays(date, 1));
        band = before && after ? 'middle' : before ? 'end' : after ? 'start' : 'single';
      }
      return {
        date,
        inMonth,
        isToday: date === today,
        isFuture: date > today,
        dots: counts ? { learn: counts.learned > 0, review: counts.reviewed > 0, practice: counts.practice_sessions > 0 } : NO_DOTS,
        band,
      };
    }),
  );
}
