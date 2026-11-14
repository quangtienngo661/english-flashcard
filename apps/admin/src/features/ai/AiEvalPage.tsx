import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useMatch, useNavigate } from 'react-router';
import { Info } from 'lucide-react';
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
import { PageTabs } from '../../ui/PageTabs';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
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
import { EXAMPLE_LEVELS, EXAMPLE_SORTS, EXAMPLES_PAGE_SIZE, filterExamples, pageCount, pageOf, sortExamples, type ExampleFilters, type ExampleSort } from './example-list';
import { bulkDeleteExamples } from './examples-workspace-api';
import { exampleSummary } from './prompt-form';
import { RevealExampleDialog } from './RevealExampleDialog';
import { useAiFormat } from './useAiFormat';
import './configs/workspace.css';

const FILTERS = { op: { default: 'generate_cloze', valid: (value: string) => (AI_OPERATION_ORDER as readonly string[]).includes(value) } };

const isForbidden = (error: unknown) => error instanceof ApiError && error.problem.slug === 'forbidden';

/** The value of the run select that stands for the working set (every other value is the id of a frozen version). */
const WORKING_SET = 'working';

/** Why "Chốt phiên bản" was refused (422 `eval-set-incomplete`): which examples lack an expected answer, and whether no example is held-out. */
type Incomplete = { missing: ReadonlySet<string>; noHeldOut: boolean };
type ExampleListView = ExampleFilters & { op: AiOperation; sort: ExampleSort; page: number; selected: Set<string> };
type BulkDeletion = { op: AiOperation; ids: string[]; key: string; dev: number; heldOut: number };

