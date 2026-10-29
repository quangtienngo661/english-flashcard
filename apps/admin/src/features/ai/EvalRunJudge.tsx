import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslations } from 'use-intl';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { type Column } from '../../ui/DataList';
import { Select } from '../../ui/Select';
import { useSubmitAction } from '../content/useSubmitAction';
import {
  aiKeys, isRunDone, listJudges, listRunItems, putLabel, startJudgePass, type AiOperation, type EvalRun, type EvalRunItem, type Judge, type JudgePass, type JudgeStatsRow,
  type JudgeTally, type JudgeVerdict,
} from './ai-api';
import { exampleSummary } from './prompt-form';
import { useAiFormat } from './useAiFormat';

const NONE = '__none';
const VERDICTS: JudgeVerdict[] = ['pass', 'fail_major', 'fail_minor'];
const PASS_ERRORS: readonly string[] = ['admin-usd-cap', 'stalled', 'run-failed', 'model-price-missing'];
const linkClass =
  'inline-flex min-h-control w-fit items-center whitespace-nowrap rounded-control px-4 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-control-touch';

/** The sentence for the `error` of a stopped pass; a code with no sentence is shown as it is. */
export function usePassErrorText() {
  const t = useTranslations();
  return (code: string) => (PASS_ERRORS.includes(code) ? t(`ai.eval.detail.judge.errors.${code}`) : code);
}

export const isPassActive = (pass: Pick<JudgePass, 'status'>): boolean => pass.status === 'queued' || pass.status === 'running';

/**
 * The active judges that score `operation`, each with its newest revision (what a pass would use). A failed read is not an error of the screen
 * that asks: it only leaves the judge parts out, so `candidates` is empty then.
 */
export function useRunJudges(operation: AiOperation) {
  const api = useApi();
  const query = useQuery({ queryKey: aiKeys.judges(), queryFn: () => listJudges(api) });
  const candidates = (query.data?.items ?? []).filter((judge) => judge.active && judge.operations.includes(operation));
  return { candidates };
}

/**
 * Which judge a select shows: the one picked while it can still run, else the first one with a model. A judge with no model is listed but cannot be
 * chosen (a pass of it would be refused, 409 `model-not-set`).
 */
export function useJudgeChoice(candidates: Judge[]) {
  const t = useTranslations();
  const [chosen, setChosen] = useState<string | null>(null);
  const usable = (judge: Judge) => judge.latest.model !== null;
  const judge = candidates.find((candidate) => candidate.id === chosen && usable(candidate)) ?? candidates.find(usable) ?? null;
  return {
    judge,
    value: judge?.id ?? '',
    choose: setChosen,
    items: candidates.map((candidate) => ({ id: candidate.id, label: usable(candidate) ? candidate.name : t('ai.eval.run.judgeNoModel', { name: candidate.name }) })),
    disabledIds: candidates.filter((candidate) => !usable(candidate)).map((candidate) => candidate.id),
  };
}

/** The criteria shown as columns: those of the judges that can score this operation, then any other code a score or a label of the run carries. */
export function criteriaOf(candidates: Judge[], items: EvalRunItem[]): string[] {
  const codes = new Set<string>();
  for (const judge of candidates) for (const criterion of judge.latest.criteria) codes.add(criterion.code);
  for (const item of items) {
    for (const score of item.scores) codes.add(score.criterion);
    for (const label of item.labels) codes.add(label.criterion);
  }
  return [...codes];
}

const scored = (tally: JudgeTally) => tally.pass + tally.fail_major + tally.fail_minor;

type SectionProps = { run: EvalRun; passes: JudgePass[]; stats: JudgeStatsRow[]; candidates: Judge[]; hasItems: boolean };

/**
 * "Judge" in the run panel (nhóm B design §5.4): the passes of this run with their progress and why one stopped, how each judge revision scored the
 * dev part and (as totals only) the held-out part, and the control that starts a pass on a finished run. Held-out outputs are never listed.
 */
