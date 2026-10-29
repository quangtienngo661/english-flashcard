import { useQueries, useQuery, useQueryClient, type Query } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'use-intl';
import { useErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ListState } from '../../ui/ListState';
import { Select } from '../../ui/Select';
import { useSubmitAction } from '../content/useSubmitAction';
import { POLL_INTERVAL_MS } from '../jobs/usePollingStatus';
import {
  aiKeys, getJudgePass, getRunComparison, listJudges, listRuns, startJudgePass, type EvalRun, type JudgePass, type JudgeTally, type JudgeUnmatched, type RunComparison, type SplitStats,
} from './ai-api';
import { isPassActive, usePassErrorText } from './EvalRunJudge';
import { exampleSummary } from './prompt-form';
import { useAiFormat } from './useAiFormat';

/** "67%", or "—" when nothing was judged (nothing passed and nothing failed). */
const percent = (pass: number, fail: number) => (pass + fail === 0 ? '—' : `${Math.round((100 * pass) / (pass + fail))}%`);

const ROWS = [
  { key: 'shape', rate: (s: SplitStats) => percent(s.shape_pass, s.shape_fail) },
  { key: 'rule', rate: (s: SplitStats) => percent(s.rule_pass, s.rule_fail) },
  { key: 'expected', rate: (s: SplitStats) => percent(s.expected_pass, s.expected_fail) },
] as const;

/** What the judge passed of the outputs it scored; "không chấm được" counts neither way. */
const judgePercent = (tally: JudgeTally) => percent(tally.pass, tally.fail_major + tally.fail_minor);

const cell = 'px-2 py-1.5 text-right tabular-nums';

/**
 * A judge revision that scored only one of the two runs cannot be compared (design §5.3). "Chấm cả hai bằng …" asks for a pass of the judge's newest
 * revision on the run that lacks scores, and also on the other one when the newest revision is not the one that scored it. While the passes run the
 * comparison waits, and it is read again when they end.
 */
