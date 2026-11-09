'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** The small "Pro" label on a feature the plan does not include (restyled from app-ui/Locked.tsx). */
export function ProBadge() {
  const t = useTranslations('App.ui');
  return (
    <span className="inline-flex items-center gap-1 rounded-wm-pill bg-wm-accent-soft px-2 py-0.5 font-wm-sans text-wm-label text-wm-accent">
      <Lock aria-hidden className="size-3" />
      {t('proBadge')}
    </span>
  );
}
