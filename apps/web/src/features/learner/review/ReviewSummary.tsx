'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

/** Each block rises 50ms after the one before it (motion audit #6); with reduced motion they all show at once. */
export const STAGGER = [
  'motion-safe:animate-summary-in',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:50ms]',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:100ms]',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:150ms]',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:200ms]',
] as const;

/** K/22, M/32: how many cards were done, split into Know and Still learning. Enter goes home (keys in ReviewSession). */
export function ReviewSummary({ counts }: { counts: { known: number; review: number } }) {
  const t = useTranslations('App.review');
  const locale = useLocale();
  return (
    <section className="flex w-full flex-col gap-5">
      <div className={`flex flex-col gap-2 ${STAGGER[0]}`}>
        <h1 className="text-display font-extrabold text-ink">{t('doneTitle', { count: counts.known + counts.review })}</h1>
        {counts.review > 0 && <p className="text-ui text-muted">{t('doneBody')}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={`flex flex-col gap-1 rounded-card bg-surface p-4 shadow-ledge-soft ${STAGGER[1]}`}>
          <span data-testid="known-count" className="text-h2 font-extrabold text-success">
            {counts.known}
          </span>
          <span className="text-ui text-ink">{t('know')}</span>
        </div>
        <div className={`flex flex-col gap-1 rounded-card bg-surface p-4 shadow-ledge-soft ${STAGGER[2]}`}>
          <span data-testid="review-count" className="text-h2 font-extrabold text-warning">
            {counts.review}
          </span>
          <span className="text-ui text-ink">{t('stillLearning')}</span>
        </div>
      </div>
      <Link
        href={`/${locale}/app`}
        className={`flex min-h-control-touch items-center justify-between gap-3 rounded-inner bg-accent px-4.5 text-body font-semibold text-on-accent shadow-ledge-accent outline-none focus-visible:ring-2 focus-visible:ring-primary md:w-fit md:min-w-64 ${STAGGER[3]}`}
      >
        {t('home')}
        <kbd className="hidden rounded-sm border border-on-accent px-1.5 text-caption md:inline">Enter</kbd>
      </Link>
    </section>
  );
}
