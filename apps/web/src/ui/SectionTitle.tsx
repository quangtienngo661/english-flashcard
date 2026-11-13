import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A section heading inside a page or card (mockup L126-127, L589): Bricolage 700, 22 px on wide screens, 20 px on phones. */
export function SectionTitle({ as: Tag = 'h2', id, className, children }: {
  as?: 'h2' | 'h3';
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag id={id} className={cn('font-wm-display text-wm-block-title-mobile text-wm-ink md:text-wm-block-title', className)}>
      {children}
    </Tag>
  );
}
