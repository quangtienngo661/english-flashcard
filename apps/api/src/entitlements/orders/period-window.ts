import { addDays, localDate, zonedMidnight } from '../../common/time/local-date.js';

// Start and end of a prepaid Pro period (launch prep B design §3.7). Pure: the caller passes `now` and the learner's zone.

/** One source of Pro in time: a plan grant or a prepaid period. A revoked span never counts. */
export type ProSpan = { startsAt: Date; endsAt: Date; revokedAt: Date | null };

/**
 * Where the unbroken Pro that covers `now` ends, or null when none covers it. Start with t = now; while some span with
 * `startsAt ≤ t < endsAt` exists, t moves to the latest `endsAt` among them. A span that starts in the future joins only
 * when it begins at or before the end of the run before it. A new period starts at this point (or at `now` when null),
 * and the snapshot's `pro_until` is this point.
 */
export function continuousProUntil(spans: ProSpan[], now: Date): Date | null {
  const live = spans.filter((span) => span.revokedAt === null);
  let t = now;
  for (;;) {
    let next: Date | null = null;
    for (const span of live) {
      if (span.startsAt <= t && t < span.endsAt && (next === null || span.endsAt > next)) next = span.endsAt;
    }
    if (next === null) break;
    t = next;
  }
  return t === now ? null : t;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/**
 * Where a period that starts at `startsAt` ends: `months` calendar months later in the learner's zone (the day clamped to
 * the last day of that month), then rounded up to 00:00 of the next day in that zone; a start at exactly 00:00 keeps that
 * day. The learner never loses Pro before the day written on the screen; the first period may carry up to a day extra.
 */
export function periodEnd(startsAt: Date, months: 1 | 3 | 12, zone: string): Date {
  const startDate = localDate(zone, startsAt);
  const [year, month, day] = startDate.split('-').map(Number);
  const monthIndex = month - 1 + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = monthIndex % 12;
  const target = `${pad(targetYear, 4)}-${pad(targetMonth + 1)}-${pad(Math.min(day, daysInMonth(targetYear, targetMonth)))}`;
  const startsAtMidnight = startsAt.getTime() === zonedMidnight(zone, startDate).getTime();
  return zonedMidnight(zone, startsAtMidnight ? target : addDays(target, 1));
}

/** The last calendar day the period covers ('tới hết'): the day of `endsAt − 1 ms` in the zone, as `YYYY-MM-DD`. */
export function lastCoveredDay(endsAt: Date, zone: string): string {
  return localDate(zone, new Date(endsAt.getTime() - 1));
}
