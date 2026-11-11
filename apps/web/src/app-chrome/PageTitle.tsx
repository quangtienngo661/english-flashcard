import type { ReactNode } from 'react';

/**
 * The app page heading ("Cài đặt", "Luyện tập"…): Bricolage ExtraBold 44 / 30 (M7.1, M7 Figma A §1.1), an optional `meta` chip
 * beside it, and an optional item on the right.
 */
export function PageTitle({ children, aside, meta }: { children: ReactNode; aside?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-wm-display text-wm-app-title-mobile text-wm-ink md:text-wm-app-title">{children}</h1>
        {meta}
      </div>
      {aside}
    </div>
  );
}