function UnmatchedJudge({ entry, data, onSettled }: { entry: JudgeUnmatched; data: RunComparison; onSettled: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const judges = useQuery({ queryKey: aiKeys.judges(), queryFn: () => listJudges(api) });
  const newest = judges.data?.items.find((judge) => judge.id === entry.judge_id)?.latest.revision ?? entry.revision;
  const lacking = entry.scored === 'a' ? data.b : data.a;
  const scoredRun = entry.scored === 'a' ? data.a : data.b;
  const targets = newest === entry.revision ? [lacking] : [lacking, scoredRun];
  const [passIds, setPassIds] = useState<string[]>([]);
  // The key is scoped to the endpoint (one path per run), so one key serves every pass of this press.
  const action = useSubmitAction(
    async (key) => {
      const ids: string[] = [];
      for (const run of targets) ids.push((await startJudgePass(api, run.id, { judge_id: entry.judge_id }, key)).id);
      return ids;
    },
    `judge-both:${data.a.id}:${data.b.id}:${entry.judge_revision_id}:${targets.length}`,
    setPassIds,
  );
  const watched = useQueries({
    queries: passIds.map((id) => ({
      queryKey: aiKeys.judgePass(id),
      queryFn: () => getJudgePass(api, id),
      refetchInterval: (query: Query<JudgePass>) => (query.state.data && !isPassActive(query.state.data) ? false : POLL_INTERVAL_MS),
    })),
  });
  const running = passIds.length > 0 && watched.some((query) => !query.data || isPassActive(query.data));
  const settled = passIds.length > 0 && !running;
  // Fires when the passes asked for have all ended (`onSettled` is stable, and this row is new for each pair of runs).
  useEffect(() => {
    if (settled) onSettled();
  }, [settled, onSettled]);
  const stopped = settled ? watched.find((query) => query.data?.status === 'failed')?.data : undefined;
  const passError = usePassErrorText();

  return (
    <li className="flex min-w-0 flex-col items-start gap-1 border-b border-border py-1 text-ui">
      <span className="wrap-anywhere text-ink">{t('ai.eval.compare.judgeUnmatched', { name: entry.judge_name, revision: entry.revision })}</span>
      {running ? (
        <span className="text-muted">{t('ai.eval.compare.judgeRunning')}</span>
      ) : (
        <Button variant="secondary" isPending={action.pending} isDisabled={action.waitSeconds > 0} onPress={() => void action.submit()}>
          {t('ai.eval.compare.judgeBoth', { name: entry.judge_name })}
        </Button>
      )}
      {action.error && <Banner variant="error" code={action.error.code}>{action.error.message}</Banner>}
      {stopped && <span className="text-danger">{t('ai.eval.compare.judgeStopped', { error: passError(stopped.error ?? '') })}</span>}
    </li>
  );
}

function Result({ data, onSettled }: { data: RunComparison; onSettled: () => void }) {
  const t = useTranslations();
  const none = t('ai.eval.detail.none');
  const { a, b } = data.stats;
  const { dev, held_out: heldOut } = data.regressions;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-ui">
          <thead>
            <tr className="border-b-2 border-border text-muted">
              <th scope="col" className="px-2 py-1.5 text-left font-medium">{t('ai.eval.compare.cols.criterion')}</th>
              {(['devBefore', 'devNow', 'heldOutBefore', 'heldOutNow'] as const).map((key) => (
                <th key={key} scope="col" className="px-2 py-1.5 text-right font-medium">{t(`ai.eval.compare.cols.${key}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, rate }) => (
              <tr key={key} className="border-b border-border">
                <th scope="row" className="px-2 py-1.5 text-left font-medium text-ink">{t(`ai.eval.compare.rows.${key}`)}</th>
                <td className={cell}>{rate(a.dev)}</td>
                <td className={cell}>{rate(b.dev)}</td>
                <td className={cell}>{rate(a.held_out)}</td>
                <td className={cell}>{rate(b.held_out)}</td>
              </tr>
            ))}
            {data.judge.map((row) => (
              <tr key={`${row.judge_revision_id}|${row.criterion}`} className="border-b border-border">
                <th scope="row" className="px-2 py-1.5 text-left font-medium text-ink">
                  {t('ai.eval.compare.judgeRow', { name: row.judge_name, revision: row.revision, criterion: row.criterion })}
                </th>
                <td className={cell}>{judgePercent(row.a.dev)}</td>
                <td className={cell}>{judgePercent(row.b.dev)}</td>
                <td className={cell}>{judgePercent(row.a.held_out)}</td>
                <td className={cell}>{judgePercent(row.b.held_out)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.judge_unmatched.length > 0 && (
        <ul className="flex flex-col gap-1">
          {data.judge_unmatched.map((entry) => (
            <UnmatchedJudge key={`${data.a.id}|${data.b.id}|${entry.judge_revision_id}|${entry.scored}`} entry={entry} data={data} onSettled={onSettled} />
          ))}
        </ul>
      )}
      {dev.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-ui font-semibold text-ink">{t('ai.eval.compare.devRegressions', { count: dev.length })}</h4>
          <ul className="flex flex-col gap-1 text-ui">
            {dev.map((regression) => (
              <li key={regression.example_id} className="flex min-w-0 flex-wrap gap-x-2 border-b border-border py-1">
                <span className="min-w-0 wrap-anywhere text-ink">{regression.input ? exampleSummary(regression.input) : none}</span>
                <span className="text-danger">{regression.failed.map((criterion) => t(`ai.eval.compare.criteria.${criterion}`)).join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {heldOut > 0 && <p className="text-ui text-ink">{t('ai.eval.compare.heldOutRegressions', { count: heldOut })}</p>}
      {dev.length === 0 && heldOut === 0 && <p className="text-ui text-muted">{t('ai.eval.compare.noRegressions')}</p>}
    </div>
  );
}

/**
 * "So sánh" (design §5.3, D20): the open run ("nay") against another run of the same version ("trước"): pass rate of shape, rules and
 * expected answer, split into dev and held-out, and the dev examples that passed before and fail now (held-out ones are only counted).
 * A run on the working set, or one from before versions existed, has no version to compare on.
 */
export function RunCompare({ run }: { run: EvalRun }) {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const errorDetails = useErrorDetails();
  const [before, setBefore] = useState('');
  const setId = run.set_id;

  const others = useQuery({
    queryKey: aiKeys.runsOfSet(run.operation, setId ?? ''),
    queryFn: () => listRuns(api, run.operation, undefined, setId ?? undefined),
    enabled: setId !== null,
  });
  const queryClient = useQueryClient();
  const comparison = useQuery({ queryKey: aiKeys.compare(before, run.id), queryFn: () => getRunComparison(api, before, run.id), enabled: before !== '' });
  // The judge passes that were asked for have ended: the comparison, and the results of both runs, are read again.
  const onSettled = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: aiKeys.compare(before, run.id) });
    void queryClient.invalidateQueries({ queryKey: aiKeys.runItems(run.id) });
    void queryClient.invalidateQueries({ queryKey: aiKeys.runItems(before) });
  }, [queryClient, before, run.id]);
  const candidates = (others.data?.items ?? []).filter((other) => other.id !== run.id);

  let body;
  if (setId === null) body = <p className="text-ui text-muted">{t('ai.eval.compare.workingSet')}</p>;
  else if (others.isPending) body = <ListState state="loading" />;
  else if (others.isError) body = <ListState state="error" onRetry={() => void others.refetch()} />;
  else if (candidates.length === 0) body = <p className="text-ui text-muted">{t('ai.eval.compare.noOther')}</p>;
  else {
    body = (
      <>
        <Select
          label={t('ai.eval.compare.select')}
          placeholder={t('ai.eval.compare.choose')}
          items={candidates.map((other) => ({ id: other.id, label: t('ai.eval.compare.option', { time: format.dateTime(other.created_at), model: other.model }) }))}
          value={before}
          onChange={setBefore}
        />
        {comparison.isError && <Banner variant="error">{errorDetails(comparison.error).message}</Banner>}
        {comparison.data && <Result data={comparison.data} onSettled={onSettled} />}
      </>
    );
  }

  return (
    <section aria-labelledby="eval-run-compare" className="flex min-w-0 flex-col gap-3">
      <h3 id="eval-run-compare" className="text-ui font-semibold text-ink">{t('ai.eval.compare.title')}</h3>
      {body}
    </section>
  );
}
