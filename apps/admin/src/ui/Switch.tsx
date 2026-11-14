import { useId } from 'react';
import { Switch as AriaSwitch } from 'react-aria-components';

type Props = {
  id?: string;
  label: string;
  isSelected: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  isDisabled?: boolean;
  /** Keeps the label for assistive tech but not on screen (a switch in a table row, whose column header says what it is). */
  hideLabel?: boolean;
};

/** An on/off setting that takes effect as it is saved (a checkbox is for "pick this among many"). */
export function Switch({ id, label, isSelected, onChange, description, isDisabled, hideLabel }: Props) {
  const descriptionId = useId();
  // The description sits beside the switch, not inside its <label>, so it does not become part of the accessible name.
  return (
    <div className="flex flex-col gap-0.5">
      <AriaSwitch
        id={id}
        isSelected={isSelected}
        onChange={onChange}
        isDisabled={isDisabled}
        aria-describedby={description ? descriptionId : undefined}
        className="group flex items-center gap-3 text-ui font-medium text-ink outline-none data-disabled:opacity-60"
      >
        <span className="flex h-6 w-10 shrink-0 items-center rounded-full bg-border-strong p-0.5 group-data-focus-visible:ring-2 group-data-focus-visible:ring-primary group-data-focus-visible:ring-offset-2 group-data-selected:bg-primary">
          <span className="size-5 rounded-full bg-surface group-data-selected:translate-x-4 motion-safe:transition-transform" />
        </span>
        {hideLabel ? <span className="sr-only">{label}</span> : label}
      </AriaSwitch>
      {description && (
        <p id={descriptionId} className="ps-13 text-xs text-muted">
          {description}
        </p>
      )}
    </div>
  );
}
