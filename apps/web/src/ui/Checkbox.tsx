'use client';

import { Check } from 'lucide-react';
import type { ReactNode, SyntheticEvent } from 'react';
import { Checkbox as AriaCheckbox } from 'react-aria-components';

// A link inside the label (the sign-up consent text) opens on click: its presses must not reach the label, which would toggle the box.
const keepLinkPresses = (event: SyntheticEvent) => {
  if ((event.target as HTMLElement).closest('a')) event.stopPropagation();
};

/** A controlled checkbox (`isSelected`, `onChange`) labelled by `children`; Figma "Ô tick" (34:355) and "Ô chọn nhỏ" (96:315). */
export function Checkbox({
  isSelected,
  onChange,
  children,
  isDisabled,
  isInvalid,
}: {
  isSelected: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  isDisabled?: boolean;
  isInvalid?: boolean;
}) {
  return (
    <AriaCheckbox
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      className="group flex items-start gap-2.5 font-wm-sans text-wm-small text-wm-ink outline-none"
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-wm-sm border-2 border-wm-ghost bg-wm-surface group-data-focus-visible:outline-3 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-wm-accent group-data-invalid:border-wm-fail group-data-selected:border-wm-accent group-data-selected:bg-wm-accent">
        {isSelected && <Check aria-hidden className="size-3.5 text-wm-on-accent" />}
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
}
