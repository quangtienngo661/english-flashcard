import { sortForToday } from './deck-actions';
import type { GroupSummary } from './groups-api';

export { arcSlot, carouselSlots, stepTo, type ArcSlot, type CarouselSlot } from '@/lib/group-carousel';

/** Cards behind a group stack (prototype `layers`, vong-7 :666): more waiting cards, a thicker stack. */
export function stackDepth(waiting: number): 0 | 1 | 2 | 3 {
  if (waiting > 16) return 3;
  if (waiting > 6) return 2;
  if (waiting > 0) return 1;
  return 0;
}

export type RhythmCell = { level: number; total: number; due: number };

/** "nhịp ôn": one entry per level 0–5 with its words and its waiting cards (prototype `rhythm`, :663). */
export function rhythm(cells: readonly RhythmCell[]): RhythmCell[] {
  return [0, 1, 2, 3, 4, 5].map((level) => {
    const cell = cells.find((c) => c.level === level);
    return { level, total: cell?.total ?? 0, due: cell?.due ?? 0 };
  });
}

/** Carousel order: the Today order, with groups that have no word last. */
export function carouselOrder(groups: GroupSummary[]): GroupSummary[] {
  const sorted = sortForToday(groups);
  return [...sorted.filter((g) => g.total > 0), ...sorted.filter((g) => g.total === 0)];
}
