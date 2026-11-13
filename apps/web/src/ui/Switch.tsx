'use client';

import { useState, type ReactNode } from 'react';
import { Switch as AriaSwitch } from 'react-aria-components';
import { LockedFeature, ProBadge } from './ProBadge';

type Props = {
  label: ReactNode;
  description?: ReactNode;
  isSelected: boolean;
  onChange: (on: boolean) => void;
  isDisabled?: boolean;
  /** Pro-only on this plan (D6): looks off and dimmed, says why when pressed, never turns on. */
  locked?: boolean;
};

// Figma "Công tắc" (138:324): a fully round track, accent when on.
const TRACK = 'relative inline-flex h-6 w-11 shrink-0 items-center rounded-wm-pill transition duration-150 ease-wm-out-strong';
const THUMB = 'size-5 rounded-wm-pill bg-wm-surface shadow-wm-row transition duration-150 ease-wm-out-strong';
const TEXT = 'flex min-w-0 flex-col';

/** A controlled on/off switch with a label and an optional description; `locked` is a Pro-only switch on this plan. */
export function Switch({ label, description, isSelected, onChange, isDisabled, locked = false }: Props) {
  const [showLocked, setShowLocked] = useState(false);
  if (locked) {
    return (
      <div className="flex flex-col gap-2">
        {/* aria-disabled keeps it focusable and pressable, so the learner can find out why it is off. */}
        <button
          type="button"
          role="switch"
          aria-checked={false}
          aria-disabled
          onClick={() => setShowLocked(true)}
          className="flex w-full items-center justify-between gap-4 rounded-wm-control text-left outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent"
        >
          <span className={TEXT}>
            <span className="flex items-center gap-2 font-wm-sans text-wm-base-strong text-wm-ink">
              {label}
              <ProBadge />
            </span>
            {description && <span className="font-wm-sans text-wm-caption text-wm-muted">{description}</span>}
          </span>
          <span aria-hidden className={`${TRACK} bg-wm-control-line opacity-60`}>
            <span className={`${THUMB} ml-0.5`} />
          </span>
        </button>
        {showLocked && <LockedFeature />}
      </div>
    );
  }
  return (
    <AriaSwitch
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      className="group flex w-full items-center justify-between gap-4 outline-none disabled:opacity-60"
    >
      <span className={TEXT}>
        <span className="font-wm-sans text-wm-base-strong text-wm-ink">{label}</span>
        {description && <span className="font-wm-sans text-wm-caption text-wm-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={`${TRACK} bg-wm-control-line group-data-focus-visible:outline-3 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-wm-accent group-data-selected:bg-wm-accent`}
      >
        <span className={`${THUMB} ml-0.5 group-data-selected:translate-x-5`} />
      </span>
    </AriaSwitch>
  );
}
