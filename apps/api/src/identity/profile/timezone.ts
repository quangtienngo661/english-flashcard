const isOffset = (name: string): boolean => name.startsWith('+') || name.startsWith('-');

/** The name `Intl` resolves `input` to (any letter case, an alias such as `Asia/Ho_Chi_Minh` becomes `Asia/Saigon`), else null. */
function resolveTimeZone(input: string): string | null {
  try {
    return new Intl.DateTimeFormat('en', { timeZone: input }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/**
 * The one canonical spelling of an IANA zone name, so equal zones are stored and cached as equal strings.
 * Null for an invalid name and for an offset such as `+07:00`, which has no DST rules and is not a zone.
 */
export function canonicalTimeZone(input: string): string | null {
  const name = resolveTimeZone(input);
  return name === null || isOffset(name) ? null : name;
}

/**
 * A zone already stored in the database, made canonical: its canonical name; else a whole-hour offset as the matching
 * `Etc/GMT` zone (POSIX sign: `Etc/GMT-7` is UTC+7); else UTC (a fractional offset or an unknown name has no such zone).
 */
export function normalizeStoredTimeZone(raw: string): string {
  const name = resolveTimeZone(raw);
  if (name === null) return 'UTC';
  if (!isOffset(name)) return name;
  const match = /^([+-])(\d{2}):00$/.exec(name);
  const hours = match ? Number(match[2]) : 0;
  if (!match || hours === 0) return 'UTC';
  return canonicalTimeZone(`Etc/GMT${match[1] === '+' ? '-' : '+'}${hours}`) ?? 'UTC';
}
