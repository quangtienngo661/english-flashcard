import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslations } from 'use-intl';
import { violationsToFields, useFocusFirstError } from '../../api/field-errors';
import { ApiError } from '../../api/problem';
import { useApi } from '../../auth/session-context';
import { useUrlFilters } from '../../api/use-url-filters';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
import { aiKeys, COST_GROUPS, getCosts, type AiOperation, type AiPurpose, type CostGroup, type CostTotals } from './ai-api';
import { isDay, rangeProblem, todayInAdminZone, type RangeProblem } from './cost-range';
import { useAiFormat } from './useAiFormat';

const FILTERS = {
  from: { default: '', valid: isDay },
  to: { default: '', valid: isDay },
  group_by: { default: 'day', valid: (value: string) => (COST_GROUPS as readonly string[]).includes(value) },
};
const FROM_ID = 'costs-from';
const TO_ID = 'costs-to';
const OPERATIONS = ['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'];
const PURPOSES = ['learner', 'test', 'eval'];

type Row = CostTotals & { key: string; isTotal: boolean };
type Fields = { from?: string; to?: string };

/** What an API 400 on the range means for a date field (`from: Must not be after to`, `to: The range must be at most 366 days`). */
const API_FIELD: Record<string, 'from' | 'to'> = { from: 'from', to: 'to' };

