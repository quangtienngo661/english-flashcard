'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { Button } from '@/app-ui/Button';
import { Select } from '@/app-ui/Select';
import { ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { GroupCard, sortForToday, waiting } from './GroupCard';
import { useGroupDialogs } from './GroupDialogs';
import { useGroups, type GroupSummary } from './groups-api';
import { TopicSuggestions } from './TopicSuggestions';

type Filter = 'all' | 'waiting' | 'done';
/** K/16b: the search box appears once the list is long enough to need it. */
const SEARCH_FROM = 10;

/** K/16, K/16b, K/17: every deck, a filter, a search from 10 decks, the new-deck tile and topic suggestions. */
export function GroupListPage() {
  const t = useTranslations('App.groups');
  const errorText = useErrorMessage();
  const groups = useGroups();
  const { open, dialogs } = useGroupDialogs();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const all = sortForToday(groups.data?.items ?? []);
  const words = all.reduce((sum, g) => sum + g.total, 0);
  const needle = query.trim().toLocaleLowerCase();
  const shown = all.filter(
    (g) =>
      (filter === 'all' || (filter === 'waiting' ? waiting(g) > 0 : waiting(g) === 0)) &&
      (!needle || g.name.toLocaleLowerCase().includes(needle)),
  );
  const actions = {
    onRename: (g: GroupSummary) => open({ kind: 'rename', group: g }),
    onDelete: (g: GroupSummary) => open({ kind: 'delete', group: g }),
  };

  return (
    <AppShell variant="main" fab>
      <PageTitle
        aside={
          <Button variant="sticker" onPress={() => open({ kind: 'create' })}>
            <Plus aria-hidden className="size-4" />
            {t('create')}
          </Button>
        }
        meta={
          all.length > 0 && (
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-caption font-medium text-muted">{t('summary', { groups: all.length, words })}</span>
          )
        }
      >
        {t('title')}
      </PageTitle>
      {groups.isPending ? (
        <FullScreenSpinner />
      ) : groups.isError ? (
        <ErrorState message={errorText(groups.error)} onRetry={() => void groups.refetch()} />
      ) : (
        <div className="flex flex-col gap-8">
          {all.length > 0 && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-64">
                <Select
                  label={t('filterLabel')}
                  hideLabel
                  value={filter}
                  onChange={(id) => setFilter(id as Filter)}
                  items={[
                    { id: 'all', label: t('filterAll', { count: all.length }) },
                    { id: 'waiting', label: t('filterWaiting') },
                    { id: 'done', label: t('filterDone') },
                  ]}
                />
              </div>
              {all.length >= SEARCH_FROM && (
                <label className="flex min-h-control w-full items-center gap-2 rounded-control border-2 border-border-strong bg-surface px-3 sm:w-72">
                  <Search aria-hidden className="size-4 text-muted" />
                  <input
                    type="search"
                    aria-label={t('search', { count: all.length })}
                    placeholder={t('search', { count: all.length })}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-ui text-ink outline-none placeholder:text-placeholder"
                  />
                </label>
              )}
            </div>
          )}
          <ul aria-label={t('title')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {shown.map((group, i) => (
              <GroupCard key={group.id} group={group} index={i} actions={actions} />
            ))}
            <li className="flex">
              <button
                type="button"
                onClick={() => open({ kind: 'create' })}
                className="flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border-strong p-4 text-center outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex size-10 items-center justify-center rounded-full border-2 border-ink">
                  <Plus aria-hidden className="size-5" />
                </span>
                <span className="text-ui font-semibold text-ink">{t('createNew')}</span>
                <span className="text-caption text-muted">{t('createNewHint')}</span>
              </button>
            </li>
          </ul>
          {all.length > 0 && shown.length === 0 && <p className="text-body text-muted">{t('noMatch')}</p>}
          <TopicSuggestions />
        </div>
      )}
      {dialogs}
    </AppShell>
  );
}
