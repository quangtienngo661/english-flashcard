'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useId, useState } from 'react';
import { Heading } from 'react-aria-components';
import { createFormat } from '@/app-shell/format';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { addDays } from '@/lib/learner-date';
import { Card } from '@/ui/Card';
import { LevelChip } from '@/ui/LevelChip';
import { Skeleton } from '@/ui/Skeleton';
import { ErrorState } from '@/ui/States';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import { useGroups } from '../groups/groups-api';
import { wordHref } from '../word/word-api';
import { useCalendarDay, type DayItem } from './calendar-api';
import { FIRST_MONTH } from './calendar-params';
import { CalendarModal } from './CalendarModal';
import { dayView } from './day-view';

export type DayDialogProps = {
  date: string;
  today: string;
  /** Replaces `?ngay=` (no new history step). */
  onDay: (date: string) => void;
  onBack: () => void;
  onClose: () => void;
};

type Filter = 'all' | 'learn' | 'review';
const FIRST_DAY = `${FIRST_MONTH}-01`;
const CHIPS = 10;
const ICON_BUTTON =
  'flex size-8.5 shrink-0 items-center justify-center rounded-wm-control border border-wm-line bg-wm-surface text-wm-ink outline-none transition-colors duration-150 md:size-9 ' +
  'hover:bg-wm-bg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent disabled:cursor-not-allowed disabled:opacity-35';
const CARD = 'flex flex-col gap-3 border border-wm-line p-4 md:p-4';
// Figma 103:4044 sizes no text token has: date 30 / 24, card title 17, the Ôn counts 16.
const RAW = {
  // raw-ok: as above
  date: 'text-[1.5rem] leading-[1.05] tracking-[-0.02em] md:text-[1.875rem]',
  // raw-ok: as above
  cardTitle: 'text-[1.0625rem]',
  // raw-ok: as above, "16" / "6" of the Ôn card
  count: 'text-[1rem]',
} as const;

/** The day's numbers in its own words: parts at 0 are left out (prototype). */
function useSummary() {
  const t = useTranslations('App.calendar.day');
  return (counts: { learned: number; reviewed: number; practice_questions: number }) =>
    [
      counts.learned > 0 ? t('sumLearned', { count: counts.learned }) : null,
      counts.reviewed > 0 ? t('sumReviewed', { count: counts.reviewed }) : null,
      counts.practice_questions > 0 ? t('sumPractice', { count: counts.practice_questions }) : null,
    ].filter(Boolean).join(' · ');
}

/**
 * Hộp Ngày (Figma 103:3820 / 103:4248, M6 Figma A §4–§5): back to Lịch, previous and next day, the date and its counts, a client-side
 * filter, and the Học and Ôn cards. Practice is only counted in the summary line (owner f19, 13/11/2026): no filter, no card.
 */
