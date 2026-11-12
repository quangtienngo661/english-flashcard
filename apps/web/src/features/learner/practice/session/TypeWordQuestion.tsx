'use client';

import { Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/ui/Button';
import { cn } from '@/lib/cn';
import { FIELD_BOX } from '@/ui/field-styles';
import { TextButton } from '@/ui/TextButton';
import { ResultTicket } from './AnswerFeedback';
import type { Outcome } from './use-practice-session';

/** What a typed answer field holds and does: the text, read-only after a final result, and Enter's two meanings (send, or retype). */
function useAnswerField(outcome: Outcome | null, onSubmit: (text: string) => void) {
  const [text, setText] = useState('');
  const final = outcome?.kind === 'final';
  const retry = outcome?.kind === 'try_again';
  const shown = final && outcome.chosen && 'text' in outcome.chosen ? outcome.chosen.text : text;
  const submit = () => {
    // Review M1: Enter on the word just graded wrong means "Làm lại": select it to retype, never send it again.
    if (retry && text === outcome.typed) {
      focusAnswer();
      return;
    }
    if (!final && text.trim()) onSubmit(text);
  };
  return { text, setText, shown, final, retry, tries: retry ? outcome.tries : 0, submit };
}

const FIELD_PROPS = { autoComplete: 'off', autoCapitalize: 'none', spellCheck: false, maxLength: 100 } as const;

/** The answer field of a typed question (K/63, K/64; TV12 [Kiểm tra]); after a final result it keeps what was typed. */
export function TypeWordInput({ outcome, onSubmit, disabled }: { outcome: Outcome | null; onSubmit: (text: string) => void; disabled: boolean }) {
  const t = useTranslations('App.practice.session');
  const field = useAnswerField(outcome, onSubmit);
  const id = useId();
  return (
    <form
      className="flex flex-col gap-3 md:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        field.submit();
      }}
    >
      <div className="relative min-w-0 flex-1">
        <label htmlFor={id} className="sr-only">
          {t('answerLabel')}
        </label>
        <input
          id={id}
          data-answer-input
          value={field.shown}
          onChange={(e) => field.setText(e.target.value)}
          readOnly={field.final}
          autoFocus
          {...FIELD_PROPS}
          placeholder={t('answerPlaceholder')}
          className={cn(FIELD_BOX, 'pr-16 font-semibold placeholder:font-normal', field.retry && 'border-wm-fail')}
        />
        {field.retry && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-wm-meta text-wm-fail">{t('attempt', { n: field.tries })}</span>}
      </div>
      {!field.final && (
        <Button type="submit" variant={field.retry ? 'secondary' : 'primary'} className="px-8" isDisabled={!field.text.trim()} isPending={disabled}>
          {t('check')}
        </Button>
      )}
    </form>
  );
}

/**
 * P.13 (mockup L509-513, owner 12/11/2026): in a fill-in sentence the blank itself is the input. At least 5 characters wide, it grows
 * with the text; accent underline and a 7 % accent wash. Enter checks. Once graded the sentence shows the result in its place
 * (`SentenceText` with a fill); an alternative answer keeps this field, read-only.
 */
export function BlankInput({ outcome, onSubmit }: { outcome: Outcome | null; onSubmit: (text: string) => void }) {
  const t = useTranslations('App.practice.session');
  const field = useAnswerField(outcome, onSubmit);
  return (
    <>
      {/* The mirror holds the shown text with the input's own font, padding and border; the input fills the same grid cell, so the width follows the text in every browser. */}
      <span className="inline-grid max-w-full align-baseline">
        <span
          aria-hidden
          className={cn(
            // raw-ok: the blank is at least 5 characters wide
            'invisible col-start-1 row-start-1 min-w-[5ch] whitespace-pre border-b-3 border-transparent px-2',
          )}
        >
          {field.shown}
        </span>
        <input
          aria-label={t('blankLabel')}
          data-answer-input
          value={field.shown}
          onChange={(e) => field.setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            e.preventDefault();
            field.submit();
          }}
          readOnly={field.final}
          autoFocus
          enterKeyHint="done"
          {...FIELD_PROPS}
          className={cn(
            // w-0 keeps the input's own default width out of the grid track; min-w-full then fills the cell the mirror sizes.
            'col-start-1 row-start-1 w-0 min-w-full rounded-t-wm-control border-0 border-b-3 bg-wm-blank-soft px-2 outline-none focus-visible:bg-wm-blank-soft-focus',
            field.retry ? 'border-wm-fail text-wm-fail caret-wm-fail' : 'border-wm-accent text-wm-accent caret-wm-accent',
          )}
        />
      </span>
      {field.retry && <span className="ml-1 align-middle font-wm-sans text-wm-meta text-wm-fail">{t('attempt', { n: field.tries })}</span>}
    </>
  );
}

/**
 * K/64 "Chưa đúng" for a wrong typed answer that can still be retried, in the wrong result ticket (F.14, D2) with no answer:
 * [Xem đáp án] (muted text), [Gợi ý], [Làm lại]; the keys are unchanged. A session word is spelt right: the spelling text would
 * mislead, and the owner wants no line instead (07/11/2026).
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
    <ResultTicket
      right={false}
      actions={
        <>
          <TextButton tone="muted" className="px-3" isDisabled={busy} onPress={onReveal}>
            {t('reveal')}
          </TextButton>
          {hintAvailable && (
            <Button variant="secondary" onPress={onHint}>
              <Lightbulb aria-hidden className="size-4" />
              {t('hint.button')}
            </Button>
          )}
          <Button variant="primary" onPress={onRetry}>
            {t('retry')}
          </Button>
        </>
      }
    >
      {!sessionWord && <p className="font-wm-sans text-wm-base-strong text-wm-ink">{t('tryAgainBody')}</p>}
      <p className="font-wm-sans text-wm-small text-wm-muted">{t('tryAgainNote')}</p>
    </ResultTicket>
  );
}

/** Focuses the answer field and selects what is in it ([Làm lại]). */
export function focusAnswer() {
  const field = document.querySelector<HTMLInputElement>('[data-answer-input]');
  field?.focus();
  field?.select();
}
