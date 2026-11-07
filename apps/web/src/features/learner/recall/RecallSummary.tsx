'use client';

import { Layers2, ListChecks } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { useGroups } from '../groups/groups-api';
import type { PracticeSessionView } from '../practice/practice-api';
import { useSummary } from '../practice/session/SessionSummary';
import { STAGGER } from '../review/ReviewSummary';

const ACTION = 'flex min-h-control-touch items-center justify-center gap-2 rounded-inner px-4.5 text-body font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary';
const PRIMARY = `${ACTION} bg-accent text-on-accent shadow-ledge-accent`;
const SECONDARY = `${ACTION} border-2 border-border-strong bg-surface text-ink shadow-button-secondary`;

/**
 * Đợt C §4.4, mockup "Xong phiên Ôn": how many words, then right-and-moved-up, wrong, Cần ôn lại (and right-but-kept when a word was
 * not due yet). The next step follows the deck: new words left → Học; due words left → Ôn tiếp; otherwise home.
 */
export function RecallSummary({ session }: { session: PracticeSessionView }) {
  const t = useTranslations('App.recall');
  const tDeck = useTranslations('App.deck');
  const locale = useLocale();
  const errorText = useErrorMessage();
  const summary = useSummary(session.id);
  const group = useGroups().data?.items.find((g) => g.id === session.group_id);
  if (summary.isPending) return <FullScreenSpinner />;
  if (summary.isError) return <ErrorState message={errorText(summary.error)} onRetry={() => void summary.refetch()} />;
  const data = summary.data;
  const recall = data.recall ?? { leveled_up: 0, correct_kept: 0 };
  const needsReview = data.words.filter((w) => w.action === 'needs_review').length;
  const tiles: Array<{ label: string; value: number; tone: string }> = [
    { label: t('leveledUp'), value: recall.leveled_up, tone: 'text-success' },
    ...(recall.correct_kept > 0 ? [{ label: t('correctKept'), value: recall.correct_kept, tone: 'text-primary' }] : []),
    { label: t('wrongKept'), value: data.wrong, tone: 'text-ink' },
    { label: t('needsReview'), value: needsReview, tone: 'text-warning' },
  ];
  const newLeft = group?.today.new ?? 0;
  const dueLeft = group ? group.today.priority + group.today.due : 0;
  const home = `/${locale}/app`;
  return (
    <section className="flex w-full flex-col gap-5">
      <h1 className={cn('text-display font-extrabold text-ink', STAGGER[0])}>{t('doneTitle', { count: data.asked })}</h1>
      <div className={cn('grid gap-3', tiles.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3', STAGGER[1])}>
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 rounded-card bg-surface p-4 shadow-ledge-soft">
            <span className={cn('text-h2 font-extrabold tabular-nums', tile.tone)}>{tile.value}</span>
            <span className="text-ui text-ink">{tile.label}</span>
          </div>
        ))}
      </div>
      {newLeft > 0 && group ? (
        <div className={cn('flex flex-col gap-3 rounded-card border border-border bg-surface p-5', STAGGER[2])}>
          <div>
            <h2 className="text-title font-semibold text-ink">{t('newLeftTitle', { count: newLeft })}</h2>
            <p className="text-ui text-muted">{t('newLeftBody')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/${locale}/app/review?group=${group.id}&mode=new`} className={PRIMARY}>
              <Layers2 aria-hidden className="size-5 shrink-0" />
              {tDeck('learn')}
            </Link>
            <Link href={home} className={SECONDARY}>
              {t('home')}
            </Link>
          </div>
        </div>
      ) : (
        <div className={cn('grid gap-3 sm:grid-cols-2 md:max-w-xl', STAGGER[2])}>
          {dueLeft > 0 && group && (
            // A plain link: the same URL through the router would keep this page, and its finished session, mounted.
            <a href={`/${locale}/app/recall?group=${group.id}`} className={PRIMARY}>
              <ListChecks aria-hidden className="size-5 shrink-0" />
              {t('again')}
            </a>
          )}
          <Link href={home} className={dueLeft > 0 ? SECONDARY : PRIMARY}>
            {t('home')}
          </Link>
        </div>
      )}
    </section>
  );
}
