// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWordCycle } from './word-cycle';

const LENGTHS = [8, 6];
type Props = { motion: boolean; start: 'first' | 'final' };
const setup = (props: Props) => renderHook((p: Props) => useWordCycle({ lengths: LENGTHS, ...p }), { initialProps: props });

describe('useWordCycle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts on the final frame of the first word and schedules nothing while motion is off', () => {
    const { result } = setup({ motion: false, start: 'final' });
    expect(result.current).toEqual({ k: 0, typed: 8, phase: 'done', due: 11 });
    expect(vi.getTimerCount()).toBe(0);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current).toEqual({ k: 0, typed: 8, phase: 'done', due: 11 });
  });

  it('shows the final frame with motion off even when it would start at the first frame', () => {
    const { result } = setup({ motion: false, start: 'first' });
    expect(result.current).toEqual({ k: 0, typed: 8, phase: 'done', due: 11 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('continues from the final frame with motion on: word 2 after 1700 ms', () => {
    const { result } = setup({ motion: true, start: 'final' });
    expect(result.current.k).toBe(0);
    act(() => { vi.advanceTimersByTime(1700); });
    expect(result.current).toEqual({ k: 1, typed: 0, phase: 'typing', due: 11 });
  });

  it('freezes on the current step when paused, and resumes with one step per timer', () => {
    const { result, rerender } = setup({ motion: true, start: 'first' });
    act(() => { vi.advanceTimersByTime(900); });
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toEqual({ k: 0, typed: 3, phase: 'typing', due: 12 });
    rerender({ motion: false, start: 'first' });
    expect(result.current).toEqual({ k: 0, typed: 3, phase: 'typing', due: 12 });
    expect(vi.getTimerCount()).toBe(0);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current.typed).toBe(3);
    rerender({ motion: true, start: 'first' });
    expect(result.current.typed).toBe(3);
    expect(vi.getTimerCount()).toBe(1);
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.typed).toBe(4);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('does not re-arm the timer when a caller passes a new array with the same lengths', () => {
    const { result, rerender } = renderHook(({ n }: { n: number }) => ({ n, step: useWordCycle({ lengths: [8, 6], motion: true, start: 'first' }) }), { initialProps: { n: 0 } });
    act(() => { vi.advanceTimersByTime(800); });
    rerender({ n: 1 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.step.typed).toBe(1);
  });

  // T10 (QA7): the sign-up showcase plays one round and stops on the last word's final frame.
  it('with rounds: 1 stops on the final frame of the last word and arms no more timers', () => {
    const { result } = renderHook(() => useWordCycle({ lengths: LENGTHS, motion: true, start: 'final', rounds: 1 }));
    for (let t = 0; t < 20_000; t += 10) act(() => { vi.advanceTimersByTime(10); });
    expect(result.current).toEqual({ k: 1, typed: 6, phase: 'done', due: 10 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('with rounds: 1 from the first frame it also types the first word, then stops on the last', () => {
    const { result } = renderHook(() => useWordCycle({ lengths: LENGTHS, motion: true, start: 'first', rounds: 1 }));
    act(() => { vi.advanceTimersByTime(900); });
    expect(result.current).toEqual({ k: 0, typed: 1, phase: 'typing', due: 12 });
    for (let t = 0; t < 20_000; t += 10) act(() => { vi.advanceTimersByTime(10); });
    expect(result.current).toEqual({ k: 1, typed: 6, phase: 'done', due: 10 });
    expect(vi.getTimerCount()).toBe(0);
  });
});
