'use client';

import { useEffect, useState } from 'react';

const STEP = 8;
const IDLE_MS = 600;

/**
 * True while the page is being scrolled down (Part 12 QA4): set once the page has moved 8 px down since the last change of direction, unless it
 * is within 8 px of the top; false again on scroll up and 600 ms after the last scroll event. Always false when `enabled` is false.
 */
export function useScrollAway(enabled: boolean): boolean {
  const [away, setAway] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let last = window.scrollY;
    let anchor = last;
    let down = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > last && !down) {
        down = true;
        anchor = last;
      } else if (y < last && down) {
        down = false;
        anchor = last;
      }
      last = y;
      setAway(y > STEP && down && y - anchor >= STEP);
      clearTimeout(timer);
      timer = setTimeout(() => setAway(false), IDLE_MS);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
      setAway(false);
    };
  }, [enabled]);
  return enabled && away;
}
