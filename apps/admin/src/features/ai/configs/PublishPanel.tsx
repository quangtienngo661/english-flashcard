import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../../api/use-error-message';
import { useApi } from '../../../auth/session-context';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { Checkbox } from '../../../ui/Checkbox';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { ListState } from '../../../ui/ListState';
import { showToast } from '../../../ui/Toast';
import {
  aiKeys, rollbackToPrevious, type AiOperation, type ConfigsView, type EvalSet, type PublishBody, type PublishWarning, type Tally,
} from '../ai-api';
import { StartRunFailure, useStartRun } from '../EvalRunPanel';
import { useAiFormat } from '../useAiFormat';
import { checkDraftById, publishDraftById, workspaceKeys } from './workspace-api';

const linkClass =
  'inline-flex min-h-control w-fit items-center whitespace-nowrap rounded-control px-4 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-control-touch';
/** The slugs after which what the panel shows (the check, the draft's version) may be out of date: it is read again. */
const STALE_SLUGS = ['publish-stale', 'draft-version-conflict', 'publish-warnings', 'eval-required', 'baseline-required'];

/** The sentence of one warning; held-out examples are only counted, never named (design §5.1). */
function useWarningText() {
  const t = useTranslations();
  const format = useAiFormat();
  const rate = (tally: Tally) => format.percent(tally.counted === 0 ? 0 : (100 * tally.passed) / tally.counted);
  return (warning: PublishWarning): string => {
    if (warning.code === 'rate-drop') {
      return t('ai.configs.publish.rateDrop', {
        criterion: t(`ai.configs.publish.criteria.${warning.criterion}`), before: rate(warning.before), after: rate(warning.after),
      });
    }
    if (warning.code === 'judge-rate-drop') {
      return t('ai.configs.publish.judgeRateDrop', {
        name: warning.judge_name, revision: warning.revision, criterion: warning.criterion, before: rate(warning.before), after: rate(warning.after),
      });
    }
    if (warning.code === 'dev-regressed') return t('ai.configs.publish.devRegressed', { count: warning.example_ids.length });
    return t('ai.configs.publish.heldOutUp', { before: warning.before, after: warning.after });
  };
}

type PanelProps = {
  draftId: string;
  expectedVersion: number;
  onPublished?: () => void;
  op: AiOperation;
  /** The newest frozen version as the page read it; the check's own version replaces it once the check is read. */
  newestSet: EvalSet | null;
  /** Publishing must wait for all unsaved edits and a successful save/recheck. */
  dirty: boolean;
};

/**
 * What the saved draft still needs before it can go live (design §6.3): a complete run of it on the newest frozen version, and one of the live
 * config for the comparison, then the warnings to read and [Publish]. A draft without a model turns the operation off instead (D38, §6.3b), and a
 * live config without a model needs no baseline (D37). Draft runs belong to the snapshot runner above this panel.
 */
