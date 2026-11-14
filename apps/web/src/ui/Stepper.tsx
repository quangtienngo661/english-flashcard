'use client';

import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button as AriaButton, Group, Input, NumberField } from 'react-aria-components';

type Props = { label: string; value: number; min: number; max: number; onChange: (value: number) => void; isDisabled?: boolean };

const STEP =
  'grid h-full w-8 place-items-center text-wm-muted outline-none hover:bg-wm-accent-soft hover:text-wm-ink ' +
  'focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-wm-accent data-disabled:opacity-40 data-disabled:hover:bg-transparent';

/**
 * Number stepper of Tùy chỉnh phiên (drawing `.stepA`): minus, a typed number, plus in one 36 px control. Enter or leaving the field commits
 * the typed number clamped to min and max; text that is not a number goes back to the current value; an empty field keeps the last valid one.
 */
export function Stepper({ label, value, min, max, onChange, isDisabled }: Props) {
  const t = useTranslations('App.ui.stepper');
  return (
    <NumberField
      value={value}
      minValue={min}
      // A value above max (the dialog keeps the learner's choice after a 403) is still steppable: minus lowers it by one, plus stays off.
      maxValue={Math.max(max, value)}
      step={1}
      isDisabled={isDisabled}
      onChange={(next) => {
        if (Number.isNaN(next)) return;
        // Only a rise is held to max; lowering an over-max value moves it one step (or to what was typed).
        onChange(next > value ? Math.min(next, max) : next);
      }}
      aria-label={label}
      decrementAriaLabel={t('decrease', { label })}
      incrementAriaLabel={t('increase', { label })}
      formatOptions={{ useGrouping: false }}
      className="inline-flex"
    >
      <Group className="inline-flex h-9 items-center overflow-hidden rounded-wm-control border border-wm-field-line bg-wm-surface">
        <AriaButton slot="decrement" className={STEP}>
          <Minus aria-hidden className="size-4" />
        </AriaButton>
        <Input
          inputMode="numeric"
          className="h-full w-12 border-x border-wm-line bg-transparent text-center font-wm-sans text-wm-base-strong tabular-nums text-wm-ink outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-wm-accent disabled:opacity-40"
        />
        <AriaButton slot="increment" isDisabled={isDisabled || value >= max} className={STEP}>
          <Plus aria-hidden className="size-4" />
        </AriaButton>
      </Group>
    </NumberField>
  );
}
