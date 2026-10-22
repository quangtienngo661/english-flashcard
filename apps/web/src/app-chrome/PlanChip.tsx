'use client';

import { useTranslations } from 'next-intl';
import { useEntitlements } from '@/app-shell/queries';
import { cn } from '@/lib/cn';

/** "Miễn phí" / "Dùng thử" / "Pro" from `GET /v1/me/entitlements` (copy doc §3.4); nothing until the plan is known. */
export function PlanChip({ tone = 'navy' }: { tone?: 'navy' | 'light' }) {
  const t = useTranslations('App.chrome.plan');
  const { data } = useEntitlements();
  if (!data) return null;
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold',
        tone === 'navy' ? 'bg-navy-raised text-on-navy' : 'bg-primary-soft text-ink',
      )}
    >
      {t(data.plan)}
    </span>
  );
}
