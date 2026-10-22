'use client';

import { useState, type ReactNode } from 'react';
import { Switch as AriaSwitch } from 'react-aria-components';
import { LockedFeature, ProBadge } from './Locked';

type Props = {
  label: ReactNode;
  description?: ReactNode;
  isSelected: boolean;
  onChange: (on: boolean) => void;
  isDisabled?: boolean;
  /** Pro-only on this plan (D6, design §6): looks off and dimmed, says why when pressed, never turns on. */
  locked?: boolean;
};

const TRACK = 'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition duration-fast ease-standard';
const THUMB = 'size-4 rounded-full transition duration-fast ease-standard';

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
          className="flex w-full items-center justify-between gap-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 text-ui font-medium text-ink">
              {label}
              <ProBadge />
            </span>
            {description && <span className="text-caption text-muted">{description}</span>}
          </span>
          <span aria-hidden className={`${TRACK} border-border-strong bg-neutral-soft opacity-60`}>
            <span className={`${THUMB} ml-0.5 bg-border-strong`} />
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
      <span className="flex min-w-0 flex-col">
        <span className="text-ui font-medium text-ink">{label}</span>
        {description && <span className="text-caption text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={`${TRACK} border-border-strong bg-surface group-data-focus-visible:ring-2 group-data-focus-visible:ring-primary group-data-focus-visible:ring-offset-2 group-data-selected:border-primary group-data-selected:bg-primary`}
      >
        <span className={`${THUMB} ml-0.5 bg-border-strong group-data-selected:translate-x-5 group-data-selected:bg-on-primary`} />
      </span>
    </AriaSwitch>
  );
}
