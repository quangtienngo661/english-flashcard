'use client';

import { CircleCheck, CircleX, Folder, Layers, Star, Target } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useAppConfig, useEntitlements, type Plan, type Pool } from '@/app-shell/queries';
import { ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { useGroups } from '../groups/groups-api';
import { CurrentSessionCard } from './CurrentSessionCard';
import { answerSummary } from './history-format';
import { OutOfSessions } from './OutOfSessions';
import { TodayHero } from './PracticeHero';
import { CHIP, SourceCard } from './SourceCard';
import { usePracticeStarter } from './use-practice-starter';
import { RULE_TYPES, useRecentHistory, useWeakGroups, useWeakPreview, type Source, type StartBody } from './practice-api';

type Origin = Exclude<Source, 'today'> | 'hero';
const ORIGINS: Origin[] = ['hero', 'group', 'weak', 'priority', 'all'];
const DECK_CHIPS = 4;

/** K/51 (K/55 when no session is left, K/77 before replacing an open session): `/app/practice`. */
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
  const [deckId, setDeckId] = useState<string | null>(null);
  const deck = decks.find((g) => g.id === deckId) ?? decks[0];
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

  let body;
  if (groups.isPending || config.isPending) body = <FullScreenSpinner />;
  else if (groups.isError) body = <ErrorState message={errorText(groups.error)} onRetry={() => void groups.refetch()} />;
  else
    body = (
      <div className="flex min-w-0 flex-1 flex-col gap-8">
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

        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-title font-semibold text-ink">
            <span id="other-sources">{t('sources.title')}</span>
            <span className="rounded-full bg-surface px-2 py-0.5 text-caption font-medium text-muted">{t('sources.count', { count: 4 })}</span>
          </h2>
          <ul aria-labelledby="other-sources" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <SourceCard
              name={t('sources.group.name')}
              icon={Folder}
              tone="primary"
              body={t('sources.group.body')}
              chips={
                decks.length === 0 ? (
                  <span className="text-caption text-muted">{t('sources.group.empty')}</span>
                ) : (
                  <>
                    {decks.slice(0, DECK_CHIPS).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        aria-pressed={g.id === deck?.id}
                        onClick={() => setDeckId(g.id)}
                        className={cn(CHIP, 'outline-none focus-visible:ring-2 focus-visible:ring-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary')}
                      >
                        <span className="truncate">{t('sources.group.chip', { name: g.name, count: g.total })}</span>
                      </button>
                    ))}
                    {decks.length > DECK_CHIPS && (
                      <button type="button" onClick={() => setCustomize({ source: 'group', groupId: deck?.id })} className={cn(CHIP, 'outline-none focus-visible:ring-2 focus-visible:ring-primary')}>
                        +{decks.length - DECK_CHIPS}
                      </button>
                    )}
                  </>
                )
              }
              startLabel={deck ? t('sources.group.start', { name: deck.name }) : null}
              onStart={() => deck && request('group', quick('group', { group_id: deck.id }))}
              busy={pending('group')}
              onCustomize={() => setCustomize({ source: 'group', groupId: deck?.id })}
              error={errors.group ?? null}
              reopensAt={reopensAt}
            />
            <SourceCard
              name={t('sources.weak.name')}
              icon={Target}
              tone="danger"
              titleHref={`/${locale}/app/practice/weak`}
              body={t('sources.weak.body')}
              chips={
                weakTotal === 0 ? (
                  <span className="text-caption text-muted">{t('sources.weak.empty')}</span>
                ) : (
                  <>
                    {weakShown.map((w) => (
                      <span key={w.sense_id} className={CHIP}>
                        <span className="truncate">{t('sources.weak.chip', { lemma: w.lemma, wrong: w.wrong, counted: w.counted })}</span>
                      </span>
                    ))}
                    {weakTotal > weakShown.length && (
                      <Link href={`/${locale}/app/practice/weak`} className={cn(CHIP, 'outline-none focus-visible:ring-2 focus-visible:ring-primary')}>
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
              icon={Star}
              tone="accent"
              body={t('sources.priority.body')}
              chips={
                <span className={priority > 0 ? CHIP : 'text-caption text-muted'}>
                  {priority > 0 ? t('sources.priority.chip', { count: priority, groups: priorityDecks }) : t('sources.priority.empty')}
                </span>
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
              icon={Layers}
              tone="success"
              body={t('sources.all.body')}
              chips={
                <span className={words > 0 ? CHIP : 'text-caption text-muted'}>
                  {words > 0 ? t('sources.all.chip', { words, groups: decks.length }) : t('sources.all.empty')}
                </span>
              }
              startLabel={words > 0 ? t('sources.all.start', { count }) : null}
              onStart={() => request('all', quick('all'))}
              busy={pending('all')}
              onCustomize={() => setCustomize({ source: 'all' })}
              error={errors.all ?? null}
              reopensAt={reopensAt}
            />
          </ul>
        </section>

        <Recent />
      </div>
    );

  return (
    <AppShell variant="main">
      <PageTitle>{t('title')}</PageTitle>
      <div className="flex flex-col gap-6 xl:flex-row">
        {body}
        <aside className="order-first flex w-full flex-col gap-4 md:order-none xl:w-90 xl:shrink-0">
          {pool && plan && <UsageCard pool={pool} plan={plan} out={out} />}
          {current.data && <CurrentSessionCard current={current.data} groups={decks} out={out} />}
          <Shortcuts />
        </aside>
      </div>
      {starter.dialogs}
    </AppShell>
  );
}

/** "Phiên luyện hôm nay" side card: plan, sessions used, and when they refill (D15). */
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
    <section aria-labelledby="usage-title" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="usage-title" className="text-title font-semibold text-ink">
          {t('title')}
        </h2>
        <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-caption font-semibold text-ink">{t(`plan.${plan}`)}</span>
      </div>
      {pool.limit > 0 && (
        <div className="flex items-center gap-3">
          {pool.limit <= 5 ? (
            <span aria-hidden className="flex flex-1 gap-1.5">
              {Array.from({ length: pool.limit }, (_, i) => (
                <span key={i} className={cn('h-2.5 flex-1 rounded-full border-2 border-primary', i < pool.used && 'bg-primary')} />
              ))}
            </span>
          ) : (
            <span aria-hidden className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-soft">
              <span
                className="block h-full rounded-full bg-primary"
                // raw-ok: share of today's sessions used
                style={{ width: `${Math.min(100, Math.round((pool.used / pool.limit) * 100))}%` }}
              />
            </span>
          )}
          <span className="shrink-0 text-ui font-semibold text-ink">{t('used', { used: pool.used, limit: pool.limit })}</span>
        </div>
      )}
      {line && <p className="text-caption text-muted">{line}</p>}
    </section>
  );
}

/** K/51 "Gần đây": the last questions answered, with a link to the history. */
function Recent() {
  const t = useTranslations('App.practice');
  const tRecent = useTranslations('App.practice.recent');
  const locale = useLocale();
  const format = useFormat();
  const history = useRecentHistory(3);
  const items = history.data?.items ?? [];
  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-title" className="text-title font-semibold text-ink">
          {t('recent.title')}
        </h2>
        <Link
          href={`/${locale}/app/practice/history`}
          className="rounded-inner border-2 border-border-strong px-4 py-1.5 text-ui font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t('recent.history')}
        </Link>
      </div>
      {history.isSuccess && items.length === 0 && <p className="text-ui text-muted">{t('recent.empty')}</p>}
      {items.length > 0 && (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.item_id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
              {item.result === 'correct' ? (
                <CircleCheck aria-label={tRecent('right')} className="size-4 shrink-0 self-center text-success" />
              ) : (
                <CircleX aria-label={tRecent('wrong')} className="size-4 shrink-0 self-center text-danger" />
              )}
              <span className="min-w-0 break-words text-ui font-semibold text-ink md:w-32">{item.lemma}</span>
              <span className="text-caption text-muted md:w-32">{t(`types.${item.type}`)}</span>
              <span className="min-w-0 flex-1 basis-full break-words text-caption text-ink md:basis-0">
                {answerSummary(item, (key, values) => tRecent(key as 'correct', values))}
              </span>
              <span className="text-caption text-muted">{format.time(item.answered_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "Phím tắt trong phiên" (web only; copy doc §6: phones drop it). */
function Shortcuts() {
  const t = useTranslations('App.practice.shortcuts');
  const rows = [
    ['1–4', t('choose')],
    ['Enter', t('check')],
    ['H', t('hint')],
    ['Esc', t('stop')],
  ] as const;
  return (
    <section aria-labelledby="shortcuts-title" className="hidden flex-col gap-3 rounded-card border border-border bg-surface p-5 md:flex">
      <h2 id="shortcuts-title" className="text-title font-semibold text-ink">
        {t('title')}
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map(([key, label]) => (
          <li key={key} className="flex items-center gap-2 text-caption text-ink">
            <kbd className="rounded-sm border border-border-strong px-1.5 font-semibold">{key}</kbd>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

