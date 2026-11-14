import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link, useSearchParams } from 'react-router';
import { useTranslations } from 'use-intl';
import { useFocusFirstError, violationsToFields } from '../../api/field-errors';
import { ApiError } from '../../api/problem';
import { useUrlFilters } from '../../api/use-url-filters';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { DetailPanel } from '../../ui/DetailPanel';
import { focusRowLink } from '../../ui/focus-row-link';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
import { useRetained } from '../../ui/use-retained';
import { POLL_INTERVAL_MS } from '../jobs/usePollingStatus';
import { AI_OPERATION_ORDER } from './ai-api';
import { BatchDetail } from './BatchDetail';
import { BatchCost, BatchStatusBadge, BatchTokens } from './BatchSummary';
import { BATCH_KINDS, BATCH_STATUSES, batchKeys, isBatchActive, listBatches, type AiBatch } from './batches-api';
import { isDay, rangeProblem, todayInAdminZone, type RangeProblem } from './cost-range';
import { useAiFormat } from './useAiFormat';

const OPERATIONS = [...AI_OPERATION_ORDER, 'judge'] as const;
const contains = (values: readonly string[]) => (value: string) => value === '' || values.includes(value);
const FILTERS = {
  from: { default: '', valid: isDay }, to: { default: '', valid: isDay },
  operation: { default: '', valid: contains(OPERATIONS) }, kind: { default: '', valid: contains(BATCH_KINDS) }, status: { default: '', valid: contains(BATCH_STATUSES) },
};
const ALL = '__all';
const FROM_ID = 'batches-from';
const TO_ID = 'batches-to';
const linkClass = 'rounded-control text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary';

