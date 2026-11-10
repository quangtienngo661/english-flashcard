'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { AnswerOption, type AnswerOptionState } from '@/ui/AnswerOption';
import type { Outcome } from './use-practice-session';

/**
 * Choice buttons (K/60–K/62; Figma "Lựa chọn" 3:51, frame 178:5755): number key, the option, and after the answer the right one
 * ("Đáp án đúng"), the wrong pick ("Bạn chọn") and the rest dimmed. 2 × 2 on desktop, stacked on phones.
 */
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
    <div className={cn('grid gap-3', columns === 2 && 'md:grid-cols-2')}>
      {options.map((option, index) => {
        const right = answered && index === rightIndex;
        const chosen = answered && index === chosenIndex;
        const state: AnswerOptionState = !answered ? 'idle' : right ? 'correct' : chosen ? 'wrong' : 'dim';
        return (
          <AnswerOption
            key={index}
            state={state}
            label={option}
            kbd={String(index + 1)}
            note={right ? (chosen ? t('chosenRight') : t('rightOption')) : chosen ? t('chosen') : undefined}
            isDisabled={disabled || answered}
            pop={right && chosen}
            onPress={() => onChoose(index)}
            // 3C (owner 27/10/2026): a wrong choice wiggles once (300ms); reduced motion keeps only the colours.
            className={chosen && !right ? 'motion-safe:animate-wiggle-soft' : undefined}
          />
        );
      })}
    </div>
  );
}

/** The index the learner chose, from the answer body, when the outcome is final. */
export function chosenChoice(outcome: Outcome | null): number | null {
  return outcome?.kind === 'final' && outcome.chosen && 'choice' in outcome.chosen ? outcome.chosen.choice : null;
}
