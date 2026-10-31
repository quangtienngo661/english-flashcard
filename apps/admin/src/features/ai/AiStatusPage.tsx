import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { DataList, type Column } from '../../ui/DataList';
import { ListState } from '../../ui/ListState';
import { aiKeys, getStatus, sortByOperationOrder, type AiProvider, type AiStatus } from './ai-api';
import { useAiFormat } from './useAiFormat';

type Operation = AiStatus['operations'][number];

const PROVIDER_ORDER: AiProvider[] = ['openai', 'anthropic', 'fake'];
const panel = 'flex flex-col gap-1 rounded-panel border-2 border-border p-4 text-ui font-semibold text-ink';
const linkClass =
  'inline-flex min-h-control w-fit items-center whitespace-nowrap rounded-control px-4 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-control-touch';

/** A/84, A/84b `/ai/status` (admin only, `settings.manage`): the AI switch, today's totals and one row per operation. */
export function AiStatusPage() {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const query = useQuery({ queryKey: aiKeys.status(), queryFn: () => getStatus(api) });

  if (query.isPending) return <ListState state="loading" />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.problem.slug === 'forbidden') return <Banner variant="error">{t('errors.forbidden')}</Banner>;
    return <ListState state="error" onRetry={() => void query.refetch()} />;
  }

  const status = query.data;
  const { today } = status;
  const keyed = PROVIDER_ORDER.filter((p) => status.providers[p]).map((p) => t(`ai.providers.${p}`));
  const operations = sortByOperationOrder(status.operations);

  const columns: Column<Operation>[] = [
    {
      key: 'operation', header: t('ai.status.cols.operation'), className: 'w-1/5 wrap-anywhere',
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-semibold">{t(`ai.operations.names.${r.operation}`)}</span>
          <code className="text-xs text-muted">{r.operation}</code>
        </span>
      ),
    },
    {
      key: 'ready', header: t('ai.status.cols.ready'), className: 'whitespace-nowrap', card: 'field',
      cell: (r) => <Badge tone={r.ready ? 'success' : 'neutral'}>{t(r.ready ? 'ai.status.ready' : 'ai.status.notReady')}</Badge>,
    },
    {
      key: 'reason', header: t('ai.status.cols.reason'), className: 'wrap-anywhere', card: 'field',
      cell: (r) => (
        <span className="flex flex-col items-start">
          {r.reason && <span>{t(`ai.reasons.${r.reason}`)}</span>}
          {r.model && <span className={r.reason ? 'text-xs text-muted' : ''}>{`${t(`ai.providers.${r.model.provider}`)} · ${r.model.model_id}`}</span>}
          {r.reason === 'model-not-set' && (
            <Link to={`/ai/configs?op=${r.operation}`} className={linkClass} aria-label={t('ai.status.chooseModelFor', { operation: t(`ai.operations.names.${r.operation}`) })}>
              {t('ai.status.chooseModel')}
            </Link>
          )}
        </span>
      ),
    },
    {
      key: 'lastError', header: t('ai.status.cols.lastError'), className: 'wrap-anywhere', card: 'field',
      cell: (r) => {
        const error = r.last_error;
        if (!error) return t('ai.status.noError');
        const outcome = error.http_status === null ? error.outcome : `${error.outcome} (HTTP ${error.http_status})`;
        return (
          <span className="flex flex-col">
            <span>{format.dateTime(error.at)}</span>
            <span className="text-xs text-muted">{`${outcome} · ${t(`ai.status.purposes.${error.purpose}`)}`}</span>
          </span>
        );
      },
    },
    {
      key: 'warning', header: t('ai.status.cols.warning'), className: 'whitespace-nowrap', card: 'field',
      cell: (r) => {
        const warning = r.model_warning;
        if (!warning) return '—';
        return (
          <Badge tone="warning">
            {warning.shutdown_at
              ? t('ai.status.shutdown', { date: format.date(warning.shutdown_at) })
              : t('ai.status.lifecycle', { lifecycle: warning.lifecycle ?? '' })}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className={panel}>
        <p>
          {today.cap === null
            ? t('ai.status.today.callsNoCap', { calls: format.number(today.calls) })
            : t('ai.status.today.calls', { calls: format.number(today.calls), cap: format.number(today.cap) })}
        </p>
        <p>{t('ai.status.today.failed', { count: format.number(today.failed_calls), cost: format.usd(today.failed_cost_usd) })}</p>
        <p>{t('ai.status.today.cost', { usd: format.usd(today.cost_usd), vnd: format.vnd(today.cost_vnd) })}</p>
        <p>{keyed.length > 0 ? t('ai.status.today.providers', { names: keyed.join(' · ') }) : t('ai.status.today.noProvider')}</p>
        <div className="flex flex-wrap items-center gap-x-3">
          <p>{t('ai.status.today.system', { state: t(status.ai_enabled ? 'ai.status.today.on' : 'ai.status.today.off') })}</p>
          {!status.ai_enabled && (
            <Link to="/settings?tab=ai" className={linkClass}>
              {t('ai.status.today.openSettings')}
            </Link>
          )}
        </div>
      </div>

      <DataList rows={operations} rowKey={(r) => r.operation} columns={columns} state="ready" />
      <p className="text-xs text-muted">{t('ai.status.errorNote')}</p>
    </div>
  );
}
