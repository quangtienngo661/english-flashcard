'use client';

import { LoaderCircle } from 'lucide-react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cn } from '@/lib/cn';

// Figma "Nút" (3:12): Chính = accent with the navy glow, Phụ = surface with a line and the soft shadow; pass and danger for
// "Đã biết" and destructive actions. No shadow when disabled. Hover brightness(1.12) 200ms, press scale(.97) 150ms (GM14, motion §6).
export type ButtonVariant = 'primary' | 'secondary' | 'pass' | 'danger';

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-wm-accent text-wm-on-accent shadow-wm-btn',
  secondary: 'border border-wm-line bg-wm-surface text-wm-ink shadow-wm-soft',
  pass: 'bg-wm-pass text-wm-on-accent shadow-wm-btn-pass',
  danger: 'bg-wm-fail text-wm-on-accent shadow-wm-btn-fail',
};

export const BUTTON_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-wm-button px-5 font-wm-sans text-wm-button outline-none ' +
  'transition duration-200 ease-out-strong hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-wm-accent motion-safe:active:scale-97 motion-safe:data-pressed:scale-97 motion-safe:data-pressed:duration-150';

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
