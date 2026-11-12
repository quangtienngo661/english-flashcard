'use client';

import { useEffect, useState } from 'react';

// The word-typing loop shared by the sign-up showcase and the landing hero: type the word into the blank, press Enter, turn green,
// the due count falls, then the next word. Timings are the mockup's (L1453-1474).

export type CycleStep = { k: number; typed: number; phase: 'typing' | 'enter' | 'done'; due: number };

/** The next frame and how long the current one stays. `k` counts up forever; use `k % lengths.length` for the word. */
export function cycleNext(step: CycleStep, lengths: readonly number[], dueStart: number): [ms: number, step: CycleStep] {
  const length = lengths[step.k % lengths.length];
  if (step.phase === 'typing' && step.typed === 0) return [900, { ...step, typed: 1 }];
  if (step.phase === 'typing' && step.typed < length) return [100, { ...step, typed: step.typed + 1 }];
  if (step.phase === 'typing') return [320, { ...step, phase: 'enter' }];
  if (step.phase === 'enter') return [260, { ...step, phase: 'done', due: Math.max(0, step.due - 1) }];
  const k = step.k + 1;
  return [1700, { k, typed: 0, phase: 'typing', due: k % lengths.length === 0 ? dueStart : step.due }];
}

/**
 * The loop's current frame. With `motion` off it returns the final frame of the first word (typed, answered, one fewer due) and
 * schedules nothing; turning it back on continues from where the loop was, one timer at a time.
 * `start: 'first'` begins at the first word's empty blank; `'final'` begins on its final frame.
 */
export function useWordCycle({ lengths, motion, start, dueStart = 12 }: {
  lengths: readonly number[]; motion: boolean; start: 'first' | 'final'; dueStart?: number;
}): CycleStep {
  const final: CycleStep = { k: 0, typed: lengths[0], phase: 'done', due: dueStart - 1 };
  const [running, setRunning] = useState<CycleStep>(start === 'final' ? final : { k: 0, typed: 0, phase: 'typing', due: dueStart });

  useEffect(() => {
    if (!motion) return;
    const [ms, after] = cycleNext(running, lengths, dueStart);
    const timer = setTimeout(() => setRunning(after), ms);
    return () => clearTimeout(timer);
  }, [motion, running, lengths, dueStart]);

  return motion ? running : final;
}
