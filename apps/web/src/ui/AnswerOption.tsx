'use client';

import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { cn } from '@/lib/cn';

export type AnswerOptionState = 'idle' | 'correct' | 'wrong' | 'dim';

const STATE: Record<AnswerOptionState, string> = {
  idle: 'border-wm-line bg-wm-surface text-wm-ink hover:border-wm-accent',
  correct: 'border-wm-pass bg-wm-pass-soft text-wm-ink',
  wrong: 'border-wm-fail bg-wm-fail-soft text-wm-ink',
  dim: 'border-wm-line bg-wm-surface text-wm-ink opacity-60',
};

const BADGE: Record<AnswerOptionState, string> = {
  idle: 'bg-wm-accent-soft text-wm-accent',
  dim: 'bg-wm-accent-soft text-wm-accent',
  correct: 'bg-wm-surface text-wm-pass ring-1 ring-inset ring-wm-pass',
  wrong: 'bg-wm-surface text-wm-fail ring-1 ring-inset ring-wm-fail',
};

type Props = {
  state: AnswerOptionState;
  label: ReactNode;
  /** The number key for this choice, shown from md. */
  kbd?: string;
  /** "Đáp án đúng" on the right option, "Bạn chọn" on a wrong pick (the caller passes the text); read by screen readers only, the ✓ / ✗ shows it. */
  note?: string;
  onPress?: () => void;
  isDisabled?: boolean;
  /** The check pops in (design §8.2): only on the learner's own right pick. */
  pop?: boolean;
  /** `motion-safe:animate-wm-wiggle-soft` on a wrong pick and the like (design §8.2). */
  className?: string;
};

/** Figma "Lựa chọn" (3:51): an answer of a multiple-choice question in Phiên luyện and Ôn. Radius 14, border 1.5 px. */
export function AnswerOption({ state, label, kbd, note, onPress, isDisabled, pop = false, className }: Props) {
  return (
    <AriaButton
      onPress={onPress}
      isDisabled={isDisabled}
      className={cn(
        // raw-ok: Figma "Lựa chọn" draws a 1.5 px border, between the 1 and 2 px utilities
        'flex min-h-13 w-full items-center gap-3 rounded-wm-row border-[1.5px] px-4 py-3 text-left outline-none transition duration-200 ease-wm-out-strong',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent data-disabled:cursor-default',
        STATE[state],
        className,
      )}
    >
      {kbd && (
        <kbd aria-hidden className={cn('hidden size-5.5 shrink-0 items-center justify-center rounded-wm-key font-wm-sans text-wm-label md:inline-flex', BADGE[state])}>
          {kbd}
        </kbd>
      )}
      <span className="min-w-0 flex-1 break-words font-wm-display text-wm-word">{label}</span>
      {note && (state === 'correct' || state === 'wrong') && (
        <span className={cn('inline-flex shrink-0 items-center', state === 'correct' ? 'text-wm-pass' : 'text-wm-fail')}>
          {state === 'correct'
            ? <Check aria-hidden className={cn('size-5', pop && 'motion-safe:animate-wm-pop-in')} />
            : <X aria-hidden className="size-5" />}
          <span className="sr-only">{note}</span>
        </span>
      )}
    </AriaButton>
  );
}
