import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Checkbox as AriaCheckbox } from 'react-aria-components';

export function Checkbox({ isSelected, onChange, children, isDisabled }: { isSelected: boolean; onChange: (v: boolean) => void; children: ReactNode; isDisabled?: boolean }) {
  return (
    <AriaCheckbox isSelected={isSelected} onChange={onChange} isDisabled={isDisabled} className="group flex items-center gap-2 text-ui text-ink outline-none">
      <span className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface group-data-focus-visible:ring-2 group-data-focus-visible:ring-primary group-data-selected:border-primary group-data-selected:bg-primary">
        {isSelected && <Check aria-hidden className="size-3 text-on-primary" />}
      </span>
      {children}
    </AriaCheckbox>
  );
}
