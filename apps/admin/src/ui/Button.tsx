import { Loader } from 'lucide-react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary/90',
  secondary: 'bg-surface text-ink border border-border-strong hover:bg-bg',
  danger: 'bg-danger-strong text-on-primary hover:bg-danger-strong/90',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
};

type Props = Omit<AriaButtonProps, 'className'> & {
  variant?: ButtonVariant;
  /** `touch` is the taller control used for form submits (Figma: 44 px). */
  size?: 'md' | 'touch';
  className?: string;
};

/** While `isPending` a press does nothing, so a double-click sends one request (Review Focus 3). */
export function Button({ variant = 'primary', size = 'md', className = '', children, isPending, ...rest }: Props) {
  const height = size === 'touch' ? 'min-h-control-touch' : 'min-h-control';
  return (
    <AriaButton
      {...rest}
      isPending={isPending}
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 py-1.5 text-ui font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 data-pending:cursor-progress ${height} ${VARIANT[variant]} ${className}`}
    >
      {(values) => (
        <>
          {isPending && <Loader aria-hidden className="size-4 animate-spin" />}
          {typeof children === 'function' ? children(values) : children}
        </>
      )}
    </AriaButton>
  );
}
