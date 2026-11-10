'use client';

import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button as AriaButton } from 'react-aria-components';

type Props = { label: string; value: number; min: number; max: number; onChange: (value: number) => void; isDisabled?: boolean };

const STEP =
  'inline-flex size-11 items-center justify-center rounded-wm-pill bg-wm-surface text-wm-ink shadow-wm-row outline-none md:size-8 ' +
  'focus-visible:outline-3 focus-visible:outline-wm-accent data-disabled:opacity-40 data-disabled:shadow-none';

/** Figma stepper of Tùy chỉnh phiên (minus, number, plus in a pill well): each button disabled at its limit; 44 px on phones. */
export function Stepper({ label, value, min, max, onChange, isDisabled }: Props) {
  const t = useTranslations('App.ui.stepper');
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1 rounded-wm-pill bg-wm-accent-soft p-1">
      <AriaButton aria-label={t('decrease', { label })} isDisabled={isDisabled || value <= min} onPress={() => onChange(value - 1)} className={STEP}>
        <Minus aria-hidden className="size-4" />
      </AriaButton>
      <output aria-live="polite" className="w-8 text-center font-wm-sans text-wm-base-strong text-wm-ink">{value}</output>
      <AriaButton aria-label={t('increase', { label })} isDisabled={isDisabled || value >= max} onPress={() => onChange(value + 1)} className={STEP}>
        <Plus aria-hidden className="size-4" />
      </AriaButton>
    </div>
  );
}