export function CostsBatchesPanel() {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const today = todayInAdminZone(new Date());
  const from = filters.from || today;
  const to = filters.to || today;
  const [draft, setDraft] = useState({ from, to });
  const [submitProblem, setSubmitProblem] = useState<RangeProblem | null>(null);
  const [seen, setSeen] = useState(`${from}|${to}`);
  if (seen !== `${from}|${to}`) {
    setSeen(`${from}|${to}`);
    setDraft({ from, to });
    setSubmitProblem(null);
  }
  const urlProblem = rangeProblem(from, to);
  const applied = { ...filters, from, to };
  const query = useInfiniteQuery({
    queryKey: batchKeys.list(applied), queryFn: ({ pageParam }) => listBatches(api, applied, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
    enabled: urlProblem === null,
    refetchInterval: (q) => q.state.data?.pages.some((page) => page.items.some(isBatchActive)) ? POLL_INTERVAL_MS : false,
  });
  const apiProblem = query.error instanceof ApiError && query.error.problem.status === 400 ? query.error.problem : null;
  const apiSplit = apiProblem ? violationsToFields(apiProblem.violations ?? [], (path) => path === 'from' || path === 'to' ? path : null) : null;
  const problem = submitProblem ?? urlProblem;
  const errors = {
    from: problem?.from ? t(`ai.costs.errors.${problem.from}`) : apiSplit?.fields.from ? t('ai.costs.errors.fromAfterTo') : undefined,
    to: problem?.to ? t(`ai.costs.errors.${problem.to}`) : apiSplit?.fields.to ? t('ai.costs.errors.tooLong') : undefined,
  };
  useFocusFirstError({ ...(errors.from ? { [FROM_ID]: errors.from } : {}), ...(errors.to ? { [TO_ID]: errors.to } : {}) }, [FROM_ID, TO_ID]);
  const id = params.get('batch') ?? undefined;
  const shownId = useRetained(id);
  function href(batchId: string) {
    const next = new URLSearchParams(params);
    next.set('batch', batchId);
    return `/ai/costs?${next}`;
  }
  const close = () => setParams((prev) => { const next = new URLSearchParams(prev); next.delete('batch'); return next; });
  function apply(event: FormEvent) {
    event.preventDefault();
    const error = rangeProblem(draft.from, draft.to);
    flushSync(() => setSubmitProblem(null));
    setSubmitProblem(error);
    if (!error) setFilters(draft);
  }
  const change = (field: 'operation' | 'kind' | 'status', value: string) => setFilters({ [field]: value === ALL ? '' : value });
  const options = (values: readonly string[], prefix: string) => [{ id: ALL, label: t('ai.costs.batches.all') }, ...values.map((value) => ({ id: value, label: t(`${prefix}.${value}`) }))];
  const columns: Column<AiBatch>[] = [
    { key: 'batch', header: t('ai.costs.batches.cols.batch'), cell: (row) => <span className="flex flex-col gap-1"><Link to={href(row.id)} className={linkClass} aria-label={t('ai.costs.batches.open', { id: row.id })}>{row.id}</Link><span>{t(`ai.costs.batches.kinds.${row.kind}`)} · {t(`ai.operations.names.${row.operation}`)}</span><span className="text-xs text-muted">{format.dateTime(row.created_at)}</span></span> },
    { key: 'model', header: t('ai.costs.batches.cols.model'), card: 'field', cell: (row) => <span className="flex flex-col gap-1"><span className="font-semibold">{row.model}</span><span className="text-xs text-muted">{row.provider}</span><span className="text-xs text-muted">{row.config_id ? t('ai.costs.batches.config', { id: row.config_id, version: row.config_version ?? '—' }) : t('ai.costs.batches.noConfig')}</span></span> },
    { key: 'progress', header: t('ai.costs.batches.cols.progress'), card: 'field', cell: (row) => <span className="flex flex-col gap-1"><BatchStatusBadge batch={row} /><span className="tabular-nums">{t('ai.costs.batches.progress', { done: format.number(row.done), total: format.number(row.total) })}</span></span> },
    { key: 'tokens', header: t('ai.costs.batches.cols.tokens'), card: 'field', cell: (row) => <BatchTokens batch={row} /> },
    { key: 'cost', header: t('ai.costs.batches.cols.cost'), card: 'field', cell: (row) => <BatchCost batch={row} /> },
  ];
  if (query.error instanceof ApiError && query.error.problem.slug === 'forbidden') return <Banner variant="error">{t('errors.forbidden')}</Banner>;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <p className="max-w-prose text-ui text-muted">{t('ai.costs.batches.note')}</p>
      <form onSubmit={apply} noValidate className="grid gap-3 shell:grid-cols-3 shell:items-end">
        <TextField id={FROM_ID} label={t('ai.costs.filters.from')} type="date" value={draft.from} error={errors.from} onChange={(value) => { setDraft({ ...draft, from: value }); setSubmitProblem(null); }} />
        <TextField id={TO_ID} label={t('ai.costs.filters.to')} type="date" value={draft.to} error={errors.to} onChange={(value) => { setDraft({ ...draft, to: value }); setSubmitProblem(null); }} />
        <Button type="submit" className="w-fit">{t('ai.costs.filters.apply')}</Button>
        <Select label={t('ai.costs.batches.operation')} value={filters.operation || ALL} onChange={(value) => change('operation', value)} items={options(OPERATIONS, 'ai.operations.names')} />
        <Select label={t('ai.costs.batches.kind')} value={filters.kind || ALL} onChange={(value) => change('kind', value)} items={options(BATCH_KINDS, 'ai.costs.batches.kinds')} />
        <Select label={t('ai.costs.batches.status')} value={filters.status || ALL} onChange={(value) => change('status', value)} items={options(BATCH_STATUSES, 'ai.costs.batches.statuses')} />
      </form>
      {apiSplit && apiSplit.form.length > 0 && <Banner variant="error">{apiSplit.form.join(' ')}</Banner>}
      {urlProblem === null && !apiProblem && <DataList rows={query.data?.pages.flatMap((page) => page.items) ?? []} rowKey={(row) => row.id} rowHref={(row) => href(row.id)} selectedKey={id} columns={columns} state={query.isPending ? 'loading' : query.isError && !query.data ? 'error' : 'ready'} emptyText={t('ai.costs.batches.empty')} onRetry={() => void query.refetch()} />}
      {query.isError && query.data && <Banner variant="error" action={<Button variant="secondary" onPress={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}>{t('common.retry')}</Button>}>{t('list.error')}</Banner>}
      {query.hasNextPage && <Button variant="secondary" isPending={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}>{t('common.loadMore')}</Button>}
      <DetailPanel isOpen={id !== undefined} onClose={close} focusKey={id ?? ''} onExited={() => id && focusRowLink(href(id))}>
        {shownId && <BatchDetail key={shownId} id={shownId} batchHref={href} />}
      </DetailPanel>
    </div>
  );
}
