'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { settle } from '@/lib/stack-motion';

export type Rating = 'known' | 'review';

type Options = {
  /** Off while the card is not on top, flying away, or a save blocks rating. */
  enabled: boolean;
  /** Only a turned card can be rated; an unturned one follows the hand a little and says why (motion doc §2). */
  flipped: boolean;
  onRate: (rating: Rating, speed: number) => void;
  /** A press without travel: turn the card. */
  onTap?: () => void;
  /** An unturned card dragged past 40 px. */
  onNudge?: () => void;
  /** Card behind follows the hand: 0 at rest, 1 at the threshold. */
  onProgress?: (p: number) => void;
  threshold?: number;
  velocity?: number;
  /** The card's id: a new top card is a new element, so the listeners move to it. */
  id?: string;
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Drag to rate (motion doc §2, prototype chong-the-mo.html:311-352): right is Đã biết, left Cần ôn lại; past 110 px, or a flick faster
 * than 0.55 px/ms over at least 30 px in the same direction. The card itself is moved through its inline transform (no render per
 * move); `dx` and the stamp come back for the labels. `touch-action: pan-y` on the card keeps a tall back face scrollable on phones.
 * Buttons and keys rate too (design §8.5), so dragging is never required.
 */
export function useCardDrag(ref: RefObject<HTMLElement | null>, options: Options) {
  const [dx, setDx] = useState(0);
  const [stamp, setStamp] = useState<Rating | null>(null);
  const latest = useRef(options);
  // The listeners read the latest options without being bound again on every render.
  useLayoutEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !options.enabled) return;
    const threshold = latest.current.threshold ?? 110;
    let start: { x: number; y: number; t: number; id: number } | null = null;
    let moving = false;
    let samples: Array<{ x: number; t: number }> = [];
    let lastX = 0;

    const reset = () => {
      start = null;
      moving = false;
      samples = [];
      setDx(0);
      setStamp(null);
      latest.current.onProgress?.(0);
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary) return;
      if ((e.target as Element | null)?.closest('button, a, input, textarea')) return;
      start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      lastX = 0;
      samples = [{ x: 0, t: start.t }];
      try {
        el.setPointerCapture?.(e.pointerId);
      } catch {
        // A synthetic pointer cannot be captured; the drag still works while the pointer stays over the card.
      }
    };

    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const x = e.clientX - start.x;
      const y = e.clientY - start.y;
      if (!moving && Math.abs(x) < 4) return;
      moving = true;
      lastX = x;
      const t = performance.now();
      samples.push({ x, t });
      samples = samples.filter((s) => s.t >= t - 100);
      if (latest.current.flipped) {
        el.style.transform = `translate(${x}px, ${y * 0.3}px) rotate(${clamp(x * 0.055, -14, 14)}deg)`;
        const p = Math.min(1, Math.abs(x) / threshold);
        latest.current.onProgress?.(p);
        setDx(x);
        setStamp(p >= 0.5 ? (x > 0 ? 'known' : 'review') : null);
      } else {
        el.style.transform = `translateX(${Math.sign(x) * Math.min(56, Math.abs(x) * 0.3)}px)`;
        if (Math.abs(x) > 40) latest.current.onNudge?.();
      }
    };

    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const elapsed = performance.now() - start.t;
      if (!moving) {
        reset();
        if (elapsed < 400) latest.current.onTap?.();
        return;
      }
      const first = samples[0];
      const last = samples[samples.length - 1];
      const span = last && first ? last.t - first.t : 0;
      const v = span > 0 ? (last.x - first.x) / span : 0;
      const fast = Math.abs(v) > (latest.current.velocity ?? 0.55) && Math.abs(lastX) > 30 && Math.sign(v) === Math.sign(lastX);
      if (latest.current.flipped && (Math.abs(lastX) > threshold || fast)) {
        const rating: Rating = lastX > 0 ? 'known' : 'review';
        const speed = Math.min(1, Math.abs(v) / 2);
        reset();
        latest.current.onRate(rating, speed);
        return;
      }
      const from = el.style.transform;
      el.style.transform = '';
      void settle(el, from);
      reset();
    };

    const cancel = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      el.style.transform = '';
      reset();
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    };
  }, [ref, options.enabled, options.id]);

  return { dx, stamp };
}
