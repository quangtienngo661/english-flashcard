import { Loader } from 'lucide-react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/** Direction B (design §6.2): chunky buttons on a flat ledge; ghost has none. */
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-button hover:bg-primary/90',
  secondary: 'bg-surface text-ink ring-2 ring-inset ring-border-strong shadow-button-secondary hover:bg-primary/4',
  danger: 'bg-danger text-on-primary shadow-button-danger hover:bg-danger/90',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
};

type Props = Omit<AriaButtonProps, 'className'> & {
  variant?: ButtonVariant;
  /** `touch` is the taller control used for form submits (Figma: 44 px). */
  size?: 'md' | 'touch';
  className?: string;
};

/**
 * While `isPending` a press does nothing and a submit button stops submitting, so a double-click sends one
 * request (Review Focus 3). React Aria's own `isPending` is not used: it injects an empty `role="img"` live
 * region that axe reports as a serious `role-img-alt` violation.
 */
export function Button({ variant = 'primary', size = 'md', className = '', children, isPending, onPress, type, ...rest }: Props) {
  const height = size === 'touch' ? 'min-h-control-touch' : 'min-h-control';
  return (
    <AriaButton
      {...rest}
      type={isPending ? 'button' : type}
      onPress={isPending ? undefined : onPress}
      aria-busy={isPending || undefined}
      data-pending={isPending || undefined}
      // The press sinks the button onto its ledge, only when motion is allowed (UBE20); coarse pointers get 44 px.
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control px-4 py-1.5 text-ui font-semibold outline-none transition duration-instant ease-standard focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-pending:cursor-progress pointer-coarse:min-h-control-touch motion-safe:data-pressed:pressed motion-safe:data-pressed:shadow-none ${height} ${VARIANT[variant]} ${className}`}
    >
      {(values) => (
        <>
          {isPending && <Loader aria-hidden className="size-4 motion-safe:animate-spin" />}
          {typeof children === 'function' ? children(values) : children}
        </>
      )}
    </AriaButton>
  );
}
