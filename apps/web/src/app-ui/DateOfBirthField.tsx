'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { birthDateProblem, deviceToday, formatBirthDate } from './date-of-birth';
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
 * A date picker (owner 27/10/2026: the browser's own date box instead of typing `dd/mm/yyyy`; no new library). The under-13 line
 * shows as soon as a date is picked (K/01b, K/92), so the form never sends a date the API would refuse.
 */
export function DateOfBirthField({ label, initial = null, description, onChange, serverError = null, today = deviceToday() }: Props) {
  const t = useTranslations('App.ui.dob');
  const [iso, setIso] = useState(initial ?? '');
  const problem = iso === '' ? null : birthDateProblem(formatBirthDate(iso), today);
  const shown = serverError ?? problem;

  return (
    <TextField
      label={label}
      type="date"
      value={iso}
      min="1900-01-01"
      max={today}
      autoComplete="bday"
      description={shown ? undefined : description}
      error={shown ? t(shown) : undefined}
      onChange={(next) => {
        setIso(next);
        onChange(next !== '' && birthDateProblem(formatBirthDate(next), today) === null ? next : null);
      }}
    />
  );
}
