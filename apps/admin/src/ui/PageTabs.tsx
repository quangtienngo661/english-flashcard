import type { ReactNode } from 'react';
import { Link, type To } from 'react-router';

type Item = { id: string; to: To; label: string; current: boolean; count?: number | string };

/**
 * Sub-pages of one screen as links under an underline (Cấu hình, Bộ ví dụ). Each is its own address, so it is a `nav` of links
 * with `aria-current`, not ARIA tabs; `aside` sits at the right end of the row (e.g. [Tạo nháp]). Never scrolls: the row wraps.
 */
export function PageTabs({ label, items, aside }: { label: string; items: Item[]; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b-2 border-border">
      <nav aria-label={label}>
        <ul className="flex flex-wrap gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.to}
                aria-current={item.current ? 'page' : undefined}
                data-current={item.current || undefined}
                className="relative inline-flex min-h-control items-center gap-1.5 rounded-t-sm px-3 pb-1 text-ui font-medium text-muted outline-none hover:bg-canvas hover:text-ink focus-visible:ring-2 focus-visible:ring-primary data-current:font-semibold data-current:text-primary data-current:after:absolute data-current:after:inset-x-2 data-current:after:-bottom-0.5 data-current:after:h-0.75 data-current:after:rounded-t-sm data-current:after:bg-primary"
              >
                {item.label}
                {/* A space for the accessible name ("Các bản nháp 3"); flex drops it visually. */}
                {item.count !== undefined && ' '}
                {item.count !== undefined && (
                  <span className={`rounded-full px-1.5 text-xs font-semibold tabular-nums ${item.current ? 'bg-primary-soft text-primary' : 'bg-neutral-soft text-muted'}`}>
                    {item.count}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {aside && <div className="pb-2">{aside}</div>}
    </div>
  );
}
