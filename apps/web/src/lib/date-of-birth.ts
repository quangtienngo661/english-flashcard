// Birth date typed as day/month/year (copy doc §4.1: "14/5/2008"), checked by the API's own rule (person.ts): a real date,
// not before 1900-01-01, not after today, and 13 or older (29/2 counts as 1/3 in a non-leap year).
export const MIN_AGE = 13;
const FLOOR = '1900-01-01';

export type BirthDateProblem = 'invalid' | 'future' | 'tooYoung';

/** `dd/mm/yyyy` (leading zeros optional) → `YYYY-MM-DD`, or null when it is not a real date. */
export function parseBirthDate(text: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${match[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Same as the API's isOldEnough. */
export function isOldEnough(birthDate: string, today: string): boolean {
  const year = Number(birthDate.slice(0, 4)) + MIN_AGE;
  let monthDay = birthDate.slice(5);
  if (monthDay === '02-29' && !isLeapYear(year)) monthDay = '03-01';
  return today >= `${String(year).padStart(4, '0')}-${monthDay}`;
}

/** What is wrong with the typed date, given today's date (`YYYY-MM-DD`) in the device zone; null when it is fine. */
export function birthDateProblem(text: string, today: string): BirthDateProblem | null {
  const iso = parseBirthDate(text);
  if (iso === null || iso < FLOOR) return 'invalid';
  if (iso > today) return 'future';
  return isOldEnough(iso, today) ? null : 'tooYoung';
}

/** Today in the device's zone, as `YYYY-MM-DD`. */
export function deviceToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** `YYYY-MM-DD` → `d/m/yyyy` for a field's starting value. */
export function formatBirthDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${Number(day)}/${Number(month)}/${year}`;
}
