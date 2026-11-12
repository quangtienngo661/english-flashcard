'use client';

import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { EmptyState, ErrorState } from '@/ui/States';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { Skeleton } from '@/ui/Skeleton';
import { TextButton } from '@/ui/TextButton';
import { useAddWord } from '../add-word/add-word-context';
import { BulkAddSheet } from '../add-word/BulkAddSheet';
import { DeckPickerDialog } from '../add-word/DeckPickerDialog';
import { useGroups } from '../groups/groups-api';
import { useSenseItems, useWordPage, type PageSense } from '../word/word-api';
import { DictionaryPage } from './DictionaryPage';
import { LiftedCard } from './LiftedCard';
import { lookupHref, lookupQuery, parseLookup, useWordList, type LookupParams } from './lookup-api';
import { LookupFilters } from './LookupFilters';
import { StackTargets } from './StackTargets';

/**
 * K/30, M/40, Figma "Từ hóa thẻ" (85:3218 / 85:3667) `/app/lookup?q=&level=&topic=&pos=&mine=`: the big search box, the filter
 * sentence, a dictionary page of the matching words, the selected word lifted into a card and the group stacks to add it to. Phones
 * show the card and the stacks before the page. Pages follow the API's cursors; the ones already seen stay cached.
 */
export function LookupPage() {
  const t = useTranslations('App.lookup');
  const tAdd = useTranslations('App.addWord');
  const locale = useLocale();
  const router = useRouter();
  const errorText = useErrorMessage();
  const params = parseLookup(useSearchParams());
  const query = lookupQuery(params);
  const go = (next: LookupParams) => router.replace(lookupHref(locale, next));

  // Cursor of each page seen, the last is the shown one; a new search starts at page 1.
  const [tokens, setTokens] = useState<Array<string | null>>([null]);
  const [seenQuery, setSeenQuery] = useState(query);
  if (seenQuery !== query) {
    setSeenQuery(query);
    setTokens([null]);
  }
  const list = useWordList(params, tokens.at(-1) ?? null);
  const words = list.data?.items ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const selected = words.find((w) => w.lemma === picked) ?? words[0];
  const wordPage = useWordPage(selected?.lemma ?? null);
  const sense = selected && wordPage.data ? entrySense(wordPage.data.sections.flatMap((s) => s.senses), selected.meaning_preview, params) : undefined;
  const items = useSenseItems(sense ? [sense.sense_id] : []);
  const item = sense ? items.data?.get(sense.sense_id) : undefined;
  const groups = useGroups().data?.items ?? [];
  const [bulk, setBulk] = useState(false);
  const [picker, setPicker] = useState(false);
  // Bulk add takes the catalog filters only: not a search text, not "Chỉ từ của tôi" (API (c) body).
  const canBulk = Boolean((params.level || params.topic || params.pos) && !params.q && !params.mine);
  const filtered = Boolean(params.level || params.topic || params.pos || params.mine);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">{t('title')}</h1>
      <div className="flex flex-col gap-3">
        <SearchBox query={params.q ?? ''} onSearch={(q) => go({ ...params, q: q || undefined })} />
        <LookupFilters value={params} total={list.data?.total ?? 0} onChange={go} />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Checkbox isSelected={Boolean(params.mine)} onChange={(mine) => go({ ...params, mine: mine || undefined })}>
            {t('mine')}
          </Checkbox>
          {canBulk && words.length > 0 && <TextButton onPress={() => setBulk(true)}>{tAdd('bulkButton')}</TextButton>}
          {filtered && (
            <TextButton tone="muted" onPress={() => go({ q: params.q })}>
              {t('clear')}
            </TextButton>
          )}
        </div>
      </div>
      {bulk && <BulkAddSheet filter={params} onClose={() => setBulk(false)} />}
      {list.isPending ? (
        <Skeleton className="h-96 w-full rounded-wm-md" />
      ) : list.isError ? (
        <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />
      ) : !selected ? (
        <EmptyState title={t('emptyTitle')} body={t('emptyBody')} action={<AddThis word={params.q} />} />
      ) : (
        <div
          // raw-ok: Figma's two columns, the page beside a 380 px card column
          className="grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_23.75rem]"
        >
          <DictionaryPage
            words={words}
            page={tokens.length}
            selected={selected.lemma}
            onSelect={setPicked}
            onPrev={tokens.length > 1 ? () => setTokens((prev) => prev.slice(0, -1)) : undefined}
            onNext={list.data?.next_page_token ? () => setTokens((prev) => [...prev, list.data!.next_page_token]) : undefined}
          />
          <div className="order-first flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:order-none">
            <LiftedCard word={selected} sense={sense} item={item} groups={groups} />
            <h2 className="mt-2 font-wm-display text-wm-base-strong font-bold text-wm-ink">{t('stacksTitle')}</h2>
            <StackTargets
              groups={groups}
              senseId={sense?.sense_id ?? null}
              lemma={selected.lemma}
              inGroups={sense && items.isSuccess ? (item?.group_ids ?? []) : null}
            />
            <div className="flex flex-col items-start gap-1">
              {sense && <TextButton onPress={() => setPicker(true)}>{t('otherGroup')}</TextButton>}
            </div>
          </div>
        </div>
      )}
      {picker && sense && <DeckPickerDialog sense={sense} onClose={() => setPicker(false)} />}
    </div>
  );
}

