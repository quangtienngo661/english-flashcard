'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motionAllowed, whileInView } from './motion';

/** bản 3's typing loop: a letter every 85 ms, the result 450 ms after the last letter, then 2600 ms before the next round. */
const TYPE_MS = 85;
const RESULT_MS = 450;
const REST_MS = 2600;
/** bản 3's review boxes: the next box lights every 1300 ms (its colours change in 300 ms, CSS). */
const BIN_MS = 1300;

/** setTimeout chains that run only while their card is on screen, and put the card back to its end state when they stop. */
function loop(el: Element, run: (wait: (ms: number, next: () => void) => void) => void, settle: () => void) {
  let timer = 0;
  let on = false;
  const wait = (ms: number, next: () => void) => {
    timer = window.setTimeout(() => on && next(), ms);
  };
  const stopView = whileInView(el, (visible) => {
    if (visible === on) return;
    on = visible;
    window.clearTimeout(timer);
    if (on) run(wait);
    else settle();
  });
  return () => {
    stopView();
    on = false;
    window.clearTimeout(timer);
    settle();
  };
}

/**
 * The living demos of "Từ lúc gặp tới lúc dùng được" (M8.6), around the card grid. Ghi từ types the word again and again with the caret
 * blinking (CSS) and shows the result row after it (`data-wm-off` hides it, 400 ms); Ôn đúng lúc lights the boxes in turn (`data-on`).
 * The listen ring is CSS only. Each loop runs while its card is on screen (30 %); off screen, and with reduced motion, every card shows
 * its server end state.
 */
export function DemoLoops({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !motionAllowed()) return;
    const stops: Array<() => void> = [];

    const typed = root.querySelector<HTMLElement>('[data-typed]');
    const result = root.querySelector<HTMLElement>('[data-result]');
    const noteCard = typed?.closest('article');
    if (typed && result && noteCard) {
      const word = typed.textContent ?? '';
      stops.push(
        loop(
          noteCard,
          (wait) => {
            const round = () => {
              let k = 0;
              typed.textContent = '';
              result.setAttribute('data-wm-off', '');
              const type = () => {
                typed.textContent = word.slice(0, ++k);
                if (k < word.length) wait(TYPE_MS, type);
                else
                  wait(RESULT_MS, () => {
                    result.removeAttribute('data-wm-off');
                    wait(REST_MS, round);
                  });
              };
              wait(TYPE_MS, type);
            };
            round();
          },
          () => {
            typed.textContent = word;
            result.removeAttribute('data-wm-off');
          },
        ),
      );
    }

    const bins = [...root.querySelectorAll<HTMLElement>('[data-bin]')];
    const binList = bins[0]?.parentElement;
    if (binList && bins.length > 1) {
      const lit = Math.max(0, bins.findIndex((bin) => bin.hasAttribute('data-on')));
      const light = (n: number) => bins.forEach((bin, j) => bin.toggleAttribute('data-on', j === n));
      stops.push(
        loop(
          binList,
          (wait) => {
            let n = lit;
            const next = () => {
              n = (n + 1) % bins.length;
              light(n);
              wait(BIN_MS, next);
            };
            wait(BIN_MS, next);
          },
          () => light(lit),
        ),
      );
    }

    return () => stops.forEach((stop) => stop());
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
