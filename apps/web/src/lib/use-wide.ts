'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 1280px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** From 1280 px (Tailwind `xl`), where a page's aside becomes a second column. The server renders the phone order. */
export function useWide(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
