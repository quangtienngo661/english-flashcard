import { localDate, zonedMidnight } from '../../common/time/local-date.js';
import { cycleAt } from './cycle.js';
import type { Resolved } from './plan-rules.js';

// The window in which AI uses are counted (launch prep A, design 6.2). Pro, trial and a limits grant with AI keep the cycle that
// starts at their anchor (D13). A Free account has no anchor: its window is the calendar month in the learner's own zone, and it
// starts only after the last time a Pro-like source ended inside that month, so uses made while Pro are not charged to Free.

export type Cycle = { start: Date; end: Date };

/** `YYYY-MM` of the month after `month`. */
function nextMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  return index === 12 ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, '0')}`;
}

/** `[00:00 on the 1st of the learner's month, 00:00 on the 1st of the next)`, DST included (`zonedMidnight` handles it). */
export function calendarMonthCycle(zone: string, now: Date): Cycle {
  const month = localDate(zone, now).slice(0, 7);
  return { start: zonedMidnight(zone, `${month}-01`), end: zonedMidnight(zone, `${nextMonth(month)}-01`) };
}

/**
 * The one place the AI window is decided. `lastEnd` is the end of the latest AI source inside this calendar month (`null` when
 * none, and always `null` for a caller that only handles Pro, such as the dashboard).
 * - an anchor → the cycle from the anchor (Pro, trial, or a limits grant with AI);
 * - no anchor, Free, some AI limit above 0 → the calendar month, starting at `lastEnd` when that is later than the month's start;
 * - otherwise `null` (a Pro or trial account without an anchor must not turn into a calendar month, LA3E6).
 */
export function aiCycle(resolved: Resolved, zone: string, now: Date, lastEnd: Date | null): Cycle | null {
  if (resolved.anchor) return cycleAt(resolved.anchor, now);
  if (resolved.plan !== 'free' || (resolved.limits.ai_practice <= 0 && resolved.limits.ai_lookup <= 0)) return null;
  const month = calendarMonthCycle(zone, now);
  return { start: lastEnd !== null && lastEnd > month.start ? lastEnd : month.start, end: month.end };
}
