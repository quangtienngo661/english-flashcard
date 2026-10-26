'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useApi, useSession } from '@/app-shell/session/session-context';
import { Button } from '@/app-ui/Button';
import { Select } from '@/app-ui/Select';
import { EmptyState, ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { BackLink } from './BackLink';
import { localDay } from './days';
import { MyReportsTab } from './MyReportsTab';
import type { HistoryItem } from './practice-api';

type TabId = 'answers' | 'reports';
const DAYS_BACK = 7;
const PAGE = 50;

/** K/57, K/57b, K/82, K/83 `/app/practice/history?tab=`: answered questions and the learner's reports. */
export function HistoryPage() {
  const t = useTranslations('App.practice.history');
  const locale = useLocale();
  const params = useSearchParams();
  const [tab, setTab] = useState<TabId>(params.get('tab') === 'reports' ? 'reports' : 'answers');
  const back = { href: `/${locale}/app/practice`, label: t('back') };
  const choose = (id: TabId) => {
    setTab(id);
    // Kept in the address so a reload stays on the tab; no navigation (pages are static shells).
    window.history.replaceState(null, '', id === 'reports' ? '?tab=reports' : window.location.pathname);
  };
  return (
    <AppShell variant="sub" back={back}>
      <BackLink {...back} />
      <PageTitle>{t('title')}</PageTitle>
      <Tabs selectedKey={tab} onSelectionChange={(key) => choose(key as TabId)} className="flex flex-col gap-5">
        <TabList aria-label={t('title')} className="flex w-fit gap-1 self-center rounded-inner bg-neutral-soft p-1">
          {(['answers', 'reports'] as const).map((id) => (
            <Tab
              key={id}
              id={id}
              className="cursor-pointer rounded-sm px-4 py-1.5 text-ui font-semibold text-muted outline-none data-focus-visible:ring-2 data-focus-visible:ring-primary data-selected:bg-surface data-selected:text-ink"
            >
              {t(`tabs.${id}`)}
            </Tab>
          ))}
        </TabList>
        <TabPanel id="answers" className="outline-none">
          <AnswersTab />
        </TabPanel>
        <TabPanel id="reports" className="outline-none">
          <MyReportsTab />
        </TabPanel>
      </Tabs>
    </AppShell>
  );
}

function AnswersTab() {
  const t = useTranslations('App.practice.history');
  const locale = useLocale();
  const api = useApi();
  const format = useFormat();
  const errorText = useErrorMessage();
  const zone = useZone();
  const [day, setDay] = useState('all');
  const list = useInfiniteQuery({
    queryKey: ['practice', 'history', day],
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams();
      if (day !== 'all') query.set('date', day);
      query.set('page_size', String(PAGE));
      if (pageParam) query.set('page_token', pageParam);
      return api.get<{ items: HistoryItem[]; next_page_token: string | null }>(`/v1/practice/history?${query}`);
    },
    initialPageParam: '',
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });

  const now = new Date().getTime();
  const days = Array.from({ length: DAYS_BACK }, (_, i) => new Date(now - i * 86_400_000));
  const dayItems = [
    { id: 'all', label: t('allDays') },
    ...days.map((at, i) => {
      const date = format.date(at, 'full');
      return { id: localDay(at, zone), label: i === 0 ? t('today', { date }) : i === 1 ? t('yesterday', { date }) : date };
    }),
  ];
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const complete = list.isSuccess && !list.hasNextPage;
  const right = items.filter((i) => i.result === 'correct').length;

  let content;
  if (list.isPending) content = <FullScreenSpinner />;
  else if (list.isError) content = <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />;
  else if (items.length === 0)
    content =
      day === 'all' ? (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Link href={`/${locale}/app/practice`} className="font-semibold text-primary underline underline-offset-2">
              {t('toPractice')}
            </Link>
          }
        />
      ) : (
        <EmptyState title={t('emptyDay')} />
      );
  else
    content = (
      <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
        <div aria-hidden className="hidden grid-cols-12 gap-3 border-b border-border pb-2 text-caption text-muted lg:grid">
          {(['time', 'word', 'type', 'prompt', 'answer', 'correct', 'result', 'action'] as const).map((col) => (
            <span key={col} className={COL[col]}>
              {t(`cols.${col}`)}
            </span>
          ))}
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <HistoryRow key={item.item_id} item={item} withDate={day === 'all'} />
          ))}
        </ul>
        {list.hasNextPage && (
          <Button variant="quiet" className="w-fit" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
            {t('more')}
          </Button>
        )}
      </section>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-64">
          <Select label={t('day')} hideLabel items={dayItems} value={day} onChange={setDay} />
        </div>
        {complete && items.length > 0 && (
          <p className="flex gap-2 text-caption font-semibold">
            <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-ink">{t('counts.total', { count: items.length })}</span>
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-ink">{t('counts.correct', { count: right })}</span>
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-ink">{t('counts.wrong', { count: items.length - right })}</span>
          </p>
        )}
      </div>
      {content}
    </div>
  );
}

