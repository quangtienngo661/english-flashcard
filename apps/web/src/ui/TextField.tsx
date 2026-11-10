'use client';

import { CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FieldError, Input, Label, Text, TextField as AriaTextField } from 'react-aria-components';
import { FIELD_BOX, FIELD_ERROR, FIELD_HINT, FIELD_LABEL } from './field-styles';

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

/** Same props as app-ui/TextField; the look of Figma "Ô nhập" (34:345). The error is tied to the input. */
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
      className="group flex w-full min-w-0 flex-col gap-1.5"
    >
      <Label className={FIELD_LABEL}>{label}</Label>
      <Input
        placeholder={placeholder}
        spellCheck={spellCheck}
        inputMode={inputMode}
        min={min}
        max={max}
        className={`${FIELD_BOX} data-invalid:border-wm-fail`}
      />
      <FieldError className={FIELD_ERROR}>
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {error}
      </FieldError>
      {(description || (showCount && maxLength)) && (
        <div className={`flex items-start justify-between gap-3 ${FIELD_HINT}`}>
          {description ? <Text slot="description">{description}</Text> : <span />}
          {showCount && maxLength ? (
            <span aria-hidden className="shrink-0 tabular-nums">
              {t('charCount', { count: [...value].length, max: maxLength })}
            </span>
          ) : null}
        </div>
      )}
    </AriaTextField>
  );
}
