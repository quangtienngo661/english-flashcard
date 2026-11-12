'use client';

import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heading } from 'react-aria-components';
import { useFormat } from '@/app-shell/format';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { addDays } from '@/lib/learner-date';
import { Skeleton } from '@/ui/Skeleton';
import { ErrorState } from '@/ui/States';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import { useGroups } from '../groups/groups-api';
import type { HistoryItem } from '../practice/practice-api';
import { wordHref } from '../word/word-api';
import { useCalendarDay, useDayAnswers, type DayItem, type PracticeSessionOfDay } from './calendar-api';
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

type Filter = 'all' | 'learn' | 'review' | 'practice';
const FIRST_DAY = `${FIRST_MONTH}-01`;
const CHIPS = 10;
const ROWS = 5;
const ICON_BUTTON =
  'flex size-8.5 shrink-0 items-center justify-center rounded-wm-control border border-wm-line bg-wm-surface text-wm-ink outline-none transition-colors duration-150 md:size-9 ' +
  'hover:bg-wm-bg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent disabled:cursor-not-allowed disabled:opacity-35';
const CARD = 'flex flex-col gap-3 rounded-wm-card border border-wm-line bg-wm-surface p-4 shadow-wm-card';
// Figma 103:4044 sizes no text token has: date 30 / 24, card title 17, chip and answer lemma 14 / 15, score 20.
const RAW = {
  // raw-ok: as above
  date: 'text-[1.5rem] leading-[1.05] tracking-[-0.02em] md:text-[1.875rem]',
  // raw-ok: as above
  cardTitle: 'text-[1.0625rem]',
  // raw-ok: as above
  lemma: 'text-[0.9375rem]',
  // raw-ok: as above
  score: 'text-[1.25rem]',
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
 * filter, and the Học, Ôn and Luyện tập cards. Practice answers come from `GET /v1/practice/history?date=` and are grouped by session;
 * "Xem đủ N câu" loads history pages until that session's answers of the day are all in.
 */
export function DayDialog({ date, today, onDay, onBack, onClose }: DayDialogProps) {
  const t = useTranslations('App.calendar.day');
  const locale = useLocale() as AppLocale;
  const format = useFormat();
  const summary = useSummary();
  const future = date > today;
  const day = useCalendarDay(date, !future);
  const answers = useDayAnswers(date, !future);
  const [filter, setFilter] = useState<Filter>('all');
  const [shownDate, setShownDate] = useState(date);
  if (shownDate !== date) {
    setShownDate(date);
    setFilter('all');
  }

  const at = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  const weekday = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', timeZone: 'UTC' }).format(at).toLowerCase();
  const monthName = locale === 'vi' ? Number(date.slice(5, 7)) : new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(at);
  const dayMonth = `${date.slice(8, 10)}/${date.slice(5, 7)}`;
  const first = day.data?.pages[0];

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

      <div key={date} aria-live="polite" className="flex flex-col gap-4 px-4 pb-6 pt-2 motion-safe:animate-wm-overlay-in md:px-7 md:pb-7">
        <div className="flex flex-col gap-1">
          <span className="text-wm-meta text-wm-muted">{date === today ? t('todaySuffix', { weekday }) : weekday}</span>
          <Heading slot="title" className={cn('font-wm-display font-extrabold text-wm-ink', RAW.date)}>{dayMonth}</Heading>
          {first && <p className="font-wm-sans text-wm-small text-wm-muted">{summary(first.counts)}</p>}
        </div>

        {future ? (
          <Empty text={t('future')} />
        ) : day.isError || answers.isError ? (
          <ErrorState message={t('error')} onRetry={() => void Promise.all([day.refetch(), answers.refetch()])} />
        ) : !first || !answers.data ? (
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">{t('loading')}</span>
            <Skeleton className="h-9 w-72 rounded-wm-control" />
            <Skeleton className="h-32 w-full rounded-wm-card" />
            <Skeleton className="h-40 w-full rounded-wm-card" />
          </div>
        ) : first.counts.learned + first.counts.reviewed + first.counts.practice_questions === 0 && first.practice_sessions.length === 0 ? (
          <Empty text={t('none')} />
        ) : (
          <DayBody
            filter={filter}
            setFilter={setFilter}
            counts={first.counts}
            view={dayView(day.data?.pages ?? [], answers.data.pages.map((page) => page.items))}
            moreItems={day.hasNextPage ? () => day.fetchNextPage() : null}
            answersLeft={answers.hasNextPage}
            loadAnswers={() => answers.fetchNextPage()}
            locale={locale}
            time={format.time}
          />
        )}
      </div>
    </CalendarModal>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-wm-row border border-dashed border-wm-line bg-wm-surface p-4.5 font-wm-sans text-wm-small text-wm-muted">{text}</p>;
}

function DayBody({ filter, setFilter, counts, view, moreItems, answersLeft, loadAnswers, locale, time }: {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  counts: { learned: number; reviewed: number; reviewed_known: number; reviewed_again: number; learned_groups: number; practice_questions: number };
  view: ReturnType<typeof dayView>;
  moreItems: (() => Promise<unknown>) | null;
  answersLeft: boolean;
  loadAnswers: () => Promise<unknown>;
  locale: AppLocale;
  time: (at: string) => string;
}) {
  const t = useTranslations('App.calendar.day');
  const groups = useGroups();
  const totals = new Map((groups.data?.items ?? []).map((g) => [g.id, g.total]));
  const tone = (groupId: string | null) => (groupId ? groupTone(groupId, totals.get(groupId) ?? 1).bg : null);
  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: t('all'), count: 1 },
    { id: 'learn', label: t('filterLearn', { count: counts.learned }), count: counts.learned },
    { id: 'review', label: t('filterReview', { count: counts.reviewed }), count: counts.reviewed },
    { id: 'practice', label: t('filterPractice', { count: counts.practice_questions }), count: counts.practice_questions },
  ];
  const show = (section: Filter) => filter === 'all' || filter === section;
  const learnShown = show('learn') && view.learned.length > 0;
  const reviewShown = show('review') && view.known.length + view.again.length > 0;
  const practiceShown = show('practice') && view.sessions.length > 0;
  return (
    <>
      <div role="group" aria-label={t('filterLabel')} className="flex w-fit flex-wrap gap-0.5 rounded-wm-row border border-wm-line bg-wm-surface p-0.75">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={filter === tab.id}
            disabled={tab.count === 0}
            onClick={() => setFilter(tab.id)}
            className={cn(
              'rounded-wm-control px-3 py-1.5 font-wm-sans text-wm-label font-semibold outline-none transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-wm-accent disabled:cursor-not-allowed disabled:opacity-40',
              filter === tab.id ? 'bg-wm-ink text-wm-surface' : 'text-wm-muted enabled:hover:text-wm-ink',
            )}
          >
            {tab.label}
          </button>
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
      {practiceShown && (
        <Section
          title={t('practiceTitle', { count: view.sessions.length })}
          hint={view.sessions.length === 1 ? t('practiceRange', { first: view.sessions[0].session.first_position, last: view.sessions[0].session.last_position }) : undefined}
          dot="bg-wm-practice"
        >
          {view.sessions.map(({ session, answers }) => (
            <SessionBlock
              key={session.session_id}
              session={session}
              answers={answers}
              hint={view.sessions.length > 1 ? t('practiceRange', { first: session.first_position, last: session.last_position }) : null}
              answersLeft={answersLeft}
              loadAnswers={loadAnswers}
              time={time}
            />
          ))}
        </Section>
      )}
      {!learnShown && !reviewShown && !practiceShown && <Empty text={t('sectionNone')} />}
    </>
  );
}

