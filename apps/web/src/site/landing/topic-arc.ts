import { arcSlot, type ArcSlot } from '@/lib/group-carousel';

/** Fit the outer decks inside the viewport's fade when space permits. */
export function topicStep(viewportWidth: number): number {
  if (viewportWidth < 768) return 128;
  const fade = Math.min(viewportWidth * 0.09, 120);
  return Math.min(230, Math.max(150, (viewportWidth / 2 - fade - 230) / 1.68));
}

export function topicSlot(k: number, viewportWidth: number): ArcSlot {
  return { ...arcSlot(k, viewportWidth < 768), x: k * topicStep(viewportWidth) * 0.84 };
}
