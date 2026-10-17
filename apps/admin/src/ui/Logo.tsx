import { useTranslations } from 'use-intl';

/** The `_ _` sticker and the product name (mockup admin-b `.brand`). */
export function Logo({ tone = 'default' }: { tone?: 'default' | 'onPrimary' }) {
  const t = useTranslations();
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="rounded-sm bg-accent px-1.5 text-xs font-extrabold tracking-widest text-ink">
        _ _
      </span>
      <span translate="no" className={`text-base font-extrabold ${tone === 'onPrimary' ? 'text-on-primary' : 'text-ink'}`}>
        {t('shell.brand')}
      </span>
    </span>
  );
}
