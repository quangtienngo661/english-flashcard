import type { CalendarDayView, DayItem } from './calendar-api';

export type DayViewModel = {
  learned: DayItem[];
  known: DayItem[];
  again: DayItem[];
};

/** The Ngày dialog's lists from the loaded pages of `GET /v1/me/calendar/days/:date`. */
export function dayView(dayPages: CalendarDayView[]): DayViewModel {
  const items = dayPages.flatMap((page) => page.items);
  return {
    learned: items.filter((item) => item.kind === 'learned'),
    known: items.filter((item) => item.kind === 'reviewed' && item.result === 'known'),
    again: items.filter((item) => item.kind === 'reviewed' && item.result === 'again'),
  };
}
