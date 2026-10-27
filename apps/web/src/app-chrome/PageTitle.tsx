import type { ReactNode } from 'react';

/**
 * The page heading with its highlighter stroke ("Hôm nay", "Cài đặt"…), an optional `meta` chip beside it (outside the heading,
 * so the stroke stays under the words only; owner 27/10/2026), and an optional item on the right.
 */
export function PageTitle({ children, aside, meta }: { children: ReactNode; aside?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="highlighter w-fit px-1 text-h2 font-extrabold text-ink">{children}</h1>
        {meta}
      </div>
      {aside}
    </div>
  );
}
