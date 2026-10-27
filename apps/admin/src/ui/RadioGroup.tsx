import { FieldError, Label, Radio, RadioGroup as AriaRadioGroup, Text } from 'react-aria-components';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (id: string) => void;
  items: Array<{ id: string; label: string; description?: string }>;
  description?: string;
  error?: string;
  isDisabled?: boolean;
};

/** One choice out of a few that should all stay visible (a `Select` hides them behind a click). */
export function RadioGroup({ id, label, value, onChange, items, description, error, isDisabled }: Props) {
  return (
    <AriaRadioGroup id={id} value={value} onChange={onChange} isDisabled={isDisabled} isInvalid={error !== undefined} className="flex w-full flex-col gap-2">
      <Label className="text-ui font-medium text-ink">{label}</Label>
      {description && (
        <Text slot="description" className="text-xs text-muted">
          {description}
        </Text>
      )}
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Radio key={item.id} value={item.id} className="group flex items-start gap-2 text-ui text-ink outline-none data-disabled:opacity-60">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-canvas group-data-focus-visible:ring-2 group-data-focus-visible:ring-primary group-data-focus-visible:ring-offset-2 group-data-selected:border-primary">
              <span className="size-2.5 rounded-full bg-primary opacity-0 group-data-selected:opacity-100" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span>{item.label}</span>
              {item.description && <span className="text-xs text-muted">{item.description}</span>}
            </span>
          </Radio>
        ))}
      </div>
      <FieldError className="text-xs text-danger">{error}</FieldError>
    </AriaRadioGroup>
  );
}
