'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Checkbox } from 'react-aria-components';
import { Switch } from '@/app-ui/Switch';
import { cn } from '@/lib/cn';
import { AI_TYPES, type AiType, type QuestionType } from './practice-api';

const STORAGE_KEY = 'wordmet-web.ai-types';

/** E21: the switch is remembered on this device only; blocked storage means "off". */
export function readAiTypesOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeAiTypesOn(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Not remembered; the dialog still works.
  }
}

/** One question-type box (K/54, K/70): equal size, no description (D10). */
export function TypeBox({ type, selected, onChange }: { type: QuestionType; selected: boolean; onChange: (on: boolean) => void }) {
  const t = useTranslations('App.practice');
  return (
    <Checkbox
      isSelected={selected}
      onChange={onChange}
      className="group flex min-h-control cursor-pointer items-center gap-2.5 rounded-inner border-2 border-border-strong bg-surface px-3 py-2 text-ui font-semibold text-ink outline-none data-focus-visible:ring-2 data-focus-visible:ring-primary data-selected:border-primary data-selected:bg-primary-soft"
    >
      {({ isSelected }) => (
        <>
          <span
            aria-hidden
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-sm border-2',
              isSelected ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface',
            )}
          >
            {isSelected && <Check className="size-3.5" />}
          </span>
          {t(`types.${type}`)}
        </>
      )}
    </Checkbox>
  );
}

type Props = {
  /** `features['ai.practice'].allowed`; false → the switch is locked and says why (D6). */
  allowed: boolean;
  on: boolean;
  onChange: (on: boolean) => void;
  chosen: Set<AiType>;
  onChoose: (type: AiType, on: boolean) => void;
  /** The most AI credits this setup can use and how many are left; null hides the line. */
  usage: { needed: number; remaining: number } | null;
};

/** K/70, K/70b: the "Kiểu câu có AI" switch with the Pro label; on shows the three AI types and the credit line (D10). */
export function AiTypesToggle({ allowed, on, onChange, chosen, onChoose, usage }: Props) {
  const t = useTranslations('App.practice.customize');
  const tUi = useTranslations('App.ui');
  return (
    <div className="flex flex-col gap-2">
      <Switch
        label={
          allowed ? (
            <span className="flex items-center gap-2">
              {t('aiToggle')}
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-primary">{tUi('proBadge')}</span>
            </span>
          ) : (
            t('aiToggle')
          )
        }
        isSelected={allowed && on}
        onChange={onChange}
        locked={!allowed}
      />
      {allowed && on && (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            {AI_TYPES.map((type) => (
              <TypeBox key={type} type={type} selected={chosen.has(type)} onChange={(v) => onChoose(type, v)} />
            ))}
          </div>
          {usage && <p className="text-caption text-muted">{t('aiLine', usage)}</p>}
        </>
      )}
    </div>
  );
}
