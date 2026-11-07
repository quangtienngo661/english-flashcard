'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import type { GroupSummary } from '../groups/groups-api';

/** Each block rises 50ms after the one before it (motion audit #6); with reduced motion they all show at once. */
export const STAGGER = [
  'motion-safe:animate-summary-in',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:50ms]',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:100ms]',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:150ms]',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:200ms]',
] as const;

/**
 * K/22, M/32: how many cards were done, split into Know and Still learning. Enter goes home (keys in ReviewSession). Đợt C §4.1:
 * a deck that still has due words offers Ôn beside the way home.
 */
export function ReviewSummary({ counts, group }: { counts: { known: number; review: number }; group?: GroupSummary }) {
  const t = useTranslations('App.review');
  const tDeck = useTranslations('App.deck');
  const due = group ? group.today.priority + group.today.due : 0;
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
      <div className={`flex flex-col gap-3 md:flex-row ${STAGGER[3]}`}>
        {due > 0 && group && (
          <Link
            href={`/${locale}/app/recall?group=${group.id}`}
            className="flex min-h-control-touch items-center justify-center gap-2 rounded-inner bg-accent px-4.5 text-body font-semibold text-on-accent shadow-ledge-accent outline-none focus-visible:ring-2 focus-visible:ring-primary md:min-w-48"
          >
            <ListChecks aria-hidden className="size-5 shrink-0" />
            {tDeck('recall')}
          </Link>
        )}
        <Link
          href={`/${locale}/app`}
          className={
            due > 0
              ? 'flex min-h-control-touch items-center justify-between gap-3 rounded-inner border-2 border-border-strong bg-surface px-4.5 text-body font-semibold text-ink shadow-button-secondary outline-none focus-visible:ring-2 focus-visible:ring-primary md:min-w-64'
              : 'flex min-h-control-touch items-center justify-between gap-3 rounded-inner bg-accent px-4.5 text-body font-semibold text-on-accent shadow-ledge-accent outline-none focus-visible:ring-2 focus-visible:ring-primary md:w-fit md:min-w-64'
          }
        >
          {t('home')}
          <kbd className="hidden rounded-sm border border-current px-1.5 text-caption md:inline">Enter</kbd>
        </Link>
      </div>
    </section>
  );
}