export function DayDialog({ date, today, onDay, onBack, onClose }: DayDialogProps) {
  const t = useTranslations('App.calendar.day');
  const locale = useLocale() as AppLocale;
  const summary = useSummary();
  const future = date > today;
  const day = useCalendarDay(date, !future);
  const [filter, setFilter] = useState<Filter>('all');
  const [shownDate, setShownDate] = useState(date);
  if (shownDate !== date) {
    setShownDate(date);
    setFilter('all');
  }

  const at = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  const weekday = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', timeZone: 'UTC' }).format(at).toLowerCase();
  const monthName = locale === 'vi' ? Number(date.slice(5, 7)) : new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(at);
  // T24, QA11: en through Intl ("Nov 13"); vi keeps "05/11" (Figma 103:3820), which vi-VN's 2-digit Intl writes "05-11".
  const dayMonth = locale === 'vi' ? `${date.slice(8, 10)}/${date.slice(5, 7)}` : createFormat(locale, 'UTC').date(`${date}T00:00:00Z`, 'dayMonth');
  const first = day.data?.pages[0];
  const empty = first ? first.counts.learned + first.counts.reviewed + first.counts.practice_questions === 0 && first.practice_sessions.length === 0 : false;
  // T25: one persistent line says which day is shown and its numbers; empty while the day loads.
  const detail = future ? t('future') : first ? summary(first.counts) || (empty ? t('none') : '') : null;
  const announce = detail === null ? '' : [`${weekday} ${dayMonth}`, detail].filter(Boolean).join(': ');

  return (
    <CalendarModal size="day" onDismiss={onBack}>
      <div className="flex items-center gap-2 px-3 pt-1 md:px-6 md:pt-5">
        <button type="button" onClick={onBack} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'gap-1 pr-2')}>
          <ChevronLeft aria-hidden className="size-4" />
          {t('back', { month: monthName })}
        </button>
        <span className="flex-1" />
        <button type="button" aria-label={t('prev')} className={ICON_BUTTON} disabled={date <= FIRST_DAY} onClick={() => onDay(addDays(date, -1))}>
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <button type="button" aria-label={t('next')} className={ICON_BUTTON} disabled={date >= today} onClick={() => onDay(addDays(date, 1))}>
          <ChevronRight aria-hidden className="size-4" />
        </button>
        <button type="button" aria-label={t('close')} className={ICON_BUTTON} onClick={onClose}>
          <X aria-hidden className="size-4.5" />
        </button>
      </div>

      <p role="status" className="sr-only">{announce}</p>
      <div key={date} className="flex flex-col gap-4 px-4 pb-6 pt-2 motion-safe:animate-wm-overlay-in md:px-7 md:pb-7">
        <div className="flex flex-col gap-1">
          <span className="text-wm-meta text-wm-muted">{date === today ? t('todaySuffix', { weekday }) : weekday}</span>
          <Heading slot="title" className={cn('font-wm-display font-extrabold text-wm-ink', RAW.date)}>{dayMonth}</Heading>
          {first && <p className="font-wm-sans text-wm-small text-wm-muted">{summary(first.counts)}</p>}
        </div>

        {future ? (
          <Empty text={t('future')} />
        ) : day.isError ? (
          <ErrorState message={t('error')} onRetry={() => void day.refetch()} />
        ) : !first ? (
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">{t('loading')}</span>
            <Skeleton className="h-9 w-72 rounded-wm-control" />
            <Skeleton className="h-32 w-full rounded-wm-card" />
            <Skeleton className="h-40 w-full rounded-wm-card" />
          </div>
        ) : empty ? (
          <Empty text={t('none')} />
        ) : (
          <DayBody
            filter={filter}
            setFilter={setFilter}
            counts={first.counts}
            view={dayView(day.data?.pages ?? [])}
            moreItems={day.hasNextPage ? () => day.fetchNextPage() : null}
            locale={locale}
          />
        )}
      </div>
    </CalendarModal>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-wm-row border border-dashed border-wm-line bg-wm-surface p-4.5 font-wm-sans text-wm-small text-wm-muted">{text}</p>;
}

