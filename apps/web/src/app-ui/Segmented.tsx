'use client';

import { Label, Radio, RadioGroup } from 'react-aria-components';

type Props<T extends string> = {
  label: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (id: T) => void;
  isDisabled?: boolean;
};

/** The pill switch of K/50 (Tiếng Việt | English, Sáng | Tối | Theo hệ thống): a radio group, the chosen one in ink. */
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
      <div className="flex rounded-control border border-border bg-surface p-1">
        {options.map((option) => (
          <Radio
            key={option.id}
            value={option.id}
            className="cursor-pointer whitespace-nowrap rounded-sm px-3 py-1.5 text-ui text-ink outline-none data-focus-visible:ring-2 data-focus-visible:ring-primary data-selected:bg-ink data-selected:font-semibold data-selected:text-surface data-disabled:opacity-60"
          >
            {option.label}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
