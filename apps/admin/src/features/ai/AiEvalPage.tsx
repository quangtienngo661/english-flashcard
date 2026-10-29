import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useMatch, useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useUrlFilters } from '../../api/use-url-filters';
import { userLabel } from '../../api/user-ref';
import { PageActions } from '../../app/shell-slots';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataList, type Column } from '../../ui/DataList';
import { DetailPanel } from '../../ui/DetailPanel';
import { focusRowLink } from '../../ui/focus-row-link';
import { ListState } from '../../ui/ListState';
import { Select } from '../../ui/Select';
import { showToast } from '../../ui/Toast';
import { useRetained } from '../../ui/use-retained';
import {
  AI_OPERATION_ORDER, aiKeys, deleteExample, getTestQuota, isDevExample, listExamples, listOperations, listRuns, type AiOperation, type EvalExample, type EvalRun,
} from './ai-api';
import { EvalRunPanel, RunStatusBadge, StartRunFailure, usePromptLabel, useStartRun } from './EvalRunPanel';
import { BulkExamplesDialog } from './BulkExamplesDialog';
import { ExampleDialog } from './ExampleDialog';
import { exampleSummary } from './prompt-form';
import { useAiFormat } from './useAiFormat';

const FILTERS = { op: { default: 'generate_cloze', valid: (value: string) => (AI_OPERATION_ORDER as readonly string[]).includes(value) } };

const isForbidden = (error: unknown) => error instanceof ApiError && error.problem.slug === 'forbidden';

/**
 * A/83 `/ai/eval?op=` (admin only): the example set of one operation (at most 1000) and its runs. `new` and `bulk` open the add dialogs over the
 * page, `runs/:id` a run beside it. [Chạy bộ ví dụ] here runs the current prompt; a draft is run from the Prompt page (design §6.5).
 */
