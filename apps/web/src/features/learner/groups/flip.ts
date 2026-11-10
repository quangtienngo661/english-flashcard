'use client';

import { useRouter } from 'next/navigation';
import { useLayoutEffect, type MouseEvent, type RefObject } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';

/**
 * The group open/close FLIP (motion doc §3): the carousel remembers the centre stack's rect just before navigating, and the page
 * that opens flies its own stack from there. Numbers come from the motion tokens in web.css; the fallbacks are the same values,
 * for environments without the stylesheet (tests).
 */
const rects = new Map<string, DOMRect>();

export function rememberRect(key: string, el: Element): void {
  rects.set(key, el.getBoundingClientRect());
}

/** The remembered rect, forgotten as it is read. */
export function takeRect(key: string): DOMRect | undefined {
  const rect = rects.get(key);
  rects.delete(key);
  return rect;
}

function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
const ms = (value: string) => Number.parseFloat(value);

/**
 * Flies `ref` from the rect remembered under `key` to where it sits (380 ms, the FLIP curve). When it flies, `page` gets
 * `wm-page-in`: its parts come in from blur, 22 ms apart. No rect, or reduced motion: nothing moves.
 */
export function useFlipFrom(key: string, ref: RefObject<HTMLElement | null>, page?: RefObject<HTMLElement | null>): void {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const from = takeRect(key);
    const el = ref.current;
    if (!from || !el || reduced) return;
    const to = el.getBoundingClientRect();
    if (!to.width) return;
    el.animate(
      [
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`, transformOrigin: 'top left' },
        { transform: 'none', transformOrigin: 'top left' },
      ],
      { duration: ms(token('--transition-duration-wm-flip', '380ms')), easing: token('--ease-wm-flip', 'cubic-bezier(0.3, 1.15, 0.5, 1)') },
    );
    page?.current?.classList.add('wm-page-in');
    // Runs once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * The way back (motion doc §3, "Đóng nhóm"): the page parts dissolve in 150 ms, the stack's rect is remembered for the carousel
 * to fly it back, then the route changes. Reduced motion: the link works as a plain link.
 */
export function useCloseFlip(key: string, stack: RefObject<HTMLElement | null>, page: RefObject<HTMLElement | null>) {
  const router = useRouter();
  const reduced = useReducedMotion();
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (reduced || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const href = event.currentTarget.getAttribute('href') ?? '';
    if (stack.current) rememberRect(key, stack.current);
    page.current?.classList.add('wm-page-out');
    window.setTimeout(() => router.push(href), ms(token('--transition-duration-wm-close', '150ms')));
  };
}
