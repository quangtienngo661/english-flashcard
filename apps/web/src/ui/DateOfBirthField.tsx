'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { birthDateProblem, deviceToday, formatBirthDate } from '@/lib/date-of-birth';
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
  /** Shown while no date is picked ("Chọn ngày sinh."): the form sets it when a press finds the field empty. */
  requiredError?: string;
  /** `YYYY-MM-DD`; defaults to today on this device (tests pin it). */
  today?: string;
};

/**
 * The birth date field, on the kit's `TextField`; `onChange` gets the ISO date, or null while it is not a valid 13+ birth date. The
 * browser's own date box (owner 27/10/2026), not the `dd/mm/yyyy` text Figma draws. The under-13 line shows as soon as a date is picked
 * (K/01b, K/92), so the form never sends a date the API would refuse.
 */
export function DateOfBirthField({ label, initial = null, description, onChange, serverError = null, requiredError, today = deviceToday() }: Props) {
  const t = useTranslations('App.ui.dob');
  const [iso, setIso] = useState(initial ?? '');
  const problem = iso === '' ? null : birthDateProblem(formatBirthDate(iso), today);
  const shown = serverError ?? problem;
  const error = shown ? t(shown) : iso === '' ? requiredError : undefined;

  return (
    <TextField
      label={label}
      type="date"
      value={iso}
      min="1900-01-01"
      max={today}
      autoComplete="bday"
      description={error ? undefined : description}
      error={error}
      onChange={(next) => {
        setIso(next);
        onChange(next !== '' && birthDateProblem(formatBirthDate(next), today) === null ? next : null);
      }}
    />
  );
}
