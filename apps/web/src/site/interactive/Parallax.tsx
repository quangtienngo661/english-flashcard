'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { finePointer, motionAllowed } from './motion';

/**
 * The hero stage's pointer parallax (bản 3; fine pointers only). It writes the pointer's place over the hero section, −1…1, as
 * `--wm-px` / `--wm-py` on the stage, at most once a frame; the CSS moves each `[data-float]` card by its depth (14, 22) in 400 ms.
 * On leaving the hero the cards go back to their places.
 */
export function Parallax({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    const hero = stage?.closest('section');
    if (!stage || !hero || !motionAllowed() || !finePointer()) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      const r = hero.getBoundingClientRect();
      stage.style.setProperty('--wm-px', (((x - r.left) / r.width) * 2 - 1).toFixed(3));
      stage.style.setProperty('--wm-py', (((y - r.top) / r.height) * 2 - 1).toFixed(3));
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      stage.style.setProperty('--wm-px', '0');
      stage.style.setProperty('--wm-py', '0');
    };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div ref={ref} data-wm-parallax="" className={className}>
      {children}
    </div>
  );
}