function Section({ title, hint, dot, children }: { title: string; hint?: string; dot: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className={CARD}>
      <div className="flex items-center gap-2">
        <span aria-hidden className={cn('size-2.25 shrink-0 rounded-full', dot)} />
        <h3 className={cn('min-w-0 flex-1 font-wm-display font-bold text-wm-ink', RAW.cardTitle)}>{title}</h3>
        {hint && <span className="shrink-0 text-wm-meta text-wm-muted">{hint}</span>}
      </div>
      {children}
    </section>
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

function SessionBlock({ session, answers, hint, answersLeft, loadAnswers, time }: {
  session: PracticeSessionOfDay;
  answers: HistoryItem[];
  hint: string | null;
  answersLeft: boolean;
  loadAnswers: () => Promise<unknown>;
  time: (at: string) => string;
}) {
  const t = useTranslations('App.calendar.day');
  const [open, setOpen] = useState(false);
  const wrong = session.questions - session.correct;
  // Expanded: keep loading history pages until this session's answers of the day are all in.
  useEffect(() => {
    if (open && answersLeft && answers.length < session.questions) void loadAnswers();
  }, [open, answersLeft, answers.length, session.questions, loadAnswers]);
  const rows = open ? answers : answers.slice(0, ROWS);
  const passShare = session.questions > 0 ? (session.correct / session.questions) * 100 : 0;
  const passWidth = { width: `${passShare}%` };
  return (
    <div className="flex flex-col gap-2 border-wm-line not-first:border-t not-first:pt-3">
      {hint && <span className="text-wm-meta text-wm-muted">{hint}</span>}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-baseline gap-1.5">
          <span className={cn('font-wm-display font-extrabold text-wm-ink', RAW.score)}>{`${session.correct}/${session.questions}`}</span>
          <span className="font-wm-sans text-wm-label font-normal text-wm-muted">{t('score')}</span>
        </span>
        <span aria-hidden className="flex h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-wm-fail">
          {
            // raw-ok: the share of right answers is data, not a design value
            <span className="h-full bg-wm-pass" style={passWidth} />
          }
        </span>
        <span className="flex items-center gap-1 rounded-wm-key bg-wm-pass-soft py-0.75 pl-1.5 pr-2 font-wm-sans text-wm-label font-bold text-wm-pass">
          <Check aria-hidden className="size-3" />
          <span aria-hidden>{session.correct}</span>
          <span className="sr-only">{t('rightCount', { count: session.correct })}</span>
        </span>
        <span className="flex items-center gap-1 rounded-wm-key bg-wm-fail-soft py-0.75 pl-1.5 pr-2 font-wm-sans text-wm-label font-bold text-wm-fail">
          <X aria-hidden className="size-3" />
          <span aria-hidden>{wrong}</span>
          <span className="sr-only">{t('wrongCount', { count: wrong })}</span>
        </span>
      </div>
      <ul className="flex flex-col">
        {rows.map((item) => (
          <li key={item.item_id} className="flex items-center gap-3 border-wm-line py-2 not-first:border-t">
            <span className="w-11 shrink-0 text-wm-meta text-wm-muted">{time(item.answered_at)}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={cn('break-words font-wm-display font-bold text-wm-ink', RAW.lemma)}>{item.lemma}</span>
              <span className="break-words font-wm-sans text-wm-caption font-normal text-wm-muted">{answerLine(item, t)}</span>
            </span>
            <span
              className={cn('flex size-5.5 shrink-0 items-center justify-center rounded-wm-key', item.result === 'correct' ? 'bg-wm-pass-soft text-wm-pass' : 'bg-wm-fail-soft text-wm-fail')}
            >
              {item.result === 'correct' ? <Check aria-hidden className="size-3" /> : <X aria-hidden className="size-3" />}
              <span className="sr-only">{t(item.result === 'correct' ? 'resultRight' : 'resultWrong')}</span>
            </span>
          </li>
        ))}
      </ul>
      {!open && session.questions > ROWS && (
        <button type="button" className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'w-fit')} onClick={() => setOpen(true)}>
          {t('showAll', { count: session.questions })}
        </button>
      )}
    </div>
  );
}

type Translate = ReturnType<typeof useTranslations<'App.calendar.day'>>;

/** "bạn trả lời …", with the right answer when it was wrong (prototype). */
function answerLine(item: HistoryItem, t: Translate): string {
  const correct = item.correct.text;
  if (item.skipped) return t('skipped', { correct });
  const options = item.prompt.options;
  let given = item.answer ?? '';
  if (options && item.answer !== null && /^\d$/.test(item.answer)) given = options[Number(item.answer)] ?? item.answer;
  else if (item.type === 'true_false_definition' && (item.answer === 'true' || item.answer === 'false')) given = t(item.answer === 'true' ? 'trueLabel' : 'falseLabel');
  return item.result === 'correct' ? t('answered', { answer: given }) : t('answeredWrong', { answer: given, correct });
}
