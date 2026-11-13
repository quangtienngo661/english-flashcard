'use client';

import { useSession } from '@/app-shell/session/session-context';

/**
 * Calendar days in the learner's zone (design §10.4): "today", the current month, "/8" and the calendar button's day come from
 * `me.timezone`, never from the device or the server. Dates are `YYYY-MM-DD`, months `YYYY-MM`; the arithmetic is on UTC days,
 * so no zone is involved once the day is known.
 */
export function useLearnerZone(): string {
  const { state } = useSession();
  return state.status === 'signed-in' || state.status === 'change-password' ? state.me.timezone : 'UTC';
}

const DAY_MS = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

/** The learner's calendar day at `now` (as `L/practice/days.ts` does). */
export function todayIn(zone: string, now: Date): string {
  let format = formatters.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatters.set(zone, format);
  }
  return format.format(now);
}

export const monthOf = (date: string): string => date.slice(0, 7);

const toUtc = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (date: string, n: number): string => fromUtc(toUtc(date) + n * DAY_MS);

export function addMonths(month: string, n: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n;
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export const daysInMonth = (month: string): number => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();

/** Monday = 0 … Sunday = 6. */
export const weekdayMon0 = (date: string): number => (new Date(toUtc(date)).getUTCDay() + 6) % 7;

/** The "/8" of "ngày có học": today's day in the current month, the month's length for a past month, 0 for a future one. */
export function elapsedDays(month: string, today: string): number {
  const current = monthOf(today);
  if (month === current) return Number(today.slice(8, 10));
  return month < current ? daysInMonth(month) : 0;
}
