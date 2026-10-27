import { FieldError, Input, Label, NumberField as AriaNumberField, Text } from 'react-aria-components';

type Props = {
  /** So a form can focus the field (`document.getElementById`), e.g. the first one a 400 flagged. */
  id?: string;
  label: string;
  /** `null` is an empty field. */
  value: number | null;
  /** Empty becomes `null` only with `isNullable`; otherwise clearing the field emits nothing and it snaps back on blur. */
  onChange: (value: number | null) => void;
  isNullable?: boolean;
  minValue?: number;
  maxValue?: number;
  step?: number;
  name?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  isDisabled?: boolean;
};

/** Number input with the same label, description and error wiring as `TextField`; React Aria reports an empty field as `NaN`. */
export function NumberField({ label, value, onChange, isNullable, error, description, placeholder, ...rest }: Props) {
  return (
    <AriaNumberField
      {...rest}
      value={value ?? Number.NaN}
      onChange={(next) => {
        if (Number.isNaN(next)) {
          if (isNullable) onChange(null);
          return;
        }
        onChange(next);
      }}
      isInvalid={error !== undefined}
      className="flex w-full flex-col gap-1.5"
    >
      <Label className="text-ui font-medium text-ink">{label}</Label>
      <Input
        placeholder={placeholder}
        className="min-h-control w-full min-w-0 rounded-control bg-canvas px-3 py-1.5 text-ui text-ink outline-none ring-2 ring-inset ring-border-strong placeholder:text-placeholder focus-visible:bg-surface focus-visible:ring-primary disabled:opacity-60 data-invalid:ring-danger"
      />
      {description && (
        <Text slot="description" className="text-xs text-muted">
          {description}
        </Text>
      )}
      <FieldError className="text-xs text-danger">{error}</FieldError>
    </AriaNumberField>
  );
}
