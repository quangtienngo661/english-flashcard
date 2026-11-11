import { addDays, monthOf } from '@/lib/learner-date';

export type CalendarView =
  | { view: 'none' }
  | { view: 'month'; month: string }
  | { view: 'day'; month: string; date: string }
  | { view: 'invalid' };

// The API's range (design §10.3): 2026-01 … 2100-12.
export const FIRST_MONTH = '2026-01';
const LAST_MONTH = '2100-12';
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const inRange = (month: string) => month >= FIRST_MONTH && month <= LAST_MONTH;
// A real calendar day: `2026-02-30` does not survive a round trip.
const isDate = (value: string) => DATE.test(value) && addDays(value, 0) === value && inRange(monthOf(value));

/**
 * `?lich=` / `?ngay=` (design §5.6): an empty `?lich` is the current month; `?ngay=` wins over `?lich=`; a malformed value or one outside
 * 2026-01 … 2100-12 is `invalid` (the host strips it). Future months and days are valid and show empty.
 */
export function parseCalendar(search: URLSearchParams, today: string): CalendarView {
  const day = search.get('ngay');
  const month = search.get('lich');
  if (day !== null) return isDate(day) ? { view: 'day', month: monthOf(day), date: day } : { view: 'invalid' };
  if (month === null) return { view: 'none' };
  if (month === '') return { view: 'month', month: monthOf(today) };
  return MONTH.test(month) && inRange(month) ? { view: 'month', month } : { view: 'invalid' };
}

/** The current path and query with the calendar parameters set (`null` removes one); other parameters stay. */
export function calendarHref(pathname: string, search: string, set: { lich?: string | null; ngay?: string | null }): string {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(set)) {
    if (value === null) params.delete(key);
    else if (value !== undefined) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
