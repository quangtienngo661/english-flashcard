import type { ReactNode } from 'react';

/**
 * The app page heading ("Cài đặt", "Luyện tập"…): Bricolage ExtraBold 44 / 30 (mockup L124-125), an optional `eyebrow` line above it
 * ("thứ tư, 12/11", mockup L858), an optional `meta` chip beside it, and an optional item on the right.
 */
export function PageTitle({ children, eyebrow, aside, meta }: { children: ReactNode; eyebrow?: ReactNode; aside?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        {eyebrow && <p className="font-wm-sans text-wm-meta text-wm-muted">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-wm-display text-wm-app-title-mobile text-wm-ink md:text-wm-app-title">{children}</h1>
          {meta}
        </div>
      </div>
      {aside}
    </div>
  );
}
