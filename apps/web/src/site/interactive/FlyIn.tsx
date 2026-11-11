'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { blurCap, EASE_OUT, LOOP_VIEW, motionAllowed, onceInView } from './motion';

/** Figma scene 2 (`13:200`): each card's transform takes 1150 ms and its opacity 517 ms, 55 ms apart. */
const MOVE_MS = 1150;
const FADE_MS = 517;
const STEP_MS = 55;

/** bản 3's seeded generator (seed 11), so every visit starts from the same scatter. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/**
 * The groups fly-in (M8.6): bản 3's 3D scatter (translate3d from depth, rotateX/Y/Z, blur 8–18 px, scale .82) on Figma's timing and
 * shuffled order (`data-fly-step` on each `[data-group-card]`). Each card sets `data-wm-lit` as it lands (the CSS flashes its border); after
 * the last, `data-wm-done` brings the caption in. Renders `display: contents`, so the list and caption keep their places in the column.
 */
export function FlyIn({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const list = root?.querySelector('ul');
    if (!root || !list) return;
    const done = () => {
      root.setAttribute('data-wm-in', '');
      root.setAttribute('data-wm-done', '');
    };
    if (!motionAllowed()) {
      done();
      return;
    }
    const animations: Animation[] = [];
    const stop = onceInView(
      list,
      () => {
        const cards = [...list.querySelectorAll<HTMLElement>('[data-group-card]')];
        if (cards.length === 0 || typeof cards[0].animate !== 'function') return done();
        // Every read first (bản 3's offsets from the list centre), then every write.
        const box = list.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        const cap = blurCap();
        const rnd = seeded(11);
        const starts = cards.map((card) => {
          const r = card.getBoundingClientRect();
          const [jx, jy, z, rx, ry, rz, b] = [rnd() - 0.5, rnd() - 0.5, rnd(), (rnd() - 0.5) * 70, (rnd() - 0.5) * 70, (rnd() - 0.5) * 40, 8 + rnd() * 10];
          rnd(); // bản 3 also drew a random order here; Figma's order replaces it, the draw keeps the same scatter.
          const ox = r.left + r.width / 2 - cx;
          const oy = r.top + r.height / 2 - cy;
          return {
            transform: `translate3d(${ox * 1.6 + jx * 520}px, ${oy * 2.4 + jy * 260}px, ${-260 - z * 520}px) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${rz}deg) scale(0.82)`,
            filter: `blur(${Math.min(b, cap)}px)`,
          };
        });
        const steps = cards.map((card, i) => Number(card.dataset.flyStep ?? i));
        const last = Math.max(...steps);
        root.setAttribute('data-wm-in', '');
        cards.forEach((card, i) => {
          const delay = steps[i] * STEP_MS;
          const move = card.animate([starts[i], { transform: 'none', filter: 'blur(0px)' }], { duration: MOVE_MS, delay, easing: EASE_OUT, fill: 'backwards' });
          animations.push(move, card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, delay, easing: EASE_OUT, fill: 'backwards' }));
          move.onfinish = () => {
            card.setAttribute('data-wm-lit', '');
            if (steps[i] === last) root.setAttribute('data-wm-done', '');
          };
        });
      },
      LOOP_VIEW,
    );
    return () => {
      stop();
      animations.forEach((a) => a.finish());
    };
  }, []);

  return (
    <div ref={ref} data-wm-fly="" className="contents">
      {children}
    </div>
  );
}
