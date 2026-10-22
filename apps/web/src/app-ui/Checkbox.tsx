'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Checkbox as AriaCheckbox } from 'react-aria-components';

// Copied from apps/admin/src/ui/Checkbox.tsx; adds an invalid state (the sign-up consent box).
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
      <span className="min-w-0">{children}</span>
    </AriaCheckbox>
  );
}
