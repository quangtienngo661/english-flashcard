'use client';

import { Check } from 'lucide-react';
import type { ReactNode, SyntheticEvent } from 'react';
import { Checkbox as AriaCheckbox } from 'react-aria-components';

// A link inside the label (the sign-up consent text) opens on click: its presses must not reach the label, which would toggle the box.
const keepLinkPresses = (event: SyntheticEvent) => {
  if ((event.target as HTMLElement).closest('a')) event.stopPropagation();
};

// Copied from apps/admin/src/ui/Checkbox.tsx; adds an invalid state (the sign-up consent box) and links in the label.
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
      className="group flex items-start gap-2.5 text-ui text-ink outline-none"
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border-2 border-border-strong bg-surface group-data-focus-visible:ring-2 group-data-focus-visible:ring-primary group-data-focus-visible:ring-offset-2 group-data-invalid:border-danger group-data-selected:border-primary group-data-selected:bg-primary">
        {isSelected && <Check aria-hidden className="size-3.5 text-on-primary" />}
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
