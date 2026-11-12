'use client';

import { ListChecks } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { BUTTON_BASE, BUTTON_VARIANT } from '@/ui/Button';
import { Kbd } from '@/ui/Kbd';
import { WordChip } from '@/ui/WordChip';
import type { GroupSummary } from '../groups/groups-api';

// Design §8.3, GM20: summary blocks rise for 400 ms, 90 ms apart (Phiên luyện, Học, Ôn).
export const STAGGER = [
  'motion-safe:animate-summary-in',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:90ms]',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:180ms]',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:270ms]',
  'motion-safe:animate-summary-in motion-safe:[animation-delay:360ms]',
] as const;

/**
 * K/22, M/32 (Figma 80:3557 / 80:3601): the ring of cards known, then the words of each pile, then the way on. Enter goes home (keys in
 * ReviewSession). Đợt C §4.1: a deck that still has due words offers Ôn beside the way home.
 */
export function ReviewSummary({ counts, piles, group }: {
  counts: { known: number; review: number };
  piles: { known: string[]; review: string[] };
  group?: GroupSummary;
}) {
  const t = useTranslations('App.review');
  const tDeck = useTranslations('App.deck');
  const due = group ? group.today.priority + group.today.due : 0;
  const locale = useLocale();
  const total = counts.known + counts.review;
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 rounded-wm-card border border-wm-line bg-wm-surface p-6 shadow-wm-card md:flex-row md:items-start md:p-8">
      <div className={STAGGER[0]}>
        <Ring known={counts.known} total={total} label={t('ring', { known: counts.known, total })} caption={t('ringCaption')} />
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
        <div className={`flex flex-col gap-2 ${STAGGER[1]}`}>
          <h1 className="font-wm-display text-wm-card-heading-mobile text-wm-ink md:text-wm-card-heading">{t('doneTitle', { count: total })}</h1>
          {counts.review > 0 && <p className="font-wm-sans text-wm-small text-wm-muted">{t('doneBody')}</p>}
        </div>
        <div className={`grid gap-4 md:grid-cols-2 ${STAGGER[2]}`}>
          <PileList tone="review" title={t('pileList', { name: t('stillLearning'), count: counts.review })} words={piles.review} count={counts.review} testId="review-count" />
          <PileList tone="known" title={t('pileList', { name: t('know'), count: counts.known })} words={piles.known} count={counts.known} testId="known-count" />
        </div>
        <div className={`flex flex-col gap-3 md:flex-row md:flex-wrap ${STAGGER[3]}`}>
          {due > 0 && group && (
            <Link href={`/${locale}/app/recall?group=${group.id}`} className={cn(BUTTON_BASE, BUTTON_VARIANT.primary)}>
              <ListChecks aria-hidden className="size-4.5 shrink-0" />
              {tDeck('recall')}
            </Link>
          )}
          <Link href={`/${locale}/app`} className={cn(BUTTON_BASE, due > 0 ? BUTTON_VARIANT.secondary : BUTTON_VARIANT.primary)}>
            {t('home')}
            <span className="hidden md:inline-flex">
              <Kbd>Enter</Kbd>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function PileList({ tone, title, words, count, testId }: { tone: 'review' | 'known'; title: string; words: string[]; count: number; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className={cn('flex items-baseline gap-2 font-wm-sans text-wm-small-strong', tone === 'review' ? 'text-wm-fail' : 'text-wm-pass')}>
        <span data-testid={testId} className="font-wm-display text-wm-card-title">
          {count}
        </span>
        <span aria-hidden>{title.split(' · ')[0]}</span>
      </p>
      {words.length > 0 && (
        <ul aria-label={title} className="flex flex-wrap gap-1.5">
          {words.map((word, i) => (
            <li key={`${i}-${word}`}>
              <WordChip word={word} tone={tone === 'review' ? 'review' : 'normal'} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A ring of the cards known out of the cards done (green), the rest to review (red). */
function Ring({ known, total, label, caption }: { known: number; total: number; label: string; caption: string }) {
  const r = 70;
  const length = 2 * Math.PI * r;
  const reviewLength = total > 0 ? ((total - known) / total) * length : 0;
  return (
    <div role="img" aria-label={label} className="relative flex size-40 items-center justify-center">
      <svg aria-hidden viewBox="0 0 160 160" className="absolute inset-0 size-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" className={total > 0 ? 'stroke-wm-pass' : 'stroke-wm-line'} />
        {reviewLength > 0 && <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" className="stroke-wm-fail" strokeDasharray={`${reviewLength} ${length}`} />}
      </svg>
      <span aria-hidden className="flex flex-col items-center">
        <span className="flex items-baseline font-wm-display text-wm-ink">
          <span className="text-wm-lemma">{known}</span>
          <span className="text-wm-word text-wm-muted">/{total}</span>
        </span>
        <span className="text-wm-meta text-wm-muted">{caption}</span>
      </span>
    </div>
  );
}
