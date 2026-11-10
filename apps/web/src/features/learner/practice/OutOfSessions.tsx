'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { BUTTON_BASE, BUTTON_VARIANT } from '@/ui/Button';
import { HeroFrame } from './PracticeHero';

/** K/55 big card (E25, D7): no session left today, when they refill, and review instead; no plans button. Not drawn in Figma. */
export function OutOfSessions({ planName, limit, time }: { planName: string; limit: number; time: string }) {
  const t = useTranslations('App.practice.out');
  const locale = useLocale();
  return (
    <HeroFrame label={t('title')} chip={t('chip')}>
      <h2 className="font-wm-display text-wm-card-heading-mobile text-wm-ink md:text-wm-card-heading">{t('title')}</h2>
      <p className="max-w-xl font-wm-sans text-wm-base text-wm-muted">{t('body', { plan: planName, limit, time })}</p>
      <Link href={`/${locale}/app`} className={`${BUTTON_BASE} ${BUTTON_VARIANT.primary} w-fit`}>
        {t('review')}
      </Link>
    </HeroFrame>
  );
}
