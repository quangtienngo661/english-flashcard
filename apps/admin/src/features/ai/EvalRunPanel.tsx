import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError, type Problem } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { userLabel } from '../../api/user-ref';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { PanelBody, PanelFooter, PanelHead } from '../../ui/DetailPanel';
import { DataList, type Column } from '../../ui/DataList';
import { ListState } from '../../ui/ListState';
import { showToast } from '../../ui/Toast';
import { useSubmitAction } from '../content/useSubmitAction';
import { getSettings } from '../settings/settings-api';
import { useNow } from '../jobs/useNow';
import { usePollingStatus, useQueuedTooLong } from '../jobs/usePollingStatus';
import {
  UUID, aiKeys, cancelRun, deleteRun, getRun, getTestQuota, isRunCancelled, isRunDone, listRunItems, startRun, type AiOperation, type EvalRun, type EvalRunItem,
  type EvalRunStatus, type SplitStats, type StartRunBody, type TestStatus,
} from './ai-api';
import { exampleSummary } from './prompt-form';
import { RunCompare } from './RunCompare';
import { useAiFormat } from './useAiFormat';

const TONE = { queued: 'neutral', running: 'primary', finished: 'success', failed: 'danger' } as const;
const NEED_EXAMPLE = 'examples: at least one example is needed';
const ITEM_STATUSES: readonly string[] = ['succeeded', 'transient_failure', 'permanent_failure', 'unavailable'] satisfies TestStatus[];
const codeBlock = 'block whitespace-pre-wrap wrap-anywhere rounded-inner bg-canvas p-2 font-mono text-xs text-ink';
const linkClass =
  'inline-flex min-h-control w-fit items-center whitespace-nowrap rounded-control px-4 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-control-touch';

/** A run an admin stopped is stored as `failed` with the error "cancelled": it reads "Đã dừng", not "Lỗi". */
export function RunStatusBadge({ status, error }: { status: EvalRunStatus; error?: string | null }) {
  const t = useTranslations();
  if (isRunCancelled({ status, error: error ?? null })) return <Badge tone="neutral">{t('ai.eval.status.cancelled')}</Badge>;
  return <Badge tone={TONE[status] ?? 'neutral'}>{TONE[status] ? t(`ai.eval.status.${status}`) : status}</Badge>;
}

/**
 * "Cấu hình 4" for a run of a config (`config_number` is null once its draft was deleted: "Cấu hình đã xóa"), "Bản số 3" for a run from before configs,
 * "Bản nháp" for a run of an unsaved draft text.
 */
export function usePromptLabel() {
  const t = useTranslations();
  return (run: Pick<EvalRun, 'prompt_revision' | 'config_id' | 'config_number'>) => {
    if (run.config_id !== null) return run.config_number === null ? t('ai.eval.detail.configGone') : t('ai.eval.detail.config', { number: run.config_number });
    return run.prompt_revision === null ? t('ai.eval.detail.draft') : t('ai.eval.detail.revision', { revision: run.prompt_revision });
  };
}

/** "Phiên bản 3", "Bộ đang soạn" or "Trước khi có phiên bản": which set of examples a run took. */
export function useSetLabel() {
  const t = useTranslations();
  return (run: Pick<EvalRun, 'set_version' | 'legacy'>) => {
    if (run.legacy) return t('ai.eval.set.legacy');
    return run.set_version === null ? t('ai.eval.set.workingShort') : t('ai.eval.set.version', { version: run.set_version });
  };
}

/**
 * [Chạy bộ ví dụ] from this page (`{ prompt: 'current', set_id }`) or from the Prompt page (`{ prompt: draft }`, the working set): `POST …/eval/runs` through `useSubmitAction`, so a
 * network error keeps the `Idempotency-Key` and [Thử lại] cannot start a second run (design §6.5). A started run moves to a fresh key:
 * the next press is a new run. Every attempt uses an `ai.test` slot, so the quota line is read again afterwards, failures included.
 */
