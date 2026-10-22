import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

/** The `_ _` sticker and the product name (Figma top bar "logo"). */
export function Logo({ tone = 'navy' }: { tone?: 'navy' | 'surface' }) {
  const t = useTranslations('App.chrome');
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="rounded-sm bg-accent px-1.5 py-px text-caption font-semibold text-on-accent">
        _ _
      </span>
      <span translate="no" className={cn('text-title font-semibold tracking-tight', tone === 'navy' ? 'text-on-navy' : 'text-ink')}>
        {t('brand')}
      </span>
    </span>
  );
}
