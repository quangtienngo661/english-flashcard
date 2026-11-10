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

type Props = {
  state: AnswerOptionState;
  label: ReactNode;
  /** The number key that picks it ("1"–"4"); the cap shows from `md` up (Figma phone rows have none). */
  kbd?: string;
  /** "Đáp án đúng" on the right option, "Bạn chọn" on a wrong pick (the caller passes the text). */
  note?: string;
  onPress?: () => void;
  isDisabled?: boolean;
  /** `motion-safe:animate-wiggle-soft` on a wrong pick and the like (design §8.2). */
  className?: string;
};

/** Figma "Lựa chọn" (3:51): an answer of a multiple-choice question in Phiên luyện and Ôn. Radius 14, border 1.5 px. */
export function AnswerOption({ state, label, kbd, note, onPress, isDisabled, className }: Props) {
  return (
    <AriaButton
      onPress={onPress}
      isDisabled={isDisabled}
      className={cn(
        // raw-ok: Figma "Lựa chọn" draws a 1.5 px border, between the 1 and 2 px utilities
        'flex min-h-13 w-full items-center gap-3 rounded-wm-lg border-[1.5px] px-4 py-3 text-left outline-none transition duration-200 ease-out-strong',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent data-disabled:cursor-default',
        STATE[state],
        className,
      )}
    >
      {kbd && (
        <kbd className="hidden size-5.5 shrink-0 items-center justify-center rounded-wm-sm bg-wm-accent-soft font-wm-sans text-wm-label text-wm-accent md:inline-flex">
          {kbd}
        </kbd>
      )}
      <span className="min-w-0 flex-1 break-words font-wm-display text-wm-word">{label}</span>
      {note && (state === 'correct' || state === 'wrong') && (
        <span className={cn('inline-flex shrink-0 items-center gap-1 font-wm-sans text-wm-label', state === 'correct' ? 'text-wm-pass' : 'text-wm-fail')}>
          {state === 'correct'
            ? <Check aria-hidden className="size-4 motion-safe:animate-pop-in" />
            : <X aria-hidden className="size-4" />}
          {note}
        </span>
      )}
    </AriaButton>
  );
}
