import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useFormatter, useTranslations } from 'use-intl';
import { useUrlFilters } from '../../api/use-url-filters';
import { PageActions } from '../../app/shell-slots';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { DataList, type Column } from '../../ui/DataList';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
import { LEVELS, listUploads } from '../content/content-api';
import { PasteWordsDialog } from './PasteWordsDialog';
import { WordRowActions } from './WordRowActions';
import { listEntries, senseCounts, WORD_FILTERS, type EntryView } from './words-api';

const ALL = 'all';

/** A/87 `/words` (`content.edit`): search and filter the catalog's words, edit one, paste many. */
export function WordsPage() {
  const t = useTranslations('words');
  const tc = useTranslations('common');
  const format = useFormatter();
  const api = useApi();
  const [filters, setFilters] = useUrlFilters(WORD_FILTERS);
  const [q, setQ] = useState(filters.q);
  const [pasting, setPasting] = useState(false);
  const uploads = useQuery({ queryKey: ['uploads', 'filter-options'], queryFn: () => listUploads(api) });
  const list = useInfiniteQuery({
    queryKey: ['entries', filters],
    queryFn: ({ pageParam }) => listEntries(api, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const date = (iso: string) => format.dateTime(new Date(iso), { day: '2-digit', month: '2-digit', year: 'numeric' });

  function search(event: FormEvent) {
    event.preventDefault();
    setFilters({ q: q.trim() });
  }

  const sensesCell = (r: EntryView) => {
    const c = senseCounts(r.senses);
    if (c.total === 0) return <span className="text-muted">{t('noSense')}</span>;
    const parts = [
      c.published > 0 && t('published', { count: c.published }),
      c.draft > 0 && t('drafts', { count: c.draft }),
      c.retired > 0 && t('retired', { count: c.retired }),
    ].filter(Boolean);
    return (
      <span className="flex flex-col">
        <span>{t('senseCount', { count: c.total })}</span>
        {parts.length > 0 && <span className="text-xs text-muted">{parts.join(' · ')}</span>}
      </span>
    );
  };

  const columns: Column<EntryView>[] = [
    { key: 'lemma', header: t('cols.lemma'), className: 'wrap-anywhere font-semibold', cell: (r) => r.lemma },
    { key: 'pos', header: t('cols.pos'), card: 'field', cell: (r) => r.pos },
    {
      key: 'level', header: t('cols.level'), card: 'field', className: 'whitespace-nowrap',
      cell: (r) => (
        <span className="flex flex-wrap items-center gap-1">
          {r.displayed_level ? <Badge tone="primary">{r.displayed_level}</Badge> : '—'}
          {r.conflict && <Badge tone="warning">{t('conflictBadge')}</Badge>}
        </span>
      ),
    },
    { key: 'senses', header: t('cols.senses'), card: 'field', cell: sensesCell },
    { key: 'function', header: t('cols.functionWord'), card: 'field', cell: (r) => (r.function_word ? t('yes') : t('no')) },
    { key: 'variants', header: t('cols.variants'), card: 'field', className: 'wrap-anywhere', cell: (r) => r.variants.map((v) => v.text).join(', ') || '—' },
    { key: 'actions', header: '', card: 'action', cell: (r) => <WordRowActions entry={r} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <Button variant="secondary" onPress={() => setPasting(true)}>
          {t('pasteButton')}
        </Button>
      </PageActions>
      <form onSubmit={search} noValidate className="flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-0 flex-1 basis-64">
          <TextField label={t('search')} value={q} onChange={setQ} placeholder={t('searchPlaceholder')} spellCheck={false} />
        </div>
        <Button type="submit" variant="secondary">
          {t('searchSubmit')}
        </Button>
      </form>
      <div className="grid gap-4 shell:grid-cols-4 shell:items-end">
        <Select
          label={t('filters.level')}
          value={filters.level || ALL}
          onChange={(v) => setFilters({ level: v === ALL ? '' : v })}
          items={[{ id: ALL, label: t('filters.all') }, ...LEVELS.map((l) => ({ id: l, label: l }))]}
        />
        <Select
          label={t('filters.hasSense')}
          description={t('filters.hasSenseHint')}
          value={filters.has_sense || ALL}
          onChange={(v) => setFilters({ has_sense: v === ALL ? '' : v })}
          items={[
            { id: ALL, label: t('filters.all') },
            { id: 'true', label: t('filters.withSense') },
            { id: 'false', label: t('filters.withoutSense') },
          ]}
        />
        <Select
          label={t('filters.batch')}
          value={filters.batch_id || ALL}
          onChange={(v) => setFilters({ batch_id: v === ALL ? '' : v })}
          items={[
            { id: ALL, label: t('filters.all') },
            ...(uploads.data?.items ?? []).map((u) => ({ id: u.id, label: `${u.file_name} · ${date(u.created_at)}` })),
          ]}
        />
        <div className="pb-2">
          <Checkbox isSelected={filters.conflict === 'true'} onChange={(on) => setFilters({ conflict: on ? 'true' : '' })}>
            {t('filters.conflict')}
          </Checkbox>
        </div>
      </div>

      <DataList
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={t('empty')}
        onRetry={() => void list.refetch()}
      />
      {rows.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-4">
          {list.hasNextPage && (
            <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
              {tc('loadMore')}
            </Button>
          )}
          <p className="text-xs text-muted">{t('footer', { count: rows.length })}</p>
        </div>
      )}
      {pasting && <PasteWordsDialog onClose={() => setPasting(false)} />}
    </div>
  );
}
