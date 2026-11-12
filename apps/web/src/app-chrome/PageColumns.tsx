'use client';

import type { ReactNode } from 'react';
import { useWide } from '@/lib/use-wide';

/**
 * One column; from 1280 px the aside becomes a second column on the right (design §5.4). Below that it follows the content, or, with
 * `asideFirstBelow`, comes before it. The order is the DOM order in both cases (no CSS `order`), so Tab and screen readers match the screen.
 */
export function PageColumns({ children, aside, asideFirstBelow = false }: { children: ReactNode; aside?: ReactNode; asideFirstBelow?: boolean }) {
  const wide = useWide();
  if (!aside) return <>{children}</>;
  const columns = [
    <aside key="aside" className="flex w-full flex-col gap-6 xl:w-90 xl:shrink-0">
      {aside}
    </aside>,
    <div key="content" className="flex min-w-0 flex-1 flex-col">
      {children}
    </div>,
  ];
  // Keyed, so crossing 1280 px moves the two columns instead of remounting them (a click during the swap would be lost).
  if (!(asideFirstBelow && !wide)) columns.reverse();
  return <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">{columns}</div>;
}
