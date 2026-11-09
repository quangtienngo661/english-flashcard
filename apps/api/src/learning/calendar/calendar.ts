import { addDays } from '../../common/time/local-date.js';
import type { PracticeDayCount } from '../practice-day-counts.port.js';

// Pure aggregation behind the study calendar (design giao diện mới §10.2, §10.5). Rows are `learning_log` rows of
// kind `review`; everything here is a function of them, so every edge case of §10.3 is tested without a database.

export type DayKind = 'learned' | 'reviewed';

export type ReviewRow = {
  localDate: string;
  itemId: string;
  senseId: string;
  groupId: string | null;
  levelBefore: number | null;
  levelAfter: number | null;
  rating: 'Good' | 'Again' | null;
  at: Date;
};

export type DayItem = {
  kind: DayKind;
  itemId: string;
  senseId: string;
  groupId: string | null;
  result: 'known' | 'again' | null;
  times: number;
  lastAt: Date;
};

export type DayCursor = { at: string; id: string; k: DayKind };

export type CalendarMonthView = {
  month: string;
  days: { date: string; learned: number; reviewed: number; practice_sessions: number }[];
  totals: { study_days: number; learned: number; reviewed: number; practice_sessions: number };
};

export type DayCounts = {
  learned: number;
  reviewed: number;
  reviewed_known: number;
  reviewed_again: number;
  learned_groups: number;
};

/** First and last date of a `YYYY-MM` month; uses the string only, never a clock. */
export function monthBounds(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  const [year, mon] = month.split('-').map(Number) as [number, number];
  const nextMonth = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`;
  return { from, to: addDays(`${nextMonth}-01`, -1) };
}

/** A row that moved a word out of the "new" box (level 0 → ≥ 1) is `learned`; every other review row is `reviewed`. */
export function classify(row: Pick<ReviewRow, 'levelBefore' | 'levelAfter'>): DayKind {
  return row.levelBefore === 0 && row.levelAfter !== null && row.levelAfter >= 1 ? 'learned' : 'reviewed';
}

export function resultOf(rating: ReviewRow['rating']): 'known' | 'again' | null {
  if (rating === 'Good') return 'known';
  if (rating === 'Again') return 'again';
  return null;
}

export function aggregateMonth(
  month: string,
  rows: ReviewRow[],
  practice: PracticeDayCount[],
  studyDays: number,
): CalendarMonthView {
  const days = new Map<string, { learnedItems: Set<string>; reviewed: number; practice: number }>();
  const dayOf = (date: string) => {
    let day = days.get(date);
    if (!day) {
      day = { learnedItems: new Set(), reviewed: 0, practice: 0 };
      days.set(date, day);
    }
    return day;
  };
  for (const row of rows) {
    const day = dayOf(row.localDate);
    if (classify(row) === 'learned') day.learnedItems.add(row.itemId);
    else day.reviewed += 1;
  }
  for (const p of practice) dayOf(p.date).practice += p.sessions;

  const list = [...days.entries()]
    .map(([date, d]) => ({ date, learned: d.learnedItems.size, reviewed: d.reviewed, practice_sessions: d.practice }))
    .filter((d) => d.learned + d.reviewed + d.practice_sessions > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return {
    month,
    days: list,
    totals: {
      study_days: studyDays,
      learned: list.reduce((sum, d) => sum + d.learned, 0),
      reviewed: list.reduce((sum, d) => sum + d.reviewed, 0),
      practice_sessions: list.reduce((sum, d) => sum + d.practice_sessions, 0),
    },
  };
}

const KIND_ORDER: Record<DayKind, number> = { learned: 0, reviewed: 1 };

/** Sort order of a day's items: last answer newest first, then item id, then `learned` before `reviewed`. */
function compare(a: { lastAt: Date; itemId: string; kind: DayKind }, b: { lastAt: Date; itemId: string; kind: DayKind }) {
  const t = b.lastAt.getTime() - a.lastAt.getTime();
  if (t !== 0) return t;
  if (a.itemId !== b.itemId) return a.itemId < b.itemId ? -1 : 1;
  return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
}

export function aggregateDay(rows: ReviewRow[]): { counts: DayCounts; items: DayItem[] } {
  const counts: DayCounts = { learned: 0, reviewed: 0, reviewed_known: 0, reviewed_again: 0, learned_groups: 0 };
  const learnedItems = new Set<string>();
  const learnedGroups = new Set<string>();
  const items = new Map<string, DayItem>();
  for (const row of rows) {
    const kind = classify(row);
    if (kind === 'learned') {
      learnedItems.add(row.itemId);
      if (row.groupId !== null) learnedGroups.add(row.groupId);
    } else {
      counts.reviewed += 1;
      if (row.rating === 'Good') counts.reviewed_known += 1;
      if (row.rating === 'Again') counts.reviewed_again += 1;
    }
    const key = `${row.itemId}|${kind}`;
    const item = items.get(key);
    if (!item) {
      items.set(key, {
        kind,
        itemId: row.itemId,
        senseId: row.senseId,
        groupId: row.groupId,
        result: resultOf(row.rating),
        times: 1,
        lastAt: row.at,
      });
    } else {
      item.times += 1;
      if (row.at.getTime() >= item.lastAt.getTime()) {
        item.groupId = row.groupId;
        item.result = resultOf(row.rating);
        item.lastAt = row.at;
      }
    }
  }
  counts.learned = learnedItems.size;
  counts.learned_groups = learnedGroups.size;
  return { counts, items: [...items.values()].sort(compare) };
}

export function pageAfter(
  items: DayItem[],
  kind: 'all' | DayKind,
  cursor: DayCursor | null,
  pageSize: number,
): { page: DayItem[]; next: DayCursor | null } {
  const sorted = items.filter((i) => kind === 'all' || i.kind === kind).sort(compare);
  const after = cursor
    ? sorted.filter((i) => compare({ lastAt: new Date(cursor.at), itemId: cursor.id, kind: cursor.k }, i) < 0)
    : sorted;
  const page = after.slice(0, pageSize);
  const last = page.at(-1);
  const next = after.length > pageSize && last ? { at: last.lastAt.toISOString(), id: last.itemId, k: last.kind } : null;
  return { page, next };
}
