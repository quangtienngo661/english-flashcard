'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { HeroFrame, McqArt } from './PracticeHero';

/** K/55 big card (E25, D7): no session left today, when they refill, and review instead; no plans button. */
export function OutOfSessions({ planName, limit, time }: { planName: string; limit: number; time: string }) {
  const t = useTranslations('App.practice.out');
  const locale = useLocale();
  return (
    <HeroFrame labelledBy="out-title" art={<McqArt />}>
      <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-on-accent">{t('chip')}</span>
      <h2 id="out-title" className="text-h2 font-extrabold">
        {t('title')}
      </h2>
      <p className="max-w-xl text-ui text-on-navy-muted">{t('body', { plan: planName, limit, time })}</p>
      <Link
        href={`/${locale}/app`}
        className="flex min-h-control-touch w-fit items-center rounded-inner bg-accent px-8 text-body font-semibold text-on-accent shadow-ledge-accent outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
      >
        {t('review')}
      </Link>
    </HeroFrame>
  );
}
