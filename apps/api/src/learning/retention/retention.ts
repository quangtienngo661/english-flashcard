import { addDays, dateValue } from '../../common/time/local-date.js';

/**
 * D7 / D30 rules (nhóm B design §10, D39). Pure: every date is `YYYY-MM-DD`, and every number of days is whole calendar days.
 * A learner is "đang học" on day d when a learning day falls in [d − N + 1, d]; a cohort is the people who registered in one
 * Monday–Sunday week of the Vietnam calendar.
 */

/** The Monday of the Monday–Sunday week that holds `day`. */
export function weekStart(day: string): string {
  const sinceMonday = (dateValue(day).getUTCDay() + 6) % 7;
  return addDays(day, -sinceMonday);
}

/** Whether some day of [`day` − `n` + 1, `day`] is in `days`. */
export function activeOn(days: ReadonlySet<string>, day: string, n: number): boolean {
  for (let back = 0; back < n; back += 1) {
    if (days.has(addDays(day, -back))) return true;
  }
  return false;
}

export type Member = { userId: string; regDay: string };
/** `d7` / `d30` are counts of members still "đang học" (the admin shows the share); `null` before the day exists or for an empty cohort. */
export type CohortRow = { week_start: string; size: number; d7: number | null; d30: number | null };

const NO_DAYS: ReadonlySet<string> = new Set();

/**
 * One row per Monday from `firstWeek` to `lastWeek` (both Mondays), oldest first. A member belongs to `weekStart(regDay)`; members of a week
 * outside the range are left out. A member is measured on their own registration day + 7 (+ 30), so the number is only complete once the
 * last member of the week (a Sunday, `week_start + 6`) has reached it: `week_start + 13` (+ 36) ≤ `today`. Members with no activity stay in `size`.
 */
export function cohortRows(args: {
  firstWeek: string; lastWeek: string; members: Member[]; activity: Map<string, Set<string>>; today: string; n: number;
}): CohortRow[] {
  const { firstWeek, lastWeek, members, activity, today, n } = args;
  const byWeek = new Map<string, Member[]>();
  for (const member of members) {
    const week = weekStart(member.regDay);
    byWeek.set(week, [...(byWeek.get(week) ?? []), member]);
  }
  const stillLearning = (list: Member[], after: number) => list
    .filter((member) => activeOn(activity.get(member.userId) ?? NO_DAYS, addDays(member.regDay, after), n)).length;
  const rows: CohortRow[] = [];
  for (let week = firstWeek; week <= lastWeek; week = addDays(week, 7)) {
    const list = byWeek.get(week) ?? [];
    const d7 = list.length === 0 || addDays(week, 13) > today ? null : stillLearning(list, 7);
    const d30 = list.length === 0 || addDays(week, 36) > today ? null : stillLearning(list, 30);
    rows.push({ week_start: week, size: list.length, d7, d30 });
  }
  return rows;
}

/**
 * Today's two numbers. `inWindow` are the learners with a learning day in the window, `ever` those with any learning day; `excluded`
 * (staff) is taken out of both. "Đã ngừng" = ever learned, not in the window.
 */
export function todayCounts(args: { inWindow: string[]; ever: string[]; excluded: ReadonlySet<string> }): { active: number; stopped: number } {
  const active = new Set(args.inWindow.filter((userId) => !args.excluded.has(userId)));
  const stopped = new Set(args.ever.filter((userId) => !args.excluded.has(userId) && !active.has(userId)));
  return { active: active.size, stopped: stopped.size };
}
