'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(hover: hover) and (pointer: fine)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * A mouse or trackpad is the main pointer (QA10). On a touch screen a field or button that takes focus by itself pops the keyboard up
 * or scrolls the page, so autofocus waits for this. The server renders the touch case.
 */
export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