export function JudgeSection({ run, passes, stats, candidates, hasItems }: SectionProps) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const format = useAiFormat();
  const errorText = usePassErrorText();
  const choice = useJudgeChoice(candidates);
  const [started, setStarted] = useState(0);
  const action = useSubmitAction(
    (key) => startJudgePass(api, run.id, { judge_id: choice.judge?.id ?? '' }, key),
    `judge-pass:${run.id}:${choice.judge?.id ?? ''}:${started}`,
    () => {
      setStarted((n) => n + 1);
      // The pass is queued: the results are read again, and from then on every 2 s while it is queued or running.
      void queryClient.invalidateQueries({ queryKey: aiKeys.runItems(run.id) });
    },
  );
  if (candidates.length === 0 && passes.length === 0 && stats.length === 0) return null;

  const canStart = isRunDone(run.status) && candidates.length > 0;
  const sameProvider = run.provider === 'anthropic' && choice.judge?.latest.model?.provider === 'anthropic';
  const labelJudge = passes[0]?.judge.id ?? choice.judge?.id ?? candidates[0]?.id ?? null;

  return (
    <section aria-labelledby="eval-run-judge" className="flex min-w-0 flex-col gap-3">
      <h3 id="eval-run-judge" className="text-ui font-semibold text-ink">{t('ai.eval.detail.judge.title')}</h3>
      {passes.length > 0 && (
        <ul className="flex flex-col gap-1 text-ui text-ink">
          {passes.map((pass) => (
            <li key={pass.id} className="flex min-w-0 flex-col wrap-anywhere">
              <span>
                {t('ai.eval.detail.judge.pass', {
                  name: pass.judge.name,
                  revision: pass.judge_revision.revision,
                  status: t(`ai.eval.detail.judge.statuses.${pass.status}`),
                  judged: format.number(pass.judged),
                  total: pass.total === null ? t('ai.eval.detail.judge.noTotal') : format.number(pass.total),
                  cost: pass.cost_usd === null ? t('ai.eval.detail.judge.noCost') : format.usd(pass.cost_usd),
                })}
              </span>
              {pass.error && <span className="text-xs text-danger">{errorText(pass.error)}</span>}
            </li>
          ))}
        </ul>
      )}
      {stats.map((row) => (
        <div key={`${row.judge_revision_id}|${row.criterion}`} className="flex min-w-0 flex-col items-start gap-1 text-ui text-ink">
          <span className="wrap-anywhere">
            {t('ai.eval.detail.judge.stats', {
              name: row.judge_name, revision: row.revision, criterion: row.criterion, pass: row.dev.pass, scored: scored(row.dev), major: row.dev.fail_major, minor: row.dev.fail_minor,
              hpass: row.held_out.pass, hscored: scored(row.held_out), unjudged: row.dev.unjudged + row.held_out.unjudged,
            })}
          </span>
          <Badge tone={row.calibrated ? 'success' : 'neutral'}>{t(row.calibrated ? 'ai.eval.detail.judge.calibrated' : 'ai.eval.detail.judge.uncalibrated')}</Badge>
        </div>
      ))}
      {canStart && (
        <div className="flex flex-col gap-3">
          <div className="w-full max-w-md">
            <Select
              label={t('ai.eval.detail.judge.select')}
              items={choice.items}
              disabledIds={choice.disabledIds}
              value={choice.value}
              onChange={choice.choose}
            />
          </div>
          {sameProvider && <p className="text-ui text-muted">{t('ai.eval.detail.judge.sameProvider')}</p>}
          <div>
            <Button isPending={action.pending} isDisabled={choice.judge === null || action.waitSeconds > 0} onPress={() => void action.submit()}>
              {t('ai.eval.detail.judge.start')}
            </Button>
          </div>
          {action.error && (
            <Banner
              variant={action.canRetry ? 'offline' : 'error'}
              code={action.error.code}
              action={action.canRetry ? <Button variant="secondary" onPress={() => void action.submit()}>{t('common.retry')}</Button> : undefined}
            >
              {action.error.message}
            </Banner>
          )}
        </div>
      )}
      {hasItems && labelJudge !== null && (
        <Link to={`/ai/judges/label?run=${run.id}&judge=${labelJudge}`} className={linkClass}>{t('ai.eval.detail.judge.labelQueue')}</Link>
      )}
    </section>
  );
}

