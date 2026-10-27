import { Check, ChevronDown } from 'lucide-react';
import { Button, Label, ListBox, ListBoxItem, Popover, Select as AriaSelect, SelectValue, Text } from 'react-aria-components';

type Props = {
  /** So a form can focus the field (`document.getElementById`), e.g. the first one a 400 flagged. */
  id?: string;
  label: string;
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  error?: string;
};

export function Select({ id, label, items, value, onChange, isDisabled, placeholder, error }: Props) {
  return (
    <AriaSelect
      id={id}
      selectedKey={value === '' ? null : value}
      placeholder={placeholder}
      isInvalid={error !== undefined}
      onSelectionChange={(key) => key !== null && onChange(String(key))}
      isDisabled={isDisabled}
      className="group flex w-full flex-col gap-1.5"
    >
      <Label className="text-ui font-medium text-ink">{label}</Label>
      <Button className="flex min-h-control w-full items-center justify-between gap-2 rounded-control bg-canvas px-3 py-1.5 text-left text-ui text-ink outline-none ring-2 ring-inset ring-border-strong hover:bg-primary-soft focus-visible:bg-surface focus-visible:ring-primary disabled:opacity-60 group-data-invalid:ring-danger">
        <SelectValue className="min-w-0 truncate" />
        <ChevronDown aria-hidden className="size-4 shrink-0" />
      </Button>
      {error && <Text slot="errorMessage" className="text-xs text-danger">{error}</Text>}
      {/* React Aria caps the popover's height to the space left on screen; the list scrolls inside it. */}
      <Popover offset={4} className="w-(--trigger-width) overflow-y-auto overscroll-contain rounded-inner bg-surface p-1 shadow-menu motion-safe:data-entering:animate-menu-in motion-safe:placement-top:data-entering:animate-menu-in-up motion-safe:data-exiting:animate-menu-out">
        <ListBox className="outline-none">
          {items.map((item) => (
            <ListBoxItem
              key={item.id}
              id={item.id}
              textValue={item.label}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft"
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
