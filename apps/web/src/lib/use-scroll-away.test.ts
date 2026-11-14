// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollAway } from './use-scroll-away';

function scrollTo(y: number) {
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    window.dispatchEvent(new Event('scroll'));
  });
}

describe('useScrollAway', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });
  afterEach(() => vi.useRealTimers());

  it('is shown before any scroll', () => {
    const { result } = renderHook(() => useScrollAway(true));
    expect(result.current).toBe(false);
  });

  it('hides once the page has moved down 8 px, not after 7 px', () => {
    const { result } = renderHook(() => useScrollAway(true));
    scrollTo(100);
    // The first event jumps from 0, so it hides; start a fresh run from a direction change instead.
    scrollTo(90);
    expect(result.current).toBe(false);
    scrollTo(97);
    expect(result.current).toBe(false);
    scrollTo(98);
    expect(result.current).toBe(true);
  });

  it('comes back on scroll up', () => {
    const { result } = renderHook(() => useScrollAway(true));
    scrollTo(200);
    expect(result.current).toBe(true);
    scrollTo(199);
    expect(result.current).toBe(false);
  });

  it('comes back 600 ms after the last scroll event, not at 599 ms', () => {
    const { result } = renderHook(() => useScrollAway(true));
    scrollTo(200);
    act(() => { vi.advanceTimersByTime(400); });
    scrollTo(300);
    act(() => { vi.advanceTimersByTime(599); });
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(false);
  });

  it('stays shown within 8 px of the top even while scrolling down', () => {
    const { result } = renderHook(() => useScrollAway(true));
    scrollTo(8);
    expect(result.current).toBe(false);
    scrollTo(9);
    scrollTo(30);
    expect(result.current).toBe(true);
  });

  it('never hides when disabled', () => {
    const { result } = renderHook(() => useScrollAway(false));
    scrollTo(500);
    expect(result.current).toBe(false);
  });
});
