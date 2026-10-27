import { Check, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Checkbox as AriaCheckbox } from 'react-aria-components';

type Props = {
  isSelected: boolean;
  onChange: (v: boolean) => void;
  isDisabled?: boolean;
  /** "Some of them": a header checkbox over a partly selected list. */
  isIndeterminate?: boolean;
} & ({ children: ReactNode; 'aria-label'?: never } | { children?: never; 'aria-label': string });

/** A box with its text beside it, or (in a table row) only a box named by `aria-label`. */
export function Checkbox({ isSelected, onChange, children, isDisabled, isIndeterminate, 'aria-label': ariaLabel }: Props) {
  return (
    <AriaCheckbox
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      isIndeterminate={isIndeterminate}
      aria-label={ariaLabel}
      className="group flex items-center gap-2 text-ui text-ink outline-none"
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-sm border-2 border-border-strong bg-canvas group-data-focus-visible:ring-2 group-data-focus-visible:ring-primary group-data-focus-visible:ring-offset-2 group-data-selected:border-primary group-data-selected:bg-primary group-data-indeterminate:border-primary group-data-indeterminate:bg-primary">
        {isIndeterminate ? <Minus aria-hidden className="size-3.5 text-on-primary" /> : isSelected && <Check aria-hidden className="size-3.5 text-on-primary" />}
      </span>
      {children}
    </AriaCheckbox>
  );
}
