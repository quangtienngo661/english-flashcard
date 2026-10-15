import type { MouseEvent, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ListState } from './ListState';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Width/alignment classes for the table cell (e.g. `w-24`). */
  className?: string;
  /** Role in the stacked card: the title line (default for the first column), a "label: value" line, or an action. */
  card?: 'title' | 'field' | 'action';
};

type Props<T> = {
  rows: T[];
  rowKey: (row: T) => string;
  columns: Column<T>[];
  state: 'loading' | 'error' | 'ready';
  emptyText?: string;
  emptyHint?: string;
  onRetry?: () => void;
  /** Makes the whole table row a mouse target for this URL; the row's own link stays the keyboard path. */
  rowHref?: (row: T) => string;
  /** The row whose detail is open (highlighted). */
  selectedKey?: string;
};

/**
 * A table when the list's own container is at least 40rem wide, stacked cards below (container query, not
 * viewport: the content area is what narrows when the sidebar is open). Empty/loading/error go to `ListState`.
 * The table sits straight on the white sheet (design §6.2): it bleeds to the sheet's edges (the sheet pads its
 * content by page-pad) and its header row sticks to the top while the page scrolls (`overflow-clip`, unlike
 * `overflow-hidden`, keeps sticky working).
 */
export function DataList<T>({ rows, rowKey, columns, state, emptyText, emptyHint, onRetry, rowHref, selectedKey }: Props<T>) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (state !== 'ready') return <ListState state={state === 'loading' ? 'loading' : 'error'} onRetry={onRetry} />;
  if (rows.length === 0) return <ListState state="empty" emptyText={emptyText} emptyHint={emptyHint} />;

  function openRow(event: MouseEvent<HTMLElement>, href: string) {
    // A link or button in the row handles its own click; dragging to select text is not a click on the row.
    if ((event.target as Element).closest('a, button') || window.getSelection()?.toString()) return;
    // Clicking the row that is already open must not stack a second history entry (Review Focus 2).
    void navigate(href, { replace: href === pathname });
  }

  const edge = 'first:pl-page-pad-min last:pr-page-pad-min shell:first:pl-page-pad-max shell:last:pr-page-pad-max';
  return (
    <div className="@container">
      <div className="-mx-page-pad-min hidden overflow-clip @list:block shell:-mx-page-pad-max">
        {/* Automatic layout: columns take their className share, but never shrink below what a no-wrap cell needs. */}
        <table className="w-full table-auto text-ui">
          <thead className="text-left">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`sticky top-0 z-10 border-b-2 border-border bg-surface px-4 py-2.5 font-medium text-muted ${edge} ${c.className ?? ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row);
              const href = rowHref?.(row);
              return (
                <tr
                  key={key}
                  data-selected={key === selectedKey || undefined}
                  onClick={href ? (event) => openRow(event, href) : undefined}
                  className={`border-b border-border transition-colors duration-instant ease-standard data-selected:bg-accent-soft ${href ? 'cursor-pointer hover:bg-primary/4' : ''}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`min-w-0 wrap-anywhere px-4 py-3.5 align-middle ${edge} ${c.className ?? ''}`}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 @list:hidden">
        {rows.map((row) => {
          const key = rowKey(row);
          return (
            <li
              key={key}
              data-testid="card"
              data-selected={key === selectedKey || undefined}
              className="flex flex-col gap-1.5 rounded-panel border-2 border-border bg-surface px-4 py-3 data-selected:bg-accent-soft"
            >
              {columns.map((c, i) => {
                const role = c.card ?? (i === 0 ? 'title' : 'field');
                if (role === 'title') return <div key={c.key} className="min-w-0 wrap-anywhere font-semibold text-ink">{c.cell(row)}</div>;
                if (role === 'action') return <div key={c.key} className="flex">{c.cell(row)}</div>;
                return (
                  <div key={c.key} className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>{c.header}:</span>
                    <span className="min-w-0 wrap-anywhere text-ui text-ink">{c.cell(row)}</span>
                  </div>
                );
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
