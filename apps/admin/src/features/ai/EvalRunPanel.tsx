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
  UUID, aiKeys, cancelRun, deleteRun, getRun, getTestQuota, isRunCancelled, isRunDone, listExamples, startRun, type AiOperation, type EvalRun, type EvalRunItem,
  type EvalRunStatus, type StartRunBody, type TestStatus,
} from './ai-api';
import { exampleSummary } from './prompt-form';
import { useAiFormat } from './useAiFormat';

const TONE = { queued: 'neutral', running: 'primary', finished: 'success', failed: 'danger' } as const;
const NEED_EXAMPLE = 'examples: at least one example is needed';
const ITEM_STATUSES: TestStatus[] = ['succeeded', 'transient_failure', 'permanent_failure', 'unavailable'];
const codeBlock = 'block whitespace-pre-wrap wrap-anywhere rounded-inner bg-canvas p-2 font-mono text-xs text-ink';
const linkClass =
  'inline-flex min-h-control w-fit items-center whitespace-nowrap rounded-control px-4 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-control-touch';

/** A run an admin stopped is stored as `failed` with the error "cancelled": it reads "Đã dừng", not "Lỗi". */
export function RunStatusBadge({ status, error }: { status: EvalRunStatus; error?: string | null }) {
  const t = useTranslations();
  if (isRunCancelled({ status, error: error ?? null })) return <Badge tone="neutral">{t('ai.eval.status.cancelled')}</Badge>;
  return <Badge tone={TONE[status] ?? 'neutral'}>{TONE[status] ? t(`ai.eval.status.${status}`) : status}</Badge>;
}

/** "Bản số 3", or "Bản nháp" for a run of an unsaved draft from the Prompt page. */
export function usePromptLabel() {
  const t = useTranslations();
  return (run: Pick<EvalRun, 'prompt_revision'>) =>
    run.prompt_revision === null ? t('ai.eval.detail.draft') : t('ai.eval.detail.revision', { revision: run.prompt_revision });
}

/**
 * [Chạy bộ ví dụ] from this page (`'current'`) or from the Prompt page (a draft): `POST …/eval/runs` through `useSubmitAction`, so a
 * network error keeps the `Idempotency-Key` and [Thử lại] cannot start a second run (design §6.5). A started run moves to a fresh key:
 * the next press is a new run. Every attempt uses an `ai.test` slot, so the quota line is read again afterwards, failures included.
 */
export function useStartRun(op: AiOperation, fingerprint: string, onStarted: (runId: string) => void, onProblem?: (problem: Problem) => void) {
  const api = useApi();
  const queryClient = useQueryClient();
  const prompt = useRef<StartRunBody['prompt']>('current');
  const [started, setStarted] = useState(0);
  const keyName = `eval-run:${op}:${started}:${fingerprint}`;
  /** What the last press sent: once the editor or the operation changes, its failure (and [Thử lại], which would resend it) is gone. */
  const [sent, setSent] = useState<string | null>(null);
  /** When the hourly limit lets the next run through (from `Retry-After`), for the 429 sentence. */
  const [retryAt, setRetryAt] = useState<Date | null>(null);
  const action = useSubmitAction(
    async (key) => {
      try {
        return await startRun(api, { operation: op, prompt: prompt.current }, key);
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
    start(next: StartRunBody['prompt']) {
      prompt.current = next;
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
  const validId = UUID.test(id);
  const query = usePollingStatus(aiKeys.run(id), () => getRun(api, id), isRunDone, validId);
  const operation = query.data?.operation ?? 'generate_cloze';
  // Same key as the page's list: the input of each result is looked up there by `example_id`.
  const examples = useQuery({ queryKey: aiKeys.examples(operation), queryFn: () => listExamples(api, operation), enabled: query.data !== undefined });
  // Same key as the settings page: an admin who just changed the rate sees the new ₫ here.
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => getSettings(api) });
  const run = query.data;
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
    [t('ai.eval.detail.prompt'), promptLabel(run)],
    [t('ai.eval.detail.startedBy'), userLabel(run.started_by_user, t)],
  ];

  const inputs = new Map((examples.data?.items ?? []).map((example) => [example.id, example.input]));
  const results = run.items.map((item, index) => ({ ...item, index }));
  const resultColumns: Column<EvalRunItem & { index: number }>[] = [
    {
      key: 'example', header: t('ai.eval.detail.cols.example'), className: 'wrap-anywhere',
      cell: (item) => {
        const input = inputs.get(item.example_id);
        if (input) return exampleSummary(input);
        // Only a set that was read can say an example is gone; while it loads, or if it failed, the input is just unknown.
        return examples.isSuccess ? t('ai.eval.detail.deletedExample') : t('ai.eval.detail.none');
      },
    },
    {
      key: 'status', header: t('ai.eval.detail.cols.status'), card: 'field',
      cell: (item) => (
        <span className={item.status === 'succeeded' ? 'text-ink' : 'font-semibold text-danger'}>
          {item.status === 'skipped' ? t('ai.eval.detail.skipped')
            : ITEM_STATUSES.includes(item.status) ? t(`ai.prompts.test.statuses.${item.status}`) : item.status}
        </span>
      ),
    },
    { key: 'reason', header: t('ai.eval.detail.cols.reason'), className: 'wrap-anywhere', card: 'field', cell: (item) => item.reason ?? t('ai.eval.detail.none') },
    {
      key: 'output', header: t('ai.eval.detail.cols.output'), className: 'min-w-0', card: 'field',
      cell: (item) => (
        <span className="flex min-w-0 flex-col gap-1">
          {item.output ? <code className={codeBlock}>{JSON.stringify(item.output)}</code> : <span>{t('ai.eval.detail.none')}</span>}
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
      key: 'latency', header: t('ai.eval.detail.cols.latency'), className: 'whitespace-nowrap tabular-nums', card: 'field',
      cell: (item) => (item.latency_ms === null ? t('ai.eval.detail.none') : t('ai.eval.detail.latency', { ms: format.number(item.latency_ms) })),
    },
    {
      key: 'cost', header: t('ai.eval.detail.cols.cost'), className: 'whitespace-nowrap tabular-nums', card: 'field',
      cell: (item) => (item.cost_usd === null ? t('ai.eval.detail.none') : format.usd(item.cost_usd)),
    },
  ];

  const live = run.status === 'queued' || run.status === 'running';
  let notice: { variant: 'info' | 'error'; text: string } | null = null;
  if (run.status === 'queued') notice = { variant: 'info', text: t(tooLong ? 'ai.eval.detail.queuedLong' : 'ai.eval.detail.queued') };
  else if (run.status === 'running') notice = { variant: 'info', text: t('ai.eval.detail.running', { done: run.done, total: run.total }) };
  else if (isRunCancelled(run)) notice = { variant: 'info', text: t('ai.eval.detail.cancelled') };
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
        {results.length > 0 && (
          <section aria-labelledby="eval-run-results" className="flex min-w-0 flex-col gap-2">
            <h3 id="eval-run-results" className="text-ui font-semibold text-ink">{t('ai.eval.detail.results')}</h3>
            <DataList rows={results} rowKey={(item) => String(item.index)} columns={resultColumns} state="ready" />
          </section>
        )}
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
