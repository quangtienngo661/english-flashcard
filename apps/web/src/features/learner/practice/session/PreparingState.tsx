'use client';

import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** K/73: the next AI question is being written; no buttons (E29 takes over after 60 s). */
export function PreparingState() {
  const t = useTranslations('App.practice.session.ai');
  return (
    <section role="status" className="flex flex-col items-center gap-3 rounded-card bg-surface p-8 text-center">
      <LoaderCircle aria-hidden className="size-8 text-primary motion-safe:animate-spin" />
      <h1 className="text-title font-bold text-ink">{t('preparingTitle')}</h1>
      <p className="text-body text-muted">{t('preparingBody')}</p>
    </section>
  );
}
