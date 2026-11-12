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
 * a paste or an autofilled code strips non-digits and fills from box 1. Typing beside a digit replaces it with the new one.
 */
export function OtpField({ label, digitLabel, value, onChange, length = 6, autoFocus, hideLabel }: Props) {
  const labelId = useId();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => (value[i] ?? '').trim());
  const emit = (next: string[]) => onChange(next.map((d) => d || ' ').join('').trimEnd());

  function fill(code: string) {
    emit(Array.from({ length }, (_, i) => code[i] ?? ''));
    boxes.current[Math.min(code.length, length - 1)]?.focus();
  }

  function put(index: number, typed: string) {
    const clean = typed.replace(/\D/g, '');
    // More than a box holds: the phone's or a password manager's one-time-code autofill, handled like a paste.
    if (clean.length > 2) return fill(clean.slice(0, length));
    // Two digits: one typed beside the digit already there, before or after it; keep the new one.
    const digit = clean.length === 2 ? (clean[0] === digits[index] ? clean[1] : clean[0]) : clean;
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
    fill(pasted);
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
            maxLength={length}
            autoFocus={autoFocus && i === 0}
            onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            data-filled={digit ? '' : undefined}
            className={
              'h-13.5 min-w-0 flex-1 rounded-wm-control border-2 border-wm-line bg-wm-surface text-center font-wm-display text-wm-card-title text-wm-ink ' +
              'caret-wm-accent outline-none focus:border-wm-accent focus-visible:ring-4 focus-visible:ring-wm-accent/16 ' +
              'data-filled:border-wm-accent data-filled:bg-wm-accent-soft md:h-15 md:w-13 md:flex-none'
            }
          />
        ))}
      </div>
    </div>
  );
}
