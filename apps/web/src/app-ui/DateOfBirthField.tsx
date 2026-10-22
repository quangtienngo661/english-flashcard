'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { birthDateProblem, deviceToday, formatBirthDate, parseBirthDate } from './date-of-birth';
import { TextField } from './TextField';

type Props = {
  label: string;
  /** ISO date to start from (Account page). */
  initial?: string | null;
  description?: string;
  /** The valid ISO date, or null while the text is not a valid 13+ birth date. */
  onChange: (iso: string | null) => void;
  /** An error from the server (400 `age-below-minimum`), shown like the local one. */
  serverError?: 'tooYoung' | null;
  /** `YYYY-MM-DD`; defaults to today on this device (tests pin it). */
  today?: string;
};

/**
 * One text field `dd/mm/yyyy` (plan Task 6). The under-13 line shows as soon as the date is complete (K/01b, K/92), so the
 * form never sends a date the API would refuse; other mistakes show when the field loses focus.
 */
export function DateOfBirthField({ label, initial = null, description, onChange, serverError = null, today = deviceToday() }: Props) {
  const t = useTranslations('App.ui.dob');
  const [text, setText] = useState(initial ? formatBirthDate(initial) : '');
  const [touched, setTouched] = useState(false);
  const problem = text === '' ? null : birthDateProblem(text, today);
  const shown = serverError ?? (problem === 'tooYoung' || (touched && problem) ? problem : null);

  return (
    <TextField
      label={label}
      value={text}
      inputMode="numeric"
      autoComplete="bday"
      placeholder={t('placeholder')}
      description={shown ? undefined : description}
      error={shown ? t(shown) : undefined}
      onBlur={() => setTouched(true)}
      onChange={(next) => {
        setText(next);
        onChange(birthDateProblem(next, today) === null ? parseBirthDate(next) : null);
      }}
    />
  );
}
