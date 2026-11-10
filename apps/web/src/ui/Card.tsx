import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = { as?: 'div' | 'section' | 'article' | 'li'; className?: string; children: ReactNode };

/** A surface card of the new UI (design §3.3: card shadow, radius 14–28; the Hôm nay cards use 20). */
export function Card({ as: Tag = 'div', className, children }: Props) {
  return <Tag className={cn('rounded-wm-xl bg-wm-surface p-5 shadow-wm-card', className)}>{children}</Tag>;
}
