'use client';

import { Children, useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The deck cards of Hôm nay in one row (owner 11/11/2026): the cards share the row's width evenly and only as many as fit are shown;
 * the rest are behind "Xem tất cả" in the heading. A card is never narrower than `--deck-min` (globals.css `.deck-row`); the columns
 * come from the row's width, so a lone card keeps a column's width instead of stretching across the row.
 */
export function DeckRow({ label, children }: { label: string; children: ReactNode }) {
  const list = useRef<HTMLUListElement>(null);
  const [fit, setFit] = useState<number | null>(null);

  const measure = useCallback(() => {
    const el = list.current;
    if (!el) return;
    const width = el.clientWidth;
    const style = window.getComputedStyle(el);
    const min = parseFloat(style.getPropertyValue('--deck-min'));
    const gap = parseFloat(style.columnGap) || 0;
    // No layout yet (or no card size): show every card and let the grid's own auto-fill place them.
    if (width <= 0 || !(min > 0)) return setFit(null);
    setFit(Math.max(1, Math.floor((width + gap) / (min + gap))));
  }, []);
  useLayoutEffect(() => {
    measure();
    const el = list.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const cards = Children.toArray(children);
  return (
    <ul
      ref={list}
      aria-label={label}
      // raw-ok: the column count is measured at run time from the row's width, so it cannot be a class
      style={fit === null ? undefined : { gridTemplateColumns: `repeat(${fit}, minmax(0, 1fr))` }}
      className="deck-row grid gap-3.5 md:gap-5"
    >
      {fit === null ? cards : cards.slice(0, fit)}
    </ul>
  );
}
