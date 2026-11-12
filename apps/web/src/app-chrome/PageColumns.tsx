import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * One column; from 1280 px the aside becomes a second column on the right (design §5.4). Below that it follows the content, or, with
 * `asideFirstBelow`, comes before it (the aside is first in the document and moves right from 1280 px).
 */
export function PageColumns({ children, aside, asideFirstBelow = false }: { children: ReactNode; aside?: ReactNode; asideFirstBelow?: boolean }) {
  if (!aside) return <>{children}</>;
  const asideEl = <aside className={cn('flex w-full flex-col gap-6 xl:w-90 xl:shrink-0', asideFirstBelow && 'xl:order-2')}>{aside}</aside>;
  const content = <div className="flex min-w-0 flex-1 flex-col">{children}</div>;
  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
      {asideFirstBelow ? asideEl : content}
      {asideFirstBelow ? content : asideEl}
    </div>
  );
}
