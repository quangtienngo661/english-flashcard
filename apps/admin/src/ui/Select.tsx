import { Check, ChevronDown } from 'lucide-react';
import { Button, Label, ListBox, ListBoxItem, Popover, Select as AriaSelect, SelectValue } from 'react-aria-components';

type Props = {
  label: string;
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  isDisabled?: boolean;
};

export function Select({ label, items, value, onChange, isDisabled }: Props) {
  return (
    <AriaSelect
      selectedKey={value}
      onSelectionChange={(key) => key !== null && onChange(String(key))}
      isDisabled={isDisabled}
      className="flex w-full flex-col gap-1.5"
    >
      <Label className="text-ui font-medium text-ink">{label}</Label>
      <Button className="flex min-h-control w-full items-center justify-between gap-2 rounded-control border border-border-strong bg-surface px-3 py-1.5 text-left text-ui text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60">
        <SelectValue className="min-w-0 truncate" />
        <ChevronDown aria-hidden className="size-4 shrink-0" />
      </Button>
      <Popover className="w-(--trigger-width) rounded-control border border-border bg-surface p-1 shadow-lg">
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
