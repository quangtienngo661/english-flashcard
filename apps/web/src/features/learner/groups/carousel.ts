import { sortForToday } from './deck-actions';
import type { GroupSummary } from './groups-api';

/** Cards behind a group stack (prototype `layers`, vong-7 :666): more waiting cards, a thicker stack. */
export function stackDepth(waiting: number): 0 | 1 | 2 | 3 {
  if (waiting > 16) return 3;
  if (waiting > 6) return 2;
  if (waiting > 0) return 1;
  return 0;
}

/** Signed shortest step from one carousel index to another, wrapping around; a tie goes right (positive). */
export function stepTo(from: number, to: number, count: number): number {
  if (count <= 0) return 0;
  const d = (((to - from) % count) + count) % count;
  return d > count / 2 ? d - count : d;
}

export type ArcSlot = { x: number; y: number; rotate: number; scale: number; opacity: number; z: number };

/**
 * "Vòng cung" (mockup L881-884, vong-7 L703-704): where the stack k places from the centre sits on the arc. x and y in px of the
 * 290 px master (the CSS turns them into rem), rotate in degrees. Phones step 128 px, wider screens 230 px; beyond two places it is
 * hidden.
 */
export function arcSlot(k: number, phone: boolean): ArcSlot {
  const step = phone ? 128 : 230;
  const a = Math.abs(k);
  return {
    x: k * step * 0.84,
    y: 16 * k * k,
    rotate: 8 * k,
    scale: 1 - 0.1 * a,
    opacity: a > 2 ? 0 : 1 - 0.25 * a,
    z: 10 - a,
  };
}

export type CarouselSlot = { index: number; k: -2 | -1 | 0 | 1 | 2 };

/**
 * The stacks on screen around `centre` (motion doc §3): k is the shortest wrap-around distance, at most 2 each side. Each group
 * appears once, so with two groups the other one sits on the right only. Sorted by index.
 */
export function carouselSlots(count: number, centre: number): CarouselSlot[] {
  const slots: CarouselSlot[] = [];
  for (let index = 0; index < count; index += 1) {
    const k = stepTo(centre, index, count);
    if (Math.abs(k) <= 2) slots.push({ index, k: k as CarouselSlot['k'] });
  }
  return slots;
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
