'use client';

import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, Label, ListBox, ListBoxItem, Popover, Select as AriaSelect, SelectValue, Text } from 'react-aria-components';

export type SelectItem = { id: string; label: string; icon?: ReactNode; /** Shown on the right of the row ("18 từ"). */ suffix?: string };

type Props = {
  label: string;
  /** Hide the visible label (the field sits in a row whose meaning is clear); it stays the accessible name. */
  hideLabel?: boolean;
  items: SelectItem[];
  value: string;
  onChange: (id: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  error?: string;
  /** What the closed button shows for the chosen item ("Trình độ: A2" while the list says "A2"); the item label by default. */
  display?: (item: SelectItem) => string;
  className?: string;
};

// Copied from apps/admin/src/ui/Select.tsx; adds an icon and a count suffix per row (the drop-down lists of copy doc §14.3).
export function Select({ label, hideLabel, items, value, onChange, isDisabled, placeholder, error, display, className }: Props) {
  return (
    <AriaSelect
      selectedKey={value === '' ? null : value}
      placeholder={placeholder}
      isInvalid={error !== undefined}
      onSelectionChange={(key) => key !== null && onChange(String(key))}
      isDisabled={isDisabled}
      className={className ?? 'group flex w-full min-w-0 flex-col gap-1.5'}
    >
      <Label className={hideLabel ? 'sr-only' : 'text-ui font-medium text-ink'}>{label}</Label>
      <Button className="flex min-h-control w-full items-center justify-between gap-2 rounded-control border-2 border-border-strong bg-surface px-3 py-2 text-left text-ui text-ink outline-none hover:bg-primary-soft focus-visible:border-primary disabled:opacity-60 group-data-invalid:border-danger">
        <SelectValue className="flex min-w-0 items-center gap-2 truncate data-placeholder:text-placeholder">
          {({ selectedItem, defaultChildren }) => {
            const item = selectedItem as SelectItem | null;
            return item ? (
              <>
                {item.icon}
                <span className="truncate">{display ? display(item) : item.label}</span>
              </>
            ) : (
              defaultChildren
            );
          }}
        </SelectValue>
        <ChevronDown aria-hidden className="size-4 shrink-0" />
      </Button>
      {error && (
        <Text slot="errorMessage" className="text-caption text-danger">
          {error}
        </Text>
      )}
      <Popover
        offset={4}
        className="w-(--trigger-width) overflow-y-auto overscroll-contain rounded-inner bg-surface p-1 shadow-menu motion-safe:data-entering:animate-menu-in motion-safe:placement-top:data-entering:animate-menu-in-up motion-safe:data-exiting:animate-menu-out"
      >
        <ListBox items={items} className="outline-none">
          {(item) => (
            <ListBoxItem
              id={item.id}
              textValue={item.label}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft data-selected:bg-primary-soft"
            >
              {({ isSelected }) => (
                <>
                  <span className="flex min-w-0 items-center gap-2">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-caption text-muted">
                    {item.suffix}
                    {isSelected && <Check aria-hidden className="size-4 text-ink" />}
                  </span>
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
