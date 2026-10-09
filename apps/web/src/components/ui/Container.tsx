import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ContainerProps = { as?: ElementType; children: ReactNode; className?: string };

// Content column: 70rem max, centred; at 1440px this leaves the Figma 160px side margins.
export function Container({ as: Tag = 'div', children, className }: ContainerProps) {
  return <Tag className={cn('mx-auto w-full max-w-content px-5 md:px-10 xl:px-0', className)}>{children}</Tag>;
}