export function PublishPanel({ op, newestSet, dirty, draftId, expectedVersion, onPublished }: PanelProps) {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const warningText = useWarningText();
  // Dropped as soon as the panel goes: a later draft must not start from the check of an earlier one.
  const checkKey = [...workspaceKeys.check(op, draftId), expectedVersion];
  const check = useQuery({ queryKey: checkKey, queryFn: () => checkDraftById(api, op, draftId), gcTime: 0 });
  const data = check.data;
  const set = data ? data.set : newestSet ? { id: newestSet.id, version: newestSet.version } : null;
  const [problem, setProblem] = useState<ErrorDetails | null>(null);
  const [confirmingOff, setConfirmingOff] = useState(false);
  /** The box is ticked for one list of warnings: when the check is read again with other warnings it is unticked. */
  const [ack, setAck] = useState<{ key: string; on: boolean }>({ key: '', on: false });
  const warningsKey = JSON.stringify(data?.warnings ?? []);
  const acknowledged = ack.on && ack.key === warningsKey;

  const onStarted = (id: string) => void navigate(`/ai/eval/runs/${id}?op=${op}`);
  // The fingerprints keep a failed press (and its [Thử lại]) to the draft version and the set it was made for.
  const startLive = useStartRun(op, `live:${set?.id ?? 'none'}`, onStarted);

  const publish = useMutation({
    mutationFn: (args: { body: PublishBody; turnOff: boolean; number: number }) => publishDraftById(api, op, draftId, args.body),
    onMutate: () => setProblem(null),
    onSuccess: (result, args) => {
      setConfirmingOff(false);
      queryClient.setQueryData<ConfigsView>(aiKeys.configs(op), result);
      void queryClient.invalidateQueries({ queryKey: aiKeys.configHistory(op) });
      void queryClient.invalidateQueries({ queryKey: aiKeys.status() });
      void queryClient.invalidateQueries({ queryKey: aiKeys.operations() });
      showToast(t(args.turnOff ? 'ai.configs.publish.turnedOff' : 'ai.configs.publish.done', { number: args.number }));
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.drafts(op) });
      onPublished?.();
    },
    onError: (e) => {
      setConfirmingOff(false);
      if (e instanceof ApiError && STALE_SLUGS.includes(e.problem.slug)) {
        void queryClient.invalidateQueries({ queryKey: workspaceKeys.check(op, draftId) });
        void queryClient.invalidateQueries({ queryKey: aiKeys.configs(op) });
        setProblem(e.problem.slug === 'publish-stale' ? { message: t('ai.configs.publish.stale'), code: null } : errorDetails(e));
      } else setProblem(errorDetails(e));
    },
  });

  const turnOff = data?.turn_off === true;
  const warnings = data?.warnings ?? [];
  const ready = data !== undefined && !check.isFetching && !check.isError && (data.draft.id === draftId && data.draft.version === expectedVersion) && (turnOff || (data.set !== null && data.blockers.length === 0));
  const canPublish = ready && !dirty && (warnings.length === 0 || acknowledged);

  function submit(confirmed: boolean) {
    if (!data || !canPublish) return;
    if (data.turn_off && !confirmed) {
      setConfirmingOff(true);
      return;
    }
    publish.mutate({
      turnOff: data.turn_off,
      number: data.draft.number,
      body: {
        expected_version: data.draft.version,
        candidate_run_id: data.turn_off ? null : data.candidate_run_id,
        baseline_run_id: data.turn_off ? null : data.baseline.run_id,
        acknowledge_warnings: !data.turn_off && data.warnings.length > 0 && acknowledged,
      },
    });
  }

  let evidence;
  if (check.isError && !data) evidence = <ListState state="error" onRetry={() => void check.refetch()} />;
  else if (!data) evidence = <ListState state="loading" />;
  else if (turnOff) evidence = <p className="text-ui text-ink">{t('ai.configs.publish.turnOffNote')}</p>;
  else {
    evidence = (
      <div className="flex flex-col gap-3">
        {data.set && <p className="font-medium text-ink">{t('ai.configs.publish.set', { version: data.set.version })}</p>}
        {!data.baseline.required && <p className="text-ui text-ink">{t('ai.configs.publish.noBaseline')}</p>}
        {data.set && data.blockers.includes('eval-required') && (
          <p className="text-ui text-ink">{t('ai.configs.publish.evalRequired', { version: data.set.version })}</p>
        )}
        {data.set && data.blockers.includes('baseline-required') && (
          <div className="flex flex-col gap-2">
            <p className="text-ui text-ink">{t('ai.configs.publish.baselineRequired', { version: data.set.version })}</p>
            <Button
              variant="secondary"
              className="self-start"
              isPending={startLive.pending}
              isDisabled={startLive.waitSeconds > 0}
              onPress={() => startLive.start({ target: { kind: 'live' }, set_id: data.set!.id })}
            >
              {startLive.waitSeconds > 0 ? t('ai.eval.run.wait', { seconds: startLive.waitSeconds }) : t('ai.configs.publish.runLive', { version: data.set.version })}
            </Button>
            <StartRunFailure action={startLive} />
          </div>
        )}
        {warnings.length > 0 && (
          <div className="flex flex-col gap-2">
            <ul className="flex list-disc flex-col gap-1 ps-5 text-ui text-ink">
              {warnings.map((warning, index) => (
                <li key={index}>{warningText(warning)}</li>
              ))}
            </ul>
            <Checkbox isSelected={acknowledged} onChange={(on) => setAck({ key: warningsKey, on })}>
              {t('ai.configs.publish.acknowledge')}
            </Checkbox>
          </div>
        )}
      </div>
    );
  }

  return (
    <section id="publish" aria-labelledby="config-publish" className="flex flex-col gap-4 rounded-panel border-2 border-border p-4">
      <h2 id="config-publish" className="text-lg font-bold text-ink">{t('ai.configs.publish.title')}</h2>
      {!turnOff && !set && <Banner variant="info" action={<Link to={`/ai/eval?op=${op}`} className={linkClass}>{t('nav.aiEval')}</Link>}>{t('ai.configs.publish.noSet')}</Banner>}
      {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
      {evidence}
      <Button variant="ghost" onPress={() => void check.refetch()} isDisabled={check.isFetching}>{t('ai.workspace.checkAgain')}</Button>
      <div className="flex flex-wrap items-center gap-3">
        <Button onPress={() => submit(false)} isPending={publish.isPending && !confirmingOff} isDisabled={!canPublish}>
          {t('ai.configs.publish.submit')}
        </Button>
        {dirty && <span className="text-ui text-muted">{t('ai.configs.publish.saveFirst')}</span>}
      </div>
      <ConfirmDialog
        isOpen={confirmingOff}
        title={t('ai.configs.publish.turnOffConfirm')}
        confirmLabel={t('ai.configs.publish.turnOffConfirm')}
        tone="danger"
        isPending={publish.isPending}
        onConfirm={() => submit(true)}
        onCancel={() => setConfirmingOff(false)}
      >
        {t('ai.configs.publish.turnOffDialog')}
      </ConfirmDialog>
    </section>
  );
}

