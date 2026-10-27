import { FieldError, Label, Text, TextArea as AriaTextArea, TextField as AriaTextField } from 'react-aria-components';
import { useFormatter } from 'use-intl';

type Props = {
  /** So a form can focus the field (`document.getElementById`), e.g. the first one a 400 flagged. */
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  isDisabled?: boolean;
  /** With `counter` it is only a limit to show, typing past it is not blocked; without it, the browser stops typing at it. */
  maxLength?: number;
  /** Shows "1.234/8.000" under the field, red when over `maxLength`. */
  counter?: boolean;
  rows?: number;
  spellCheck?: boolean;
};

/** Multi-line `TextField`: same label, description and error wiring, plus an optional length counter. */
export function TextArea({ label, value, onChange, error, description, placeholder, spellCheck, rows = 4, maxLength, counter, ...rest }: Props) {
  const format = useFormatter();
  const length = value.length;
  const over = counter && maxLength !== undefined && length > maxLength;
  return (
    <AriaTextField
      {...rest}
      value={value}
      onChange={onChange}
      maxLength={counter ? undefined : maxLength}
      isInvalid={error !== undefined || over}
      className="flex w-full flex-col gap-1.5"
    >
      <Label className="text-ui font-medium text-ink">{label}</Label>
      <AriaTextArea
        rows={rows}
        placeholder={placeholder}
        spellCheck={spellCheck}
        className="min-h-control w-full min-w-0 resize-y rounded-control bg-canvas px-3 py-1.5 text-ui text-ink outline-none ring-2 ring-inset ring-border-strong placeholder:text-placeholder focus-visible:bg-surface focus-visible:ring-primary disabled:opacity-60 data-invalid:ring-danger"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {description && (
            <Text slot="description" className="text-xs text-muted">
              {description}
            </Text>
          )}
          <FieldError className="text-xs text-danger">{error}</FieldError>
        </div>
        {counter && maxLength !== undefined && (
          <span data-over={over ? '' : undefined} className="shrink-0 text-xs text-muted data-over:text-danger">
            {format.number(length)}/{format.number(maxLength)}
          </span>
        )}
      </div>
    </AriaTextField>
  );
}
