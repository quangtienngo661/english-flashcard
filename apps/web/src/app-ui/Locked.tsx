'use client';

import { Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

/** The small "Pro" label on a feature the plan does not include (copy doc §3.3). */
export function ProBadge() {
  const t = useTranslations('App.ui');
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-primary">
      <Lock aria-hidden className="size-3" />
      {t('proBadge')}
    </span>
  );
}

/** D6 line shown when a locked control is pressed: no price, no buy button, only the way to Plans. */
export function LockedFeature() {
  const t = useTranslations('App.ui');
  const locale = useLocale();
  return (
    <p role="status" className="text-caption text-muted">
      {t('lockedLine')}{' '}
      <Link href={`/${locale}/app/plans`} className="font-semibold text-primary underline underline-offset-2">
        {t('seePlans')}
      </Link>
    </p>
  );
}