export function useStartRun(op: AiOperation, fingerprint: string, onStarted: (runId: string) => void, onProblem?: (problem: Problem) => void) {
  const api = useApi();
  const queryClient = useQueryClient();
  const body = useRef<Omit<StartRunBody, 'operation'>>({ prompt: 'current' });
  const [started, setStarted] = useState(0);
  const keyName = `eval-run:${op}:${started}:${fingerprint}`;
  /** What the last press sent: once the editor or the operation changes, its failure (and [Thử lại], which would resend it) is gone. */
  const [sent, setSent] = useState<string | null>(null);
  /** When the hourly limit lets the next run through (from `Retry-After`), for the 429 sentence. */
  const [retryAt, setRetryAt] = useState<Date | null>(null);
  const action = useSubmitAction(
    async (key) => {
      try {
        return await startRun(api, { operation: op, ...body.current }, key);
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.problem.status === 429 && e.retryAfterSeconds !== null) setRetryAt(new Date(Date.now() + e.retryAfterSeconds * 1000));
          onProblem?.(e.problem);
        }
        throw e;
      } finally {
        void queryClient.invalidateQueries({ queryKey: aiKeys.testQuota() });
      }
    },
    keyName,
    (result) => {
      setStarted((n) => n + 1);
      void queryClient.invalidateQueries({ queryKey: aiKeys.runs(op) });
      onStarted(result.run_id);
    },
  );
  const stale = sent !== keyName;
  return {
    ...action,
    error: stale ? null : action.error,
    problem: stale ? null : action.problem,
    canRetry: !stale && action.canRetry,
    retryAt,
    start(next: Omit<StartRunBody, 'operation'>) {
      body.current = next;
      setSent(keyName);
      void action.submit();
    },
  };
}

type StartFailureProps = {
  action: ReturnType<typeof useStartRun>;
  /** Violations of a draft (`prompt.instructions: …`) that the caller placed on its boxes; the rest are listed in the banner. */
  rest?: string[];
};

/** The banner for a failed start: model not chosen (link to Thao tác), empty set, hourly limit, offline with [Thử lại], else the API text. */
export function StartRunFailure({ action, rest }: StartFailureProps) {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const quota = useQuery({ queryKey: aiKeys.testQuota(), queryFn: () => getTestQuota(api) });
  if (!action.error) return null;
  const problem: Problem | null = action.problem;
  let message = action.error.message;
  let toOperations = false;
  if (problem?.slug === 'model-not-set') toOperations = true;
  else if (problem?.status === 429 && action.retryAt) {
    message = t('ai.eval.run.rateLimited', { limit: quota.data?.limit ?? 20, time: format.time(action.retryAt) });
  } else if (problem?.slug === 'validation-failed') {
    const violations = problem.violations ?? [];
    message = violations.includes(NEED_EXAMPLE) ? t('ai.eval.run.needExample') : [t('errors.validation-failed'), ...(rest ?? violations)].join(' ');
  }
  return (
    <Banner
      variant={action.canRetry ? 'offline' : 'error'}
      code={action.error.code}
      action={
        action.canRetry ? (
          <Button variant="secondary" onPress={() => void action.submit()}>{t('common.retry')}</Button>
        ) : toOperations ? (
          <Link to="/ai/operations" className={linkClass}>{t('ai.prompts.test.openOperations')}</Link>
        ) : undefined
      }
    >
      {message}
    </Banner>
  );
}

/**
 * A/83 run detail beside the runs list (`/ai/eval/runs/:id`): read again every 2 s until `finished` or `failed` (not while the tab is
 * hidden); a failed run shows its error and is never re-run by itself. ₫ is computed here from today's `usd_vnd_rate` (design §6.5).
 * A queued or running run can be stopped, a finished or failed one deleted (both ask first); `onDeleted` lets the page close the panel.
 */
