import { daysBetween, localDate, localTime } from '../../common/time/local-date.js';
import type { AppSettings } from '../../settings/index.js';
import type { ReminderKind } from '../provider/notification-provider.js';

/** The inactive email goes at most once in this many local days, whatever was sent before (D26). */
const INACTIVE_EVERY_DAYS = 7;

export type EligibilityInput = {
  now: Date;
  timezone: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  settings: AppSettings['reminders'];
  /**
   * Local dates (`YYYY-MM-DD`, last 7 local days) of reminders that went out or may have: `sent`, and `sending` left from an
   * earlier day (D37). They count toward `minGapDays` and the inactive cap.
   */
  sentDates: string[];
  /** Local dates of days marked `failed` (M7): they count toward the inactive cap only, so a regular email is retried. */
  failedDates: string[];
};

export type Eligibility =
  | { kind: ReminderKind; today: string }
  | { skip: 'before-time' | 'stopped' | 'gap' | 'inactive-cap' };

/**
 * Which reminder, if any, a learner may get now (design 8.2). Absence counts local calendar days in the learner's zone
 * (D44). Card counts, preferences and today's delivery row are checked by the caller.
 */
export function eligibility(input: EligibilityInput): Eligibility {
  const { now, timezone, settings, sentDates, failedDates } = input;
  const today = localDate(timezone, now);
  if (localTime(timezone, now) < settings.sendTime) return { skip: 'before-time' };
  const absent = daysBetween(localDate(timezone, input.lastSeenAt ?? input.createdAt), today);
  if (absent > settings.stopAfterDays) return { skip: 'stopped' };
  const since = (dates: string[]) => {
    const last = dates.toSorted().at(-1);
    return last === undefined ? Infinity : daysBetween(last, today);
  };
  if (absent >= settings.inactiveAfterDays) {
    return since([...sentDates, ...failedDates]) < INACTIVE_EVERY_DAYS ? { skip: 'inactive-cap' } : { kind: 'inactive', today };
  }
  return since(sentDates) < settings.minGapDays ? { skip: 'gap' } : { kind: 'regular', today };
}
