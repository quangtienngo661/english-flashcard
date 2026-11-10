'use client';

import { Check, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { AddFab } from '@/app-chrome/AddFab';
import { PageColumns } from '@/app-chrome/PageColumns';
import { createFormat, useFormat } from '@/app-shell/format';
import { useAppConfig } from '@/app-shell/queries';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';
import { StageBar } from '@/ui/StageBar';
import { mastered, sortForToday, waiting } from '../groups/deck-actions';
import { DeckButtons } from '../groups/DeckButtons';
import { useGroupDialogs } from '../groups/GroupDialogs';
import { GroupStack } from '../groups/GroupStack';
import { useGroups, type GroupSummary } from '../groups/groups-api';
import { STAGE_KEYS } from '../groups/stages';
import { TopicSuggestions } from '../groups/TopicSuggestions';
import { useLastSession, type LastSessionView } from './last-session';
import { QuickAddBox } from './QuickAddBox';

/** Other decks with cards waiting shown as cards (Figma 117:4425 "Nhóm của bạn"); done and empty decks go into one line. */
const TODAY_CARDS = 4;

const LINK = 'text-wm-small-strong text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent';

/** Hôm nay (Figma 117:4425 / 117:4712, design §9 M3): the deck to review next, the last practice, the other decks, topics, the side column. */
export function TodayPage() {
  const t = useTranslations('App.today');
  const tCommon = useTranslations('App.common');
  const format = useFormat();
  const groups = useGroups();
  const { open, dialogs } = useGroupDialogs();
  const sorted = sortForToday(groups.data?.items ?? []);
  const hero = sorted.find((g) => waiting(g) > 0) ?? null;

  return (
    <>
      <div className="mb-5 flex flex-col gap-1.5">
        <p className="font-wm-mono text-wm-mono text-wm-muted">{format.date(new Date(), 'weekdayDayMonth')}</p>
        <h1 className="font-wm-display text-3xl font-extrabold leading-tight tracking-tight text-wm-ink md:text-5xl">{t('title')}</h1>
      </div>
      <PageColumns
        aside={
          <>
            <QuickAddBox />
            {sorted.length > 0 && <TodayAside groups={sorted} />}
          </>
        }
      >
        {groups.isPending ? (
          <div role="status" className="flex flex-col gap-5">
            <span className="sr-only">{tCommon('loading')}</span>
            <Skeleton className="h-64 w-full rounded-wm-2xl" />
            <Skeleton className="h-36 w-full rounded-wm-xl" />
          </div>
        ) : groups.isError ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-wm-xl bg-wm-surface p-6 shadow-wm-card">
            <p className="text-wm-base text-wm-ink">{tCommon('errorPageTitle')}</p>
            <Button variant="secondary" onPress={() => void groups.refetch()}>
              {tCommon('retry')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {sorted.length === 0 ? (
              <section className="flex flex-col items-start gap-3 rounded-wm-xl bg-wm-surface p-6 shadow-wm-card md:p-8">
                <h2 className="font-wm-display text-wm-card-title text-wm-ink">{t('emptyTitle')}</h2>
                <p className="text-wm-base text-wm-muted">{t('emptyBody')}</p>
                <Button size="lg" onPress={() => open({ kind: 'create' })}>
                  {t('createFirst')}
                </Button>
              </section>
            ) : (
              <>
                {hero ? <Hero group={hero} /> : <p className="rounded-wm-xl bg-wm-pass-soft p-5 text-wm-base text-wm-ink">{t('allDone')}</p>}
                <LastPractice groups={sorted} />
                <OtherGroups groups={sorted} hero={hero} />
              </>
            )}
            <TopicSuggestions />
          </div>
        )}
        {dialogs}
      </PageColumns>
      <AddFab />
    </>
  );
}

/** "Ôn tiếp" (Figma 117:4545): border in the deck colour, the three-part bar, Học · Ôn, the big waiting count. */
function Hero({ group }: { group: GroupSummary }) {
  const t = useTranslations('App.today');
  const format = useFormat();
  const tone = groupTone(group.id, group.total);
  const { priority, due, new: fresh } = group.today;
  const legend = [
    ['bg-wm-accent', t('legendPriority', { count: priority })],
    ['bg-wm-ink', t('legendDue', { count: due })],
    ['bg-wm-ghost', t('legendNew', { count: fresh })],
  ] as const;
  return (
    <section
      aria-label={group.name}
      className={cn('flex flex-col gap-4 rounded-wm-2xl border-2 bg-wm-surface p-5 shadow-wm-lift md:flex-row md:items-center md:gap-6 md:p-7', tone.border)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="font-wm-mono text-wm-mono text-wm-muted">{priority > 0 ? t('heroChipPriority') : t('heroChip')}</p>
        <h2 className="font-wm-display text-3xl font-extrabold leading-tight tracking-tight wrap-anywhere text-wm-ink md:text-4xl">{group.name}</h2>
        <p className="text-wm-small text-wm-muted">{t('heroLine', { total: group.total, mastered: mastered(group) })}</p>
        <StageBar
          aria-label={t('heroBar')}
          className="max-w-110"
          segments={[
            { size: priority, fill: priority, tone: 'bg-wm-accent', label: legend[0][1] },
            { size: due, fill: due, tone: 'bg-wm-ink', label: legend[1][1] },
            { size: fresh, fill: fresh, tone: 'bg-wm-ghost', label: legend[2][1] },
          ].filter((s) => s.size > 0)}
        />
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {legend.map(([dot, text]) => (
            <li key={text} className="flex items-center gap-1.5 text-wm-caption text-wm-muted">
              <span aria-hidden className={cn('size-2.25 rounded-wm-xs', dot)} />
              {text}
            </li>
          ))}
        </ul>
        <DeckButtons group={group} className="mt-1" buttonClassName="flex-1 md:w-37 md:flex-none" />
      </div>
      <p className="order-first flex flex-col md:order-none md:items-end">
        <span className={cn('font-wm-display text-6xl font-extrabold leading-none tracking-tight md:text-8xl', tone.ink)}>{format.number(waiting(group))}</span>
        <span className="font-wm-mono text-wm-mono text-wm-muted">{t('heroWaiting')}</span>
      </p>
    </section>
  );
}

/** "Lần luyện gần nhất" (Figma 117:4573): only when the API has a session; an error hides it (Review Focus 2). */
function LastPractice({ groups }: { groups: GroupSummary[] }) {
  const last = useLastSession();
  if (!last.data) return null;
  return <LastPracticeCard last={last.data} groups={groups} />;
}

function LastPracticeCard({ last, groups }: { last: LastSessionView; groups: GroupSummary[] }) {
  const t = useTranslations('App.today');
  const locale = useLocale() as AppLocale;
  // `local_date` is already the learner's day: format it as a plain date, without a zone shift.
  const date = createFormat(locale, 'UTC').date(`${last.local_date}T12:00:00Z`, 'weekdayDayMonth');
  const name = groups.find((g) => g.id === last.group_id)?.name;
  const line = [t('lastLine', { date, count: last.questions }), name].filter(Boolean).join(' · ');
  const wrong = last.questions - last.correct;
  return (
    <section aria-labelledby="last-practice" className="flex flex-col gap-4 rounded-wm-xl border border-wm-line bg-wm-surface p-4 shadow-wm-card md:flex-row md:items-center md:gap-6 md:px-6 md:py-5">
      <div className="flex shrink-0 items-baseline gap-2 md:flex-col md:items-center md:gap-0">
        <span className="font-wm-display text-3xl font-extrabold tracking-tight text-wm-ink">
          {last.correct}/{last.questions}
        </span>
        <span className="font-wm-mono text-wm-mono text-wm-muted">{t('lastCorrect')}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 id="last-practice" className="text-wm-button text-wm-ink">
          {t('lastTitle')}
        </h2>
        <p className="font-wm-mono text-wm-mono text-wm-muted wrap-anywhere">{line}</p>
        <div className="flex items-center gap-3">
          <span role="img" aria-label={t('lastBar', { correct: last.correct, wrong })} className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-wm-sm bg-wm-line">
            <span
              className="h-full bg-wm-pass"
              // raw-ok: the bar is the share of right answers
              style={{ width: `${last.questions ? (last.correct / last.questions) * 100 : 0}%` }}
            />
            <span className="h-full flex-1 bg-wm-fail" />
          </span>
          <span aria-hidden className="flex shrink-0 items-center gap-1 rounded-wm-sm bg-wm-pass-soft px-2 py-0.5 text-wm-label text-wm-pass">
            <Check className="size-3" /> {last.correct}
          </span>
          <span aria-hidden className="flex shrink-0 items-center gap-1 rounded-wm-sm bg-wm-fail-soft px-2 py-0.5 text-wm-label text-wm-fail">
            <X className="size-3" /> {wrong}
          </span>
        </div>
        {last.wrong_lemmas.length > 0 && <p className="text-wm-small text-wm-muted wrap-anywhere">{t('lastWrong', { lemmas: last.wrong_lemmas.join(', ') })}</p>}
      </div>
      <div className="flex shrink-0 gap-5 md:flex-col md:items-end md:gap-2">
        <Link href={`/${locale}/app/practice/weak`} className={LINK}>
          {t('lastRetry')}
        </Link>
        {/* The study calendar comes with M6; until then the old history page (design §9 M3). */}
        <Link href={`/${locale}/app/practice/history`} className={LINK}>
          {t('lastCalendar')}
        </Link>
      </div>
    </section>
  );
}

/** "Nhóm của bạn" on Hôm nay: up to 4 other decks with cards waiting, then one line for decks done today and empty decks. */
function OtherGroups({ groups, hero }: { groups: GroupSummary[]; hero: GroupSummary | null }) {
  const t = useTranslations('App.today');
  const locale = useLocale();
  const others = groups.filter((g) => g !== hero && waiting(g) > 0);
  const done = groups.filter((g) => g.total > 0 && waiting(g) === 0).map((g) => g.name);
  const empty = groups.filter((g) => g.total === 0).map((g) => g.name);
  const note = [done.length > 0 && t('noteDone', { names: done.join(', ') }), empty.length > 0 && t('noteEmpty', { names: empty.join(', ') })].filter(Boolean);
  return (
    <section aria-labelledby="your-groups" className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <h2 id="your-groups" className="font-wm-display text-xl font-bold text-wm-ink md:text-2xl">
          {t('yourGroups')}
        </h2>
        {others.length > 0 && <p className="hidden min-w-0 flex-1 truncate font-wm-mono text-wm-mono text-wm-muted md:block">{t('yourGroupsHint', { count: others.length })}</p>}
        <Link href={`/${locale}/app/groups`} aria-label={t('seeAll', { count: groups.length })} className={cn(LINK, 'ml-auto shrink-0')}>
          <span className="md:hidden">{t('seeAllShort')}</span>
          <span className="hidden md:inline">{t('seeAll', { count: groups.length })}</span>
        </Link>
      </div>
      {others.length > 0 && (
        <ul aria-label={t('yourGroups')} className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-3 md:mx-0 md:gap-5 md:px-0">
          {others.slice(0, TODAY_CARDS).map((g) => (
            <li key={g.id} className="shrink-0">
              <GroupStack group={g} size="today" depth={2} href={`/${locale}/app/group?id=${g.id}`} />
            </li>
          ))}
        </ul>
      )}
      {note.length > 0 && <p className="text-wm-small text-wm-muted wrap-anywhere">{note.join(' · ')}</p>}
    </section>
  );
}

/** Square colours of "Từ theo ngăn" (M3 Figma A §5): the stage dots, stage 5 flat. */
const STAGE_SQUARE = ['bg-wm-stage-0-dot', 'bg-wm-stage-1-dot', 'bg-wm-stage-2-dot', 'bg-wm-stage-3-dot', 'bg-wm-stage-4-dot', 'bg-wm-stage-5-solid'] as const;

/** Side column: words waiting too long (the deck with most) and every word by stage. */
function TodayAside({ groups }: { groups: GroupSummary[] }) {
  const t = useTranslations('App.today');
  const tStage = useTranslations('App.stages');
  const locale = useLocale();
  const format = useFormat();
  const days = useAppConfig().data?.learning.backlog_after_days;
  const backlog = [...groups].sort((a, b) => b.backlog - a.backlog)[0];
  const stages = STAGE_KEYS.map((key, level) => ({
    key,
    level,
    total: groups.reduce((sum, g) => sum + (g.cells[level]?.total ?? 0), 0),
    due: groups.reduce((sum, g) => sum + (g.cells[level]?.due ?? 0), 0),
  }));
  const words = stages.reduce((sum, s) => sum + s.total, 0);
  return (
    <>
      {backlog && backlog.backlog > 0 && days !== undefined && (
        <section aria-label={t('backlogTitle', { count: backlog.backlog })} className="flex items-center gap-4 rounded-wm-xl border border-wm-line bg-wm-surface p-4 shadow-wm-card md:p-6">
          <span className="font-wm-display text-5xl font-extrabold leading-none tracking-tight text-wm-fail">{format.number(backlog.backlog)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-wm-button text-wm-ink">{t('backlogLabel')}</p>
            <p className="text-wm-caption text-wm-muted wrap-anywhere">{t('backlogLine', { name: backlog.name, days })}</p>
          </div>
          <Link href={`/${locale}/app/group/backlog?id=${backlog.id}`} className={cn(LINK, 'shrink-0')}>
            {t('see')}
          </Link>
        </section>
      )}
      <section aria-labelledby="by-stage" className="flex flex-col gap-2 rounded-wm-xl border border-wm-line bg-wm-surface p-4 shadow-wm-card md:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="by-stage" className="font-wm-display text-base font-bold text-wm-ink">
            {t('stagesTitle', { count: words })}
          </h2>
          <span className="font-wm-mono text-wm-mono text-wm-muted">{t('stagesHint')}</span>
        </div>
        <ul className="flex flex-col gap-3">
          {stages.map((s) => (
            <li key={s.key} className="flex items-center gap-3 text-wm-caption text-wm-ink">
              <span className="flex w-21 shrink-0 items-center gap-2">
                <span aria-hidden className={cn('size-2.25 shrink-0 rounded-wm-xs', STAGE_SQUARE[s.level])} />
                {tStage(s.key)}
              </span>
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-wm-sm bg-wm-line">
                <span
                  className={cn('block h-full', STAGE_SQUARE[s.level])}
                  // raw-ok: bar width is the share of due cards in the stage
                  style={{ width: `${s.total ? Math.round((s.due / s.total) * 100) : 0}%` }}
                />
              </span>
              <span className="w-14 shrink-0 text-right font-wm-mono text-wm-mono text-wm-muted">
                {s.due} / {s.total}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
