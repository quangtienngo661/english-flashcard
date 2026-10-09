import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-primary-soft px-3 py-1.5 text-caption font-semibold text-primary', className)}>
      {children}
    </span>
  );
}
