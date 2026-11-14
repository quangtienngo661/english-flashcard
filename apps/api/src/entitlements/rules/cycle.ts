import { localDate, nextLocalMidnight } from '../../common/time/local-date.js';
import { AI_DAY_ZONE } from '../entitlements.constants.js';

// AI cycles (design §5.5, D13) are computed in UTC from the anchor; the system cap's day is the Vietnam date (§7.3).

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Same UTC day and time as `anchor`, `k` months later; the day is clamped to that month's last day (the anchor never drifts). */
export function addMonthsClamped(anchor: Date, k: number): Date {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + k;
  const day = Math.min(anchor.getUTCDate(), daysInMonth(year, month));
  return new Date(Date.UTC(
    year, month, day, anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds(),
  ));
}

/** The cycle `[addMonthsClamped(anchor, k), addMonthsClamped(anchor, k + 1))` that contains `now`; `k = 0` when `now < anchor`. */
export function cycleAt(anchor: Date, now: Date): { start: Date; end: Date } {
  let k = Math.max(
    0,
    (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + now.getUTCMonth() - anchor.getUTCMonth(),
  );
  while (k > 0 && addMonthsClamped(anchor, k) > now) k -= 1;
  while (addMonthsClamped(anchor, k + 1) <= now) k += 1;
  return { start: addMonthsClamped(anchor, k), end: addMonthsClamped(anchor, k + 1) };
}

/** The system cap's day (`YYYY-MM-DD`) at `now`. */
export function aiDay(now: Date): string {
  return localDate(AI_DAY_ZONE, now);
}

/** When the system cap's next day starts. */
export function nextAiDayStart(now: Date): Date {
  return nextLocalMidnight(AI_DAY_ZONE, now);
}
