'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { Button } from '@/app-ui/Button';
import { EmptyState, ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { LookupFilters } from './LookupFilters';
import { lookupHref, parseLookup, useWordSearch, type LookupParams, type WordRow } from './lookup-api';

/** K/30, M/40 `/app/lookup?q=&level=&topic=&pos=&mine=`: matching words, filters in the URL, a preview of one word on wide screens. */
export function LookupPage() {
  const t = useTranslations('App.lookup');
  const locale = useLocale();
  const router = useRouter();
  const params = parseLookup(useSearchParams());
  const search = useWordSearch(params);
  const errorText = useErrorMessage();
  const words = search.data?.pages.flatMap((p) => p.items) ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const preview = words.find((w) => w.lemma === picked) ?? words[0];
  const go = (next: LookupParams) => router.replace(lookupHref(locale, next));

  return (
    <AppShell
      variant="main"
      aside={preview ? <WordPreview word={preview} /> : undefined}
    >
      <div className="flex flex-col gap-4">
        <PageTitle>{t('title')}</PageTitle>
        <LookupFilters value={params} onChange={go} />
        {search.isPending ? (
          <FullScreenSpinner />
        ) : search.isError ? (
          <ErrorState message={errorText(search.error)} onRetry={() => void search.refetch()} />
        ) : words.length === 0 ? (
          <EmptyState title={t('emptyTitle')} body={t('emptyBody')} action={<Button variant="sticker">{t('addThis')}</Button>} />
        ) : (
          <section aria-label={t('results')} className="flex flex-col rounded-card border border-border bg-surface p-2 md:p-4">
            <div aria-hidden className="hidden grid-cols-12 gap-3 border-b border-border px-3 pb-2 text-caption font-semibold text-muted md:grid">
              <span className="col-span-3">{t('colWord')}</span>
              <span className="col-span-2">{t('colPos')}</span>
              <span className="col-span-5">{t('colMeaning')}</span>
              <span className="col-span-2">{t('colLevel')}</span>
            </div>
            <ul className="divide-y divide-border">
              {words.map((word) => (
                <li
                  key={word.lemma}
                  aria-label={word.lemma}
                  onMouseEnter={() => setPicked(word.lemma)}
                  onFocus={() => setPicked(word.lemma)}
                  className={cn('grid grid-cols-12 items-center gap-x-3 gap-y-0.5 rounded-inner px-3 py-3', preview?.lemma === word.lemma && 'md:bg-accent-soft')}
                >
                  <span className="col-span-9 row-start-1 flex min-w-0 flex-wrap items-baseline gap-x-2 md:col-span-3">
                    <Link href={`/${locale}/app/word?w=${encodeURIComponent(word.lemma)}`} className="break-all text-ui font-semibold text-ink hover:underline">
                      {word.lemma}
                    </Link>
                    <span className="text-caption text-muted md:hidden">{word.pos_list.join(', ')}</span>
                  </span>
                  <span className="hidden text-caption text-muted md:col-span-2 md:block">{word.pos_list.join(', ')}</span>
                  <span className="col-span-12 row-start-2 break-words text-ui text-ink md:col-span-5 md:row-start-auto">{word.meaning_preview}</span>
                  <span className="col-span-3 col-start-10 row-start-1 flex items-center justify-end gap-1.5 md:col-span-2 md:col-start-auto md:row-start-auto md:justify-start">
                    {word.level && <span className="rounded-sm bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">{word.level}</span>}
                    {word.has_private && <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-caption font-semibold text-ink">{t('mineTag')}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {search.hasNextPage && (
              <div className="px-3 pt-3">
                <Button variant="quiet" isPending={search.isFetchingNextPage} onPress={() => void search.fetchNextPage()}>
                  {t('more')}
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

type WordPage = { sections: Array<{ pos: string; senses: Array<{ examples: string[]; topics: Array<{ code: string; name: string }> }> }> };

/** K/30 right column: the hovered (or first) word with its first example and the way to its page. */
function WordPreview({ word }: { word: WordRow }) {
  const t = useTranslations('App.lookup');
  const locale = useLocale();
  const api = useApi();
  const page = useQuery({
    queryKey: ['word', word.lemma],
    queryFn: () => api.get<WordPage>(`/v1/words/${encodeURIComponent(word.lemma)}`),
    staleTime: 60_000,
  });
  const first = page.data?.sections[0]?.senses[0];
  return (
    <section className="hidden flex-col gap-3 rounded-card border-2 border-ink bg-surface p-5 shadow-ledge xl:flex">
      <div className="flex flex-wrap gap-1.5">
        {word.level && <span className="rounded-sm bg-primary px-1.5 py-0.5 text-caption font-semibold text-on-primary">{word.level}</span>}
        {first?.topics[0] && <span className="rounded-sm bg-success-soft px-1.5 py-0.5 text-caption font-semibold text-success">{first.topics[0].name}</span>}
      </div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="break-all text-h2 font-extrabold text-ink">{word.lemma}</span>
        <span className="text-ui text-muted">{word.pos_list.join(', ')}</span>
      </p>
      <p className="break-words text-title font-semibold text-ink">{word.meaning_preview}</p>
      {first?.examples[0] && (
        <div className="flex flex-col gap-0.5">
          <p className="text-caption font-semibold text-muted">{t('example')}</p>
          <p className="break-words text-ui text-ink">{first.examples[0]}</p>
        </div>
      )}
      <Link
        href={`/${locale}/app/word?w=${encodeURIComponent(word.lemma)}`}
        className="flex min-h-control w-fit items-center rounded-inner border-2 border-border-strong px-4 text-ui font-semibold text-ink shadow-button-secondary hover:bg-primary-soft"
      >
        {t('openWord')}
      </Link>
    </section>
  );
}
