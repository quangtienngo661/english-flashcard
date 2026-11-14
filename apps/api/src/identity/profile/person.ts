import { z } from 'zod';

export const MIN_AGE = 13;
const NAME_MAX = 50;
const BIRTH_DATE_FLOOR = '1900-01-01';

const normalizeName = (value: string): string => value.normalize('NFC').trim();
const validName = (value: string): boolean =>
  [...value].length >= 1 && [...value].length <= NAME_MAX && !/\p{Cc}/u.test(value);

/** NFC + trim, then 1-50 code points with no control characters. */
export const personNameSchema = z.string().transform(normalizeName).refine(validName);

/** Same rule, but `null` is allowed and a string empty after trim becomes `null`. */
export const optionalPersonNameSchema = z
  .string()
  .nullable()
  .transform((value) => (value === null ? null : normalizeName(value)))
  .transform((value) => (value === '' ? null : value))
  .refine((value) => value === null || validName(value));

const isRealDate = (value: string): boolean => {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

/** Shape, real calendar date and the 1900-01-01 floor. "Not after today" is the service's job. */
export const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealDate)
  .refine((value) => value >= BIRTH_DATE_FLOOR);

const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** True when `today` is on or after the `minAge`-th birthday (29 Feb -> 1 Mar in a non-leap year). */
export function isOldEnough(birthDate: string, today: string, minAge: number): boolean {
  const year = Number(birthDate.slice(0, 4)) + minAge;
  let monthDay = birthDate.slice(5);
  if (monthDay === '02-29' && !isLeapYear(year)) monthDay = '03-01';
  const birthday = `${String(year).padStart(4, '0')}-${monthDay}`;
  return today >= birthday;
}
