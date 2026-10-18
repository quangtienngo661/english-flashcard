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
