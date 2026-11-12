import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * "Thanh nổi" (Figma 97:3085, 98:3127): the action bar of a selection, floating at the bottom, above the phone tab bar. A row on
 * desktop, stacked on phones. The caller shows it only while something is selected.
 */
export function FloatingBar({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        'fixed inset-x-3 bottom-21 z-30 flex flex-col gap-3 rounded-wm-row border border-wm-line bg-wm-surface px-4 py-3 shadow-wm-pop',
        'md:inset-x-auto md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:flex-row md:items-center md:gap-4 md:py-2 md:pl-5 md:pr-2',
        'motion-safe:animate-wm-dialog-in',
        className,
      )}
    >
      {children}
    </div>
  );
}
