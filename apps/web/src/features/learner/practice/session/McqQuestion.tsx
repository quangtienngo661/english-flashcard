'use client';

import { CircleCheck, CircleX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import type { Outcome } from './use-practice-session';

/** Choice buttons (K/60, K/61, K/62): number key, the option, and after the answer which one was right and which was chosen. */
export function Choices({ options, rightIndex, chosenIndex, onChoose, disabled, columns = 2 }: {
  options: string[];
  rightIndex: number | null;
  chosenIndex: number | null;
  onChoose: (index: number) => void;
  disabled: boolean;
  columns?: 1 | 2;
}) {
  const t = useTranslations('App.practice.session');
  const answered = rightIndex !== null;
  return (
    <div className={cn('grid gap-3', columns === 2 && 'sm:grid-cols-2')}>
      {options.map((option, index) => {
        const right = answered && index === rightIndex;
        const chosen = answered && index === chosenIndex;
        return (
          <button
            key={index}
            type="button"
            disabled={disabled || answered}
            onClick={() => onChoose(index)}
            className={cn(
              'flex min-h-control-touch min-w-0 items-center gap-3 rounded-inner border-2 px-3 py-2 text-left text-body font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary',
              right ? 'border-success bg-success-soft' : chosen ? 'border-danger bg-danger-soft' : 'border-border-strong bg-surface enabled:hover:bg-primary-soft',
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-border-strong text-caption">{index + 1}</span>{' '}
            <span className="min-w-0 flex-1 break-words">{option}</span>
            {right && (
              <span className="flex shrink-0 items-center gap-1 text-caption font-semibold text-success">
                {chosen ? t('chosenRight') : t('rightOption')}
                <CircleCheck aria-hidden className="size-4" />
              </span>
            )}
            {chosen && !right && (
              <span className="flex shrink-0 items-center gap-1 text-caption font-semibold text-danger">
                {t('chosen')}
                <CircleX aria-hidden className="size-4" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The index the learner chose, from the answer body, when the outcome is final. */
export function chosenChoice(outcome: Outcome | null): number | null {
  return outcome?.kind === 'final' && outcome.chosen && 'choice' in outcome.chosen ? outcome.chosen.choice : null;
}