/** Figma "Ô tìm (nổi bật)" (85:3270): the page's own big box; "/" focuses it here (the top bar hides its box on Tra từ). */
function SearchBox({ query, onSearch }: { query: string; onSearch: (q: string) => void }) {
  const t = useTranslations('App.lookup');
  const [text, setText] = useState(query);
  const [seen, setSeen] = useState(query);
  if (seen !== query) {
    setSeen(query);
    setText(query);
  }
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      e.preventDefault();
      box.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    onSearch(text.trim());
  }
  return (
    <form role="search" onSubmit={submit}>
      <label className="flex h-11 items-center gap-2.5 rounded-wm-lg border-2 border-wm-accent bg-wm-surface pl-4 pr-3 shadow-wm-soft focus-within:ring-4 focus-within:ring-wm-accent/16 md:h-12">
        <Search aria-hidden className="size-5 shrink-0 text-wm-accent" />
        <span className="sr-only">{t('searchLabel')}</span>
        <input
          ref={box}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={100}
          placeholder={t('searchLabel')}
          className="min-w-0 flex-1 bg-transparent font-wm-sans text-wm-base text-wm-ink outline-none placeholder:text-wm-muted"
        />
        <kbd aria-hidden className="shrink-0 rounded-wm-sm border border-wm-line bg-wm-bg px-1.5 text-wm-meta font-bold text-wm-ink">
          /
        </kbd>
      </label>
    </form>
  );
}

/**
 * The meaning the dictionary entry shows: the word list previews one sense among those matching the filters, so the card and the
 * stacks pick that same sense (its meaning text, within the filters), not simply the first sense of the word page.
 */
function entrySense(senses: PageSense[], preview: string, p: LookupParams): PageSense | undefined {
  const matching = senses.filter(
    (s) =>
      (!p.pos || s.pos === p.pos) &&
      (!p.level || s.level === p.level) &&
      (!p.topic || s.topics.some((tp) => tp.code === p.topic)) &&
      (!p.mine || s.scope === 'private'),
  );
  const pool = matching.length > 0 ? matching : senses;
  return pool.find((s) => s.meaning.text === preview) ?? pool[0];
}

function AddThis({ word }: { word?: string }) {
  const t = useTranslations('App.lookup');
  const { open } = useAddWord();
  return <Button onPress={() => open(word)}>{t('addThis')}</Button>;
}
