import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ContainerProps = { as?: ElementType; children: ReactNode; className?: string };

/**
 * The public pages' content column: 72.5rem of content (Figma 1160 px, so 140 px each side at 1440), with the padding outside it:
 * 16 px on a phone (Figma `9:109`, `9:100`), 40 px from `md`.
 */
export function Container({ as: Tag = 'div', children, className }: ContainerProps) {
  return <Tag className={cn('mx-auto box-content max-w-wm-site px-4 md:px-10', className)}>{children}</Tag>;
}