export function EvalRunPanel({ id, onDone, onDeleted }: { id: string; onDone?: () => void; onDeleted?: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const format = useAiFormat();
  const promptLabel = usePromptLabel();
  const setLabel = useSetLabel();
  const validId = UUID.test(id);
  const query = usePollingStatus(aiKeys.run(id), () => getRun(api, id), isRunDone, validId);
  const operation = query.data?.operation ?? 'generate_cloze';
  const run = query.data;
  // The dev results and the totals of both parts. Each result carries the snapshot of its example, so the example list is not read.
  const itemsQuery = useQuery({ queryKey: aiKeys.runItems(id), queryFn: () => listRunItems(api, id), enabled: validId && run !== undefined });
  // Same key as the settings page: an admin who just changed the rate sees the new ₫ here.
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => getSettings(api) });
  const now = useNow(1000, run?.status === 'queued');
  const tooLong = useQueuedTooLong(run?.status ?? 'running', run?.created_at ?? '', now);

  const [asking, setAsking] = useState<'stop' | 'delete' | null>(null);
  const [actionError, setActionError] = useState<ErrorDetails | null>(null);
  const refreshRuns = () => void queryClient.invalidateQueries({ queryKey: aiKeys.runs(operation) });
  // 409 (the run is not in the state the panel showed) and 404 (gone): read the run and the list again.
  const onActionError = (e: unknown) => {
    setAsking(null);
    setActionError(errorDetails(e));
    if (e instanceof ApiError && (e.problem.status === 409 || e.problem.status === 404)) {
      void queryClient.invalidateQueries({ queryKey: aiKeys.run(id) });
      refreshRuns();
    }
  };
  const stop = useMutation({
    mutationFn: () => cancelRun(api, id),
    onMutate: () => setActionError(null),
    onSuccess: async (stopped) => {
      setAsking(null);
      // A poll still in flight would put the old "running" back; the answer already is the stopped run.
      await queryClient.cancelQueries({ queryKey: aiKeys.run(id) });
      queryClient.setQueryData(aiKeys.run(id), stopped);
      showToast(t('ai.eval.toast.stopped'));
      // The list is read again by the effect below: the panel sees the run end, as when the worker finishes it.
    },
    onError: onActionError,
  });
  const remove = useMutation({
    mutationFn: () => deleteRun(api, id),
    onMutate: () => setActionError(null),
    onSuccess: () => {
      setAsking(null);
      refreshRuns();
      showToast(t('ai.eval.toast.runDeleted'));
      onDeleted?.();
    },
    onError: onActionError,
  });

  // When the polling sees the run end, the list is read again so its row matches the panel (as Lô nhập, UBE27).
  const seen = useRef<string | undefined>(undefined);
  useEffect(() => {
    const status = run?.status;
    if (seen.current && !isRunDone(seen.current) && status && isRunDone(status)) onDone?.();
    seen.current = status;
  }, [run?.status, onDone]);

  // The results are read again whenever the run moves on (`done`) or changes state (its last example finished, it ended).
  const progress = run ? `${run.done}/${run.status}` : null;
  const lastProgress = useRef<string | null>(null);
  useEffect(() => {
    if (progress === null) return;
    if (lastProgress.current !== null && lastProgress.current !== progress) void queryClient.invalidateQueries({ queryKey: aiKeys.runItems(id) });
    lastProgress.current = progress;
  }, [progress, id, queryClient]);

  if (!run) {
    return (
      <>
        <PanelHead title={t('nav.aiEval')} />
        <PanelBody>
          {!validId || (query.error instanceof ApiError && query.error.problem.status === 404) ? (
            <Banner variant="error">{t('ai.eval.detail.notFound')}</Banner>
          ) : (
            <ListState state={query.isPending ? 'loading' : 'error'} onRetry={() => void query.refetch()} />
          )}
        </PanelBody>
      </>
    );
  }

  const rate = settings.data?.values.ai.usd_vnd_rate;
  let cost: string = t('ai.eval.detail.none');
  if (run.cost_usd !== null) {
    cost = typeof rate === 'number'
      ? t('ai.eval.detail.costVnd', { usd: format.usd(run.cost_usd), vnd: format.vnd(Math.round(Number(run.cost_usd) * rate)) })
      : format.usd(run.cost_usd);
  }
  const model = `${t(`ai.providers.${run.provider}`)} · ${run.model}`;
  const rows: Array<[string, string, string?]> = [
    [t('ai.eval.detail.progress'), `${format.number(run.done)}/${format.number(run.total)}`],
    [t('ai.eval.detail.valid'), `${format.number(run.valid_count)}/${format.number(run.done)}`],
    [t('ai.eval.detail.avgLatency'), run.avg_latency_ms === null ? t('ai.eval.detail.none') : t('ai.eval.detail.latency', { ms: format.number(Math.round(run.avg_latency_ms)) })],
    [t('ai.eval.detail.cost'), cost, run.cost_unknown_count > 0 ? t('ai.eval.detail.unknownCost', { count: run.cost_unknown_count }) : undefined],
    [t('ai.eval.detail.model'), model],
    [t('ai.eval.detail.set'), setLabel(run)],
    [t('ai.eval.detail.prompt'), promptLabel(run)],
    [t('ai.eval.detail.startedBy'), userLabel(run.started_by_user, t)],
  ];

  const items = itemsQuery.data?.items ?? [];
  const stats = itemsQuery.data?.stats;
  const none = t('ai.eval.detail.none');
  const ruleText = (item: EvalRunItem): string => {
    const rule = item.rule;
    if (!rule) return none;
    if (rule.status === 'pass') return t('ai.eval.detail.rule.pass');
    if (rule.status === 'fail') return t('ai.eval.detail.rule.fail', { problems: rule.problems.join(', ') });
    if (rule.status === 'not_applicable') return t('ai.eval.detail.rule.notApplicable');
    if (rule.reason === 'not-in-catalog') return t('ai.eval.detail.rule.skippedNotInCatalog');
    return t(rule.reason === 'no-rules' ? 'ai.eval.detail.rule.skippedNoRules' : 'ai.eval.detail.rule.skipped');
  };
  const statsLine = (part: 'dev' | 'heldOut', counts: SplitStats) =>
    t(`ai.eval.detail.stats.${part}`, {
      shapePass: counts.shape_pass, shapeDone: counts.total - counts.pending - counts.skipped, rulePass: counts.rule_pass,
      ruleJudged: counts.rule_pass + counts.rule_fail, ruleSkipped: counts.rule_skipped, expectedPass: counts.expected_pass,
      expectedJudged: counts.expected_pass + counts.expected_fail,
    });
  const tried = (counts: SplitStats) => counts.total - counts.pending - counts.skipped;
  const transient = stats ? stats.dev.shape_transient + stats.held_out.shape_transient : 0;
  const showResults = itemsQuery.data !== undefined && (items.length > 0 || (stats !== undefined && tried(stats.dev) + tried(stats.held_out) > 0));
  const resultColumns: Column<EvalRunItem>[] = [
    // `input` is null on an item migrated from an old run whose example was deleted before the snapshots existed.
    { key: 'example', header: t('ai.eval.detail.cols.example'), className: 'wrap-anywhere', cell: (item) => (item.input ? exampleSummary(item.input) : t('ai.eval.detail.deletedExample')) },
    {
      key: 'status', header: t('ai.eval.detail.cols.status'), card: 'field',
      cell: (item) => (
        <span className={item.status === 'succeeded' ? 'text-ink' : 'font-semibold text-danger'}>
          {item.status === 'skipped' ? t('ai.eval.detail.skipped')
            : item.status === 'in_progress' ? t('ai.eval.status.running')
              : ITEM_STATUSES.includes(item.status) ? t(`ai.prompts.test.statuses.${item.status}`) : item.status}
        </span>
      ),
    },
    { key: 'reason', header: t('ai.eval.detail.cols.reason'), className: 'wrap-anywhere', card: 'field', cell: (item) => item.reason ?? none },
    {
      key: 'output', header: t('ai.eval.detail.cols.output'), className: 'min-w-0', card: 'field',
      cell: (item) => (
        <span className="flex min-w-0 flex-col gap-1">
          {item.output ? <code className={codeBlock}>{JSON.stringify(item.output)}</code> : <span>{none}</span>}
          {item.raw_output !== null && (
            <details className="min-w-0">
              <summary className="cursor-pointer text-xs font-medium text-primary">{t('ai.eval.detail.rawOutput')}</summary>
              <pre className={codeBlock}>{item.raw_output}</pre>
            </details>
          )}
        </span>
      ),
    },
    {
      key: 'rule', header: t('ai.eval.detail.cols.rule'), className: 'wrap-anywhere', card: 'field',
      cell: (item) => <span className={item.rule?.status === 'fail' ? 'font-semibold text-danger' : 'text-ink'}>{ruleText(item)}</span>,
    },
    {
      key: 'expected', header: t('ai.eval.detail.cols.expected'), className: 'whitespace-nowrap', card: 'field',
      cell: (item) => (item.expected_result === null ? none : (
        <span className={item.expected_result === 'fail' ? 'font-semibold text-danger' : 'text-ink'}>{t(`ai.eval.detail.expectedResult.${item.expected_result}`)}</span>
      )),
    },
    {
      key: 'latency', header: t('ai.eval.detail.cols.latency'), className: 'whitespace-nowrap tabular-nums', card: 'field',
      cell: (item) => (item.latency_ms === null ? none : t('ai.eval.detail.latency', { ms: format.number(item.latency_ms) })),
    },
    {
      key: 'cost', header: t('ai.eval.detail.cols.cost'), className: 'whitespace-nowrap tabular-nums', card: 'field',
      cell: (item) => (item.cost_usd === null ? none : format.usd(item.cost_usd)),
    },
  ];

  const live = run.status === 'queued' || run.status === 'running';
  let notice: { variant: 'info' | 'error'; text: string } | null = null;
  if (run.status === 'queued') notice = { variant: 'info', text: t(tooLong ? 'ai.eval.detail.queuedLong' : 'ai.eval.detail.queued') };
  else if (run.status === 'running') notice = { variant: 'info', text: t('ai.eval.detail.running', { done: run.done, total: run.total }) };
  else if (isRunCancelled(run)) notice = { variant: 'info', text: t('ai.eval.detail.cancelled') };
  else if (run.status === 'failed' && run.error === 'config-changed') notice = { variant: 'error', text: t('ai.eval.detail.configChanged') };
  else if (run.status === 'failed') {
    notice = { variant: 'error', text: run.error ? t('ai.eval.detail.failed', { error: run.error }) : t('ai.eval.detail.failedNoReason') };
  }

  return (
    <>
      <PanelHead
        title={t('ai.eval.detail.title', { time: format.dateTime(run.created_at) })}
        status={<RunStatusBadge status={run.status} error={run.error} />}
      />
      <PanelBody>
        {actionError && <Banner variant="error" code={actionError.code}>{actionError.message}</Banner>}
        {notice && <Banner variant={notice.variant}>{notice.text}</Banner>}
        {!isRunDone(run.status) && <p className="text-ui text-muted">{t('ai.eval.detail.background')}</p>}
        <dl className="flex min-w-0 flex-col gap-2 text-ui">
          {rows.map(([label, value, extra]) => (
            <div key={label} className="flex min-w-0 gap-4">
              <dt className="w-32 shrink-0 text-muted">{label}</dt>
              <dd className="min-w-0 tabular-nums text-ink wrap-anywhere">
                {value}
                {extra && <span className="block text-xs text-muted">{extra}</span>}
              </dd>
            </div>
          ))}
        </dl>
        {(showResults || itemsQuery.isError) && (
          <section aria-labelledby="eval-run-results" className="flex min-w-0 flex-col gap-2">
            <h3 id="eval-run-results" className="text-ui font-semibold text-ink">{t('ai.eval.detail.results')}</h3>
            {itemsQuery.isError && !itemsQuery.data && <ListState state="error" onRetry={() => void itemsQuery.refetch()} />}
            {showResults && stats && (
              <div className="flex flex-col gap-1 text-ui text-ink">
                <p>{statsLine('dev', stats.dev)}</p>
                {stats.held_out.total > 0 && <p>{statsLine('heldOut', stats.held_out)}</p>}
                {transient > 0 && <p>{t('ai.eval.detail.stats.transient', { count: transient })}</p>}
                {stats.held_out.total > 0 && <p className="text-muted">{t('ai.eval.detail.stats.heldOutHidden')}</p>}
              </div>
            )}
            {items.length > 0 && <DataList rows={items} rowKey={(item) => String(item.position)} columns={resultColumns} state="ready" />}
          </section>
        )}
        <RunCompare run={run} />
      </PanelBody>
      {/* Gone for the moment between a delete and the panel closing. */}
      {!remove.isSuccess && (live || isRunDone(run.status)) && (
        <PanelFooter>
          {live ? (
            <Button variant="secondary" onPress={() => setAsking('stop')}>{t('ai.eval.stop.button')}</Button>
          ) : (
            <Button variant="danger" onPress={() => setAsking('delete')}>{t('ai.eval.removeRun.button')}</Button>
          )}
        </PanelFooter>
      )}
      <ConfirmDialog
        isOpen={asking === 'stop'}
        title={t('ai.eval.stop.title')}
        confirmLabel={t('ai.eval.stop.confirm')}
        cancelLabel={t('ai.eval.stop.keep')}
        isPending={stop.isPending}
        onConfirm={() => stop.mutate()}
        onCancel={() => setAsking(null)}
      >
        {t('ai.eval.stop.body')}
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={asking === 'delete'}
        title={t('ai.eval.removeRun.title')}
        confirmLabel={t('ai.eval.removeRun.confirm')}
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setAsking(null)}
      >
        {t('ai.eval.removeRun.body')}
      </ConfirmDialog>
    </>
  );
}
