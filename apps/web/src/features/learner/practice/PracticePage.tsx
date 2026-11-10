'use client';

import { Check, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useAppConfig, useEntitlements, type Plan, type Pool } from '@/app-shell/queries';
import { ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { Kbd } from '@/ui/Kbd';
import { ProgressBar } from '@/ui/ProgressBar';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import { useGroups } from '../groups/groups-api';
import { CurrentSessionCard } from './CurrentSessionCard';
import { answerSummary } from './history-format';
import { OutOfSessions } from './OutOfSessions';
import { TodayHero } from './PracticeHero';
import { CHIP, CHIP_FAIL, SourceCard } from './SourceCard';
import { usePracticeStarter } from './use-practice-starter';
import { RULE_TYPES, useRecentHistory, useWeakGroups, useWeakPreview, type Source, type StartBody } from './practice-api';

type Origin = Exclude<Source, 'today'> | 'hero';
const ORIGINS: Origin[] = ['hero', 'group', 'weak', 'priority', 'all'];
const DECK_CHIPS = 2;

/** K/51 (K/55 when no session is left, K/77 before replacing an open session): `/app/practice` (Figma 99:3169 / 99:3391). */
export function PracticePage() {
  const t = useTranslations('App.practice');
  const locale = useLocale();
  const errorText = useErrorMessage();
  const groups = useGroups();
  const config = useAppConfig();
  const entitlements = useEntitlements();
  const weakGroups = useWeakGroups();
  const weakPreview = useWeakPreview(2);
  const starter = usePracticeStarter<Origin>();
  const { request, current, decks, out, reopensAt } = starter;
  const count = config.data?.practice.default_questions_per_session ?? 10;
  const pool = entitlements.data?.pools.practice_sessions;
  const plan = entitlements.data?.plan;
  const setCustomize = starter.customize;
  const errors: Partial<Record<Origin, string>> = Object.fromEntries(ORIGINS.map((o) => [o, starter.error(o) ?? undefined]));
  const pending = starter.pending;

  const quick = (source: Source, extra: Partial<StartBody> = {}): StartBody => ({ source, ...extra, types: [...RULE_TYPES], count });

  // The `today` source takes priority, due and today's new cards of every deck (as the review queue).
  const todayWords = (g: (typeof decks)[number]) => g.today.priority + g.today.due + g.today.new;
  const today = decks.reduce((sum, g) => sum + todayWords(g), 0);
  const todayDecks = decks.filter((g) => todayWords(g) > 0).length;
  const priority = decks.reduce((sum, g) => sum + g.today.priority, 0);
  const priorityDecks = decks.filter((g) => g.today.priority > 0).length;
  const words = decks.reduce((sum, g) => sum + g.total, 0);
  const weakTotal = weakGroups.data?.total ?? 0;
  const weakShown = weakPreview.data?.items ?? [];
  const empty = (text: string) => <span className="font-wm-sans text-wm-small text-wm-muted">{text}</span>;

  let body;
  if (groups.isPending || config.isPending) body = <FullScreenSpinner />;
  else if (groups.isError) body = <ErrorState message={errorText(groups.error)} onRetry={() => void groups.refetch()} />;
  else
    body = (
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {out && plan && pool ? (
          <OutOfSessions planName={t(`usage.plan.${plan}`)} limit={pool.limit} time={reopensAt ?? ''} />
        ) : (
          <TodayHero
            words={today}
            groups={todayDecks}
            count={count}
            busy={pending('hero')}
            error={errors.hero ?? null}
            onStart={() => request('hero', quick('today'))}
            onCustomize={() => setCustomize({ source: 'today' })}
          />
        )}
        {current.data && <CurrentSessionCard current={current.data} groups={decks} out={out} />}

        <section className="flex flex-col gap-3">
          <h2 id="other-sources" className="font-wm-display text-wm-card-title text-wm-ink">
            {t('sources.title')}
          </h2>
          <ul aria-labelledby="other-sources" className="flex flex-col rounded-wm-xl border border-wm-line bg-wm-surface px-5 shadow-wm-card">
            <SourceCard
              name={t('sources.group.name')}
              body={t('sources.group.body')}
              chips={
                decks.length === 0 ? (
                  empty(t('sources.group.empty'))
                ) : (
                  // Owner 27/10/2026: the decks are only shown here (look normal, not buttons); a deck is chosen in [Tùy chỉnh].
                  <>
                    {decks.slice(0, DECK_CHIPS).map((g) => (
                      <span key={g.id} className={CHIP}>
                        <span className="truncate">{t('sources.group.chip', { name: g.name, count: g.total })}</span>
                      </span>
                    ))}
                    {decks.length > DECK_CHIPS && <span className={CHIP}>{t('sources.group.more', { count: decks.length - DECK_CHIPS })}</span>}
                  </>
                )
              }
              startLabel={null}
              onStart={() => {}}
              busy={pending('group')}
              onCustomize={() => setCustomize({ source: 'group', groupId: decks[0]?.id })}
              error={errors.group ?? null}
              reopensAt={reopensAt}
            />
            <SourceCard
              name={t('sources.weak.name')}
              titleHref={`/${locale}/app/practice/weak`}
              body={t('sources.weak.body')}
              chips={
                weakTotal === 0 ? (
                  empty(t('sources.weak.empty'))
                ) : (
                  <>
                    {weakShown.map((w) => (
                      <span key={w.sense_id} className={CHIP_FAIL}>
                        <span className="truncate">{t('sources.weak.chip', { lemma: w.lemma, wrong: w.wrong, counted: w.counted })}</span>
                      </span>
                    ))}
                    {weakTotal > weakShown.length && (
                      <Link
                        href={`/${locale}/app/practice/weak`}
                        className={cn(CHIP, 'outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent')}
                      >
                        {t('sources.weak.more', { count: weakTotal - weakShown.length })}
                      </Link>
                    )}
                  </>
                )
              }
              startLabel={weakTotal > 0 ? t('sources.weak.start', { count: weakTotal }) : null}
              onStart={() => request('weak', quick('weak'))}
              busy={pending('weak')}
              onCustomize={() => setCustomize({ source: 'weak' })}
              error={errors.weak ?? null}
              reopensAt={reopensAt}
            />
            <SourceCard
              name={t('sources.priority.name')}
              body={t('sources.priority.body')}
              chips={
                priority > 0 ? <span className={CHIP}>{t('sources.priority.chip', { count: priority, groups: priorityDecks })}</span> : empty(t('sources.priority.empty'))
              }
              startLabel={priority > 0 ? t('sources.priority.start', { count: priority }) : null}
              onStart={() => request('priority', quick('priority'))}
              busy={pending('priority')}
              onCustomize={() => setCustomize({ source: 'priority' })}
              error={errors.priority ?? null}
              reopensAt={reopensAt}
            />
            <SourceCard
              name={t('sources.all.name')}
              body={t('sources.all.body')}
              chips={words > 0 ? <span className={CHIP}>{t('sources.all.chip', { words, groups: decks.length })}</span> : empty(t('sources.all.empty'))}
              startLabel={words > 0 ? t('sources.all.start', { count }) : null}
              onStart={() => request('all', quick('all'))}
              busy={pending('all')}
              onCustomize={() => setCustomize({ source: 'all' })}
              error={errors.all ?? null}
              reopensAt={reopensAt}
            />
          </ul>
        </section>
      </div>
    );

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageTitle>{t('title')}</PageTitle>
        {pool && plan && <UsageCard pool={pool} plan={plan} out={out} />}
      </div>
      <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:gap-6">
        {body}
        <aside className="flex w-full flex-col gap-5 xl:w-80 xl:shrink-0">
          <Recent />
          <Shortcuts />
        </aside>
      </div>
      {starter.dialogs}
    </>
  );
}

