'use client';

import { LoaderCircle } from 'lucide-react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cn } from '@/lib/cn';

// Copied from apps/admin/src/ui/Button.tsx; variants follow the Figma "Button" component (3:71): Sticker = the one yellow
// main action per screen, Quiet = secondary, Ink = dark, Danger = destructive.
export type ButtonVariant = 'sticker' | 'primary' | 'quiet' | 'ink' | 'danger' | 'ghost';

const VARIANT: Record<ButtonVariant, string> = {
  sticker: 'bg-accent text-on-accent shadow-ledge-accent hover:bg-accent/90',
  primary: 'bg-primary text-on-primary shadow-button hover:bg-primary/90',
  quiet: 'bg-surface text-ink ring-2 ring-inset ring-border-strong shadow-button-secondary hover:bg-primary-soft',
  ink: 'bg-ink text-surface shadow-ledge hover:bg-ink/90',
  danger: 'bg-danger text-on-primary shadow-button-danger hover:bg-danger/90',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
};

type Props = Omit<AriaButtonProps, 'className'> & {
  variant?: ButtonVariant;
  /** `lg` is the 44 px form submit of the auth screens and sessions. */
  size?: 'md' | 'lg';
  className?: string;
};

/**
 * While `isPending` a press does nothing and a submit button stops submitting, so a double-click sends one request
 * (Review Focus 1). React Aria's own `isPending` is not used: it adds an empty `role="img"` region axe reports.
 */
export function Button({ variant = 'primary', size = 'md', className, children, isPending, onPress, type, ...rest }: Props) {
  return (
    <AriaButton
      {...rest}
      type={isPending ? 'button' : type}
      onPress={isPending ? undefined : onPress}
      aria-busy={isPending || undefined}
      data-variant={variant}
      data-pending={isPending || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-inner px-4.5 font-semibold outline-none transition duration-instant ease-standard focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 data-pending:cursor-progress motion-safe:data-pressed:pressed motion-safe:data-pressed:shadow-none',
        size === 'lg' ? 'min-h-control-touch text-body' : 'min-h-control text-ui',
        VARIANT[variant],
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
