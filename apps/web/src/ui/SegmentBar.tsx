import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BarSegment = {
  /** Segment width share (e.g. its words). */
  size: number;
  /** Filled part, in the same unit as `size`. */
  fill: number;
  /** Background class of the fill. */
  tone: string;
  /** Read by screen readers for this segment. */
  label?: string;
};

/**
 * A bar of segments (Figma "nhịp ôn", "Ưu tiên · đến hạn · mới"): each segment's width follows `size`, its fill `fill / size`.
 * `labels` (one per segment) are printed under it.
 */
export function SegmentBar({
  segments,
  labels,
  className,
  'aria-label': ariaLabel,
}: {
  segments: BarSegment[];
  labels?: ReactNode[];
  className?: string;
  'aria-label': string;
}) {
  return (
    <figure aria-label={ariaLabel} className={cn('m-0 w-full', className)}>
      <ul className="flex w-full gap-0.75">
        {segments.map((s, i) => (
          <li
            key={i}
            aria-label={s.label}
            className="flex min-w-0 flex-col gap-1.5"
            // raw-ok: the segment width is data (its share of the whole bar)
            style={{ flexGrow: s.size, flexBasis: 0 }}
          >
            <span className="relative block h-2.5 overflow-hidden rounded-wm-pill bg-wm-ink/14">
              <span
                className={cn('absolute inset-y-0 left-0 block rounded-wm-pill', s.tone)}
                // raw-ok: the fill width is data
                style={{ width: `${s.size > 0 ? Math.min(100, (s.fill / s.size) * 100) : 0}%` }}
              />
            </span>
            {labels?.[i] !== undefined && <span className="truncate text-wm-meta text-wm-muted">{labels[i]}</span>}
          </li>
        ))}
      </ul>
    </figure>
  );
}
