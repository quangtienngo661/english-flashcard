import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Small SVG/HTML charts for the AI dashboard, no chart library (dataviz rules): thin marks with a 2px gap, a legend for two or
 * more series, values in text tokens only, a per-column hover/focus tooltip, and every value also in a table or a label.
 * Series 1 is `primary`, series 2 `accent-deep` (validated together on the light surface: CVD ΔE 39, contrast warns for the
 * yellow, so a legend and a table always ship with it); `danger` is reserved for failures and always labelled.
 */
export type Series = { label: string; fill: string; swatch: string };

export const SERIES = {
  first: { fill: 'fill-primary', swatch: 'bg-primary' },
  second: { fill: 'fill-accent-deep', swatch: 'bg-accent-deep' },
  failure: { fill: 'fill-danger', swatch: 'bg-danger' },
} as const;

export function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s) => (
        <li key={s.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-2.5 rounded-sm ${s.swatch}`} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/** Width of an element, followed on resize; a fixed fallback where ResizeObserver does not exist (tests). */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

const niceMax = (value: number): number => {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
};

type ColumnProps = {
  /** Names the chart for screen readers. */
  label: string;
  series: Series[];
  /** One column per day; `values[i]` belongs to `series[i]`, stacked from the baseline in that order. */
  days: Array<{ date: string; values: number[] }>;
  formatValue: (value: number) => string;
  formatDay: (date: string) => string;
};

const HEIGHT = 160;
const AXIS = 44;

/** Stacked columns per day on one axis, hairline grid at 0 / half / max, a tooltip on hover and on keyboard focus. */
export function ColumnChart({ label, series, days, formatValue, formatDay }: ColumnProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...days.map((day) => day.values.reduce((sum, v) => sum + v, 0))));
  const plot = width - AXIS;
  const band = plot / Math.max(1, days.length);
  const bar = Math.max(2, Math.min(24, band - 4));
  const y = (value: number) => HEIGHT - (value / max) * HEIGHT;
  const ticks = [0, max / 2, max];
  const day = active === null ? null : days[active];

  return (
    <div className="flex flex-col gap-2">
      <Legend series={series} />
      <div ref={ref} className="relative w-full">
        <svg role="group" aria-label={label} width={width} height={HEIGHT + 24} className="block overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={AXIS} x2={width} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={1} />
              <text x={AXIS - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-xs tabular-nums">{formatValue(tick)}</text>
            </g>
          ))}
          {days.map((d, index) => {
            const x = AXIS + index * band + (band - bar) / 2;
            let base = 0;
            return (
              <g key={d.date} className={active !== null && active !== index ? 'opacity-50' : undefined}>
                {d.values.map((value, s) => {
                  if (value <= 0) return null;
                  const top = y(base + value);
                  // 2px surface gap between stacked segments; the first segment sits on the baseline.
                  const height = Math.max(1, y(base) - top - (base > 0 ? 2 : 0));
                  base += value;
                  return <rect key={s} x={x} y={top} width={bar} height={height} rx={Math.min(4, bar / 2)} className={series[s].fill} />;
                })}
                <rect
                  x={AXIS + index * band}
                  y={0}
                  width={band}
                  height={HEIGHT}
                  role="img"
                  className="fill-transparent outline-none"
                  tabIndex={0}
                  aria-label={`${formatDay(d.date)}: ${series.map((s, i) => `${s.label} ${formatValue(d.values[i] ?? 0)}`).join(', ')}`}
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
          {[0, Math.floor((days.length - 1) / 2), days.length - 1].filter((v, i, all) => all.indexOf(v) === i && days[v]).map((index) => (
            <text key={index} x={AXIS + index * band + band / 2} y={HEIGHT + 16} textAnchor="middle" className="fill-muted text-xs tabular-nums">
              {formatDay(days[index].date)}
            </text>
          ))}
        </svg>
        {day && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 flex min-w-36 -translate-x-1/2 flex-col gap-1 rounded-control border-2 border-border bg-surface px-3 py-2 text-xs text-muted shadow-menu"
            // raw-ok: the tooltip follows the hovered column, a position only known at run time.
            style={{ left: Math.min(Math.max(AXIS + active * band + band / 2, 80), width - 80) }}
          >
            <span className="font-semibold text-ink">{formatDay(day.date)}</span>
            {series.map((s, i) => (
              <span key={s.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={`h-0.5 w-3 ${s.swatch}`} />
                  {s.label}
                </span>
                <span className="font-semibold tabular-nums text-ink">{formatValue(day.values[i] ?? 0)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type ShareColumn = {
  key: string;
  /** The whole name of the column: its screen-reader name and the head of its tooltip. */
  label: string;
  /** Short lines written under the column when `label` is too long for it; the label itself when absent. */
  axis?: string[];
  /** Shares of the series, in series order, each between 0 and 1: a column stacks them from the baseline. */
  values: number[];
  /** One more line of the tooltip and of the screen-reader name, for the counts the shares come from. */
  note?: string;
};

const SHARE_TOP = 18;
const LINE = 14;
/** About how wide a character of the 12px axis text is; labels are cut to what their column can hold, the whole text stays in the tooltip. */
const CHAR = 6.5;

const fit = (text: string, maxChars: number): string => (text.length <= maxChars ? text : `${text.slice(0, Math.max(1, maxChars - 1))}…`);

/**
 * Stacked shares per group on a fixed 0–1 axis (one column per group, its label under it), with a dashed line and a label at the left edge of
 * each marked column. Same legend, keyboard focus, screen-reader name and tooltip as `ColumnChart`.
 */
export function ShareColumns({ label, series, columns, markers, formatValue }: {
  label: string;
  series: Series[];
  columns: ShareColumn[];
  markers: Array<{ index: number; label: string }>;
  formatValue: (value: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const top = markers.length > 0 ? SHARE_TOP : 4;
  const plot = width - AXIS;
  const band = plot / Math.max(1, columns.length);
  const bar = Math.max(2, Math.min(40, band - 8));
  const y = (value: number) => top + HEIGHT - value * HEIGHT;
  const ticks = [0, 0.5, 1];
  const axisOf = (column: ShareColumn) => column.axis ?? [column.label];
  const lines = Math.max(1, ...columns.map((column) => axisOf(column).length));
  const maxChars = Math.max(3, Math.floor((band - 4) / CHAR));
  // Narrow columns would write over each other: then only the first, middle and last carry their label.
  const labelled = band >= 36 ? columns.map((_, index) => index)
    : [0, Math.floor((columns.length - 1) / 2), columns.length - 1].filter((v, i, all) => all.indexOf(v) === i && columns[v]);
  const shown = active === null ? null : columns[active];
  const nameOf = (column: ShareColumn) =>
    `${column.label}: ${series.map((s, i) => `${s.label} ${formatValue(column.values[i] ?? 0)}`).join(', ')}${column.note ? `, ${column.note}` : ''}`;

  return (
    <div className="flex flex-col gap-2">
      <Legend series={series} />
      <div ref={ref} className="relative w-full">
        <svg role="group" aria-label={label} width={width} height={top + HEIGHT + 12 + lines * LINE} className="block overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={AXIS} x2={width} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={1} />
              <text x={AXIS - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-xs tabular-nums">{formatValue(tick)}</text>
            </g>
          ))}
          {columns.map((column, index) => {
            const x = AXIS + index * band + (band - bar) / 2;
            let base = 0;
            return (
              <g key={column.key} className={active !== null && active !== index ? 'opacity-50' : undefined}>
                {column.values.map((value, s) => {
                  if (value <= 0) return null;
                  const barTop = y(base + value);
                  // 2px surface gap between stacked segments; the first segment sits on the baseline.
                  const height = Math.max(1, y(base) - barTop - (base > 0 ? 2 : 0));
                  base += value;
                  return <rect key={s} x={x} y={barTop} width={bar} height={height} rx={Math.min(4, bar / 2)} className={series[s].fill} />;
                })}
                <rect
                  x={AXIS + index * band}
                  y={top}
                  width={band}
                  height={HEIGHT}
                  role="img"
                  className="fill-transparent outline-none"
                  tabIndex={0}
                  aria-label={nameOf(column)}
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
          {markers.map((marker, k) => {
            const x = AXIS + marker.index * band;
            const before = k > 0 ? AXIS + markers[k - 1].index * band : AXIS;
            const after = k < markers.length - 1 ? AXIS + markers[k + 1].index * band : width;
            // The label sits right of its line when it fits before the next marker, otherwise left of it, never past the chart's edges.
            const right = after - x - 8;
            const left = x - before - 8;
            const onRight = right >= marker.label.length * CHAR || right >= left;
            return (
              <g key={marker.index}>
                <line x1={x} x2={x} y1={top} y2={top + HEIGHT} className="stroke-border" strokeWidth={1.5} strokeDasharray="4 3" />
                <text x={onRight ? x + 4 : x - 4} y={top - 6} textAnchor={onRight ? 'start' : 'end'} className="fill-muted text-xs">
                  {fit(marker.label, Math.floor((onRight ? right : left) / CHAR))}
                </text>
              </g>
            );
          })}
          {labelled.map((index) => (
            <text key={columns[index].key} x={AXIS + index * band + band / 2} y={top + HEIGHT + 16} textAnchor="middle" className="fill-muted text-xs">
              {axisOf(columns[index]).map((line, n) => (
                <tspan key={n} x={AXIS + index * band + band / 2} dy={n === 0 ? 0 : LINE}>{fit(line, maxChars)}</tspan>
              ))}
            </text>
          ))}
        </svg>
        {shown && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 flex w-60 max-w-full -translate-x-1/2 flex-col gap-1 rounded-control border-2 border-border bg-surface px-3 py-2 text-xs text-muted shadow-menu"
            // raw-ok: the tooltip follows the hovered column, a position only known at run time.
            style={{ left: Math.min(Math.max(AXIS + active * band + band / 2, 124), Math.max(124, width - 124)) }}
          >
            <span className="wrap-anywhere font-semibold text-ink">{shown.label}</span>
            {series.map((s, i) => (
              <span key={s.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={`h-0.5 w-3 ${s.swatch}`} />
                  {s.label}
                </span>
                <span className="font-semibold tabular-nums text-ink">{formatValue(shown.values[i] ?? 0)}</span>
              </span>
            ))}
            {shown.note && <span className="wrap-anywhere">{shown.note}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

type BarRow = { key: string; label: ReactNode; values: number[]; display: string[] };

/** Horizontal bars, one row per category (one bar per series), the value written at the tip. */
export function BarList({ label, series, rows, max }: { label: string; series: Series[]; rows: BarRow[]; max?: number }) {
  const top = max ?? Math.max(0, ...rows.flatMap((row) => row.values));
  return (
    <div className="flex flex-col gap-3">
      <Legend series={series} />
      <ul aria-label={label} className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.key} className="grid gap-1 shell:grid-cols-3 shell:items-center shell:gap-3">
            <span className="wrap-anywhere text-ui text-ink">{row.label}</span>
            <span className="flex flex-col gap-1 shell:col-span-2">
              {row.values.map((value, i) => (
                <span key={series[i].label} className="flex items-center gap-2">
                  <span className="h-2.5 min-w-0 flex-1">
                    <span
                      className={`block h-full rounded-r ${series[i].swatch}`}
                      // raw-ok: a bar's length is its value, known at run time.
                      style={{ width: top > 0 ? `${Math.max(value > 0 ? 1 : 0, (value / top) * 100)}%` : '0%' }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted">
                    {series.length > 1 ? <span className="sr-only">{`${series[i].label}: `}</span> : null}
                    {row.display[i]}
                  </span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One ratio against a limit: the fill turns `danger` once the alert share is reached, the track is a lighter step. */
export function Meter({ label, value, max, display, alert }: { label: string; value: number; max: number | null; display: string; alert?: boolean }) {
  const share = max && max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-panel bg-neutral-soft px-4 py-3">
      <span className={`break-words text-2xl font-extrabold ${alert ? 'text-danger' : 'text-ink'}`}>{display}</span>
      <span className="text-xs text-muted">{label}</span>
      <span
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max ?? 0}
        aria-valuenow={value}
        className={`block h-2 overflow-hidden rounded-full ${alert ? 'bg-danger-soft' : 'bg-primary-soft'}`}
      >
        <span
          className={`block h-full rounded-full ${alert ? 'bg-danger' : 'bg-primary'}`}
          // raw-ok: the fill is the share of the limit, known at run time.
          style={{ width: `${share * 100}%` }}
        />
      </span>
    </div>
  );
}

/** The table twin of a chart, folded away so it does not compete with the chart. */
export function TableView({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group text-ui">
      <summary className="w-fit cursor-pointer rounded-control px-2 py-1 font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary">
        {summary}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
