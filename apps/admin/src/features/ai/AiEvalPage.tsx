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
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataList, type Column } from '../../ui/DataList';
import { DetailPanel } from '../../ui/DetailPanel';
import { focusRowLink } from '../../ui/focus-row-link';
import { ListState } from '../../ui/ListState';
import { Select } from '../../ui/Select';
import { showToast } from '../../ui/Toast';
import { useRetained } from '../../ui/use-retained';
import {
  AI_OPERATION_ORDER, aiKeys, deleteExample, freezeSet, getTestQuota, isDevExample, listExamples, listOperations, listRuns, listSets, type AiOperation,
  type EvalExample, type EvalRun, type EvalSet, type ExampleRow,
} from './ai-api';
import { EvalRunPanel, RunStatusBadge, StartRunFailure, usePromptLabel, useSetLabel, useStartRun } from './EvalRunPanel';
import { useJudgeChoice, useRunJudges } from './EvalRunJudge';
import { BulkExamplesDialog } from './BulkExamplesDialog';
import { EvalSetDialog } from './EvalSetDialog';
import { ExampleDialog } from './ExampleDialog';
import { EXAMPLE_SORTS, pageCount, pageOf, sortExamples, type ExampleSort } from './example-list';
import { exampleSummary } from './prompt-form';
import { RevealExampleDialog } from './RevealExampleDialog';
import { useAiFormat } from './useAiFormat';

const FILTERS = { op: { default: 'generate_cloze', valid: (value: string) => (AI_OPERATION_ORDER as readonly string[]).includes(value) } };

const isForbidden = (error: unknown) => error instanceof ApiError && error.problem.slug === 'forbidden';

/** The value of the run select that stands for the working set (every other value is the id of a frozen version). */
const WORKING_SET = 'working';

/** Why "Chốt phiên bản" was refused (422 `eval-set-incomplete`): which examples lack an expected answer, and whether no example is held-out. */
type Incomplete = { missing: ReadonlySet<string>; noHeldOut: boolean };

