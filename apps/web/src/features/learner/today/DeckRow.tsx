'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';

/** A press that moved less than this is a click, not a drag. */
const DRAG_PX = 6;
/** One arrow press scrolls this share of the visible row. */
const PAGE = 0.8;

/**
 * The deck cards of Hôm nay in one row (owner 10/11/2026): no scrollbar; drag with the mouse, swipe on touch, or the arrows on
 * each side (shown only where there is more to see). A drag never opens the card it ends on; a click still does.
 */
export function DeckRow({ label, children }: { label: string; children: ReactNode }) {
  const t = useTranslations('App.groups');
  const list = useRef<HTMLUListElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const [edges, setEdges] = useState({ prev: false, next: false });
  const reduced = useReducedMotion();

  const measure = useCallback(() => {
    const el = list.current;
    if (!el) return;
    setEdges({ prev: el.scrollLeft > 1, next: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
  }, []);
  useEffect(() => {
    measure();
    const el = list.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  function page(direction: 1 | -1) {
    const el = list.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * PAGE), behavior: reduced ? 'auto' : 'smooth' });
  }

  function onPointerDown(event: PointerEvent<HTMLUListElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !list.current) return;
    drag.current = { x: event.clientX, left: list.current.scrollLeft, moved: false };
    dragged.current = false;
  }
  function onPointerMove(event: PointerEvent<HTMLUListElement>) {
    const d = drag.current;
    if (!d || !list.current) return;
    const dx = event.clientX - d.x;
    if (!d.moved && Math.abs(dx) < DRAG_PX) return;
    d.moved = true;
    list.current.scrollLeft = d.left - dx;
  }
  function onPointerUp() {
    dragged.current = drag.current?.moved ?? false;
    drag.current = null;
  }

  return (
    <div className="relative">
      <ul
        ref={list}
        aria-label={label}
        onScroll={measure}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClickCapture={(event) => {
          if (!dragged.current) return;
          dragged.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragStart={(event) => event.preventDefault()}
        className="no-scrollbar -mx-4 flex snap-x snap-proximity gap-3.5 overflow-x-auto overscroll-x-contain px-4 pb-3 pt-2 select-none md:mx-0 md:gap-5 md:px-0"
      >
        {children}
      </ul>
      {edges.prev && <Arrow side="prev" label={t('prev')} onPress={() => page(-1)} />}
      {edges.next && <Arrow side="next" label={t('next')} onPress={() => page(1)} />}
    </div>
  );
}

function Arrow({ side, label, onPress }: { side: 'prev' | 'next'; label: string; onPress: () => void }) {
  const Icon = side === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className={cn(
        'absolute top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-wm-pill border border-wm-line bg-wm-surface text-wm-ink shadow-wm-soft outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent md:flex',
        side === 'prev' ? '-left-5' : '-right-5',
      )}
    >
      <Icon aria-hidden className="size-4.5" />
    </button>
  );
}
