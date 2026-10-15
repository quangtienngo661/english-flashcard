import { FieldError, Input, Label, Text, TextField as AriaTextField } from 'react-aria-components';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'url';
  name?: string;
  autoComplete?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  isDisabled?: boolean;
  maxLength?: number;
  /** `false` for emails and codes, where the spell checker only adds noise. */
  spellCheck?: boolean;
  inputMode?: 'text' | 'numeric' | 'email' | 'url';
};

/** Label, input and error in one block; the error is tied to the input (`aria-describedby`, `aria-invalid`). */
export function TextField({ label, value, onChange, error, description, placeholder, spellCheck, inputMode, ...rest }: Props) {
  return (
    <AriaTextField {...rest} value={value} onChange={onChange} isInvalid={error !== undefined} className="flex w-full flex-col gap-1.5">
      <Label className="text-ui font-medium text-ink">{label}</Label>
      <Input
        placeholder={placeholder}
        spellCheck={spellCheck}
        inputMode={inputMode}
        className="min-h-control w-full min-w-0 rounded-control border border-border-strong bg-surface px-3 py-1.5 text-ui text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 data-invalid:border-danger"
      />
      {description && (
        <Text slot="description" className="text-xs text-muted">
          {description}
        </Text>
      )}
      <FieldError className="text-xs text-danger">{error}</FieldError>
    </AriaTextField>
  );
}
