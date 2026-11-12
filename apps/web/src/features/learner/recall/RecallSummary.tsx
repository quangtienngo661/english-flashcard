'use client';

import { Layers2, ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useRouteLocale } from '@/app-shell/route-locale';
import { ErrorState } from '@/ui/States';
import { SkeletonBlocks } from '@/ui/Skeleton';
import { cn } from '@/lib/cn';
import { BUTTON_BASE, BUTTON_VARIANT } from '@/ui/Button';
import { useGroups } from '../groups/groups-api';
import type { PracticeSessionView } from '../practice/practice-api';
import { useSummary } from '../practice/session/SessionSummary';
import { STAGGER } from '../review/ReviewSummary';

/**
 * Đợt C §4.4, Figma 209:6089 / 209:6195 "Ôn xong phiên": the ring of right answers, how many words, then the four results
 * (right and moved up, right and kept when a word was not due yet, wrong, Cần ôn lại). The next step follows the deck: new words left
 * → Học; due words left → Ôn tiếp; otherwise home.
 */
export function RecallSummary({ session }: { session: PracticeSessionView }) {
  const t = useTranslations('App.recall');
  const tDeck = useTranslations('App.deck');
  const locale = useRouteLocale();
  const errorText = useErrorMessage();
  const summary = useSummary(session.id);
  const group = useGroups().data?.items.find((g) => g.id === session.group_id);
  if (summary.isPending) return <SkeletonBlocks />;
  if (summary.isError) return <ErrorState message={errorText(summary.error)} onRetry={() => void summary.refetch()} />;
  const data = summary.data;
  const recall = data.recall ?? { leveled_up: 0, correct_kept: 0 };
  const needsReview = data.words.filter((w) => w.action === 'needs_review').length;
  const tiles: Array<{ label: string; value: number; tone: string }> = [
    { label: t('leveledUp'), value: recall.leveled_up, tone: 'text-wm-pass' },
    ...(recall.correct_kept > 0 ? [{ label: t('correctKept'), value: recall.correct_kept, tone: 'text-wm-accent' }] : []),
    { label: t('wrongKept'), value: data.wrong, tone: 'text-wm-fail' },
    { label: t('needsReview'), value: needsReview, tone: 'text-wm-ink' },
  ];
  const newLeft = group?.today.new ?? 0;
  const dueLeft = group ? group.today.priority + group.today.due : 0;
  const home = `/${locale}/app`;
  return (
    <section className="flex w-full flex-col items-center gap-8 rounded-wm-card border border-wm-line bg-wm-surface p-6 shadow-wm-card md:flex-row md:items-start md:p-8">
      <div className={STAGGER[0]}>
        <Ring correct={data.correct} total={data.asked} label={t('ring', { correct: data.correct, total: data.asked })} caption={t('ringCaption')} />
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
        <h1 className={cn('text-balance font-wm-display text-wm-card-heading-mobile text-wm-ink md:text-wm-card-heading', STAGGER[1])}>
          {t('doneTitle', { count: data.asked })}
        </h1>
        <div className={cn('grid gap-3', tiles.length === 4 ? 'grid-cols-2' : 'grid-cols-3', STAGGER[2])}>
          {tiles.map((tile) => (
            <div key={tile.label} className="flex flex-col gap-0.5 rounded-wm-row bg-wm-bg px-4 py-3">
              <span className={cn('font-wm-display text-wm-card-title tabular-nums', tile.tone)}>{tile.value}</span>
              <span className="font-wm-sans text-wm-small text-wm-ink">{tile.label}</span>
            </div>
          ))}
        </div>
        {newLeft > 0 && group ? (
          <div className={cn('flex flex-col gap-3 rounded-wm-row border border-wm-line p-4', STAGGER[3])}>
            <div>
              <h2 className="font-wm-sans text-wm-base-strong text-wm-ink">{t('newLeftTitle', { count: newLeft })}</h2>
              <p className="font-wm-sans text-wm-small text-wm-muted">{t('newLeftBody')}</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <Link href={`/${locale}/app/review?group=${group.id}&mode=new`} className={cn(BUTTON_BASE, BUTTON_VARIANT.primary)}>
                <Layers2 aria-hidden className="size-4.5 shrink-0" />
                {tDeck('learn')}
              </Link>
              <Link href={home} className={cn(BUTTON_BASE, BUTTON_VARIANT.secondary)}>
                {t('home')}
              </Link>
            </div>
          </div>
        ) : (
          <div className={cn('flex flex-col gap-3 md:flex-row', STAGGER[3])}>
            {dueLeft > 0 && group && (
              // A plain link: the same URL through the router would keep this page, and its finished session, mounted.
              <a href={`/${locale}/app/recall?group=${group.id}`} className={cn(BUTTON_BASE, BUTTON_VARIANT.primary)}>
                <ListChecks aria-hidden className="size-4.5 shrink-0" />
                {t('again')}
              </a>
            )}
            <Link href={home} className={cn(BUTTON_BASE, dueLeft > 0 ? BUTTON_VARIANT.secondary : BUTTON_VARIANT.primary)}>
              {t('home')}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/** A ring of the right answers (green) out of the words asked, the wrong ones in red. */
function Ring({ correct, total, label, caption }: { correct: number; total: number; label: string; caption: string }) {
  const r = 70;
  const length = 2 * Math.PI * r;
  const wrongLength = total > 0 ? ((total - correct) / total) * length : 0;
  return (
    <div role="img" aria-label={label} className="relative flex size-40 items-center justify-center">
      <svg aria-hidden viewBox="0 0 160 160" className="absolute inset-0 size-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" className={total > 0 ? 'stroke-wm-pass' : 'stroke-wm-line'} />
        {wrongLength > 0 && <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" className="stroke-wm-fail" strokeDasharray={`${wrongLength} ${length}`} />}
      </svg>
      <span aria-hidden className="flex flex-col items-center">
        <span className="flex items-baseline font-wm-display text-wm-ink">
          <span className="text-wm-lemma">{correct}</span>
          <span className="text-wm-word text-wm-muted">/{total}</span>
        </span>
        <span className="text-wm-meta text-wm-muted">{caption}</span>
      </span>
    </div>
  );
}
