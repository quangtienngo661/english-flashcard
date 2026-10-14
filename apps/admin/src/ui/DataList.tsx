import type { ReactNode } from 'react';
import { ListState } from './ListState';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Width/alignment classes for the table cell (e.g. `w-24`). */
  className?: string;
};

type Props<T> = {
  rows: T[];
  rowKey: (row: T) => string;
  columns: Column<T>[];
  state: 'loading' | 'error' | 'ready';
  emptyText?: string;
  onRetry?: () => void;
};

/**
 * A table when the list's own container is at least 40rem wide, stacked cards below (container query, not
 * viewport: the content area is what narrows when the sidebar is open). Empty/loading/error go to `ListState`.
 */
export function DataList<T>({ rows, rowKey, columns, state, emptyText, onRetry }: Props<T>) {
  const shell = 'overflow-hidden rounded-panel border border-border bg-surface';
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
        <ListState state="empty" emptyText={emptyText} />
      </div>
    );
  }
  return (
    <div className="@container">
      <div className={shell}>
        <table className="hidden w-full table-fixed text-ui @list:table">
          <thead className="bg-bg text-left text-xs text-muted">
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
                  <td key={c.key} className={`min-w-0 break-all px-4 py-3 align-middle ${c.className ?? ''}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="@list:hidden">
          {rows.map((row) => (
            <li key={rowKey(row)} data-testid="card" className="flex flex-col gap-2 border-t border-border px-4 py-3 first:border-t-0">
              {columns.map((c) => (
                <div key={c.key} className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs text-muted">{c.header}</span>
                  <div className="min-w-0 break-all text-ui text-ink">{c.cell(row)}</div>
                </div>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
