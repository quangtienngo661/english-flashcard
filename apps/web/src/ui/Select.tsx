'use client';

import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, Label, ListBox, ListBoxItem, Popover, Select as AriaSelect, SelectValue, Text } from 'react-aria-components';
import { FIELD_ERROR, FIELD_LABEL } from './field-styles';

export type SelectItem = { id: string; label: string; icon?: ReactNode; /** Shown on the right of the row ("18 từ"). */ suffix?: string };

type Props = {
  label: string;
  /** Hide the visible label; it stays the accessible name. */
  hideLabel?: boolean;
  items: SelectItem[];
  value: string;
  onChange: (id: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  error?: string;
  /** What the closed button shows for the chosen item; the item label by default. */
  display?: (item: SelectItem) => string;
  className?: string;
};

/** Same props as app-ui/Select; Figma "Ô chọn" (46:326): the field look, a popover with the pop shadow. */
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
      <Label className={hideLabel ? 'sr-only' : FIELD_LABEL}>{label}</Label>
      <Button className="flex min-h-12 w-full items-center justify-between gap-2 rounded-wm-md border-2 border-wm-line bg-wm-surface px-3.5 py-2 text-left font-wm-sans text-wm-base text-wm-ink outline-none focus-visible:border-wm-accent focus-visible:ring-4 focus-visible:ring-wm-accent/16 disabled:opacity-60 group-data-invalid:border-wm-fail">
        <SelectValue className="flex min-w-0 items-center gap-2 truncate data-placeholder:text-wm-muted">
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
        <ChevronDown aria-hidden className="size-4 shrink-0 text-wm-muted" />
      </Button>
      {error && (
        <Text slot="errorMessage" className={FIELD_ERROR}>
          {error}
        </Text>
      )}
      <Popover
        offset={4}
        className="w-(--trigger-width) overflow-y-auto overscroll-contain rounded-wm-modal bg-wm-surface p-1 shadow-wm-pop motion-safe:data-entering:animate-menu-in motion-safe:placement-top:data-entering:animate-menu-in-up motion-safe:data-exiting:animate-menu-out"
      >
        <ListBox items={items} className="outline-none">
          {(item) => (
            <ListBoxItem
              id={item.id}
              textValue={item.label}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-wm-sm px-3 py-2 font-wm-sans text-wm-small text-wm-ink outline-none data-focused:bg-wm-accent-soft data-selected:bg-wm-accent-soft"
            >
              {({ isSelected }) => (
                <>
                  <span className="flex min-w-0 items-center gap-2">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 font-wm-sans text-wm-caption text-wm-muted">
                    {item.suffix}
                    {isSelected && <Check aria-hidden className="size-4 text-wm-accent" />}
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
