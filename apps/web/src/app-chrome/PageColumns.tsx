import type { ReactNode } from 'react';

/** One column; from 1280 px the aside becomes a second column on the right (design §5.4). Below that it follows the content. */
export function PageColumns({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  if (!aside) return <>{children}</>;
  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <aside className="flex w-full flex-col gap-6 xl:w-90 xl:shrink-0">{aside}</aside>
    </div>
  );
}