/** [Quay về cấu hình N] (design §6.4): puts the config before the live one back; shown only when there is one. Its errors go to `onProblem`. */
export function RollbackControl({ op, view, onProblem }: { op: AiOperation; view: ConfigsView; onProblem: (problem: ErrorDetails | null) => void }) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const [asking, setAsking] = useState(false);
  const previous = view.previous;

  const rollback = useMutation({
    mutationFn: () => rollbackToPrevious(api, op, { expected_live_version: view.live_version }),
    onMutate: () => onProblem(null),
    onSuccess: (result) => {
      setAsking(false);
      queryClient.setQueryData<ConfigsView>(aiKeys.configs(op), result);
      void queryClient.invalidateQueries({ queryKey: aiKeys.configHistory(op) });
      void queryClient.invalidateQueries({ queryKey: aiKeys.status() });
      void queryClient.invalidateQueries({ queryKey: aiKeys.operations() });
      showToast(t('ai.configs.rollback.done', { number: result.live.number }));
    },
    onError: (e) => {
      setAsking(false);
      // Someone else published or rolled back first: what this page shows is out of date.
      void queryClient.invalidateQueries({ queryKey: aiKeys.configs(op) });
      onProblem(errorDetails(e));
    },
  });

  if (!previous) return null;
  return (
    <>
      <Button variant="secondary" onPress={() => setAsking(true)}>{t('ai.configs.rollback.button', { number: previous.number })}</Button>
      <ConfirmDialog
        isOpen={asking}
        title={t('ai.configs.rollback.button', { number: previous.number })}
        confirmLabel={t('ai.configs.rollback.go')}
        isPending={rollback.isPending}
        onConfirm={() => rollback.mutate()}
        onCancel={() => setAsking(false)}
      >
        {t('ai.configs.rollback.confirm', { number: previous.number })}
      </ConfirmDialog>
    </>
  );
}