const COL = {
  time: 'lg:col-span-1',
  word: 'lg:col-span-1',
  type: 'lg:col-span-2',
  prompt: 'lg:col-span-2',
  answer: 'lg:col-span-2',
  correct: 'lg:col-span-1',
  result: 'lg:col-span-2',
  action: 'lg:col-span-1',
} as const;

/** One answered question; a stacked card on phones (M/L57), a table row from 1024 px. */
function HistoryRow({ item, withDate }: { item: HistoryItem; withDate: boolean }) {
  const t = useTranslations('App.practice.history');
  const tp = useTranslations('App.practice');
  const format = useFormat();
  const prompt = item.prompt;
  const isTf = item.type === 'true_false_definition';
  const type =
    item.type === 'type_word' ? t('typeStyle', { type: tp('types.type_word'), style: t(`styles.${item.prompt_style === 'sentence' ? 'sentence' : 'meaning'}`) }) : tp(`types.${item.type}`);
  const question = prompt.sentence ?? (isTf ? `${prompt.lemma} · ${prompt.meaning}` : (prompt.meaning ?? ''));
  const answer =
    item.answer === null ? t('none')
      : prompt.options && /^\d$/.test(item.answer) ? (prompt.options[Number(item.answer)] ?? item.answer)
        : isTf ? t(item.answer === 'true' ? 'true' : 'false') : item.answer;
  const correct = isTf ? t(item.correct.is_true ? 'true' : 'false') : item.correct.text;
  const right = item.result === 'correct';
  const result = item.skipped ? t('result.skipped')
    : !right ? t('result.wrong')
      : item.hint_level > 0 ? t('result.hinted')
        : item.tries > 1 ? t('result.retried', { n: item.tries }) : t('result.correct');
  const time = withDate ? `${format.date(item.answered_at, 'dayMonth')} ${format.time(item.answered_at)}` : format.time(item.answered_at);
  return (
    <li className="grid grid-cols-2 gap-x-3 gap-y-1 py-3 text-caption lg:grid-cols-12 lg:items-center">
      <span className={cn('text-muted', COL.time)}>{time}</span>
      <span className={cn('text-right text-muted lg:text-left', COL.type, 'lg:order-2')}>{type}</span>
      <span data-col="word" className={cn('col-span-2 min-w-0 break-words text-ui font-semibold text-ink lg:col-span-1 lg:order-1')}>
        {item.lemma}
      </span>
      <span className={cn('col-span-2 min-w-0 break-words text-ink lg:order-3', COL.prompt)}>{question}</span>
      <span className={cn('flex min-w-0 flex-col break-words lg:order-4', COL.answer)}>
        <span className="text-muted lg:sr-only">{t('cols.answer')}</span>
        <span className={right ? 'text-ink' : 'text-danger'}>{answer}</span>
      </span>
      <span className={cn('flex min-w-0 flex-col break-words text-right text-ink lg:order-5 lg:text-left', COL.correct)}>
        <span className="text-muted lg:sr-only">{t('cols.correct')}</span>
        <span>{correct}</span>
      </span>
      <span className={cn('lg:order-6', COL.result)}>
        <span className={cn('rounded-full px-2 py-0.5 font-semibold text-ink', right ? (item.hint_level > 0 ? 'bg-accent-soft' : 'bg-success-soft') : 'bg-danger-soft')}>{result}</span>
      </span>
      <span className={cn('text-right text-ink lg:order-7 lg:text-left', COL.action)}>{item.review_action ? t(`actions.${item.review_action as 'known'}`) : t('none')}</span>
    </li>
  );
}

function useZone(): string {
  const { state } = useSession();
  return state.status === 'signed-in' ? state.me.timezone : 'UTC';
}
