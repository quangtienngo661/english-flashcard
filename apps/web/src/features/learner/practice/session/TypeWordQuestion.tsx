'use client';

import { Lightbulb, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { Button } from '@/ui/Button';
import { cn } from '@/lib/cn';
import { FIELD_BOX } from '@/ui/field-styles';
import { TextButton } from '@/ui/TextButton';
import { ButtonKey } from './QuestionCard';
import type { Outcome } from './use-practice-session';

/** The answer field of a typed question (K/63, K/64; TV12 [Kiểm tra]); after a final result it keeps what was typed. */
export function TypeWordInput({ outcome, onSubmit, disabled }: { outcome: Outcome | null; onSubmit: (text: string) => void; disabled: boolean }) {
  const t = useTranslations('App.practice.session');
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const final = outcome?.kind === 'final';
  const retry = outcome?.kind === 'try_again';
  const shown = final && outcome.chosen && 'text' in outcome.chosen ? outcome.chosen.text : text;
  return (
    <form
      className="flex flex-col gap-3 md:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        // Review M1: Enter on the word just graded wrong means "Làm lại": select it to retype, never send it again.
        if (retry && text === outcome.typed) {
          focusAnswer();
          return;
        }
        if (!final && text.trim()) onSubmit(text);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <label htmlFor={id} className="sr-only">
          {t('answerLabel')}
        </label>
        <input
          ref={input}
          id={id}
          data-answer-input
          value={shown}
          onChange={(e) => setText(e.target.value)}
          readOnly={final}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={100}
          placeholder={t('answerPlaceholder')}
          className={cn(FIELD_BOX, 'pr-16 font-semibold placeholder:font-normal', retry && 'border-wm-fail')}
        />
        {retry && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-wm-meta text-wm-fail">{t('attempt', { n: outcome.tries })}</span>}
      </div>
      {!final && (
        <Button type="submit" variant={retry ? 'secondary' : 'primary'} className="px-8" isDisabled={!text.trim()} isPending={disabled}>
          {t('check')}
        </Button>
      )}
    </form>
  );
}

/**
 * K/64 "Chưa đúng" for a wrong typed answer that can still be retried, tucked under the card like the result (Figma 178:5326):
 * [Xem đáp án] (text), [Gợi ý H], [Làm lại Enter]. A session word is spelt right: the spelling text would mislead, and the owner
 * wants no line instead (07/11/2026).
 */
export function TryAgainPanel({ sessionWord, onRetry, onHint, hintAvailable, onReveal, busy }: {
  sessionWord: boolean;
  onRetry: () => void;
  onHint: () => void;
  hintAvailable: boolean;
  onReveal: () => void;
  busy: boolean;
}) {
  const t = useTranslations('App.practice.session');
  return (
    <div data-feedback className="-mt-6.5 flex flex-col gap-3 rounded-b-wm-card border-2 border-t-0 border-wm-wrong-line bg-wm-wrong-soft px-5 pb-6 pt-11 shadow-wm-card motion-safe:animate-wm-panel-drop md:mx-5.5 md:px-7">
      <div className="flex items-center gap-3">
        <span className="flex size-7.5 shrink-0 items-center justify-center rounded-full bg-wm-wrong-ink text-wm-on-accent">
          <X aria-hidden className="size-4.5" />
        </span>
        <p className="font-wm-display text-wm-card-title text-wm-wrong-ink">{t('wrong')}</p>
      </div>
      {!sessionWord && <p className="font-wm-sans text-wm-base-strong text-wm-ink">{t('tryAgainBody')}</p>}
      <p className="font-wm-sans text-wm-small text-wm-muted">{t('tryAgainNote')}</p>
      <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:justify-end">
        <TextButton tone="muted" className="col-span-2 row-start-2 justify-center md:col-auto md:row-auto md:mr-auto" isDisabled={busy} onPress={onReveal}>
          {t('reveal')}
        </TextButton>
        {hintAvailable && (
          <Button variant="secondary" onPress={onHint}>
            <Lightbulb aria-hidden className="size-4" />
            {t('hint.button')}
            <ButtonKey>H</ButtonKey>
          </Button>
        )}
        <Button variant="primary" className={hintAvailable ? undefined : 'col-span-2'} onPress={onRetry}>
          {t('retry')}
          <ButtonKey>Enter</ButtonKey>
        </Button>
      </div>
    </div>
  );
}

/** Focuses the answer field and selects what is in it ([Làm lại]). */
export function focusAnswer() {
  const field = document.querySelector<HTMLInputElement>('[data-answer-input]');
  field?.focus();
  field?.select();
}
