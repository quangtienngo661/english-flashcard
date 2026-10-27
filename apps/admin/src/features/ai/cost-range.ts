import { ADMIN_ZONE } from '../transactions/transactions-api';

/** The longest range the costs API accepts, counting both end days. */
export const MAX_RANGE_DAYS = 366;
const DAY_MS = 86_400_000;
const DAY = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: ADMIN_ZONE });

/** Today's Vietnam day as `YYYY-MM-DD`: what the costs API uses when `from` or `to` is left out. */
export const todayInAdminZone = (now: Date): string => DAY.format(now);

/** A `YYYY-MM-DD` that is a real calendar day. */
export const isDay = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

export type RangeProblem = { from?: 'required' | 'fromAfterTo'; to?: 'required' | 'tooLong' };

/** What the API would answer 400 to, found before asking (design §6.6): the field it belongs to and which message. */
export function rangeProblem(from: string, to: string): RangeProblem | null {
  if (!isDay(from)) return { from: 'required' };
  if (!isDay(to)) return { to: 'required' };
  if (from > to) return { from: 'fromAfterTo' };
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
  return days > MAX_RANGE_DAYS ? { to: 'tooLong' } : null;
}
