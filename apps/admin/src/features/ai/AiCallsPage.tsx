import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useUrlFilters } from '../../api/use-url-filters';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { Dialog } from '../../ui/Dialog';
import { TextField } from '../../ui/TextField';
import { aiKeys, listCalls, type AiCall } from './ai-api';
import { useAiFormat } from './useAiFormat';

const MAX_ID = 200;
const FILTERS = { operation_id: { default: '', valid: (value: string) => value.length >= 1 && value.length <= MAX_ID } };

/** The stored request or response as indented JSON; text that is not JSON is shown as it is. */
function formatJson(value: unknown): string {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2) ?? '';
}

/** A/86 `/ai/calls?operation_id=` (admin only, `settings.manage`): every provider call of one operation id, oldest first. */
export function AiCallsPage() {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const operationId = filters.operation_id;
  const [draft, setDraft] = useState(operationId);
  const [open, setOpen] = useState<AiCall | null>(null);

  // A link or the Back button changes the applied id; the box follows it (state adjusted while rendering, not in an effect).
  const [seen, setSeen] = useState(operationId);
  if (seen !== operationId) {
    setSeen(operationId);
    setDraft(operationId);
  }

  const query = useQuery({
    queryKey: aiKeys.calls(operationId),
    queryFn: () => listCalls(api, operationId),
    enabled: operationId !== '',
  });

  function search(event: FormEvent) {
    event.preventDefault();
    setFilters({ operation_id: draft.trim() });
  }

  if (query.error instanceof ApiError && query.error.problem.slug === 'forbidden') return <Banner variant="error">{t('errors.forbidden')}</Banner>;

  /** The day and month only ("25/10"): a kept call is at most a few days old. */
  const shortDate = (at: string) => format.date(at).slice(0, -5);
  const two = (top: string, bottom: string | null) => (
    <span className="flex flex-col">
      <span>{top}</span>
      {bottom && <span className="text-xs text-muted">{bottom}</span>}
    </span>
  );

  const columns: Column<AiCall>[] = [
    { key: 'attempt', header: t('ai.calls.cols.attempt'), className: 'whitespace-nowrap font-semibold', cell: (r) => r.attempt },
    { key: 'purpose', header: t('ai.calls.cols.purpose'), className: 'whitespace-nowrap', card: 'field', cell: (r) => t(`ai.status.purposes.${r.purpose}`) },
    {
      key: 'operation', header: t('ai.calls.cols.operation'), className: 'wrap-anywhere', card: 'field',
      cell: (r) => two(t(`ai.operations.names.${r.operation}`), r.prompt_revision === null ? null : t('ai.calls.revision', { revision: r.prompt_revision })),
    },
    {
      key: 'model', header: t('ai.calls.cols.model'), className: 'wrap-anywhere', card: 'field',
      cell: (r) => two(r.model, [t(`ai.providers.${r.provider}`), r.effort].filter(Boolean).join(' · ')),
    },
    { key: 'outcome', header: t('ai.calls.cols.outcome'), className: 'wrap-anywhere', card: 'field', cell: (r) => two(r.outcome, r.provider_error_code) },
    { key: 'http', header: t('ai.calls.cols.http'), className: 'whitespace-nowrap', card: 'field', cell: (r) => r.http_status ?? '—' },
    {
      key: 'tokens', header: t('ai.calls.cols.tokens'), className: 'whitespace-nowrap', card: 'field',
      cell: (r) =>
        two(
          t('ai.calls.tokensInOut', { input: format.number(r.input_tokens), output: format.number(r.output_tokens) }),
          t('ai.calls.tokensExtra', { cached: format.number(r.cached_input_tokens), reasoning: format.number(r.reasoning_tokens) }),
        ),
    },
    {
      key: 'cost', header: t('ai.calls.cols.cost'), className: 'whitespace-nowrap', card: 'field',
      cell: (r) => (r.cost_known && r.cost_usd !== null ? format.usd(r.cost_usd) : t('ai.calls.costUnknown')),
    },
    {
      key: 'time', header: t('ai.calls.cols.time'), className: 'whitespace-nowrap', card: 'field',
      cell: (r) => two(format.dateTime(r.created_at), `${format.number(r.latency_ms)} ms`),
    },
    {
      key: 'content', header: t('ai.calls.cols.content'), className: 'wrap-anywhere', card: 'field',
      cell: (r) =>
        r.content ? (
          <span className="flex flex-col items-start">
            <span>{t('ai.calls.untilDate', { date: shortDate(r.content.expires_at) })}</span>
            <Button variant="ghost" aria-label={t('ai.calls.viewFor', { attempt: r.attempt })} onPress={() => setOpen(r)}>
              {t('ai.calls.view')}
            </Button>
          </span>
        ) : (
          t('ai.calls.noContent')
        ),
    },
  ];

  const content = open?.content ?? null;
  const blocks = content
    ? [
        [t('ai.calls.content.request'), formatJson(content.request)],
        [t('ai.calls.content.response'), formatJson(content.response)],
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={search} noValidate className="flex flex-col gap-3 shell:flex-row shell:items-end">
        <div className="min-w-0 flex-1">
        <TextField
          label={t('ai.calls.search.label')}
          placeholder={t('ai.calls.search.placeholder')}
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_ID}
          value={draft}
          onChange={setDraft}
        />
        </div>
        <Button type="submit" className="w-fit">
          {t('ai.calls.search.submit')}
        </Button>
      </form>

      {operationId === '' ? (
        <p className="text-ui text-muted">{t('ai.calls.hint')}</p>
      ) : (
        <>
          <p className="wrap-anywhere text-ui text-muted">{t('ai.calls.forId', { id: operationId })}</p>
          <DataList
            rows={query.data?.items ?? []}
            rowKey={(r) => r.id}
            columns={columns}
            state={query.isPending ? 'loading' : query.isError ? 'error' : 'ready'}
            emptyText={t('ai.calls.empty')}
            onRetry={() => void query.refetch()}
          />
        </>
      )}

      {open && content && (
        <Dialog
          isOpen
          onOpenChange={(isOpen) => !isOpen && setOpen(null)}
          title={t('ai.calls.content.title')}
          size="lg"
          actions={
            <Button variant="secondary" onPress={() => setOpen(null)}>
              {t('common.close')}
            </Button>
          }
        >
          {blocks.map(([label, json]) => (
            <section key={label} className="flex flex-col gap-1.5">
              <h3 className="text-ui font-semibold text-ink">{label}</h3>
              <pre tabIndex={0} className="max-h-80 overflow-auto whitespace-pre-wrap wrap-anywhere rounded-inner bg-canvas p-3 text-xs text-ink">
                {json}
              </pre>
            </section>
          ))}
        </Dialog>
      )}
    </div>
  );
}
