import type { AnchorHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { buttonBase, buttonVariants, type ButtonVariant } from './Button';

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function ButtonLink({ variant = 'primary', fullWidth, className, ...props }: ButtonLinkProps) {
  return <a className={cn(buttonBase, buttonVariants[variant], fullWidth && 'w-full', className)} {...props} />;
}
