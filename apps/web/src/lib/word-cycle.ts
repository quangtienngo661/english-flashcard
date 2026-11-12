'use client';

import { useEffect, useMemo, useState } from 'react';

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
 * The loop's current frame. Before the loop has advanced its first step, `motion` off returns the final frame of the first word
 * (typed, answered, one fewer due) and schedules nothing. Once it has run, `motion` off freezes on the current frame (no timer) and
 * turning it back on continues from that frame with one timer at a time, so a pause never jumps.
 * `start: 'first'` begins at the first word's empty blank; `'final'` begins on its final frame.
 * `lengths` is compared by value, so a new array with the same numbers does not restart the timer.
 */
export function useWordCycle({ lengths, motion, start, dueStart = 12 }: {
  lengths: readonly number[]; motion: boolean; start: 'first' | 'final'; dueStart?: number;
}): CycleStep {
  const key = lengths.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the values of `lengths`
  const stable = useMemo(() => lengths, [key]);
  const final = useMemo<CycleStep>(() => ({ k: 0, typed: stable[0], phase: 'done', due: dueStart - 1 }), [stable, dueStart]);
  const [state, setState] = useState<{ step: CycleStep; started: boolean }>({
    step: start === 'final' ? final : { k: 0, typed: 0, phase: 'typing', due: dueStart },
    started: false,
  });

  useEffect(() => {
    if (!motion) return;
    const [ms, after] = cycleNext(state.step, stable, dueStart);
    const timer = setTimeout(() => setState({ step: after, started: true }), ms);
    return () => clearTimeout(timer);
  }, [motion, state, stable, dueStart]);

  return motion || state.started ? state.step : final;
}
