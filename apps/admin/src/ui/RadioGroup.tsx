import { useId } from 'react';
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
          <RadioItem key={item.id} item={item} />
        ))}
      </div>
      <FieldError className="text-xs text-danger">{error}</FieldError>
    </AriaRadioGroup>
  );
}

function RadioItem({ item }: { item: Props['items'][number] }) {
  const descriptionId = useId();
  // The description sits beside the radio, not inside its <label>, so it does not become part of the accessible name.
  return (
    <div className="flex flex-col gap-0.5">
      <Radio
        value={item.id}
        aria-describedby={item.description ? descriptionId : undefined}
        className="group flex items-start gap-2 text-ui text-ink outline-none data-disabled:opacity-60"
      >
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-canvas group-data-focus-visible:ring-2 group-data-focus-visible:ring-primary group-data-focus-visible:ring-offset-2 group-data-selected:border-primary">
          <span className="size-2.5 rounded-full bg-primary opacity-0 group-data-selected:opacity-100" />
        </span>
        {item.label}
      </Radio>
      {item.description && (
        <p id={descriptionId} className="ps-7 text-xs text-muted">
          {item.description}
        </p>
      )}
    </div>
  );
}
