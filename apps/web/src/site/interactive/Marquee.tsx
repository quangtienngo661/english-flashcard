import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A row that slides sideways for ever (M8.6 "Word strip": 52 s, the reversed row 64 s, linear). The children are written twice, the copy
 * `aria-hidden`; the track moves by half its width, so the loop has no seam. Each half ends with the gap, so both halves are equally wide.
 */
export function Marquee({ reverse = false, className, children }: { reverse?: boolean; className?: string; children: ReactNode }) {
  return (
    <div data-wm-marquee={reverse ? 'reverse' : 'forward'} className={cn('flex w-max', className)}>
      <div className="flex gap-2.5 pr-2.5">{children}</div>
      <div aria-hidden="true" className="flex gap-2.5 pr-2.5">
        {children}
      </div>
    </div>
  );
}