function DayBody({ filter, setFilter, counts, view, moreItems, locale }: {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  counts: { learned: number; reviewed: number; reviewed_known: number; reviewed_again: number; learned_groups: number; practice_questions: number };
  view: ReturnType<typeof dayView>;
  moreItems: (() => Promise<unknown>) | null;
  locale: AppLocale;
}) {
  const t = useTranslations('App.calendar.day');
  const groups = useGroups();
  const totals = new Map((groups.data?.items ?? []).map((g) => [g.id, g.total]));
  const tone = (groupId: string | null) => (groupId ? groupTone(groupId, totals.get(groupId) ?? 1).bg : null);
  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: t('all'), count: counts.learned + counts.reviewed },
    { id: 'learn', label: t('filterLearn'), count: counts.learned },
    { id: 'review', label: t('filterReview'), count: counts.reviewed },
  ];
  const show = (section: Filter) => filter === 'all' || filter === section;
  const learnShown = show('learn') && view.learned.length > 0;
  const reviewShown = show('review') && view.known.length + view.again.length > 0;
  return (
    <>
      <div role="group" aria-label={t('filterLabel')} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <LevelChip key={tab.id} tone="all" label={tab.label} count={tab.count} pressed={filter === tab.id} isDisabled={tab.count === 0} onPress={() => setFilter(tab.id)} />
        ))}
      </div>

      {learnShown && (
        <Section title={t('learnTitle', { count: counts.learned })} hint={t('learnHint', { count: counts.learned_groups })} dot="bg-wm-accent">
          <Chips items={view.learned} tone={tone} locale={locale} more={moreItems} />
        </Section>
      )}
      {reviewShown && (
        <Section title={t('reviewTitle', { count: counts.reviewed })} hint={t('reviewHint')} dot="bg-wm-pass">
          {view.known.length > 0 && (
            <>
              <p className="flex items-baseline gap-2 font-wm-sans text-wm-label font-normal text-wm-muted">
                <span className={cn('font-wm-display font-bold text-wm-pass', RAW.count)}>{counts.reviewed_known}</span>
                {t('known')}
              </p>
              <Chips items={view.known} tone={tone} locale={locale} more={moreItems} />
            </>
          )}
          {view.again.length > 0 && (
            <>
              <p className="flex items-baseline gap-2 font-wm-sans text-wm-label font-normal text-wm-muted">
                <span className={cn('font-wm-display font-bold text-wm-fail', RAW.count)}>{counts.reviewed_again}</span>
                {t('again')}
              </p>
              <Chips items={view.again} tone={tone} locale={locale} more={moreItems} again />
            </>
          )}
        </Section>
      )}
      {!learnShown && !reviewShown && <Empty text={t('sectionNone')} />}
    </>
  );
}

function Section({ title, hint, dot, children }: { title: string; hint?: string; dot: string; children: React.ReactNode }) {
  const headingId = useId();
  return (
    <Card as="section" labelledBy={headingId} className={CARD}>
      <div className="flex items-center gap-2">
        <span aria-hidden className={cn('size-2.25 shrink-0 rounded-full', dot)} />
        <h3 id={headingId} className={cn('min-w-0 flex-1 font-wm-display font-bold text-wm-ink', RAW.cardTitle)}>{title}</h3>
        {hint && <span className="shrink-0 text-wm-meta text-wm-muted">{hint}</span>}
      </div>
      {children}
    </Card>
  );
}

function Chips({ items, tone, locale, more, again = false }: {
  items: DayItem[];
  tone: (groupId: string | null) => string | null;
  locale: AppLocale;
  more: (() => Promise<unknown>) | null;
  again?: boolean;
}) {
  const t = useTranslations('App.calendar.day');
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, CHIPS);
  const hidden = items.length - shown.length;
  const chip = cn('flex items-center gap-1.5 rounded-wm-key px-2 py-1', again ? 'bg-wm-fail-soft' : 'bg-wm-bg');
  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {shown.map((item) => {
        const square = tone(item.group_id);
        return (
          <li key={`${item.kind}-${item.item_id}`} className={chip}>
            {square && <span aria-hidden className={cn('size-1.75 shrink-0 rounded-wm-key', square)} />}
            {item.lemma ? (
              <Link href={wordHref(locale, item.lemma)} className="font-wm-display text-wm-small font-bold text-wm-ink outline-none hover:underline focus-visible:outline-3 focus-visible:outline-wm-accent">
                {item.lemma}
              </Link>
            ) : (
              <span className="font-wm-sans text-wm-small text-wm-muted">{t('lemmaGone')}</span>
            )}
          </li>
        );
      })}
      {!open && (hidden > 0 || more) && (
        <li>
          <button
            type="button"
            className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.muted, 'px-1')}
            onClick={() => {
              setOpen(true);
              if (more) void more();
            }}
          >
            {t('more', { count: hidden })}
          </button>
        </li>
      )}
    </ul>
  );
}
