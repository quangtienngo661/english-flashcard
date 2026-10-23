'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { Button } from '@/app-ui/Button';
import { cn } from '@/lib/cn';
import { KBD } from './QuestionCard';
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
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
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
          className={cn(
            'min-h-control-touch w-full rounded-inner border-2 bg-surface px-3 pr-16 text-body font-semibold text-ink outline-none placeholder:font-normal placeholder:text-placeholder focus-visible:border-primary',
            retry ? 'border-danger bg-danger-soft' : 'border-border-strong',
          )}
        />
        {retry && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption font-semibold text-danger">{t('attempt', { n: outcome.tries })}</span>}
      </div>
      {!final && (
        <Button type="submit" variant="sticker" size="lg" className="px-8" isDisabled={!text.trim()} isPending={disabled}>
          {t('check')}
        </Button>
      )}
    </form>
  );
}

/** K/64 buttons for a wrong typed answer that can still be retried. */
export function TryAgainActions({ onRetry, onHint, hintAvailable, onReveal, busy }: {
  onRetry: () => void;
  onHint: () => void;
  hintAvailable: boolean;
  onReveal: () => void;
  busy: boolean;
}) {
  const t = useTranslations('App.practice.session');
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <Button variant="sticker" size="lg" className="justify-between" onPress={onRetry}>
          {t('retry')}
          <kbd className={`${KBD} border-on-accent`}>Enter</kbd>
        </Button>
        {hintAvailable && (
          <Button variant="quiet" size="lg" className="justify-between" onPress={onHint}>
            {t('hint.button')}
            <kbd className={`${KBD} border-border-strong`}>H</kbd>
          </Button>
        )}
        <Button variant="quiet" size="lg" isPending={busy} onPress={onReveal}>
          {t('reveal')}
        </Button>
      </div>
      <p className="text-caption text-muted">{t('tryAgainNote')}</p>
    </div>
  );
}

/** Focuses the answer field and selects what is in it ([Làm lại]). */
export function focusAnswer() {
  const field = document.querySelector<HTMLInputElement>('[data-answer-input]');
  field?.focus();
  field?.select();
}
