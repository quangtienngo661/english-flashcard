import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { useErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { ListState } from '../../ui/ListState';
import { Select } from '../../ui/Select';
import { aiKeys, getRunComparison, listRuns, type EvalRun, type RunComparison, type SplitStats } from './ai-api';
import { exampleSummary } from './prompt-form';
import { useAiFormat } from './useAiFormat';

/** "67%", or "—" when nothing was judged (nothing passed and nothing failed). */
const percent = (pass: number, fail: number) => (pass + fail === 0 ? '—' : `${Math.round((100 * pass) / (pass + fail))}%`);

const ROWS = [
  { key: 'shape', rate: (s: SplitStats) => percent(s.shape_pass, s.shape_fail) },
  { key: 'rule', rate: (s: SplitStats) => percent(s.rule_pass, s.rule_fail) },
  { key: 'expected', rate: (s: SplitStats) => percent(s.expected_pass, s.expected_fail) },
] as const;

const cell = 'px-2 py-1.5 text-right tabular-nums';

function Result({ data }: { data: RunComparison }) {
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
          </tbody>
        </table>
      </div>
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
  const comparison = useQuery({ queryKey: aiKeys.compare(before, run.id), queryFn: () => getRunComparison(api, before, run.id), enabled: before !== '' });
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
        {comparison.data && <Result data={comparison.data} />}
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
