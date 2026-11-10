'use client';

import { Label, Radio, RadioGroup } from 'react-aria-components';

type Props<T extends string> = {
  label: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (id: T) => void;
  isDisabled?: boolean;
};

/** Same props as app-ui/Segmented; Figma "Nút chia đoạn" (138:319): fully round, the chosen option on surface with a row shadow. */
export function Segmented<T extends string>({ label, value, options, onChange, isDisabled }: Props<T>) {
  return (
    <RadioGroup
      value={value}
      onChange={(v) => onChange(v as T)}
      orientation="horizontal"
      isDisabled={isDisabled}
      className="flex shrink-0 flex-col"
    >
      <Label className="sr-only">{label}</Label>
      {/* Equal-width options and one font weight, so nothing shifts when the choice changes. */}
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-wm-pill bg-wm-accent-soft p-1">
        {options.map((option) => (
          <Radio
            key={option.id}
            value={option.id}
            className="cursor-pointer whitespace-nowrap rounded-wm-pill px-3.5 py-1.5 text-center font-wm-sans text-wm-small-strong text-wm-muted outline-none transition duration-150 ease-out-strong data-focus-visible:outline-3 data-focus-visible:outline-wm-accent data-selected:bg-wm-surface data-selected:text-wm-ink data-selected:shadow-wm-row data-disabled:opacity-60"
          >
            {option.label}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