/**
 * A/83 `/ai/eval?op=` (admin only): the example set of one operation (at most 1000) and its runs. `new` and `bulk` open the add dialogs over the
 * page, `runs/:id` a run beside it. [Chạy bộ ví dụ] here runs the current prompt; a draft or temporary snapshot is run from its Configs editor.
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
  // Three sub-pages under one tab row: the list (also under new / bulk), the frozen versions with the run box, and the runs.
  const onSets = useMatch('/ai/eval/sets') !== null;
  const onRuns = useMatch('/ai/eval/runs') !== null || runId !== undefined;
  const tab = onSets ? 'sets' : onRuns ? 'runs' : 'list';
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
  const [listView, setListView] = useState<ExampleListView>({ op, sort: 'heldOutFirst', page: 1, search: '', level: 'all', split: 'all', selected: new Set() });
  const [bulkDeletion, setBulkDeletion] = useState<BulkDeletion | null>(null);
  const [bulkError, setBulkError] = useState<ErrorDetails | null>(null);
  // Reset in render so browser history and the operation picker both clear selection before the next paint.
  if (listView.op !== op) {
    setListView({ op, sort: listView.sort, page: 1, search: '', level: 'all', split: 'all', selected: new Set() });
    setBulkDeletion(null);
    setBulkError(null);
  }

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
    onSuccess: async (_, example) => {
      setDeleting(null);
      setListView((current) => ({ ...current, selected: new Set([...current.selected].filter((id) => id !== example.id)) }));
      await queryClient.invalidateQueries({ queryKey: aiKeys.examples(op) });
      showToast(t('ai.eval.toast.deleted'));
    },
    onError: (e) => {
      setDeleting(null);
      setProblem(errorDetails(e));
    },
  });

  const bulkRemove = useMutation({
    mutationFn: (request: BulkDeletion) => bulkDeleteExamples(api, request.op, request.ids, request.key),
    onMutate: () => setBulkError(null),
    onSuccess: async (result, request) => {
      setBulkDeletion((current) => current?.key === request.key ? null : current);
      const removed = new Set([...result.deleted_ids, ...result.already_missing_ids]);
      setListView((current) => current.op === request.op
        ? { ...current, selected: new Set([...current.selected].filter((id) => !removed.has(id))) }
        : current);
      showToast(t('ai.eval.bulkDelete.done', { deleted: result.deleted_ids.length, missing: result.already_missing_ids.length }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: aiKeys.examples(request.op) }),
        queryClient.invalidateQueries({ queryKey: ['ai', 'eval-set'] }),
      ]);
    },
    onError: (e) => setBulkError(errorDetails(e)),
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
  const filtered = filterExamples(rows, listView);
  const sorted = sortExamples(filtered, listView.sort);
  const pages = pageCount(sorted.length);
  const page = listView.op === op ? Math.min(listView.page, pages) : 1;
  const goTo = (next: number) => setListView({ ...listView, page: next });
  const changeList = (patch: Partial<ExampleFilters> & { sort?: ExampleSort }) => setListView({ ...listView, ...patch, page: 1 });
  const selected = listView.selected;
  const confirmBulkDelete = () => {
    const selectedRows = rows.filter((row) => selected.has(row.id));
    const heldOut = selectedRows.filter((row) => !isDevExample(row)).length;
    setBulkError(null);
    setBulkDeletion({ op, ids: [...selected], key: crypto.randomUUID(), dev: selectedRows.length - heldOut, heldOut });
  };
  const items = AI_OPERATION_ORDER.map((id) => ({ id, label: `${t(`ai.operations.names.${id}`)} (${id})` }));
  const back = () => void navigate(`/ai/eval${search}`);
  const backToRuns = () => void navigate(`/ai/eval/runs${search}`);

  const exampleColumns: Column<ExampleRow>[] = [
    {
      key: 'input', header: t('ai.eval.cols.input'), className: 'w-1/3 wrap-anywhere',
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
      key: 'level', header: t('ai.eval.list.levelColumn'), className: 'whitespace-nowrap', card: 'field',
      cell: (e) => isDevExample(e) && typeof e.input.level === 'string' ? e.input.level : t('ai.eval.detail.none'),
    },
    {
      key: 'split', header: t('ai.eval.cols.split'), className: 'whitespace-nowrap', card: 'field',
      cell: (e) => (
        <Badge tone={isDevExample(e) ? 'primary' : 'warning'}>{t(isDevExample(e) ? 'ai.eval.split.dev' : 'ai.eval.split.heldOut')}</Badge>
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
        <span className="flex items-center gap-x-1 whitespace-nowrap">
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
        selection={{
          selected,
          onChange: (next) => setListView({ ...listView, selected: next }),
          label: (e) => isDevExample(e) ? t('ai.eval.bulkDelete.selectRow', { summary: exampleSummary(e.input) }) : t('ai.eval.bulkDelete.selectHeldOut', { id: e.id }),
        }}
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
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 max-w-2xl flex-1 basis-80 flex-col gap-3">
          <div className="w-full max-w-sm">
            <Select label={t('ai.eval.operation')} items={items} value={op} onChange={(value) => setFilters({ op: value })} />
          </div>
          <p className="flex gap-2 text-ui text-muted"><Info aria-hidden className="mt-0.5 size-4 shrink-0" />{t('ai.eval.examplesHint')}</p>
        </div>
        <section aria-label={t('ai.eval.stats.label')} className="flex w-full flex-col gap-2.5 rounded-panel border-2 border-border px-4 py-3 sm:w-80">
          <h2 className="text-base font-bold text-ink tabular-nums">{t('ai.eval.examples', { count: rows.length })}</h2>
          <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-neutral-soft">
            {rows.length > 0 && <>
              <span
                className="bg-primary"
                // raw-ok: the dev share of the examples, known at run time.
                style={{ width: `${(devCount / rows.length) * 100}%` }}
              />
              <span
                className="bg-accent"
                // raw-ok: the held-out share of the examples, known at run time.
                style={{ width: `${(heldOutCount / rows.length) * 100}%` }}
              />
            </>}
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-ui font-semibold text-ink tabular-nums">
            <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-xs bg-primary" />{t('ai.eval.stats.dev', { count: devCount })}</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-xs bg-accent" />{t('ai.eval.stats.heldOut', { count: heldOutCount })}</span>
          </p>
        </section>
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

      <PageTabs
        label={t('ai.eval.tabs.label')}
        items={[
          { id: 'list', to: `/ai/eval${search}`, label: t('ai.eval.tabs.list'), current: tab === 'list', count: examples.data ? rows.length : undefined },
          { id: 'sets', to: `/ai/eval/sets${search}`, label: t('ai.eval.tabs.sets'), current: tab === 'sets', count: sets.data ? versionRows.length : undefined },
          { id: 'runs', to: `/ai/eval/runs${search}`, label: t('ai.eval.tabs.runs'), current: tab === 'runs', count: runs.data ? `${runRows.length}${runs.hasNextPage ? '+' : ''}` : undefined },
        ]}
      />

      {tab === 'list' && (
        <section aria-label={t('ai.eval.tabs.list')} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TextField
              label={t('ai.eval.list.search')}
              placeholder={t('ai.eval.list.searchPlaceholder')}
              value={listView.search}
              onChange={(search) => changeList({ search })}
            />
            <Select
              label={t('ai.eval.list.splitFilter')}
              value={listView.split}
              items={[
                { id: 'all', label: t('ai.eval.list.allSplits') },
                { id: 'dev', label: t('ai.eval.split.dev') },
                { id: 'held_out', label: t('ai.eval.split.heldOut') },
              ]}
              onChange={(split) => changeList({ split: split as ExampleFilters['split'] })}
            />
            <Select
              label={t('ai.eval.list.level')}
              value={listView.level}
              items={[{ id: 'all', label: t('ai.eval.list.allLevels') }, ...EXAMPLE_LEVELS.map((id) => ({ id, label: id }))]}
              onChange={(level) => changeList({ level })}
            />
            <Select
              id="eval-examples-sort"
              label={t('ai.eval.list.sort')}
              items={EXAMPLE_SORTS.map((id) => ({ id, label: t(`ai.eval.list.sorts.${id}`) }))}
              value={listView.sort}
              onChange={(sort) => changeList({ sort: sort as ExampleSort })}
            />
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <span className="font-semibold text-ink tabular-nums">{t('ai.eval.list.filteredCount', { count: filtered.length })}</span>
            <span>{t('ai.eval.list.filterHint')}</span>
          </p>
          <div className={`flex min-h-13 flex-wrap items-center gap-x-3 gap-y-2 rounded-control py-1.5 pr-1.5 pl-4 transition-colors duration-fast ${selected.size > 0 ? 'bg-primary-soft' : 'bg-canvas'}`}>
            <span role="status" className="text-ui font-semibold text-ink tabular-nums">{t('ai.eval.bulkDelete.selected', { count: selected.size })}</span>
            <Button variant="ghost" isDisabled={selected.size === 0} onPress={() => setListView({ ...listView, selected: new Set() })}>{t('ai.eval.bulkDelete.clear')}</Button>
            <span aria-hidden className="h-5 w-0.5 bg-border" />
            <Button
              variant="ghost"
              isDisabled={filtered.length === 0 || filtered.every((row) => selected.has(row.id))}
              onPress={() => setListView({ ...listView, selected: new Set([...selected, ...filtered.map((row) => row.id)]) })}
            >
              {t('ai.eval.bulkDelete.selectFiltered')}
            </Button>
            <span className="flex-1" />
            <Button variant="danger" isDisabled={selected.size === 0 || bulkRemove.isPending} onPress={confirmBulkDelete}>{t('ai.eval.bulkDelete.button', { count: selected.size })}</Button>
          </div>
          {examplesBody}
          {pages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted tabular-nums">
                {t('ai.eval.list.range', { from: (page - 1) * EXAMPLES_PAGE_SIZE + 1, to: Math.min(page * EXAMPLES_PAGE_SIZE, sorted.length), total: sorted.length })}
              </span>
              <nav aria-label={t('ai.eval.list.pages')} className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" isDisabled={page <= 1} onPress={() => goTo(page - 1)}>{t('ai.eval.list.previous')}</Button>
                <span className="text-ui text-muted tabular-nums">{t('ai.eval.list.page', { page, pages })}</span>
                <Button variant="secondary" isDisabled={page >= pages} onPress={() => goTo(page + 1)}>{t('ai.eval.list.next')}</Button>
              </nav>
            </div>
          )}
        </section>
      )}

      {tab === 'sets' && (
        <div className="config-workspace">
          <section aria-label={t('ai.eval.sets.title')} className="flex min-w-0 flex-col gap-3">
            {setsBody}
          </section>
          <aside aria-labelledby="eval-run" className="config-live flex min-w-0 flex-col overflow-hidden rounded-panel border-2 border-border">
            <div className="flex flex-col gap-1 bg-primary-soft p-4">
              <h2 id="eval-run" className="text-lg font-bold text-ink">{t('ai.eval.run.title')}</h2>
              <p className="text-xs text-muted">{t('ai.eval.run.note')}</p>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <Select
                label={t('ai.eval.set.label')}
                items={[
                  ...versionRows.map((version) => ({ id: version.id, label: t('ai.eval.set.version', { version: version.version }) })),
                  { id: WORKING_SET, label: t('ai.eval.set.working') },
                ]}
                value={runSet}
                onChange={(id) => setPick({ op, id })}
              />
              {judges.candidates.length > 0 && (
                <div className="flex flex-col gap-3">
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
              {/* Until the versions are read the select cannot say which one a run would take. */}
              <Button
                isPending={start.pending}
                isDisabled={start.waitSeconds > 0 || sets.isPending || (judgeWanted && judgeId === null)}
                onPress={() => start.start({ prompt: 'current', ...(runSet === WORKING_SET ? {} : { set_id: runSet }), ...(judgeId === null ? {} : { judge_id: judgeId }) })}
              >
                {start.waitSeconds > 0 ? t('ai.eval.run.wait', { seconds: start.waitSeconds }) : t('ai.eval.run.start')}
              </Button>
              <StartRunFailure action={start} op={op} />
              {(quota.data || quota.isError) && (
                <p className="border-t-2 border-border pt-3 text-xs">
                  {quota.data && <span className="text-muted tabular-nums">{t('ai.eval.run.quota', { remaining: quota.data.remaining, limit: quota.data.limit })}</span>}
                  {quota.isError && <span className="text-danger">{t('ai.eval.run.quotaFailed')}</span>}
                </p>
              )}
            </div>
          </aside>
        </div>
      )}

      {tab === 'runs' && (
        <section aria-label={t('ai.eval.runs.title')} className="flex flex-col gap-3">
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
      )}

      {isNew && inputFields && <ExampleDialog op={op} inputFields={inputFields} onClose={back} />}
      {isBulk && inputFields && <BulkExamplesDialog op={op} inputFields={inputFields} onClose={back} />}
      {editing && inputFields && <ExampleDialog key={editing.id} op={op} inputFields={inputFields} example={editing} onClose={() => setEditing(null)} />}
      {openSet && <EvalSetDialog key={openSet.id} op={op} set={openSet} onClose={() => setOpenSet(null)} />}
      {shownRunId && (
        <DetailPanel
          isOpen={runId !== undefined}
          onClose={backToRuns}
          onExited={() => focusRowLink(runHref(shownRunId))}
          focusKey={shownRunId}
        >
          <EvalRunPanel key={shownRunId} id={shownRunId} onDone={() => void queryClient.invalidateQueries({ queryKey: aiKeys.runs(op) })} onDeleted={backToRuns} />
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
        isOpen={bulkDeletion?.op === op}
        title={t('ai.eval.bulkDelete.title', { count: bulkDeletion?.ids.length ?? 0 })}
        confirmLabel={t('ai.eval.bulkDelete.confirm', { count: bulkDeletion?.ids.length ?? 0 })}
        tone="danger"
        isPending={bulkRemove.isPending}
        onConfirm={() => bulkDeletion && !bulkRemove.isPending && bulkRemove.mutate(bulkDeletion)}
        onCancel={() => setBulkDeletion(null)}
      >
        <div className="flex flex-col gap-3">
          <p className="font-semibold">{t('ai.eval.bulkDelete.counts', { dev: bulkDeletion?.dev ?? 0, heldOut: bulkDeletion?.heldOut ?? 0 })}</p>
          <p>{t('ai.eval.bulkDelete.body')}</p>
          {bulkError && <Banner variant="error" code={bulkError.code}>{bulkError.message}</Banner>}
        </div>
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
