import { Check, ChevronDown } from 'lucide-react';
import { Button, Label, ListBox, ListBoxItem, Popover, Select as AriaSelect, SelectValue, Text } from 'react-aria-components';

type Props = {
  label: string;
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  error?: string;
};

export function Select({ label, items, value, onChange, isDisabled, placeholder, error }: Props) {
  return (
    <AriaSelect
      selectedKey={value === '' ? null : value}
      placeholder={placeholder}
      isInvalid={error !== undefined}
      onSelectionChange={(key) => key !== null && onChange(String(key))}
      isDisabled={isDisabled}
      className="group flex w-full flex-col gap-1.5"
    >
      <Label className="text-ui font-medium text-ink">{label}</Label>
      <Button className="flex min-h-control w-full items-center justify-between gap-2 rounded-control border border-border-strong bg-surface px-3 py-1.5 text-left text-ui text-ink outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 group-data-invalid:border-danger">
        <SelectValue className="min-w-0 truncate" />
        <ChevronDown aria-hidden className="size-4 shrink-0" />
      </Button>
      {error && <Text slot="errorMessage" className="text-xs text-danger-strong">{error}</Text>}
      {/* React Aria caps the popover's height to the space left on screen; the list scrolls inside it. */}
      <Popover className="w-(--trigger-width) overflow-y-auto overscroll-contain rounded-control bg-surface p-1 shadow-card">
        <ListBox className="outline-none">
          {items.map((item) => (
            <ListBoxItem
              key={item.id}
              id={item.id}
              textValue={item.label}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-control px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft"
            >
              {({ isSelected }) => (
                <>
                  {item.label}
                  {isSelected && <Check aria-hidden className="size-4" />}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
