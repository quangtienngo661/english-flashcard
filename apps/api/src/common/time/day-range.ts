import { ProblemDetailsException } from '../problem-details/problem-details.exception.js';
import { addDays, daysBetween, localDate, zonedMidnight } from './local-date.js';

/** The longest range an admin report reads (the AI costs report's limit, plan choice 15 of Bước 6). */
export const REPORT_RANGE_MAX_DAYS = 366;

/** Whole days `from`..`to` (`YYYY-MM-DD`) in one zone; `start` is `from`'s midnight, `end` the midnight after `to`. */
export type DayRange = { from: string; to: string; start: Date; end: Date };

/** Missing `to` = today, missing `from` = `defaultDays` days ending on `to`. A reversed or too long range → 400. */
export function dayRange(query: { from?: string; to?: string }, zone: string, now: Date, defaultDays: number): DayRange {
  const to = query.to ?? localDate(zone, now);
  const from = query.from ?? addDays(to, 1 - defaultDays);
  const violation = from > to ? 'from: Must not be after to'
    : daysBetween(from, to) + 1 > REPORT_RANGE_MAX_DAYS ? `to: The range must be at most ${REPORT_RANGE_MAX_DAYS} days` : null;
  if (violation) {
    throw new ProblemDetailsException({ status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations: [violation] } });
  }
  return { from, to, start: zonedMidnight(zone, from), end: zonedMidnight(zone, addDays(to, 1)) };
}

/** Every day of the range in order, for series that must show a day with no row as zero. */
export function daysOf(range: Pick<DayRange, 'from' | 'to'>): string[] {
  return Array.from({ length: daysBetween(range.from, range.to) + 1 }, (_, index) => addDays(range.from, index));
}
