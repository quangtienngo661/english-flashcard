'use client';

import { useTranslations } from 'next-intl';
import { FieldError, Input, Label, Text, TextField as AriaTextField } from 'react-aria-components';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'date';
  /** Bounds of a `date` field (`YYYY-MM-DD`). */
  min?: string;
  max?: string;
  name?: string;
  autoComplete?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  maxLength?: number;
  /** Shows "12/60" under the field (needs `maxLength`). */
  showCount?: boolean;
  spellCheck?: boolean;
  inputMode?: 'text' | 'numeric' | 'email';
  onBlur?: () => void;
  autoFocus?: boolean;
};

// Copied from apps/admin/src/ui/TextField.tsx; adds the character counter and the compact Figma field (38–40 px, 14 px text).
/** Label, input and error in one block; the error is tied to the input (`aria-describedby`, `aria-invalid`). */
export function TextField({ label, value, onChange, error, description, placeholder, spellCheck, inputMode, showCount, maxLength, onBlur, min, max, ...rest }: Props) {
  const t = useTranslations('App.common');
  return (
    <AriaTextField
      {...rest}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      maxLength={maxLength}
      isInvalid={error !== undefined}
      className="flex w-full min-w-0 flex-col gap-1.5"
    >
      <Label className="text-ui font-medium text-ink">{label}</Label>
      <Input
        placeholder={placeholder}
        spellCheck={spellCheck}
        inputMode={inputMode}
        min={min}
        max={max}
        className="min-h-control w-full min-w-0 rounded-control border-2 border-border-strong bg-surface px-3 py-2 text-ui text-ink outline-none placeholder:text-placeholder focus-visible:border-primary disabled:opacity-60 read-only:bg-canvas data-invalid:border-danger"
      />
      {(description || (showCount && maxLength)) && (
        <div className="flex items-start justify-between gap-3 text-caption text-muted">
          {description ? <Text slot="description">{description}</Text> : <span />}
          {showCount && maxLength ? (
            <span aria-hidden className="shrink-0 tabular-nums">
              {t('charCount', { count: [...value].length, max: maxLength })}
            </span>
          ) : null}
        </div>
      )}
      <FieldError className="text-caption text-danger">{error}</FieldError>
    </AriaTextField>
  );
}
