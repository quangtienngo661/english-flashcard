'use client';

import { useTranslations } from 'next-intl';
import { Choices } from './McqQuestion';
import type { Outcome } from './use-practice-session';

/** K/62: two choices, Đúng (1) and Sai (2). */
export function TrueFalseChoices({ outcome, onAnswer, disabled }: { outcome: Outcome | null; onAnswer: (isTrue: boolean) => void; disabled: boolean }) {
  const t = useTranslations('App.practice.session');
  const final = outcome?.kind === 'final' ? outcome : null;
  const right = final?.result.correct.is_true;
  const chosen = final?.chosen && 'is_true' in final.chosen ? final.chosen.is_true : null;
  return (
    <Choices
      options={[t('true'), t('false')]}
      rightIndex={final && right !== null && right !== undefined ? (right ? 0 : 1) : null}
      chosenIndex={chosen === null ? null : chosen ? 0 : 1}
      onChoose={(index) => onAnswer(index === 0)}
      disabled={disabled}
    />
  );
}
