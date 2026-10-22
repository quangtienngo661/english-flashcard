import type { ReactNode } from 'react';

/** The page heading with its highlighter stroke ("Hôm nay", "Cài đặt"…), and an optional item on the right. */
export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h1 className="highlighter w-fit px-1 text-h2 font-extrabold text-ink">{children}</h1>
      {aside}
    </div>
  );
}