/** A/85 `/ai/costs?from=&to=&group_by=` (admin only, `settings.manage`): calls, tokens and cost per group over up to 366 Vietnam days. */
export function AiCostsPage() {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const groupBy = filters.group_by as CostGroup;
  const today = todayInAdminZone(new Date());
  const from = filters.from || today;
  const to = filters.to || today;
  const [draft, setDraft] = useState({ from, to });
  const [submitProblem, setSubmitProblem] = useState<RangeProblem | null>(null);

  // A link or the Back button changes the applied range; the boxes follow it (state adjusted while rendering, not in an effect).
  const [seen, setSeen] = useState(`${from}|${to}`);
  if (seen !== `${from}|${to}`) {
    setSeen(`${from}|${to}`);
    setDraft({ from, to });
    setSubmitProblem(null);
  }

  const urlProblem = rangeProblem(from, to);
  const query = useQuery({
    queryKey: aiKeys.costs(from, to, groupBy),
    queryFn: () => getCosts(api, from, to, groupBy),
    enabled: urlProblem === null,
  });

  const problemFields = (p: RangeProblem | null): Fields => ({
    ...(p?.from ? { from: t(`ai.costs.errors.${p.from}`) } : {}),
    ...(p?.to ? { to: t(`ai.costs.errors.${p.to}`) } : {}),
  });
  const apiProblem = query.error instanceof ApiError && query.error.problem.status === 400 ? query.error.problem : null;
  const apiSplit = apiProblem ? violationsToFields(apiProblem.violations ?? [], (path) => API_FIELD[path] ?? null) : null;
  const apiFields: Fields = apiSplit
    ? { ...(apiSplit.fields.from ? { from: t('ai.costs.errors.fromAfterTo') } : {}), ...(apiSplit.fields.to ? { to: t('ai.costs.errors.tooLong') } : {}) }
    : {};
  const errors: Fields = { ...apiFields, ...problemFields(urlProblem), ...problemFields(submitProblem) };
  useFocusFirstError({ ...(errors.from ? { [FROM_ID]: errors.from } : {}), ...(errors.to ? { [TO_ID]: errors.to } : {}) }, [FROM_ID, TO_ID]);

  function apply(event: FormEvent) {
    event.preventDefault();
    const problem = rangeProblem(draft.from, draft.to);
    setSubmitProblem(problem);
    if (problem) return;
    setFilters({ from: draft.from, to: draft.to });
  }

  const forbidden = query.error instanceof ApiError && query.error.problem.slug === 'forbidden';
  if (forbidden) return <Banner variant="error">{t('errors.forbidden')}</Banner>;

  const groupLabel = (key: string): ReactNode => {
    if (groupBy === 'day') return format.date(`${key}T00:00:00+07:00`);
    if (groupBy === 'operation' && OPERATIONS.includes(key)) {
      return (
        <span className="flex flex-col">
          <span className="font-semibold">{t(`ai.operations.names.${key as AiOperation}`)}</span>
          <code className="text-xs text-muted">{key}</code>
        </span>
      );
    }
    if (groupBy === 'purpose' && PURPOSES.includes(key)) return t(`ai.status.purposes.${key as AiPurpose}`);
    return key;
  };

  const strong = (row: Row, content: ReactNode) => <span className={row.isTotal ? 'font-bold' : undefined}>{content}</span>;
  const numeric = 'whitespace-nowrap';
  const columns: Column<Row>[] = [
    { key: 'group', header: t('ai.costs.cols.group'), className: 'wrap-anywhere', cell: (r) => (r.isTotal ? strong(r, t('ai.costs.total')) : groupLabel(r.key)) },
    { key: 'calls', header: t('ai.costs.cols.calls'), className: numeric, card: 'field', cell: (r) => strong(r, format.number(r.calls)) },
    { key: 'input', header: t('ai.costs.cols.input'), className: numeric, card: 'field', cell: (r) => strong(r, format.number(r.input_tokens)) },
    { key: 'cached', header: t('ai.costs.cols.cached'), className: numeric, card: 'field', cell: (r) => strong(r, format.number(r.cached_input_tokens)) },
    { key: 'output', header: t('ai.costs.cols.output'), className: numeric, card: 'field', cell: (r) => strong(r, format.number(r.output_tokens)) },
    { key: 'reasoning', header: t('ai.costs.cols.reasoning'), className: numeric, card: 'field', cell: (r) => strong(r, format.number(r.reasoning_tokens)) },
    { key: 'usd', header: t('ai.costs.cols.usd'), className: numeric, card: 'field', cell: (r) => strong(r, format.usd(r.cost_usd)) },
    { key: 'vnd', header: t('ai.costs.cols.vnd'), className: numeric, card: 'field', cell: (r) => strong(r, format.vnd(r.cost_vnd)) },
    { key: 'unknown', header: t('ai.costs.cols.unknown'), className: numeric, card: 'field', cell: (r) => strong(r, format.number(r.unknown_cost_calls)) },
  ];

  const rows: Row[] = query.data
    ? [...query.data.items.map((item) => ({ ...item, isTotal: false })), ...(query.data.items.length > 0 ? [{ ...query.data.total, key: 'total', isTotal: true }] : [])]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-ui text-muted">{t('ai.costs.note')}</p>
      <form onSubmit={apply} noValidate className="grid gap-3 shell:grid-cols-4 shell:items-end">
        <TextField
          id={FROM_ID}
          label={t('ai.costs.filters.from')}
          type="date"
          value={draft.from}
          onChange={(value) => { setDraft({ ...draft, from: value }); setSubmitProblem(null); }}
          error={errors.from}
        />
        <TextField
          id={TO_ID}
          label={t('ai.costs.filters.to')}
          type="date"
          value={draft.to}
          onChange={(value) => { setDraft({ ...draft, to: value }); setSubmitProblem(null); }}
          error={errors.to}
        />
        <Select
          label={t('ai.costs.filters.groupBy')}
          value={groupBy}
          onChange={(value) => setFilters({ group_by: value })}
          items={COST_GROUPS.map((group) => ({ id: group, label: t(`ai.costs.groups.${group}`) }))}
        />
        <Button type="submit" className="w-fit">
          {t('ai.costs.filters.apply')}
        </Button>
      </form>

      {apiSplit && apiSplit.form.length > 0 && <Banner variant="error">{apiSplit.form.join(' ')}</Banner>}

      {urlProblem === null && !apiProblem && (
        <DataList
          rows={rows}
          rowKey={(r) => (r.isTotal ? '\u0000total' : r.key)}
          columns={columns}
          state={query.isPending ? 'loading' : query.isError ? 'error' : 'ready'}
          emptyText={t('ai.costs.empty')}
          onRetry={() => void query.refetch()}
        />
      )}
    </div>
  );
}
