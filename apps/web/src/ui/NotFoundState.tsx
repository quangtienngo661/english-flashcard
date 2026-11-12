'use client';

import { SearchX } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

/** E17: a stale or wrong link (deleted deck, unknown word); `back` names where to go instead. */
export function NotFoundState({ title, back }: { title?: string; back?: { href: string; label: string } }) {
  const t = useTranslations('App.common');
  const locale = useLocale();
  const link = back ?? { href: `/${locale}/app`, label: t('home') };
  return (
    <div className="flex flex-col items-start gap-3 rounded-wm-xl bg-wm-surface p-6 shadow-wm-card">
      <SearchX aria-hidden className="size-8 text-wm-muted" />
      <h1 className="font-wm-display text-wm-card-title text-wm-ink">{title ?? t('notFoundTitle')}</h1>
      <p className="font-wm-sans text-wm-base text-wm-muted">{t('notFoundBody')}</p>
      <Link href={link.href} className="font-wm-sans font-semibold text-wm-accent underline underline-offset-2">
        {link.label}
      </Link>
    </div>
  );
}
