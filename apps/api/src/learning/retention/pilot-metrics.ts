import { addDays } from '../../common/time/local-date.js';
import { weekStart } from './retention.js';

export type PilotWeekRow = {
  week: string;
  verified: number;
  orders_created: number;
  orders_paid: number;
};

export type RecallLevelRow = {
  level: number;
  due_answers: number;
  remembered: number;
};

/** Whether a member's first studied day is on or within one calendar day of registration. */
export function isActivated(regDay: string, firstStudyDay: string | null): boolean {
  if (firstStudyDay === null) return false;
  return firstStudyDay <= addDays(regDay, 1);
}

/** One row per Monday week from `firstWeek` to `lastWeek` (inclusive, oldest first). */
export function weekRows(args: {
  firstWeek: string;
  lastWeek: string;
  members: Array<{ regDay: string }>;
  orders: Array<{ day: string; paid: boolean }>;
}): PilotWeekRow[] {
  const { firstWeek, lastWeek, members, orders } = args;
  const verifiedByWeek = new Map<string, number>();
  for (const member of members) {
    const week = weekStart(member.regDay);
    verifiedByWeek.set(week, (verifiedByWeek.get(week) ?? 0) + 1);
  }
  const ordersByWeek = new Map<string, { created: number; paid: number }>();
  for (const order of orders) {
    const week = weekStart(order.day);
    const entry = ordersByWeek.get(week) ?? { created: 0, paid: 0 };
    entry.created += 1;
    if (order.paid) entry.paid += 1;
    ordersByWeek.set(week, entry);
  }
  const rows: PilotWeekRow[] = [];
  for (let week = firstWeek; week <= lastWeek; week = addDays(week, 7)) {
    const orderCounts = ordersByWeek.get(week) ?? { created: 0, paid: 0 };
    rows.push({
      week,
      verified: verifiedByWeek.get(week) ?? 0,
      orders_created: orderCounts.created,
      orders_paid: orderCounts.paid,
    });
  }
  return rows;
}

/** Group due review answers by `levelBefore`, counting rows with `levelAfter > levelBefore`, sorted by level. */
export function recallByLevel(rows: Array<{ levelBefore: number; levelAfter: number }>): RecallLevelRow[] {
  const byLevel = new Map<number, { due: number; remembered: number }>();
  for (const row of rows) {
    const entry = byLevel.get(row.levelBefore) ?? { due: 0, remembered: 0 };
    entry.due += 1;
    if (row.levelAfter > row.levelBefore) entry.remembered += 1;
    byLevel.set(row.levelBefore, entry);
  }
  return [...byLevel.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, counts]) => ({
      level,
      due_answers: counts.due,
      remembered: counts.remembered,
    }));
}
