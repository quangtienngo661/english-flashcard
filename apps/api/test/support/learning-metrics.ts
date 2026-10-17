import { addDays, dateString, dateValue } from '../../src/common/time/local-date.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

export type LearningMetrics = {
  /** item_added rows per ISO week (`YYYY-Www`) of their local date. */
  weeklyAdds: Record<string, number>;
  /** Scheduled due dates whose 48-hour window closed inside [from, to], and how many got an answer in that window. */
  due: { total: number; answeredWithin48h: number; share: number | null };
  /** Local dates with at least one log row, ascending. */
  activeDays: string[];
};

function isoWeek(date: string): string {
  const day = dateValue(date);
  // The ISO week belongs to the year of its Thursday.
  const thursday = new Date(day.getTime() + (3 - ((day.getUTCDay() + 6) % 7)) * 86_400_000);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = 1 + Math.floor((thursday.getTime() - yearStart) / (7 * 86_400_000));
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * LR14 / B3#20, computed from learning_log alone (from/to are local dates, inclusive). A due date is scheduled by a
 * "known" answer that moved it; it counts as answered within 48 hours when a later review of the item falls on that date
 * or the next one.
 */
export async function learningMetrics(prisma: PrismaClient, userId: string, from: string, to: string): Promise<LearningMetrics> {
  const rows = await prisma.learningLogEntry.findMany({
    where: { userId, localDate: { gte: dateValue(addDays(from, -1)), lte: dateValue(to) } },
    orderBy: [{ at: 'asc' }, { id: 'asc' }],
  });
  const inRange = rows.filter((row) => dateString(row.localDate) >= from);

  const weeklyAdds: Record<string, number> = {};
  for (const row of inRange) {
    if (row.kind !== 'item_added') continue;
    const week = isoWeek(dateString(row.localDate));
    weeklyAdds[week] = (weeklyAdds[week] ?? 0) + 1;
  }

  const reviews = rows.filter((row) => row.kind === 'review');
  let total = 0;
  let answeredWithin48h = 0;
  reviews.forEach((row, index) => {
    if (row.answer !== 'known' || row.dueAfter === null || row.dueBefore === null) return;
    const due = dateString(row.dueAfter);
    if (due === dateString(row.dueBefore) || due < from || addDays(due, 1) > to) return;
    total += 1;
    const answered = reviews.slice(index + 1).some((later) => later.itemId === row.itemId
      && dateString(later.localDate) >= due && dateString(later.localDate) <= addDays(due, 1));
    if (answered) answeredWithin48h += 1;
  });

  return {
    weeklyAdds,
    due: { total, answeredWithin48h, share: total === 0 ? null : answeredWithin48h / total },
    activeDays: [...new Set(inRange.map((row) => dateString(row.localDate)))].sort(),
  };
}
