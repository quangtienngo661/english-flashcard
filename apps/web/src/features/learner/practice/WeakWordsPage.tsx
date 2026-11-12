'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { BackLink } from '@/app-chrome/BackLink';
import { PageColumns } from '@/app-chrome/PageColumns';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useAppConfig } from '@/app-shell/queries';
import { useApi, useSession } from '@/app-shell/session/session-context';
import { EmptyState, ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';
import { Select } from '@/ui/Select';
import { Tag } from '@/ui/Tag';
import { TextButton } from '@/ui/TextButton';
import { STAGE_KEYS } from '../groups/stages';
import { localDay } from './days';
import { RULE_TYPES, useWeakGroups, type WeakWord } from './practice-api';
import { usePracticeStarter } from './use-practice-starter';

const PAGE = 50;
const STAGE_DOT = ['bg-wm-stage-0-dot', 'bg-wm-stage-1-dot', 'bg-wm-stage-2-dot', 'bg-wm-stage-3-dot', 'bg-wm-stage-4-dot', 'bg-wm-stage-5-solid'] as const;

/** K/56 `/app/practice/weak` (Figma 119:4317): the weak words, by deck (API (b)), with a start for them. */
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
    <>
      <BackLink {...back} />
      <PageColumns
        aside={
          <>
            {count > 0 && (
              // Figma "Luyện từ hay sai": the count in red, the line, [Tùy chỉnh] and the start.
              <section aria-labelledby="weak-card" className="flex flex-col gap-3 rounded-wm-card border border-wm-line bg-wm-surface p-6 shadow-wm-card">
                <span className="text-wm-meta text-wm-muted">{t('cardChip')}</span>
                <h2 id="weak-card" className="font-wm-display text-wm-section text-wm-fail">
                  {t('cardCount', { count })}
                </h2>
                <p className="font-wm-sans text-wm-small text-wm-muted">{t('cardBody')}</p>
                {starter.error('weak') && (
                  <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
                    {starter.error('weak')}
                  </p>
                )}
                {starter.reopensAt ? (
                  <p className="font-wm-sans text-wm-small-strong text-wm-ink">{t('reopens', { time: starter.reopensAt })}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button variant="primary" isPending={starter.pending('weak')} onPress={start}>
                      <span className="truncate">{chosen ? t('startGroup', { count, name: chosen.name }) : t('start', { count })}</span>
                    </Button>
                    <TextButton className="justify-center" onPress={() => starter.customize({ source: 'weak', groupId: chosen?.group_id })}>
                      {t('customize')}
                    </TextButton>
                  </div>
                )}
              </section>
            )}
            <section aria-labelledby="weak-rules" className="flex flex-col gap-2 px-1">
              <h2 id="weak-rules" className="font-wm-sans text-wm-base-strong text-wm-ink">
                {t('rulesTitle')}
              </h2>
              {(['in', 'skip', 'out', 'removed'] as const).map((key) => (
                <p key={key} className="font-wm-sans text-wm-small text-wm-muted">
                  {t(`rules.${key}`)}
                </p>
              ))}
            </section>
          </>
        }
      >
        <PageTitle>{t('title')}</PageTitle>
        {groups.isPending ? (
          <FullScreenSpinner />
        ) : groups.isError ? (
          <ErrorState message={errorText(groups.error)} onRetry={() => void groups.refetch()} />
        ) : groups.data.total === 0 ? (
          <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />
        ) : (
          <section className="flex flex-col gap-4 rounded-wm-card border border-wm-line bg-wm-surface p-5 shadow-wm-card md:px-6">
            <div className="w-full md:w-72">
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
            <h2 className="wrap-anywhere font-wm-display text-wm-word text-wm-ink">{chosen ? t('titleGroup', { count, name: chosen.name }) : t('titleAll', { count })}</h2>
            {list.isError ? <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} /> : <WeakList words={words} />}
            {list.hasNextPage && (
              <TextButton className="w-fit" isDisabled={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
                {t('more')}
              </TextButton>
            )}
          </section>
        )}
        {starter.dialogs}
      </PageColumns>
    </>
  );
}

/** Figma 119:4317: word, meaning, ✓/✗ of the last 5 questions (✓ = counted − wrong; the API has no order), stage, last wrong. Phones keep the word and the chips. */
function WeakList({ words }: { words: WeakWord[] }) {
  const t = useTranslations('App.practice.weak');
  const tStage = useTranslations('App.stages');
  const format = useFormat();
  const zone = useZone();
  const today = localDay(new Date(), zone);
  const cols = 'md:grid md:grid-cols-12 md:items-center md:gap-4';
  return (
    <div>
      <div aria-hidden className={cn('hidden border-b border-wm-line pb-2 text-wm-meta text-wm-muted', cols)}>
        <span className="col-span-2">{t('cols.word')}</span>
        <span className="col-span-4">{t('cols.meaning')}</span>
        <span className="col-span-2">{t('cols.recent')}</span>
        <span className="col-span-2">{t('cols.stage')}</span>
        <span className="col-span-2">{t('cols.last')}</span>
      </div>
      <ul className="flex flex-col divide-y divide-wm-line">
        {words.map((w) => (
          <li key={w.sense_id} className={cn('flex items-center justify-between gap-3 py-3', cols)}>
            <span className="min-w-0 break-words font-wm-display text-wm-word text-wm-ink md:col-span-2">{w.lemma}</span>
            <span className="hidden min-w-0 break-words font-wm-sans text-wm-small text-wm-muted md:col-span-4 md:block">{w.meaning ?? '—'}</span>
            <span className="flex shrink-0 gap-1.5 md:col-span-2">
              <span role="img" aria-label={t('right', { count: w.counted - w.wrong })}>
                <Tag tone="pass">
                  <Check aria-hidden className="size-3" />
                  {w.counted - w.wrong}
                </Tag>
              </span>
              <span role="img" aria-label={t('wrong', { count: w.wrong })}>
                <Tag tone="fail">
                  <X aria-hidden className="size-3" />
                  {w.wrong}
                </Tag>
              </span>
            </span>
            <span className="hidden items-center gap-1.5 font-wm-sans text-wm-small text-wm-ink md:col-span-2 md:flex">
              <span aria-hidden className={cn('size-2.5 shrink-0 rounded-wm-key', STAGE_DOT[w.level] ?? STAGE_DOT[0])} />
              {tStage(STAGE_KEYS[w.level] ?? 's0')}
            </span>
            <span className="hidden text-wm-meta text-wm-muted md:col-span-2 md:block">
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
