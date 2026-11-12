import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = { as?: 'div' | 'section' | 'article' | 'li'; labelledBy?: string; className?: string; children: ReactNode };

/** A surface card (mockup L140, L589): radius 14, padding 24 (20 on phones), card shadow, no border. */
export function Card({ as: Tag = 'div', labelledBy, className, children }: Props) {
  return <Tag aria-labelledby={labelledBy} className={cn('rounded-wm-card bg-wm-surface p-5 shadow-wm-card md:p-6', className)}>{children}</Tag>;
}
