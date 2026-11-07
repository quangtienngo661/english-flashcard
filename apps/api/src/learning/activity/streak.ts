import { addDays, dateString, dateValue } from '../../common/time/local-date.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

/** How many study days one read looks at; a streak longer than that is shown as 4000 (about eleven years). */
const READ_LIMIT = 4000;

/**
 * The study streak (round C, DC28): consecutive study days ending today, or ending yesterday when today is not studied yet (the
 * streak is still alive until the day ends). Dates are `YYYY-MM-DD` in the learner's zone, newest first; repeats and dates after
 * `today` are ignored.
 */
export function streakDays(studiedDatesDesc: string[], today: string): number {
  const days = new Set(studiedDatesDesc.filter((date) => date <= today));
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

/** The learner's streak on their local date `today`, reading through `db` (a caller inside a transaction passes its `tx`). */
export async function streakAsOf(
  db: Prisma.TransactionClient | PrismaClient, userId: string, today: string,
): Promise<{ days: number; studiedToday: boolean }> {
  const rows = await db.learningActivityDay.findMany({
    where: { userId, studied: true, localDate: { lte: dateValue(today) } },
    orderBy: { localDate: 'desc' }, take: READ_LIMIT, select: { localDate: true },
  });
  const dates = rows.map((row) => dateString(row.localDate));
  return { days: streakDays(dates, today), studiedToday: dates[0] === today };
}
