'use client';

import { useEffect, useRef } from 'react';
import { motionAllowed, whileInView } from './motion';

/** Figma scene 1 (`10:349`): 20 px rows; each move 350 ms on `cubic-bezier(.5,0,.5,1)`, then a 750 ms hold. */
const ROW_PX = 20;
const MOVE_MS = 350;
const HOLD_MS = 750;
const MOVE_EASE = 'cubic-bezier(0.5, 0, 0.5, 1)';
/** Figma holds the first topic 1400 ms before the first move: 650 ms more than every later hold. */
const FIRST_HOLD_EXTRA_MS = 650;

const ROW = 'flex h-5 items-center justify-center font-wm-sans text-wm-label text-wm-on-accent';

/**
 * The topic list of the hero pill ("Chủ đề (chạy vòng)"). The first topic is written again at the end (`aria-hidden`), so the list wraps
 * without a jump. Before JS and with reduced motion, the first topic stands still. The loop pauses while the hero is off screen.
 */
export function TopicTicker({ topics }: { topics: string[] }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list || topics.length < 2 || !motionAllowed() || typeof list.animate !== 'function') return;
    const step = MOVE_MS + HOLD_MS;
    const total = topics.length * step;
    const frames: Keyframe[] = [];
    topics.forEach((_, i) => {
      const at = `translateY(${-ROW_PX * i}px)`;
      frames.push({ transform: at, offset: (i * step) / total });
      frames.push({ transform: at, offset: (i * step + HOLD_MS) / total, easing: MOVE_EASE });
    });
    frames.push({ transform: `translateY(${-ROW_PX * topics.length}px)`, offset: 1 });
    const animation = list.animate(frames, { duration: total, delay: FIRST_HOLD_EXTRA_MS, iterations: Infinity });
    const stop = whileInView(list, (on) => (on ? animation.play() : animation.pause()));
    return () => {
      stop();
      animation.cancel();
    };
  }, [topics]);

  return (
    <span ref={ref} className="flex flex-col">
      {topics.map((topic) => (
        <span key={topic} className={ROW}>
          {topic}
        </span>
      ))}
      <span aria-hidden="true" className={ROW}>
        {topics[0]}
      </span>
    </span>
  );
}
