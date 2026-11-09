import type { ReactNode } from 'react';

/** Figma "Phím" (3:17): a key cap, 22px, accent-soft with accent text. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex size-5.5 items-center justify-center rounded-wm-sm bg-wm-accent-soft font-wm-sans text-wm-label text-wm-accent">
      {children}
    </kbd>
  );
}