export function AiEvalPage() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const { search } = useLocation();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const format = useAiFormat();
  const promptLabel = usePromptLabel();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const op = filters.op as AiOperation;
  const isNew = useMatch('/ai/eval/new') !== null;
  const isBulk = useMatch('/ai/eval/bulk') !== null;
  const runId = useMatch('/ai/eval/runs/:id')?.params.id;
  const shownRunId = useRetained(runId);
  const [editing, setEditing] = useState<EvalExample | null>(null);
  const [deleting, setDeleting] = useState<EvalExample | null>(null);
  const [problem, setProblem] = useState<ErrorDetails | null>(null);

  const examples = useQuery({ queryKey: aiKeys.examples(op), queryFn: () => listExamples(api, op) });
  const operations = useQuery({ queryKey: aiKeys.operations(), queryFn: () => listOperations(api) });
  const quota = useQuery({ queryKey: aiKeys.testQuota(), queryFn: () => getTestQuota(api) });
  const runs = useInfiniteQuery({
    queryKey: aiKeys.runs(op),
    queryFn: ({ pageParam }) => listRuns(api, op, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const runRows = runs.data?.pages.flatMap((page) => page.items) ?? [];
  const runHref = (id: string) => `/ai/eval/runs/${id}${search}`;
  const start = useStartRun(op, '', (id) => void navigate(runHref(id)));

  const remove = useMutation({
    mutationFn: (example: EvalExample) => deleteExample(api, example.id),
    onMutate: () => setProblem(null),
    onSuccess: async () => {
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: aiKeys.examples(op) });
      showToast(t('ai.eval.toast.deleted'));
    },
    onError: (e) => {
      setDeleting(null);
      setProblem(errorDetails(e));
    },
  });

  const inputFields = operations.data?.items.find((setting) => setting.operation === op)?.input_fields;
  const set = (examples.data?.items ?? []).filter(isDevExample);
  const items = AI_OPERATION_ORDER.map((id) => ({ id, label: `${t(`ai.operations.names.${id}`)} (${id})` }));
  const back = () => void navigate(`/ai/eval${search}`);

  const exampleColumns: Column<EvalExample>[] = [
    { key: 'input', header: t('ai.eval.cols.input'), className: 'w-2/5 wrap-anywhere', cell: (e) => exampleSummary(e.input) },
    { key: 'note', header: t('ai.eval.cols.note'), className: 'wrap-anywhere', card: 'field', cell: (e) => e.note ?? t('ai.eval.detail.none') },
    { key: 'createdBy', header: t('ai.eval.cols.createdBy'), className: 'wrap-anywhere', card: 'field', cell: (e) => userLabel(e.created_by_user, t) },
    {
      key: 'actions', header: t('ai.eval.cols.actions'), card: 'action',
      cell: (e) => (
        <span className="flex flex-wrap items-center gap-x-1">
          <Button variant="ghost" aria-label={t('ai.eval.editFor', { summary: exampleSummary(e.input) })} isDisabled={!inputFields} onPress={() => setEditing(e)}>
            {t('ai.eval.edit')}
          </Button>
          <Button variant="ghost" className="text-danger" aria-label={t('ai.eval.deleteFor', { summary: exampleSummary(e.input) })} onPress={() => setDeleting(e)}>
            {t('ai.eval.delete')}
          </Button>
        </span>
      ),
    },
  ];

  const runColumns: Column<EvalRun>[] = [
    {
      key: 'time', header: t('ai.eval.runs.cols.time'), className: 'whitespace-nowrap tabular-nums',
      cell: (r) => (
        <Link to={runHref(r.id)} className="rounded-control text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">
          {format.dateTime(r.created_at)}
        </Link>
      ),
    },
    { key: 'status', header: t('ai.eval.runs.cols.status'), card: 'field', cell: (r) => <RunStatusBadge status={r.status} error={r.error} /> },
    { key: 'progress', header: t('ai.eval.runs.cols.progress'), className: 'tabular-nums', card: 'field', cell: (r) => `${format.number(r.done)}/${format.number(r.total)}` },
    { key: 'valid', header: t('ai.eval.runs.cols.valid'), className: 'tabular-nums', card: 'field', cell: (r) => format.number(r.valid_count) },
    { key: 'prompt', header: t('ai.eval.runs.cols.prompt'), card: 'field', cell: (r) => promptLabel(r) },
    { key: 'startedBy', header: t('ai.eval.runs.cols.startedBy'), className: 'wrap-anywhere', card: 'field', cell: (r) => userLabel(r.started_by_user, t) },
  ];

  let examplesBody;
  if (examples.isError && !examples.data) {
    examplesBody = isForbidden(examples.error)
      ? <Banner variant="error">{t('errors.forbidden')}</Banner>
      : <ListState state="error" onRetry={() => void examples.refetch()} />;
  } else {
    examplesBody = (
      <DataList
        rows={set}
        rowKey={(e) => e.id}
        columns={exampleColumns}
        state={examples.isPending ? 'loading' : 'ready'}
        emptyText={t('ai.eval.empty')}
        emptyHint={t('ai.eval.emptyHint')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <Button variant="secondary" isDisabled={!inputFields} onPress={() => void navigate(`/ai/eval/bulk${search}`)}>{t('ai.eval.bulk.add')}</Button>
        <Button variant="secondary" isDisabled={!inputFields} onPress={() => void navigate(`/ai/eval/new${search}`)}>{t('ai.eval.add')}</Button>
      </PageActions>
      <div className="w-full max-w-sm">
        <Select label={t('ai.eval.operation')} items={items} value={op} onChange={(value) => setFilters({ op: value })} />
      </div>
      {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
      {operations.isError && <Banner variant="error">{isForbidden(operations.error) ? t('errors.forbidden') : t('list.error')}</Banner>}

      <section aria-labelledby="eval-examples" className="flex flex-col gap-3">
        <h2 id="eval-examples" className="text-lg font-bold text-ink">{t('ai.eval.examples', { count: set.length })}</h2>
        <p className="text-ui text-muted">{t('ai.eval.examplesHint')}</p>
        {examplesBody}
      </section>

      <section aria-labelledby="eval-run" className="flex flex-col gap-3 rounded-panel border-2 border-border p-4">
        <h2 id="eval-run" className="text-lg font-bold text-ink">{t('ai.eval.run.title')}</h2>
        <p className="text-ui text-muted">{t('ai.eval.run.note')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button isPending={start.pending} isDisabled={start.waitSeconds > 0} onPress={() => start.start('current')}>
            {start.waitSeconds > 0 ? t('ai.eval.run.wait', { seconds: start.waitSeconds }) : t('ai.eval.run.start')}
          </Button>
          {quota.data && <span className="text-ui text-muted">{t('ai.eval.run.quota', { remaining: quota.data.remaining, limit: quota.data.limit })}</span>}
          {quota.isError && <span className="text-ui text-danger">{t('ai.eval.run.quotaFailed')}</span>}
        </div>
        <StartRunFailure action={start} />
      </section>

      <section aria-labelledby="eval-runs" className="flex flex-col gap-3">
        <h2 id="eval-runs" className="text-lg font-bold text-ink">{t('ai.eval.runs.title')}</h2>
        {runs.isError && runRows.length === 0 && isForbidden(runs.error) ? (
          <Banner variant="error">{t('errors.forbidden')}</Banner>
        ) : (
          <DataList
            rows={runRows}
            rowKey={(r) => r.id}
            columns={runColumns}
            rowHref={(r) => runHref(r.id)}
            selectedKey={runId}
            state={runs.isPending ? 'loading' : runs.isError && runRows.length === 0 ? 'error' : 'ready'}
            emptyText={t('ai.eval.runs.empty')}
            emptyHint={t('ai.eval.runs.emptyHint')}
            onRetry={() => void runs.refetch()}
          />
        )}
        {runs.hasNextPage && (
          <Button variant="secondary" className="self-center" isPending={runs.isFetchingNextPage} onPress={() => void runs.fetchNextPage()}>
            {t('common.loadMore')}
          </Button>
        )}
      </section>

      {isNew && inputFields && <ExampleDialog op={op} inputFields={inputFields} onClose={back} />}
      {isBulk && inputFields && <BulkExamplesDialog op={op} inputFields={inputFields} onClose={back} />}
      {editing && inputFields && <ExampleDialog key={editing.id} op={op} inputFields={inputFields} example={editing} onClose={() => setEditing(null)} />}
      {shownRunId && (
        <DetailPanel
          isOpen={runId !== undefined}
          onClose={back}
          onExited={() => focusRowLink(runHref(shownRunId))}
          focusKey={shownRunId}
        >
          <EvalRunPanel key={shownRunId} id={shownRunId} onDone={() => void queryClient.invalidateQueries({ queryKey: aiKeys.runs(op) })} onDeleted={back} />
        </DetailPanel>
      )}
      <ConfirmDialog
        isOpen={deleting !== null}
        title={t('ai.eval.deleteTitle')}
        confirmLabel={t('ai.eval.deleteConfirm')}
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      >
        {t('ai.eval.deleteBody')}
      </ConfirmDialog>
    </div>
  );
}
