import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'inverse';

export const buttonVariants = {
  primary: 'bg-primary text-on-primary hover:bg-primary/90',
  secondary: 'bg-surface text-ink border border-border hover:bg-bg',
  inverse: 'bg-on-primary text-primary hover:bg-on-primary/90',
} satisfies Record<ButtonVariant, string>;

export const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-6 py-3 text-body font-semibold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-70';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({ variant = 'primary', fullWidth, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonBase, buttonVariants[variant], fullWidth && 'w-full', className)} {...props} />;
}