/** "Phiên luyện hôm nay" (Figma header block, D15): plan, sessions used, one bar, and when they refill. */
function UsageCard({ pool, plan, out }: { pool: Pool; plan: Plan; out: boolean }) {
  const t = useTranslations('App.practice.usage');
  const format = useFormat();
  const time = pool.resets_at ? format.resetAt(pool.resets_at) : null;
  let line: string | null = null;
  if (time && out) {
    const minutes = Math.max(0, Math.ceil((Date.parse(pool.resets_at!) - new Date().getTime()) / 60_000));
    const wait = minutes >= 60 ? t('hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 }) : t('minutes', { minutes });
    line = t('out', { time, wait });
  } else if (time) line = t('note', { time });
  return (
    <section aria-labelledby="usage-title" className="flex w-full flex-col gap-2 md:w-85">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-wm-mono text-wm-mono text-wm-muted">
          <span id="usage-title" className="first-letter:lowercase">
            {t('title')}
          </span>
          {' · '}
          <span>{t(`plan.${plan}`)}</span>
        </p>
        {pool.limit > 0 && <span className="shrink-0 font-wm-display text-wm-base text-wm-ink">{t('used', { used: pool.used, limit: pool.limit })}</span>}
      </div>
      {pool.limit > 0 && <ProgressBar value={pool.used} max={pool.limit} label={t('used', { used: pool.used, limit: pool.limit })} className="h-2" />}
      {line && <p className="font-wm-mono text-wm-mono text-wm-muted">{line}</p>}
    </section>
  );
}

/** K/51 "Gần đây": the last questions answered, with a link to the history (the calendar replaces it in M6). */
function Recent() {
  const t = useTranslations('App.practice');
  const tRecent = useTranslations('App.practice.recent');
  const locale = useLocale();
  const history = useRecentHistory(3);
  const items = history.data?.items ?? [];
  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-3 rounded-wm-xl border border-wm-line bg-wm-surface p-6 shadow-wm-card">
      <h2 id="recent-title" className="font-wm-display text-wm-base text-wm-ink">
        {t('recent.title')}
      </h2>
      {history.isSuccess && items.length === 0 && <p className="font-wm-sans text-wm-small text-wm-muted">{t('recent.empty')}</p>}
      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const right = item.result === 'correct';
            return (
              <li key={item.item_id} className="flex items-start gap-3">
                <span
                  role="img"
                  aria-label={right ? tRecent('right') : tRecent('wrong')}
                  className={cn('mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-wm-sm', right ? 'bg-wm-pass-soft text-wm-pass' : 'bg-wm-fail-soft text-wm-fail')}
                >
                  {right ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="break-words font-wm-sans text-wm-small-strong text-wm-ink">{item.lemma}</span>
                  <span className="break-words font-wm-sans text-wm-caption text-wm-muted">
                    {answerSummary(item, (key, values) => tRecent(key as 'correct', values))}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Link href={`/${locale}/app/practice/history`} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'w-fit')}>
        {t('recent.history')}
      </Link>
    </section>
  );
}

/** "Phím trong phiên" (web only; Figma draws no phone card). */
function Shortcuts() {
  const t = useTranslations('App.practice.shortcuts');
  const rows = [
    [['1', '2', '3', '4'], t('choose')],
    [['Enter'], t('check')],
    [['H'], t('hint')],
    [['Esc'], t('stop')],
  ] as const;
  return (
    <section aria-labelledby="shortcuts-title" className="hidden flex-col gap-3 rounded-wm-xl border border-wm-line bg-wm-surface p-6 shadow-wm-card md:flex">
      <h2 id="shortcuts-title" className="font-wm-display text-wm-base text-wm-ink">
        {t('title')}
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map(([keys, label]) => (
          <li key={label} className="flex items-center gap-2 font-wm-sans text-wm-small text-wm-muted">
            <span className="flex gap-1">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
