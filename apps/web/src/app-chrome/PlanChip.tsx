'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEntitlements } from '@/app-shell/queries';

/** "Miễn phí" / "Dùng thử" / "Pro" from `GET /v1/me/entitlements`; nothing until the plan is known. */
export function PlanChip() {
  const t = useTranslations('App.chrome.plan');
  const { data } = useEntitlements();
  if (!data) return null;
  return <span className="whitespace-nowrap font-wm-sans text-wm-label text-wm-muted">{t(data.plan)}</span>;
}

/** The quiet plan chip of the top bar (Figma 54:502 "Chip gói"), a way to Gói học. */
export function PlanChipLink() {
  const t = useTranslations('App.chrome');
  const locale = useLocale();
  return (
    <Link
      href={`/${locale}/app/plans`}
      className="flex min-h-9 items-center rounded-wm-pill px-1 outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent"
    >
      <span className="sr-only">{t('plans')}: </span>
      <PlanChip />
    </Link>
  );
}
