const dateFormats = new Map<string, Intl.DateTimeFormat>();

function dateFormat(timeZone: string): Intl.DateTimeFormat {
  let format = dateFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    dateFormats.set(timeZone, format);
  }
  return format;
}

/** The calendar date (`YYYY-MM-DD`) in `timeZone` at the instant `at`. */
export function localDate(timeZone: string, at: Date): string {
  const parts = Object.fromEntries(dateFormat(timeZone).formatToParts(at).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** A `YYYY-MM-DD` date as the UTC-midnight Date Prisma uses for a `@db.Date` column. */
export function dateValue(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}