/**
 * A/83 `/ai/eval?op=` (admin only): the example set of one operation (at most 1000) and its runs. `new` and `bulk` open the add dialogs over the
 * page, `runs/:id` a run beside it. [Chạy bộ ví dụ] here runs the current prompt; a draft is run from the Prompt page (design §6.5).
 * Nhóm B M1: held-out examples are listed as hidden rows (opened only after a question), [Chốt phiên bản] freezes the working set, and the
 * frozen versions are listed below it.
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
  const setLabel = useSetLabel();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const op = filters.op as AiOperation;
  const isNew = useMatch('/ai/eval/new') !== null;
  const isBulk = useMatch('/ai/eval/bulk') !== null;
  const runId = useMatch('/ai/eval/runs/:id')?.params.id;
  const shownRunId = useRetained(runId);
  const [editing, setEditing] = useState<EvalExample | null>(null);
  const [deleting, setDeleting] = useState<ExampleRow | null>(null);
  const [revealing, setRevealing] = useState<string | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [openSet, setOpenSet] = useState<EvalSet | null>(null);
  const [incomplete, setIncomplete] = useState<Incomplete | null>(null);
  /** What the admin chose in the run select, for the operation it was chosen on; nothing chosen = the newest version. */
  const [pick, setPick] = useState<{ op: AiOperation; id: string } | null>(null);
  const [problem, setProblem] = useState<ErrorDetails | null>(null);
  // The list's order and page; another operation starts again on page 1 (the order is kept).
  const [listView, setListView] = useState<{ op: AiOperation; sort: ExampleSort; page: number }>({ op, sort: 'oldest', page: 1 });

  const examples = useQuery({ queryKey: aiKeys.examples(op), queryFn: () => listExamples(api, op) });
  const sets = useQuery({ queryKey: aiKeys.sets(op), queryFn: () => listSets(api, op) });
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

  const remove = useMutation({
    mutationFn: (example: ExampleRow) => deleteExample(api, example.id),
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

  const versionRows = sets.data?.items ?? [];
  const newest = versionRows.reduce<EvalSet | null>((best, version) => (best === null || version.version > best.version ? version : best), null);
  const chosen = pick?.op === op && (pick.id === WORKING_SET || versionRows.some((version) => version.id === pick.id)) ? pick.id : null;
  const runSet = chosen ?? newest?.id ?? WORKING_SET;
  // The fingerprint keeps a failed press and its [Thử lại] to the set it was made for.
  // "Chấm bằng judge": only when an active judge scores this operation. Ticked, the run asks for a pass of the chosen judge when it finishes.
  const judges = useRunJudges(op);
  const judgeChoice = useJudgeChoice(judges.candidates);
  const [judgeOn, setJudgeOn] = useState(false);
  const judgeId = judgeOn && judges.candidates.length > 0 ? (judgeChoice.judge?.id ?? null) : null;
  const judgeWanted = judgeOn && judges.candidates.length > 0;
  const start = useStartRun(op, `${runSet}:${judgeId ?? ''}`, (id) => void navigate(runHref(id)));
  const nextVersion = Math.max(0, ...versionRows.map((version) => version.version)) + 1;
  const freeze = useMutation({
    mutationFn: () => freezeSet(api, op),
    onMutate: () => {
      setProblem(null);
      setIncomplete(null);
    },
    onSuccess: async (created) => {
      setFreezing(false);
      setPick(null);
      await queryClient.invalidateQueries({ queryKey: aiKeys.sets(op) });
      showToast(t('ai.eval.toast.frozen', { version: created.version }));
    },
    onError: (e) => {
      setFreezing(false);
      if (e instanceof ApiError && e.problem.slug === 'eval-set-incomplete') {
        setIncomplete({ missing: new Set(e.problem.missing_expected ?? []), noHeldOut: e.problem.no_held_out === true });
        return;
      }
      setProblem(errorDetails(e));
      // Another admin froze a version first: the list of versions the dialog was built on is out of date.
      if (e instanceof ApiError && e.problem.slug === 'eval-set-conflict') void queryClient.invalidateQueries({ queryKey: aiKeys.sets(op) });
    },
  });

  const inputFields = operations.data?.items.find((setting) => setting.operation === op)?.input_fields;
  const rows = examples.data?.items ?? [];
  const devCount = rows.filter(isDevExample).length;
  const heldOutCount = rows.length - devCount;
  const sorted = sortExamples(rows, listView.sort);
  const pages = pageCount(sorted.length);
  const page = listView.op === op ? Math.min(listView.page, pages) : 1;
  const goTo = (next: number) => setListView({ op, sort: listView.sort, page: next });
  const items = AI_OPERATION_ORDER.map((id) => ({ id, label: `${t(`ai.operations.names.${id}`)} (${id})` }));
  const back = () => void navigate(`/ai/eval${search}`);

  const exampleColumns: Column<ExampleRow>[] = [
    {
      key: 'input', header: t('ai.eval.cols.input'), className: 'w-2/5 wrap-anywhere',
      cell: (e) => {
        if (!isDevExample(e)) return t('ai.eval.heldOutHidden');
        const lacksExpected = e.expected === null && incomplete?.missing.has(e.id);
        return (
          <span className="flex flex-col">
            <span>{exampleSummary(e.input)}</span>
            {lacksExpected && <span className="text-xs text-danger">{t('ai.eval.freeze.rowMissing')}</span>}
          </span>
        );
      },
    },
    {
      key: 'split', header: t('ai.eval.cols.split'), className: 'whitespace-nowrap', card: 'field',
      cell: (e) => (
        <Badge tone={isDevExample(e) ? 'neutral' : 'warning'}>{t(isDevExample(e) ? 'ai.eval.split.dev' : 'ai.eval.split.heldOut')}</Badge>
      ),
    },
    {
      key: 'note', header: t('ai.eval.cols.note'), className: 'wrap-anywhere', card: 'field',
      cell: (e) => (isDevExample(e) ? (e.note ?? t('ai.eval.detail.none')) : t('ai.eval.detail.none')),
    },
    {
      key: 'createdBy', header: t('ai.eval.cols.createdBy'), className: 'wrap-anywhere', card: 'field',
      cell: (e) => (isDevExample(e) ? userLabel(e.created_by_user, t) : t('ai.eval.detail.none')),
    },
    {
      key: 'actions', header: t('ai.eval.cols.actions'), card: 'action',
      cell: (e) => (
        <span className="flex flex-wrap items-center gap-x-1">
          {isDevExample(e) ? (
            <Button variant="ghost" aria-label={t('ai.eval.editFor', { summary: exampleSummary(e.input) })} isDisabled={!inputFields} onPress={() => setEditing(e)}>
              {t('ai.eval.edit')}
            </Button>
          ) : (
            <Button variant="ghost" onPress={() => setRevealing(e.id)}>{t('ai.eval.reveal.button')}</Button>
          )}
          <Button
            variant="ghost"
            className="text-danger"
            aria-label={isDevExample(e) ? t('ai.eval.deleteFor', { summary: exampleSummary(e.input) }) : undefined}
            onPress={() => setDeleting(e)}
          >
            {t('ai.eval.delete')}
          </Button>
        </span>
      ),
    },
  ];

  const setColumns: Column<EvalSet>[] = [
    {
      key: 'version', header: t('ai.eval.sets.cols.version'), className: 'whitespace-nowrap',
      cell: (s) => <Button variant="ghost" onPress={() => setOpenSet(s)}>{t('ai.eval.sets.version', { version: s.version })}</Button>,
    },
    { key: 'frozenAt', header: t('ai.eval.sets.cols.frozenAt'), className: 'whitespace-nowrap tabular-nums', card: 'field', cell: (s) => format.dateTime(s.frozen_at) },
    { key: 'counts', header: t('ai.eval.sets.cols.counts'), className: 'whitespace-nowrap', card: 'field', cell: (s) => t('ai.eval.counts', { dev: s.dev_count, heldOut: s.held_out_count }) },
    {
      key: 'seen', header: t('ai.eval.sets.cols.seen'), className: 'wrap-anywhere', card: 'field',
      cell: (s) => (s.revealed_count > 0 ? t('ai.eval.sets.revealed', { count: s.revealed_count }) : t('ai.eval.detail.none')),
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
    { key: 'set', header: t('ai.eval.runs.cols.set'), card: 'field', cell: (r) => setLabel(r) },
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
        rows={pageOf(sorted, page)}
        rowKey={(e) => e.id}
        columns={exampleColumns}
        state={examples.isPending ? 'loading' : 'ready'}
        emptyText={t('ai.eval.empty')}
        emptyHint={t('ai.eval.emptyHint')}
      />
    );
  }

  let setsBody;
  if (sets.isError && !sets.data) {
    setsBody = isForbidden(sets.error)
      ? <Banner variant="error">{t('errors.forbidden')}</Banner>
      : <ListState state="error" onRetry={() => void sets.refetch()} />;
  } else {
    setsBody = (
      <DataList
        rows={versionRows}
        rowKey={(s) => s.id}
        columns={setColumns}
        state={sets.isPending ? 'loading' : 'ready'}
        emptyText={t('ai.eval.sets.empty')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <Button variant="secondary" isDisabled={!examples.data || !sets.data} onPress={() => setFreezing(true)}>{t('ai.eval.freeze.button')}</Button>
        <Button variant="secondary" isDisabled={!inputFields} onPress={() => void navigate(`/ai/eval/bulk${search}`)}>{t('ai.eval.bulk.add')}</Button>
        <Button variant="secondary" isDisabled={!inputFields} onPress={() => void navigate(`/ai/eval/new${search}`)}>{t('ai.eval.add')}</Button>
      </PageActions>
      <div className="w-full max-w-sm">
        <Select label={t('ai.eval.operation')} items={items} value={op} onChange={(value) => setFilters({ op: value })} />
      </div>
      {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
      {incomplete && (
        <Banner variant="error">
          <p className="font-semibold">{t('ai.eval.freeze.incomplete')}</p>
          <ul className="list-disc pl-5">
            {incomplete.missing.size > 0 && <li>{t('ai.eval.freeze.missingExpected', { count: incomplete.missing.size })}</li>}
            {incomplete.noHeldOut && <li>{t('ai.eval.freeze.noHeldOut')}</li>}
          </ul>
        </Banner>
      )}
      {operations.isError && <Banner variant="error">{isForbidden(operations.error) ? t('errors.forbidden') : t('list.error')}</Banner>}

      <section aria-labelledby="eval-examples" className="flex flex-col gap-3">
        <h2 id="eval-examples" className="text-lg font-bold text-ink">{t('ai.eval.examples', { count: rows.length })}</h2>
        <p className="text-ui text-muted">{t('ai.eval.examplesHint')}</p>
        {examples.data && <p className="text-ui font-medium text-ink">{t('ai.eval.counts', { dev: devCount, heldOut: heldOutCount })}</p>}
        {rows.length > 1 && (
          <div className="w-full max-w-xs">
            <Select
              id="eval-examples-sort"
              label={t('ai.eval.list.sort')}
              items={EXAMPLE_SORTS.map((id) => ({ id, label: t(`ai.eval.list.sorts.${id}`) }))}
              value={listView.sort}
              onChange={(sort) => setListView({ op, sort: sort as ExampleSort, page: 1 })}
            />
          </div>
        )}
        {examplesBody}
        {pages > 1 && (
          <nav aria-label={t('ai.eval.list.pages')} className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" isDisabled={page <= 1} onPress={() => goTo(page - 1)}>{t('ai.eval.list.previous')}</Button>
            <span className="text-ui text-muted tabular-nums">{t('ai.eval.list.page', { page, pages })}</span>
            <Button variant="secondary" isDisabled={page >= pages} onPress={() => goTo(page + 1)}>{t('ai.eval.list.next')}</Button>
          </nav>
        )}
      </section>

      <section aria-labelledby="eval-sets" className="flex flex-col gap-3">
        <h2 id="eval-sets" className="text-lg font-bold text-ink">{t('ai.eval.sets.title')}</h2>
        {setsBody}
      </section>

      <section aria-labelledby="eval-run" className="flex flex-col gap-3 rounded-panel border-2 border-border p-4">
        <h2 id="eval-run" className="text-lg font-bold text-ink">{t('ai.eval.run.title')}</h2>
        <p className="text-ui text-muted">{t('ai.eval.run.note')}</p>
        <div className="w-full max-w-md">
          <Select
            label={t('ai.eval.set.label')}
            items={[
              ...versionRows.map((version) => ({ id: version.id, label: t('ai.eval.set.version', { version: version.version }) })),
              { id: WORKING_SET, label: t('ai.eval.set.working') },
            ]}
            value={runSet}
            onChange={(id) => setPick({ op, id })}
          />
        </div>
        {judges.candidates.length > 0 && (
          <div className="flex w-full max-w-md flex-col gap-3">
            <Checkbox isSelected={judgeOn} onChange={setJudgeOn}>{t('ai.eval.run.judge')}</Checkbox>
            {judgeOn && (
              <Select
                label={t('ai.eval.run.judgeSelect')}
                items={judgeChoice.items}
                disabledIds={judgeChoice.disabledIds}
                value={judgeChoice.value}
                onChange={judgeChoice.choose}
              />
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {/* Until the versions are read the select cannot say which one a run would take. */}
          <Button
            isPending={start.pending}
            isDisabled={start.waitSeconds > 0 || sets.isPending || (judgeWanted && judgeId === null)}
            onPress={() => start.start({ prompt: 'current', ...(runSet === WORKING_SET ? {} : { set_id: runSet }), ...(judgeId === null ? {} : { judge_id: judgeId }) })}
          >
            {start.waitSeconds > 0 ? t('ai.eval.run.wait', { seconds: start.waitSeconds }) : t('ai.eval.run.start')}
          </Button>
          {quota.data && <span className="text-ui text-muted">{t('ai.eval.run.quota', { remaining: quota.data.remaining, limit: quota.data.limit })}</span>}
          {quota.isError && <span className="text-ui text-danger">{t('ai.eval.run.quotaFailed')}</span>}
        </div>
        <StartRunFailure action={start} op={op} />
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
      {openSet && <EvalSetDialog key={openSet.id} op={op} set={openSet} onClose={() => setOpenSet(null)} />}
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
      <RevealExampleDialog op={op} exampleId={revealing} onClose={() => setRevealing(null)} />
      <ConfirmDialog
        isOpen={freezing}
        title={t('ai.eval.freeze.title', { version: nextVersion })}
        confirmLabel={t('ai.eval.freeze.confirm')}
        isPending={freeze.isPending}
        onConfirm={() => freeze.mutate()}
        onCancel={() => setFreezing(false)}
      >
        {t('ai.eval.freeze.body', { dev: devCount, heldOut: heldOutCount, version: nextVersion })}
      </ConfirmDialog>
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
