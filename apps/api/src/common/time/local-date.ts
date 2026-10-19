const formats = new Map<string, Intl.DateTimeFormat>();
const DAY_MS = 86_400_000;

function format(timeZone: string): Intl.DateTimeFormat {
  let value = formats.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    formats.set(timeZone, value);
  }
  return value;
}

function parts(timeZone: string, at: Date): Record<string, string> {
  return Object.fromEntries(format(timeZone).formatToParts(at).map(({ type, value }) => [type, value]));
}

/** The calendar date (`YYYY-MM-DD`) in `timeZone` at the instant `at`. */
export function localDate(timeZone: string, at: Date): string {
  const { year, month, day } = parts(timeZone, at);
  return `${year}-${month}-${day}`;
}

/** The zone's offset from UTC (ms) in force at the instant `at`, to the minute. */
function offsetMs(timeZone: string, at: Date): number {
  const { year, month, day, hour, minute } = parts(timeZone, at);
  const minuteStart = Math.floor(at.getTime() / 60_000) * 60_000;
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) - minuteStart;
}

/**
 * The UTC instant of 00:00 of `date` (`YYYY-MM-DD`) in `timeZone`; on a day where DST skips midnight, the first instant
 * of that date. The offset at the first guess may be the wrong side of a change, so the offset at the corrected instant
 * gives a second candidate; the earlier candidate that falls on `date` wins.
 */
export function zonedMidnight(timeZone: string, date: string): Date {
  const guess = dateValue(date).getTime();
  const first = new Date(guess - offsetMs(timeZone, new Date(guess)));
  const second = new Date(guess - offsetMs(timeZone, first));
  const onDate = [first, second].filter((at) => localDate(timeZone, at) === date);
  return onDate.reduce((earliest, at) => (at < earliest ? at : earliest), onDate[0] ?? second);
}

/** The next 00:00 in `timeZone` strictly after `now`. */
export function nextLocalMidnight(timeZone: string, now: Date): Date {
  return zonedMidnight(timeZone, addDays(localDate(timeZone, now), 1));
}

/** The wall-clock time (`HH:MM`, 00–23) in `timeZone` at the instant `at`. */
export function localTime(timeZone: string, at: Date): string {
  const { hour, minute } = parts(timeZone, at);
  return `${hour}:${minute}`;
}

/** A `YYYY-MM-DD` date as the UTC-midnight Date Prisma uses for a `@db.Date` column. */
export function dateValue(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** A `@db.Date` value back to `YYYY-MM-DD`. */
export function dateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return dateString(new Date(dateValue(date).getTime() + days * DAY_MS));
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((dateValue(to).getTime() - dateValue(from).getTime()) / DAY_MS);
}
