import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useFormatter, useLocale, useTranslations } from 'use-intl';
import { useErrorMessage } from '../../api/use-error-message';
import { useUrlFilters } from '../../api/use-url-filters';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataList, type Column } from '../../ui/DataList';
import { Select } from '../../ui/Select';
import { LEVELS, listTopics, listUploads, VALID_POS } from '../content/content-api';
import { topicLabel } from '../content/FilterFields';
import { BulkResultDialog } from './BulkResultDialog';
import {
  BULK_MAX,
  hasOpenEdit,
  listSenses,
  runBulk,
  SENSE_FILTERS,
  SENSE_STATUSES,
  statusKey,
  type BulkAction,
  type BulkResult,
  type SenseRow,
} from './senses-api';

const ALL = 'all';
export const STATUS_TONE: Record<string, 'primary' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  draft: 'warning', reviewed: 'primary', published: 'success', rejected: 'danger', superseded: 'neutral', unpublished: 'neutral', retired: 'neutral', none: 'neutral',
};

/** A/88 `/senses` (`content.edit`): filter, pick rows, run one of five bulk actions; a row opens its detail (A/88b). */
export function SensesPage() {
  const t = useTranslations('senses');
  const tc = useTranslations('common');
  const locale = useLocale();
  const format = useFormatter();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const canPublish = useCan('content.publish');
  const [filters, setFilters] = useUrlFilters(SENSE_FILTERS);
  const filterKey = JSON.stringify(filters);
  const [picked, setPicked] = useState<{ for: string; ids: ReadonlySet<string> }>({ for: filterKey, ids: new Set() });
  // A new filter set starts with nothing picked: rows of the old list are no longer shown.
  const selected = picked.for === filterKey ? picked.ids : new Set<string>();
  const [confirm, setConfirm] = useState<BulkAction | null>(null);
  const [results, setResults] = useState<{ results: BulkResult[]; rows: SenseRow[] } | null>(null);

  const topics = useQuery({ queryKey: ['topics'], queryFn: () => listTopics(api) });
  const uploads = useQuery({ queryKey: ['uploads', 'filter-options'], queryFn: () => listUploads(api) });
  const list = useInfiniteQuery({
    queryKey: ['senses', filters],
    queryFn: ({ pageParam }) => listSenses(api, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const chosen = rows.filter((r) => selected.has(r.sense_id));

  const bulk = useMutation({
    mutationFn: (action: BulkAction) => runBulk(api, action, chosen),
    onSuccess: async (out) => {
      setResults({ results: out, rows: chosen });
      setPicked({ for: filterKey, ids: new Set() });
      await queryClient.invalidateQueries({ queryKey: ['senses'] });
    },
  });
  const start = (action: BulkAction) => (action === 'unpublish' || action === 'retire' ? setConfirm(action) : bulk.mutate(action));
  const date = (iso: string) => format.dateTime(new Date(iso), { day: '2-digit', month: '2-digit', year: 'numeric' });

  const columns: Column<SenseRow>[] = [
    {
      key: 'lemma', header: t('cols.lemma'), className: 'wrap-anywhere font-semibold',
      cell: (r) => <Link to={`/senses/${r.sense_id}`} className="text-ink underline-offset-2 hover:underline">{r.lemma}</Link>,
    },
    { key: 'pos', header: t('cols.pos'), card: 'field', cell: (r) => r.pos },
    { key: 'gloss', header: t('cols.gloss'), card: 'field', className: 'wrap-anywhere', cell: (r) => r.content?.gloss_vi || '—' },
    { key: 'level', header: t('cols.level'), card: 'field', cell: (r) => (r.displayed_level ? <Badge tone="primary">{r.displayed_level}</Badge> : '—') },
    {
      key: 'status', header: t('cols.status'), card: 'field', className: 'whitespace-nowrap',
      cell: (r) => <Badge tone={STATUS_TONE[statusKey(r)]}>{t(`status.${statusKey(r)}` as 'status.draft')}</Badge>,
    },
    {
      key: 'revision', header: t('cols.revision'), card: 'field',
      cell: (r) => (r.revision === null ? '—' : hasOpenEdit(r) ? t('openEdit', { revision: r.revision }) : `#${r.revision}`),
    },
    {
      key: 'missing', header: t('cols.missing'), card: 'field',
      cell: (r) => (r.missing.length === 0 ? '—' : r.missing.map((m) => t(`bulk.missing.${m}`)).join(' · ')),
    },
  ];
  const actions: BulkAction[] = canPublish ? ['review', 'reject', 'publish', 'unpublish', 'retire'] : ['review', 'reject'];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 shell:grid-cols-5 shell:items-end">
        <Select
          label={t('filters.status')}
          value={filters.status || ALL}
          onChange={(v) => setFilters({ status: v === ALL ? '' : v })}
          items={[{ id: ALL, label: t('filters.all') }, ...SENSE_STATUSES.map((s) => ({ id: s, label: t(`filters.statuses.${s}`) }))]}
        />
        <Select
          label={t('filters.level')}
          value={filters.level || ALL}
          onChange={(v) => setFilters({ level: v === ALL ? '' : v })}
          items={[{ id: ALL, label: t('filters.all') }, ...LEVELS.map((l) => ({ id: l, label: l }))]}
        />
        <Select
          label={t('filters.pos')}
          value={filters.pos || ALL}
          onChange={(v) => setFilters({ pos: v === ALL ? '' : v })}
          items={[{ id: ALL, label: t('filters.all') }, ...VALID_POS.map((p) => ({ id: p, label: p }))]}
        />
        <Select
          label={t('filters.topic')}
          value={filters.topic || ALL}
          onChange={(v) => setFilters({ topic: v === ALL ? '' : v })}
          items={[
            { id: ALL, label: t('filters.all') },
            ...(topics.data ?? []).map((tp) => ({ id: tp.code, label: topicLabel(tp, locale, t('archived')) })),
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
      </div>

      {selected.size > 0 && (
        <div role="region" aria-label={t('bulk.region')} className="flex flex-wrap items-center gap-3 rounded-panel bg-primary-soft p-3">
          <span className="text-ui font-semibold text-ink">{t('bulk.selected', { count: selected.size })}</span>
          {actions.map((action) => (
            <Button key={action} variant="secondary" isPending={bulk.isPending && bulk.variables === action} isDisabled={bulk.isPending || chosen.length > BULK_MAX} onPress={() => start(action)}>
              {t(`bulk.actions.${action}`)}
            </Button>
          ))}
          {chosen.length > BULK_MAX && <span className="text-xs text-danger">{t('bulk.tooMany', { max: BULK_MAX })}</span>}
        </div>
      )}
      {bulk.error && <Banner variant="error">{errorMessage(bulk.error)}</Banner>}

      <DataList
        rows={rows}
        rowKey={(r) => r.sense_id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={t('empty')}
        onRetry={() => void list.refetch()}
        rowHref={(r) => `/senses/${r.sense_id}`}
        selection={{
          selected,
          onChange: (ids) => setPicked({ for: filterKey, ids }),
          label: (r) => t('bulk.pick', { word: `${r.lemma} · ${r.pos}` }),
        }}
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

      <ConfirmDialog
        isOpen={confirm !== null}
        title={confirm ? t(`bulk.confirm.${confirm as 'retire'}.title`, { count: chosen.length }) : ''}
        confirmLabel={confirm ? t(`bulk.actions.${confirm}`) : ''}
        tone="danger"
        onConfirm={() => {
          const action = confirm!;
          setConfirm(null);
          bulk.mutate(action);
        }}
        onCancel={() => setConfirm(null)}
      >
        {confirm ? t(`bulk.confirm.${confirm as 'retire'}.body`) : null}
      </ConfirmDialog>
      {results && <BulkResultDialog results={results.results} rows={results.rows} onClose={() => setResults(null)} />}
    </div>
  );
}
