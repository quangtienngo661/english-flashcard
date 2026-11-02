import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { userLabel } from '../../api/user-ref';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { PanelBody, PanelHead } from '../../ui/DetailPanel';
import { ListState } from '../../ui/ListState';
import { POLL_INTERVAL_MS } from '../jobs/usePollingStatus';
import { getJudgePass, UUID } from './ai-api';
import { BatchCost, BatchStatusBadge, BatchTokens } from './BatchSummary';
import { BatchTestOutputs } from './BatchTestOutputs';
import { batchKeys, getBatch, isBatchActive } from './batches-api';
import { useAiFormat } from './useAiFormat';

const linkClass = 'inline-flex min-h-control items-center rounded-control text-ui text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary';

/** Judge passes may score an eval or real questions: resolve provenance instead of treating a pass ID as a run ID. */
function JudgeSource({ id, operation }: { id: string; operation: string }) {
  const t = useTranslations();
  const api = useApi();
  const query = useQuery({ queryKey: ['ai', 'judge-pass', id], queryFn: () => getJudgePass(api, id) });
  if (query.isError) return <ListState state="error" onRetry={() => void query.refetch()} />;
  if (!query.data) return <ListState state="loading" />;
  const href = query.data.eval_run_id ? `/ai/eval/runs/${query.data.eval_run_id}?op=${encodeURIComponent(operation)}` : `/ai/real-questions?pass=${encodeURIComponent(id)}`;
  return <Link aria-label={t('ai.costs.batches.judgeSource')} className={`${linkClass} flex-wrap gap-x-2 wrap-anywhere`} to={href}>{t('ai.costs.batches.judgeSource')} <span className="text-xs">{id}</span></Link>;
}

/** Only configuration fields belong in the prompt preview; never dump opaque snapshots containing source data. */
function promptSnapshot(snapshot: Record<string, unknown>) {
  const fields = ['instructions', 'examples', 'model_ref', 'effort', 'thinking', 'max_output_tokens'];
  return JSON.stringify(Object.fromEntries(fields.filter((key) => key in snapshot).map((key) => [key, snapshot[key]])), null, 2);
}

export function BatchDetail({ id, batchHref }: { id: string; batchHref: (id: string) => string }) {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const valid = UUID.test(id);
  const query = useQuery({
    queryKey: batchKeys.detail(id), queryFn: () => getBatch(api, id), enabled: valid,
    refetchInterval: (q) => q.state.data && isBatchActive(q.state.data) && !q.state.error ? POLL_INTERVAL_MS : false,
  });
  const batch = query.data;
  const error = query.error instanceof ApiError ? query.error.problem : null;
  const content = !valid ? <Banner variant="error">{t('ai.costs.batches.invalidId')}</Banner>
    : error?.status === 404 ? <Banner variant="error">{t('ai.costs.batches.notFound')}</Banner>
    : error?.slug === 'forbidden' ? <Banner variant="error">{t('errors.forbidden')}</Banner>
    : query.isError ? <ListState state="error" onRetry={() => void query.refetch()} />
    : !batch ? <ListState state="loading" /> : null;
  const rows = batch ? [
    [t('ai.costs.batches.cols.progress'), t('ai.costs.batches.progress', { done: format.number(batch.done), total: format.number(batch.total) })],
    [t('ai.costs.batches.startedBy'), userLabel(batch.started_by_user, t)],
    [t('ai.costs.batches.createdAt'), format.dateTime(batch.created_at)],
    [t('ai.costs.batches.startedAt'), batch.started_at ? format.dateTime(batch.started_at) : '—'],
    [t('ai.costs.batches.finishedAt'), batch.finished_at ? format.dateTime(batch.finished_at) : '—'],
    [t('ai.costs.batches.fingerprint'), batch.fingerprint ?? '—'],
  ] : [];
  return (
    <>
      <PanelHead title={t('ai.costs.batches.title')} status={<span className="text-xs text-muted">{id}</span>} />
      <PanelBody focusable>
        {content || (batch && <>
          <div className="flex flex-wrap gap-3"><BatchStatusBadge batch={batch} /><span className="text-ui">{t(`ai.costs.batches.kinds.${batch.kind}`)}</span></div>
          <p className="wrap-anywhere text-ui font-semibold">{batch.provider} / {batch.model}</p>
          {/* These identify the frozen run's config provenance, not whether its content was saved or temporary.
              The API has no explicit flag for that distinction; execution snapshots must not be used to guess it. */}
          <p className="wrap-anywhere text-ui">{batch.config_id ? t('ai.costs.batches.config', { id: batch.config_id, version: batch.config_version ?? '—' }) : t('ai.costs.batches.noConfig')}</p>
          {(!batch.config_id || batch.config_version === null || !batch.fingerprint) && <p className="text-ui text-muted">{t('ai.costs.batches.sourceUnknown')}</p>}
          <section aria-label={t('ai.costs.batches.cols.cost')}><BatchCost batch={batch} /></section>
          <section aria-label={t('ai.costs.batches.cols.tokens')}><BatchTokens batch={batch} /></section>
          <dl className="flex flex-col gap-3 text-ui">{rows.map(([label, value]) => <div key={label} className="flex min-w-0 flex-col gap-1"><dt className="text-xs text-muted">{label}</dt><dd className="wrap-anywhere tabular-nums">{value}</dd></div>)}</dl>
          <p className="text-ui text-muted">{t('ai.costs.batches.snapshotNote')}</p>
          {batch.snapshot ? <details><summary className="cursor-pointer rounded-control text-ui text-primary focus-visible:ring-2 focus-visible:ring-primary">{t('ai.costs.batches.snapshot')}</summary><pre tabIndex={0} className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap wrap-anywhere rounded-inner bg-canvas p-3 text-xs">{promptSnapshot(batch.snapshot)}</pre></details> : <p className="text-ui text-muted">{t('ai.costs.batches.noSnapshot')}</p>}
          <div className="flex flex-col items-start gap-2">
            {batch.kind === 'eval' && batch.source_id && <Link aria-label={t('ai.costs.batches.evalSource')} className={`${linkClass} flex-wrap gap-x-2 wrap-anywhere`} to={`/ai/eval/runs/${batch.source_id}?op=${encodeURIComponent(batch.operation)}`}>{t('ai.costs.batches.evalSource')} <span className="text-xs">{batch.source_id}</span></Link>}
            {batch.kind === 'judge' && batch.source_id && <JudgeSource id={batch.source_id} operation={batch.operation} />}
            {batch.parent_id && <Link aria-label={t('ai.costs.batches.parent')} className={`${linkClass} flex-wrap gap-x-2 wrap-anywhere`} to={batchHref(batch.parent_id)}>{t('ai.costs.batches.parent')} <span className="text-xs">{batch.parent_id}</span></Link>}
            {batch.config_id && <Link className={linkClass} to={`/ai/configs/history?op=${encodeURIComponent(batch.operation)}`}>{t('ai.costs.batches.draft')}</Link>}
          </div>
          {batch.kind !== 'test' ? <p className="text-ui text-muted">{t('ai.costs.batches.resultsElsewhere')}</p> : <BatchTestOutputs items={batch.items} />}
        </>)}
      </PanelBody>
    </>
  );
}
