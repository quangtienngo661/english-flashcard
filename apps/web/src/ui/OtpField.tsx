'use client';

import { type ClipboardEvent, type KeyboardEvent, useId, useRef } from 'react';
import { FIELD_LABEL } from './field-styles';

type Props = {
  label: string;
  digitLabel: (n: number) => string;
  /** The digits typed so far; an empty box in the middle is a space. */
  value: string;
  onChange: (digits: string) => void;
  length?: number;
  autoFocus?: boolean;
  /** Keeps the group's name for screen readers only (Xác minh email: the page title already says it). */
  hideLabel?: boolean;
};

/**
 * Figma "Ô mã" (34:364): one box per digit. A digit moves focus to the next box, Backspace on an empty box goes back one,
 * a paste strips non-digits and fills from box 1. Each box keeps only the last digit typed, so typing over a digit replaces it.
 */
export function OtpField({ label, digitLabel, value, onChange, length = 6, autoFocus, hideLabel }: Props) {
  const labelId = useId();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => (value[i] ?? '').trim());
  const emit = (next: string[]) => onChange(next.map((d) => d || ' ').join('').trimEnd());

  function put(index: number, typed: string) {
    const digit = typed.replace(/\D/g, '').slice(-1);
    emit(digits.map((d, i) => (i === index ? digit : d)));
    if (digit && index < length - 1) boxes.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) boxes.current[index - 1]?.focus();
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    emit(Array.from({ length }, (_, i) => pasted[i] ?? ''));
    boxes.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className={hideLabel ? 'sr-only' : FIELD_LABEL}>
        {label}
      </span>
      <div role="group" aria-labelledby={labelId} className="flex gap-2 md:justify-between md:gap-0">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            aria-label={digitLabel(i + 1)}
            value={digit}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={2}
            autoFocus={autoFocus && i === 0}
            onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            data-filled={digit ? '' : undefined}
            className={
              'h-13.5 min-w-0 flex-1 rounded-wm-md border-2 border-wm-line bg-wm-surface text-center font-wm-display text-wm-card-title text-wm-ink ' +
              'caret-wm-accent outline-none focus:border-wm-accent focus-visible:ring-4 focus-visible:ring-wm-accent/16 ' +
              'data-filled:border-wm-accent data-filled:bg-wm-accent-soft md:h-15 md:w-13 md:flex-none'
            }
          />
        ))}
      </div>
    </div>
  );
}
