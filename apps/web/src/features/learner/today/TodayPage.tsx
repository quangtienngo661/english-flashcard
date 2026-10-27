'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useAppConfig } from '@/app-shell/queries';
import { Button } from '@/app-ui/Button';
import { ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { GroupCard, sortForToday, waiting } from '../groups/GroupCard';
import { useGroupDialogs } from '../groups/GroupDialogs';
import { useGroups, type GroupSummary } from '../groups/groups-api';
import { TopicSuggestions } from '../groups/TopicSuggestions';
import { QuickAddBox } from './QuickAddBox';
import { STAGE_KEYS } from '../groups/stages';

/** Owner 27/10/2026: Today lists only the first decks (decks with cards waiting first); [Xem tất cả] opens the deck list. */
const TODAY_DECKS = 6;

/** K/10, K/10b, K/94: the deck to review next, the first decks, topic suggestions, and the side column. */
export function TodayPage() {
  const t = useTranslations('App.today');
  const locale = useLocale();
  const format = useFormat();
  const errorText = useErrorMessage();
  const groups = useGroups();
  const { open, dialogs } = useGroupDialogs();
  const sorted = sortForToday(groups.data?.items ?? []);
  const hero = sorted.find((g) => waiting(g) > 0) ?? null;
  const actions = {
    onRename: (g: GroupSummary) => open({ kind: 'rename', group: g }),
    onDelete: (g: GroupSummary) => open({ kind: 'delete', group: g }),
  };

  return (
    <AppShell
      variant="main"
      fab
      aside={
        <>
          <QuickAddBox />
          {sorted.length > 0 && <TodayAside groups={sorted} />}
        </>
      }
    >
      <PageTitle aside={<span className="rounded-full bg-surface px-3 py-1 text-caption font-semibold text-ink">{format.date(new Date(), 'weekdayDayMonth')}</span>}>
        {t('title')}
      </PageTitle>
      {groups.isPending ? (
        <FullScreenSpinner />
      ) : groups.isError ? (
        <ErrorState message={errorText(groups.error)} onRetry={() => void groups.refetch()} />
      ) : (
        <div className="flex flex-col gap-8">
          {sorted.length === 0 ? (
            <section className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6 md:p-8">
              <h2 className="text-h3 font-bold text-ink">{t('emptyTitle')}</h2>
              <p className="text-body text-muted">{t('emptyBody')}</p>
              <Button variant="sticker" size="lg" onPress={() => open({ kind: 'create' })}>
                {t('createFirst')}
              </Button>
            </section>
          ) : (
            <>
              {hero ? <Hero group={hero} /> : <p className="rounded-card bg-success-soft p-5 text-body text-ink">{t('allDone')}</p>}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="your-groups" className="flex items-center gap-2 text-title font-semibold text-ink">
                    {t('yourGroups')}
                    <span className="rounded-full bg-surface px-2 py-0.5 text-caption font-medium text-muted">{t('groupCount', { count: sorted.length })}</span>
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="quiet" onPress={() => open({ kind: 'create' })}>
                      {t('createGroup')}
                    </Button>
                    {sorted.length > TODAY_DECKS && (
                      <Link
                        href={`/${locale}/app/groups`}
                        className="flex min-h-control items-center rounded-inner px-3 text-ui font-semibold text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {t('seeAll')}
                      </Link>
                    )}
                  </div>
                </div>
                <ul aria-label={t('yourGroups')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {sorted.slice(0, TODAY_DECKS).map((group, i) => (
                    <GroupCard key={group.id} group={group} index={i} actions={actions} />
                  ))}
                </ul>
              </section>
            </>
          )}
          <TopicSuggestions />
        </div>
      )}
      {dialogs}
    </AppShell>
  );
}

/** The first deck with cards waiting (K/10 big card). */
function Hero({ group }: { group: GroupSummary }) {
  const t = useTranslations('App.today');
  const locale = useLocale();
  const count = waiting(group);
  const review = `/${locale}/app/review?group=${group.id}`;
  return (
    // Owner 27/10/2026: the same deep navy card as Hôm nay on Luyện tập.
    <section aria-label={group.name} className="flex flex-col gap-4 rounded-card border-b-4 border-primary bg-navy-card p-5 text-on-navy md:p-7">
      <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-on-accent">
        {group.today.priority > 0 ? t('heroChipPriority') : t('heroChip')}
      </span>
      <div>
        <h2 className="break-words text-h2 font-extrabold text-on-navy">{group.name}</h2>
        <p className="text-ui text-on-navy-muted">{t('heroLine', { waiting: count, total: group.total })}</p>
      </div>
      <dl className="grid max-w-md grid-cols-3 gap-3">
        {(
          [
            ['priority', group.today.priority, 'bg-accent'],
            ['due', group.today.due, 'bg-primary'],
            ['new', group.today.new, 'bg-on-navy-muted'],
          ] as const
        ).map(([key, value, dot]) => (
          <div key={key} className="flex flex-col rounded-inner bg-navy-raised px-3 py-2.5">
            <dd className="text-title font-bold text-on-navy">{value}</dd>
            <dt className="flex items-center gap-1.5 text-caption text-on-navy-muted">
              <span aria-hidden className={`size-2 rounded-full ${dot}`} />
              {t(key)}
            </dt>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-4">
        <Link href={review} className="flex min-h-control-touch items-center rounded-inner bg-accent px-6 text-body font-semibold text-on-accent shadow-ledge-accent">
          {t('review', { count })}
        </Link>
        <Link href={`${review}&mode=all`} className="text-ui font-semibold text-on-navy underline underline-offset-2">
          {t('studyAll', { total: group.total })}
        </Link>
      </div>
    </section>
  );
}

/** Side column of K/10: words waiting too long (the deck with most), and every word by stage. */
function TodayAside({ groups }: { groups: GroupSummary[] }) {
  const t = useTranslations('App.today');
  const tStage = useTranslations('App.stages');
  const locale = useLocale();
  const days = useAppConfig().data?.learning.backlog_after_days;
  const backlog = [...groups].sort((a, b) => b.backlog - a.backlog)[0];
  const stages = STAGE_KEYS.map((key, level) => ({
    key,
    total: groups.reduce((sum, g) => sum + (g.cells[level]?.total ?? 0), 0),
    due: groups.reduce((sum, g) => sum + (g.cells[level]?.due ?? 0), 0),
  }));
  const words = stages.reduce((sum, s) => sum + s.total, 0);
  return (
    <>
      {backlog && backlog.backlog > 0 && days !== undefined && (
        <section className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
          <div className="min-w-0">
            <h2 className="text-body font-semibold text-danger">{t('backlogTitle', { count: backlog.backlog })}</h2>
            <p className="wrap-anywhere text-caption text-muted">{t('backlogLine', { name: backlog.name, days })}</p>
          </div>
          <Link href={`/${locale}/app/group/backlog?id=${backlog.id}`} className="shrink-0 rounded-inner border-2 border-border-strong px-4 py-1.5 text-ui font-semibold text-ink">
            {t('see')}
          </Link>
        </section>
      )}
      <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-body font-semibold text-ink">{t('stagesTitle', { count: words })}</h2>
          <span className="text-caption text-muted">{t('stagesHint')}</span>
        </div>
        <ul className="flex flex-col gap-2">
          {stages.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-caption text-muted">
              <span className="w-16 shrink-0">{tStage(s.key)}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full border border-primary">
                <span
                  className="block h-full bg-primary"
                  // raw-ok: bar width is the share of due cards in the stage
                  style={{ width: `${s.total ? Math.round((s.due / s.total) * 100) : 0}%` }}
                />
              </span>
              <span className="w-14 shrink-0 text-right font-semibold text-ink">
                {s.due} / {s.total}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
