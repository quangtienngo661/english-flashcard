'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 1024px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** From 1024 px (Tailwind `lg`), where Tra từ shows the word card and the group stacks beside the list. The server renders the phone layout. */
export function useLarge(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
