'use client';

import { LoaderCircle } from 'lucide-react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cn } from '@/lib/cn';
import { BUTTON_BASE, BUTTON_VARIANT, type ButtonVariant } from './button-styles';

// The look lives in button-styles.ts, a plain module: a server component (ButtonLink on the public pages) that imported these strings from
// this 'use client' file would get client references instead of the classes (R240). Re-exported for the app screens that import them here.
export { BUTTON_BASE, BUTTON_VARIANT, type ButtonVariant } from './button-styles';

export const BUTTON_DISABLED = 'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100';

type Props = Omit<AriaButtonProps, 'className'> & {
  variant?: ButtonVariant;
  /** `lg`: the full-width submit of auth screens and sessions. */
  size?: 'md' | 'lg';
  isPending?: boolean;
  className?: string;
};

/** While `isPending` a press does nothing and a submit button stops submitting, so a double-click sends one request. */
export function Button({ variant = 'primary', size = 'md', className, children, isPending, onPress, type, ...rest }: Props) {
  return (
    <AriaButton
      {...rest}
      type={isPending ? 'button' : type}
      onPress={isPending ? undefined : onPress}
      aria-busy={isPending || undefined}
      data-variant={variant}
      className={cn(
        BUTTON_BASE,
        BUTTON_DISABLED,
        size === 'lg' && 'min-h-12 px-6',
        isPending && 'cursor-progress',
        BUTTON_VARIANT[variant],
        className,
      )}
    >
      {(values) => (
        <>
          {isPending && <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />}
          {typeof children === 'function' ? children(values) : children}
        </>
      )}
    </AriaButton>
  );
}
