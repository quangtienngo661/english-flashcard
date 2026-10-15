import type { ReactNode } from 'react';
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
};

/**
 * A table when the list's own container is at least 40rem wide, stacked cards below (container query, not
 * viewport: the content area is what narrows when the sidebar is open). Empty/loading/error go to `ListState`.
 */
export function DataList<T>({ rows, rowKey, columns, state, emptyText, emptyHint, onRetry }: Props<T>) {
  const shell = 'overflow-hidden rounded-panel bg-surface shadow-card';
  if (state !== 'ready') {
    return (
      <div className={shell}>
        <ListState state={state === 'loading' ? 'loading' : 'error'} onRetry={onRetry} />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className={shell}>
        <ListState state="empty" emptyText={emptyText} emptyHint={emptyHint} />
      </div>
    );
  }
  return (
    <div className="@container">
      <div className={`hidden @list:block ${shell}`}>
        <table className="w-full table-fixed text-ui">
          <thead className="bg-bg text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-4 py-2.5 font-normal ${c.className ?? ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-t border-border">
                {columns.map((c) => (
                  <td key={c.key} className={`min-w-0 wrap-anywhere px-4 py-3 align-middle ${c.className ?? ''}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 @list:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} data-testid="card" className="flex flex-col gap-1.5 rounded-panel bg-surface px-4 py-3 shadow-card">
            {columns.map((c, i) => {
              const role = c.card ?? (i === 0 ? 'title' : 'field');
              if (role === 'title') return <div key={c.key} className="min-w-0 wrap-anywhere font-medium text-ink">{c.cell(row)}</div>;
              if (role === 'action') return <div key={c.key} className="flex">{c.cell(row)}</div>;
              return (
                <div key={c.key} className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>{c.header}:</span>
                  <span className="min-w-0 wrap-anywhere text-ui text-ink">{c.cell(row)}</span>
                </div>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
