import type { ReactNode } from 'react';

/** Figma "Phím" (3:17): a key cap 22px high, at least 22px wide (Enter, Esc grow with their word), accent-soft with accent text. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5.5 min-w-5.5 shrink-0 items-center justify-center whitespace-nowrap rounded-wm-sm px-1 bg-wm-accent-soft font-wm-sans text-wm-label text-wm-accent">
      {children}
    </kbd>
  );
}
