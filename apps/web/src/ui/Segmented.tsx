'use client';

import { Label, Radio, RadioGroup } from 'react-aria-components';
import { cn } from '@/lib/cn';
import { COUNT_BOX, COUNT_BOX_REST } from './count-box';

type Props<T extends string> = {
  label: string;
  value: T;
  options: Array<{ id: T; label: string; count?: number }>;
  onChange: (id: T) => void;
  isDisabled?: boolean;
  /** Fill the width given, each option an equal share (the word filter of Tùy chỉnh phiên). */
  fullWidth?: boolean;
  /** Smaller options, for a segment that sits on a row next to its label (Tùy chỉnh phiên). */
  compact?: boolean;
};

/**
 * One choice among a few `options`, a radio group named `label`. Figma "Nút chia đoạn" (138:319): fully round, the chosen option on
 * surface with a row shadow.
 */
export function Segmented<T extends string>({ label, value, options, onChange, isDisabled, fullWidth = false, compact = false }: Props<T>) {
  // Owner 10/11/2026: the in-row and full-width segments use smaller type (12px, semibold), so they sit on one line in the options dialog.
  const size = compact ? 'px-2 py-1 text-xs font-semibold' : fullWidth ? 'px-2 py-1.5 text-xs font-semibold' : 'px-3.5 py-1.5 text-wm-small-strong';
  return (
    <RadioGroup
      value={value}
      onChange={(v) => onChange(v as T)}
      orientation="horizontal"
      isDisabled={isDisabled}
      className={fullWidth ? 'flex w-full flex-col' : 'flex shrink-0 flex-col'}
    >
      <Label className="sr-only">{label}</Label>
      {/* Equal-width options and one font weight, so nothing shifts when the choice changes. No option is narrower than its text and
          count (owner 13/11/2026: with Tailwind's auto-cols-fr, minmax(0, 1fr), "All words 61" spilled its count out of the chosen pill). */}
      <div
        // raw-ok: a track never narrower than its option's text and count, and equal when there is room; no token for minmax()
        className="grid auto-cols-[minmax(max-content,1fr)] grid-flow-col gap-1 rounded-wm-pill bg-wm-accent-soft p-1"
      >
        {options.map((option) => (
          <Radio
            key={option.id}
            value={option.id}
            className={`cursor-pointer whitespace-nowrap rounded-wm-pill text-center ${size} font-wm-sans text-wm-muted outline-none transition duration-200 ease-wm-out-strong data-focus-visible:outline-3 data-focus-visible:outline-wm-accent data-selected:bg-wm-surface data-selected:text-wm-ink data-selected:shadow-wm-row data-disabled:cursor-not-allowed data-disabled:opacity-60`}
          >
            {({ isSelected }) => (
              <>
                {option.label}
                {option.count !== undefined && (
                  <>
                    {' '}
                    <span className={cn('ms-1.5', isSelected ? `${COUNT_BOX} bg-wm-accent-soft text-wm-accent` : `${COUNT_BOX_REST} ring-wm-line`)}>{option.count}</span>
                  </>
                )}
              </>
            )}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
