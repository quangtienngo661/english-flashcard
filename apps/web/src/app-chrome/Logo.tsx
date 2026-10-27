import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

/** The yellow mark (app/icon.svg) and the product name (Figma top bar "logo"). */
export function Logo({ tone = 'navy' }: { tone?: 'navy' | 'surface' }) {
  const t = useTranslations('App.chrome');
  return (
    <span className="flex items-center gap-2">
      {/* The mark of app/icon.svg as inline SVG, so it stays sharp at any size (owner 27/10/2026); colours from tokens. */}
      <svg aria-hidden viewBox="0 0 64 64" className="size-8 shrink-0">
        <rect width="64" height="64" rx="14" className="fill-accent" />
        <path d="M14 40h14M36 40h14" strokeWidth="6" strokeLinecap="round" className="stroke-on-accent" />
      </svg>
      <span translate="no" className={cn('text-title font-semibold tracking-tight', tone === 'navy' ? 'text-on-navy' : 'text-ink')}>
        {t('brand')}
      </span>
    </span>
  );
}
