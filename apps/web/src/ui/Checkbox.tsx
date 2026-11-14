'use client';

import { Check, CircleAlert, Minus } from 'lucide-react';
import { useId, type ReactNode, type SyntheticEvent } from 'react';
import { Checkbox as AriaCheckbox } from 'react-aria-components';
import { FIELD_ERROR } from './field-styles';

// A link inside the label (the sign-up consent text) opens on click: its presses must not reach the label, which would toggle the box.
const keepLinkPresses = (event: SyntheticEvent) => {
  if ((event.target as HTMLElement).closest('a')) event.stopPropagation();
};

/**
 * A controlled checkbox (`isSelected`, `onChange`) labelled by `children`; Figma "Ô tick" (34:355) and "Ô chọn nhỏ" (96:315). `error`
 * marks it wrong and shows the line under it, tied to the box as its description.
 */
export function Checkbox({
  isSelected,
  isIndeterminate,
  onChange,
  children,
  isDisabled,
  isInvalid,
  error,
}: {
  isSelected: boolean;
  isIndeterminate?: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  isDisabled?: boolean;
  isInvalid?: boolean;
  error?: string;
}) {
  const errorId = useId();
  const box = (
    <AriaCheckbox
      isSelected={isSelected}
      isIndeterminate={isIndeterminate}
      onChange={onChange}
      isDisabled={isDisabled}
      isInvalid={isInvalid || error !== undefined}
      aria-describedby={error !== undefined ? errorId : undefined}
      className="group flex items-start gap-2.5 font-wm-sans text-wm-small text-wm-ink outline-none"
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-wm-key border-2 border-wm-control-line bg-wm-surface group-data-focus-visible:outline-3 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-wm-accent group-data-invalid:border-wm-fail group-data-selected:border-wm-accent group-data-selected:bg-wm-accent group-data-indeterminate:border-wm-accent group-data-indeterminate:bg-wm-accent">
        {isIndeterminate ? <Minus aria-hidden className="size-3.5 text-wm-on-accent" /> : isSelected && <Check aria-hidden className="size-3.5 text-wm-on-accent" />}
      </span>
      <span
        className="min-w-0"
        onPointerDown={keepLinkPresses}
        onPointerUp={keepLinkPresses}
        onMouseDown={keepLinkPresses}
        onMouseUp={keepLinkPresses}
        onClick={keepLinkPresses}
        onKeyDown={keepLinkPresses}
        onKeyUp={keepLinkPresses}
      >
        {children}
      </span>
    </AriaCheckbox>
  );
  // The same wrapper with or without the error, so the box keeps its focus when the error goes; `contents` leaves layouts as they were.
  return (
    <div className={error === undefined ? 'contents' : 'flex flex-col gap-1.5'}>
      {box}
      {error !== undefined && (
        <p id={errorId} className={FIELD_ERROR}>
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