/**
 * Puts or takes back (`verdict: null`) the owner's label on one criterion of one dev output of a run, and patches the cached results of the run from
 * the answer, so whatever shows the label shows it at once. The labels are what every judge revision's agreement is measured against, so those are read again.
 */
export function useLabelMutation(runId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  type Data = Awaited<ReturnType<typeof listRunItems>>;
  return useMutation({
    mutationFn: (v: { subjectId: string; criterion: string; verdict: JudgeVerdict | null }) =>
      putLabel(api, { subject_kind: 'eval_item', subject_id: v.subjectId, criterion: v.criterion, verdict: v.verdict }),
    onSuccess: (saved) => {
      queryClient.setQueryData<Data>(
        aiKeys.runItems(runId),
        (old) => old && {
          ...old,
          items: old.items.map((item) => (item.item_id !== saved.subject_id
            ? item
            : { ...item, labels: [...item.labels.filter((existing) => existing.criterion !== saved.criterion), ...(saved.verdict === null ? [] : [saved])] })),
        },
      );
      void queryClient.invalidateQueries({ queryKey: aiKeys.anyJudgeAgreement() });
    },
  });
}

/**
 * The "Judge" and "Nhãn" columns of the results table, and what went wrong with the last label. A label is written as it is chosen (`PUT …/labels`).
 * Only dev outputs are listed, so held-out ones are never labelled here.
 */
export function useJudgeColumns(runId: string, criteria: string[], items: EvalRunItem[]) {
  const t = useTranslations();
  const errorDetails = useErrorDetails();
  const label = useLabelMutation(runId);
  const error: ErrorDetails | null = label.isError ? errorDetails(label.error) : null;

  if (criteria.length === 0) return { columns: [] as Column<EvalRunItem>[], error };
  const revisions = new Set(items.flatMap((item) => item.scores.map((score) => score.judge_revision_id)));
  const verdictName = (verdict: JudgeVerdict | null) => t(`ai.eval.detail.judge.verdicts.${verdict ?? 'unjudged'}`);
  const choices = [
    { id: NONE, label: t('ai.eval.detail.judge.labelNone') },
    ...VERDICTS.map((verdict) => ({ id: verdict, label: verdictName(verdict) })),
  ];

  const columns: Column<EvalRunItem>[] = [
    {
      key: 'judge', header: t('ai.eval.detail.judge.cols.judge'), className: 'wrap-anywhere', card: 'field',
      cell: (item) => {
        const lines = criteria.flatMap((criterion) => item.scores.filter((score) => score.criterion === criterion));
        if (lines.length === 0) return t('ai.eval.detail.none');
        return (
          <span className="flex min-w-0 flex-col gap-1">
            {lines.map((score) => (
              <span key={`${score.judge_revision_id}|${score.criterion}`} className="flex min-w-0 flex-col">
                <span className={score.verdict === 'pass' ? 'text-ink' : 'font-semibold text-danger'}>
                  {revisions.size > 1
                    ? t('ai.eval.detail.judge.scoreOf', { criterion: score.criterion, verdict: verdictName(score.verdict), name: score.judge_name, revision: score.revision })
                    : t('ai.eval.detail.judge.score', { criterion: score.criterion, verdict: verdictName(score.verdict) })}
                </span>
                {(score.reason ?? score.problem) && <span className="text-xs text-muted">{score.reason ?? score.problem}</span>}
              </span>
            ))}
          </span>
        );
      },
    },
    {
      key: 'label', header: t('ai.eval.detail.judge.cols.label'), className: 'min-w-40', card: 'field',
      cell: (item) => (
        <span className="flex min-w-0 flex-col gap-1">
          {criteria.map((criterion) => (
            <Select
              key={criterion}
              hideLabel
              label={t('ai.eval.detail.judge.labelFor', { example: item.input ? exampleSummary(item.input) : t('ai.eval.detail.deletedExample'), criterion })}
              items={choices}
              value={item.labels.find((existing) => existing.criterion === criterion)?.verdict ?? NONE}
              onChange={(value) => label.mutate({ subjectId: item.item_id, criterion, verdict: value === NONE ? null : (value as JudgeVerdict) })}
              isDisabled={label.isPending}
            />
          ))}
        </span>
      ),
    },
  ];
  return { columns, error };
}
