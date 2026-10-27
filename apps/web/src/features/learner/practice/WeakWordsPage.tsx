'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useAppConfig } from '@/app-shell/queries';
import { useApi, useSession } from '@/app-shell/session/session-context';
import { Button } from '@/app-ui/Button';
import { Select } from '@/app-ui/Select';
import { EmptyState, ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { STAGE_KEYS } from '../groups/stages';
import { BackLink } from './BackLink';
import { localDay } from './days';
import { RULE_TYPES, useWeakGroups, type WeakWord } from './practice-api';
import { usePracticeStarter } from './use-practice-starter';

const PAGE = 50;

/** K/56 `/app/practice/weak`: the weak words, by deck (API (b)), with a start for them. */
export function WeakWordsPage() {
  const t = useTranslations('App.practice.weak');
  const locale = useLocale();
  const api = useApi();
  const errorText = useErrorMessage();
  const groups = useWeakGroups();
  const config = useAppConfig();
  const starter = usePracticeStarter<'weak'>();
  const [deck, setDeck] = useState('all');
  const list = useInfiniteQuery({
    queryKey: ['practice', 'weak-words', deck],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (deck !== 'all') params.set('group_id', deck);
      params.set('page_size', String(PAGE));
      if (pageParam) params.set('page_token', pageParam);
      return api.get<{ items: WeakWord[]; next_page_token: string | null }>(`/v1/practice/weak-words?${params}`);
    },
    initialPageParam: '',
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const chosen = groups.data?.items.find((g) => g.group_id === deck) ?? null;
  const count = chosen ? chosen.count : (groups.data?.total ?? 0);
  const words = list.data?.pages.flatMap((p) => p.items) ?? [];
  const questions = config.data?.practice.default_questions_per_session ?? 10;
  const back = { href: `/${locale}/app/practice`, label: t('back') };

  const start = () =>
    starter.request('weak', { source: 'weak', ...(chosen ? { group_id: chosen.group_id } : {}), types: [...RULE_TYPES], count: questions });

  return (
    <AppShell
      variant="sub"
      back={back}
      aside={
        <>
          {count > 0 && (
            <section aria-labelledby="weak-card" className="flex flex-col gap-3 rounded-card border-b-4 border-primary bg-navy-card p-5 text-on-navy">
              <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-on-accent">{t('cardChip')}</span>
              <h2 id="weak-card" className="text-h2 font-extrabold">
                {t('cardCount', { count })}
              </h2>
              <p className="text-ui text-on-navy-muted">{t('cardBody')}</p>
              {starter.error('weak') && (
                <p role="alert" className="text-ui font-semibold">
                  {starter.error('weak')}
                </p>
              )}
              {starter.reopensAt ? (
                <p className="text-ui font-semibold">{t('reopens', { time: starter.reopensAt })}</p>
              ) : (
                <>
                  <Button variant="sticker" size="lg" className="w-full" isPending={starter.pending('weak')} onPress={start}>
                    <span className="truncate">{chosen ? t('startGroup', { count, name: chosen.name }) : t('start', { count })}</span>
                  </Button>
                  <Button
                    size="lg"
                    className="bg-transparent text-on-navy shadow-none ring-2 ring-inset ring-on-navy-muted hover:bg-navy-raised"
                    onPress={() => starter.customize({ source: 'weak', groupId: chosen?.group_id })}
                  >
                    {t('customize')}
                  </Button>
                </>
              )}
            </section>
          )}
          <section aria-labelledby="weak-rules" className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
            <h2 id="weak-rules" className="text-title font-semibold text-ink">
              {t('rulesTitle')}
            </h2>
            {(['in', 'skip', 'out', 'removed'] as const).map((key) => (
              <p key={key} className="text-caption text-ink">
                {t(`rules.${key}`)}
              </p>
            ))}
          </section>
        </>
      }
    >
      <BackLink {...back} />
      <PageTitle>{t('title')}</PageTitle>
      {groups.isPending ? (
        <FullScreenSpinner />
      ) : groups.isError ? (
        <ErrorState message={errorText(groups.error)} onRetry={() => void groups.refetch()} />
      ) : groups.data.total === 0 ? (
        <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />
      ) : (
        <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
          <div className="w-full sm:w-72">
            <Select
              label={t('group')}
              items={[
                { id: 'all', label: t('all', { count: groups.data.total }) },
                ...groups.data.items.map((g) => ({ id: g.group_id, label: t('deckOption', { name: g.name, count: g.count }) })),
              ]}
              value={deck}
              onChange={setDeck}
            />
          </div>
          <h2 className="wrap-anywhere text-title font-semibold text-ink">{chosen ? t('titleGroup', { count, name: chosen.name }) : t('titleAll', { count })}</h2>
          {list.isError ? (
            <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />
          ) : (
            <WeakList words={words} />
          )}
          {list.hasNextPage && (
            <Button variant="quiet" className="w-fit" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
              {t('more')}
            </Button>
          )}
        </section>
      )}
      {starter.dialogs}
    </AppShell>
  );
}

function WeakList({ words }: { words: WeakWord[] }) {
  const t = useTranslations('App.practice.weak');
  const tStage = useTranslations('App.stages');
  const format = useFormat();
  const zone = useZone();
  const today = localDay(new Date(), zone);
  return (
    <div>
      <div aria-hidden className="hidden grid-cols-12 gap-3 border-b border-border pb-2 text-caption text-muted md:grid">
        <span className="col-span-2">{t('cols.word')}</span>
        <span className="col-span-4">{t('cols.meaning')}</span>
        <span className="col-span-2">{t('cols.recent')}</span>
        <span className="col-span-2">{t('cols.stage')}</span>
        <span className="col-span-2">{t('cols.last')}</span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {words.map((w) => (
          <li key={w.sense_id} className="grid grid-cols-2 gap-x-3 gap-y-1 py-3 md:grid-cols-12 md:items-center">
            <span className="min-w-0 break-words text-ui font-semibold text-ink md:col-span-2 md:col-start-1 md:row-start-1">{w.lemma}</span>
            <span className="text-right text-caption font-semibold text-danger md:col-span-2 md:col-start-7 md:row-start-1 md:text-left">{t('wrongOf', { wrong: w.wrong, counted: w.counted })}</span>
            <span className="col-span-2 min-w-0 break-words text-caption text-muted md:col-span-4 md:col-start-3 md:row-start-1 md:text-ui md:text-ink">{w.meaning ?? '—'}</span>
            <span className="text-caption text-ink md:col-span-2 md:col-start-9 md:row-start-1">{tStage(STAGE_KEYS[w.level] ?? 's0')}</span>
            <span className="text-right text-caption text-muted md:col-span-2 md:col-start-11 md:row-start-1 md:text-left">
              {localDay(new Date(w.last_wrong_at), zone) === today ? t('today', { time: format.time(w.last_wrong_at) }) : format.date(w.last_wrong_at, 'dayMonth')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function useZone(): string {
  const { state } = useSession();
  return state.status === 'signed-in' ? state.me.timezone : 'UTC';
}
