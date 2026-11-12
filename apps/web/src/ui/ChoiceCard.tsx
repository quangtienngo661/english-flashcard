'use client';

import type { ReactNode } from 'react';
import { Label, Radio, RadioGroup } from 'react-aria-components';

type GroupProps<T extends string> = {
  label: string;
  /** The label stays for screen readers only (the period cards of Gói học sit under the Pro card's own heading). */
  hideLabel?: boolean;
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
};

/** A vertical radio group of `ChoiceCard`s, 16 px apart (design §7.5). Arrow keys move the choice. */
export function ChoiceCardGroup<T extends string>({ label, hideLabel = false, value, onChange, children }: GroupProps<T>) {
  return (
    <RadioGroup value={value} onChange={(next) => onChange(next as T)} className="flex flex-col gap-2">
      <Label className={hideLabel ? 'sr-only' : 'font-wm-sans text-wm-small-strong text-wm-ink'}>{label}</Label>
      <div className="flex flex-col gap-4">{children}</div>
    </RadioGroup>
  );
}

type CardProps = {
  value: string;
  title: string;
  /** Mono green beside the title from 768 px, under it on phones ("−37% · tiết kiệm nhất"). */
  note?: string;
  /** At the right end; part of the radio's name unless marked `aria-hidden`. `ui/` cannot format money, so it comes formatted. */
  trailing?: ReactNode;
  isDisabled?: boolean;
};

/**
 * One choice of a `ChoiceCardGroup` (design §7.5), drawn as the period cards of Gói học (M7 Figma B §1.3, not component 34:383): an 18 px
 * radio, the title and note, the trailing block. Radius 14, border 1.5 px `--line`; chosen: `--accent` border on accent at 4 %.
 */
export function ChoiceCard({ value, title, note, trailing, isDisabled }: CardProps) {
  return (
    <Radio
      value={value}
      isDisabled={isDisabled}
      // raw-ok: Figma draws the period cards with a 1.5 px border, between the 1 and 2 px utilities
      className="group flex cursor-pointer items-center gap-3 rounded-wm-lg border-[1.5px] border-wm-line px-4 py-3 outline-none transition duration-200 ease-out-strong data-selected:border-wm-accent data-selected:bg-wm-accent/4 data-focus-visible:outline-3 data-focus-visible:outline-offset-2 data-focus-visible:outline-wm-accent data-disabled:cursor-not-allowed data-disabled:opacity-50"
    >
      <span
        aria-hidden
        // raw-ok: the 18 px radio ring is 1.5 px, like the card's border
        className="flex size-4.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-wm-ghost bg-wm-surface group-data-selected:border-wm-accent"
      >
        <span className="size-2 rounded-full group-data-selected:bg-wm-accent" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-baseline md:gap-2">
        <span className="font-wm-sans text-wm-button text-wm-ink">{title}</span>
        {note && (
          // raw-ok: Figma's saving note is Noto Sans Bold 11, under the 12 px meta token
          <span className="text-[0.6875rem] font-bold leading-snug text-wm-pass">{note}</span>
        )}
      </span>
      {trailing !== undefined && <span className="shrink-0 text-right">{trailing}</span>}
    </Radio>
  );
}
