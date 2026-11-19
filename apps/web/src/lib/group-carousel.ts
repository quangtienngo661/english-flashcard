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
