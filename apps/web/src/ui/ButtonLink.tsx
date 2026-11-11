import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { BUTTON_BASE, BUTTON_VARIANT, type ButtonVariant } from './Button';

type Look = { variant?: ButtonVariant; size?: 'md' | 'lg' };
type Props =
  | (ComponentProps<typeof Link> & Look & { reload?: false })
  /** A full page load (plain `<a>`), not client navigation: links from the public pages into `/app`, whose CSP nonce is per document (LB3E6). */
  | (ComponentProps<'a'> & Look & { href: string; reload: true });

/** A link that looks like `Button` (Figma "Nút" 3:12). */
export function ButtonLink({ variant = 'primary', size = 'md', reload, className, ...rest }: Props) {
  const look = cn(BUTTON_BASE, size === 'lg' && 'min-h-12 px-6', BUTTON_VARIANT[variant], className);
  if (reload) return <a {...(rest as ComponentProps<'a'>)} data-variant={variant} className={look} />;
  return <Link {...(rest as ComponentProps<typeof Link>)} data-variant={variant} className={look} />;
}
