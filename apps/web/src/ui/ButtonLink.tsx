import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { BUTTON_BASE, BUTTON_VARIANT, type ButtonVariant } from './Button';

type Props = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: 'md' | 'lg' };

/** A link that looks like `Button` (Figma "Nút" 3:12). */
export function ButtonLink({ variant = 'primary', size = 'md', className, ...rest }: Props) {
  return <Link {...rest} className={cn(BUTTON_BASE, size === 'lg' && 'min-h-12 px-6', BUTTON_VARIANT[variant], className)} />;
}
