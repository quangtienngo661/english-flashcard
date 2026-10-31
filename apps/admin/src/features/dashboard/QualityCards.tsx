import { useLocale, useTranslations } from 'use-intl';
import { Badge } from '../../ui/Badge';
import { DataList, type Column } from '../../ui/DataList';
import { sortByOperationOrder, type AiOperation, type SplitStats } from '../ai/ai-api';
import { useAiFormat } from '../ai/useAiFormat';
import { Card, SubTitle } from './Card';
import { SERIES, ShareColumns, TableView } from './charts';
import type { DashboardJudgeRevision, JudgeScoreGroup, LatestEval, RealJudgeLatest, VerdictCounts } from './dashboard-api';
import { judgeCharts, scoredOf, type JudgeChart, type JudgeColumn } from './quality';

/** Only for a cell that has a space the table must not break at; a number or a header may wrap, or a wide table is clipped at 1024 px. */
const NOWRAP = 'whitespace-nowrap';

/** "{passed}/{counted}", or a dash when nothing was counted (never "0/0", never 0 %). */
function useRatio() {
  const format = useAiFormat();
  return (passed: number, counted: number) => (counted > 0 ? `${format.number(passed)}/${format.number(counted)}` : '—');
}

/** The latest complete eval of each operation's live config: its split into dev and held-out, one table per operation. */
export function LatestEvalCard({ evals, revisions }: { evals: LatestEval[]; revisions: DashboardJudgeRevision[] }) {
  const t = useTranslations();
  const format = useAiFormat();

  return (
    <Card icon="◎" title={t('dashboard.evals.title')} hint={t('dashboard.evals.hint')} wide>
      {evals.length === 0 && <p className="text-ui text-muted">{t('dashboard.empty')}</p>}
      {sortByOperationOrder(evals).map((entry) => {
        const { run } = entry;
        // Why there is no run, most basic reason first: nothing frozen to run on, nothing to run, or no complete run yet.
        const missing = entry.set === null ? t('dashboard.evals.noSet')
          : entry.live?.model == null ? t('dashboard.evals.noModel')
            : t('dashboard.evals.noRun', { version: entry.set.version });
        return (
          <div key={entry.operation} className="flex flex-col gap-2">
            <SubTitle>{t(`ai.operations.names.${entry.operation}`)}</SubTitle>
            {run && entry.set && entry.live ? (
              <>
                <p className="text-ui text-muted">
                  {t('dashboard.evals.run', {
                    number: entry.live.number, model: run.model, version: entry.set.version, date: format.date(run.created_at),
                  })}
                </p>
                <EvalTable run={run} revisions={revisions} />
              </>
            ) : (
              <p className="text-ui text-muted">{missing}</p>
            )}
          </div>
        );
      })}
    </Card>
  );
}

type SplitRow = { key: 'dev' | 'held_out'; stats: SplitStats };

function EvalTable({ run, revisions }: { run: NonNullable<LatestEval['run']>; revisions: DashboardJudgeRevision[] }) {
  const t = useTranslations();
  const ratio = useRatio();
  const byId = new Map(revisions.map((revision) => [revision.id, revision]));
  // A judge column needs the judge's name and revision; the API sends every revision that has a score, so none is dropped in practice.
  const judges = run.judge.flatMap((entry) => {
    const revision = byId.get(entry.judge_revision_id);
    return revision ? [{ entry, revision }] : [];
  });
  const rows: SplitRow[] = [{ key: 'dev', stats: run.stats.dev }, { key: 'held_out', stats: run.stats.held_out }];
  const columns: Column<SplitRow>[] = [
    { key: 'split', header: t('dashboard.evals.split'), cell: (r) => (r.key === 'dev' ? t('dashboard.evals.dev') : t('dashboard.evals.heldOut')) },
    {
      key: 'shape', header: t('dashboard.evals.shape'), card: 'field',
      cell: (r) => ratio(r.stats.shape_pass, r.stats.total - r.stats.pending - r.stats.skipped),
    },
    { key: 'rule', header: t('dashboard.evals.rule'), card: 'field', cell: (r) => ratio(r.stats.rule_pass, r.stats.rule_pass + r.stats.rule_fail) },
    {
      key: 'expected', header: t('dashboard.evals.expected'), card: 'field',
      cell: (r) => ratio(r.stats.expected_pass, r.stats.expected_pass + r.stats.expected_fail),
    },
    ...judges.map(({ entry, revision }): Column<SplitRow> => ({
      key: `judge|${revision.id}|${entry.criterion}`,
      header: t('dashboard.evals.judge', { name: revision.judge_name, revision: revision.revision, criterion: entry.criterion }),
      card: 'field',
      cell: (r) => ratio(entry[r.key].pass, scoredOf(entry[r.key])),
    })),
  ];
  return <DataList rows={rows} rowKey={(r) => r.key} columns={columns} state="ready" />;
}

/** One chart per operation, judge and criterion: the judge's verdict shares of every config and source, a dashed line where its revision changes. */
export function JudgeScoresCard({ groups, revisions }: { groups: JudgeScoreGroup[]; revisions: DashboardJudgeRevision[] }) {
  const t = useTranslations();
  const charts = judgeCharts(groups, revisions);

  return (
    <Card icon="⚖" title={t('dashboard.judge.title')} hint={t('dashboard.judge.hint')} wide>
      {charts.length === 0 ? <p className="text-ui text-muted">{t('dashboard.judge.empty')}</p> : charts.map((chart) => <JudgeChartBlock key={chart.key} chart={chart} />)}
    </Card>
  );
}

function JudgeChartBlock({ chart }: { chart: JudgeChart }) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useAiFormat();
  const percent = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', { style: 'percent', maximumFractionDigits: 1 });
  const name = t('dashboard.judge.chart', { judge: chart.judgeName, criterion: chart.criterion, operation: t(`ai.operations.names.${chart.operation}`) });
  const series = [
    { label: t('dashboard.judge.pass'), ...SERIES.first },
    { label: t('dashboard.judge.failMajor'), ...SERIES.failure },
    { label: t('dashboard.judge.failMinor'), ...SERIES.second },
  ];
  const label = (column: JudgeColumn) => t('dashboard.judge.column', {
    source: t(`dashboard.judge.sources.${column.source}`), number: column.config_number ?? '—', model: column.model ?? '—',
  });
  const calibration = (column: JudgeColumn) => (
    <span className="flex flex-wrap items-center gap-2">
      <Badge tone={column.calibrated ? 'success' : 'warning'}>{t(column.calibrated ? 'dashboard.judge.calibrated' : 'dashboard.judge.uncalibrated')}</Badge>
      <span className="text-xs text-muted">{t('dashboard.judge.agreement', { agree: column.agree, labeled: column.labeled })}</span>
    </span>
  );
  // One line per judge revision on the chart, so "not calibrated" is read without opening the table.
  const revisions = [...new Map(chart.columns.map((column) => [column.judge_revision_id, column])).values()];
  const counts = (c: VerdictCounts) =>
    [['pass', c.pass], ['failMajor', c.fail_major], ['failMinor', c.fail_minor], ['unscored', c.unscored]]
      .map(([key, n]) => `${t(`dashboard.judge.${key as 'pass'}`)} ${format.number(n as number)}`).join(', ');
  const rowKey = (column: JudgeColumn) => `${column.source}|${column.config_number}|${column.model}|${column.judge_revision_id}`;

  return (
    <div className="flex flex-col gap-3">
      <SubTitle>{name}</SubTitle>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-ui text-muted">
        {revisions.map((column) => (
          <li key={column.judge_revision_id} className="flex flex-wrap items-center gap-2">
            <span>{t('dashboard.judge.marker', { revision: column.revision })}</span>
            {calibration(column)}
          </li>
        ))}
      </ul>
      <ShareColumns
        label={name}
        series={series}
        columns={chart.columns.map((column) => {
          const scored = scoredOf(column.counts);
          const share = (n: number) => (scored > 0 ? n / scored : 0);
          return {
            key: rowKey(column),
            label: label(column),
            axis: [t(`dashboard.judge.sources.${column.source}`), t('dashboard.judge.axisConfig', { number: column.config_number ?? '—' }), column.model ?? '—'],
            values: [share(column.counts.pass), share(column.counts.fail_major), share(column.counts.fail_minor)],
            note: counts(column.counts),
          };
        })}
        markers={chart.markers.map((index) => ({ index, label: t('dashboard.judge.marker', { revision: chart.columns[index].revision }) }))}
        formatValue={(value) => percent.format(value)}
      />
      <TableView summary={t('dashboard.showTable')}>
        <DataList
          rows={chart.columns}
          rowKey={rowKey}
          state="ready"
          columns={[
            { key: 'group', header: t('dashboard.judge.cols.group'), cell: label },
            { key: 'revision', header: t('dashboard.judge.cols.revision'), card: 'field', cell: (r) => t('dashboard.judge.marker', { revision: r.revision }) },
            { key: 'pass', header: t('dashboard.judge.pass'), card: 'field', cell: (r) => format.number(r.counts.pass) },
            { key: 'failMajor', header: t('dashboard.judge.failMajor'), card: 'field', cell: (r) => format.number(r.counts.fail_major) },
            { key: 'failMinor', header: t('dashboard.judge.failMinor'), card: 'field', cell: (r) => format.number(r.counts.fail_minor) },
            { key: 'unscored', header: t('dashboard.judge.unscored'), card: 'field', cell: (r) => format.number(r.counts.unscored) },
            { key: 'calibration', header: t('dashboard.judge.cols.calibration'), card: 'field', cell: calibration },
          ]}
        />
      </TableView>
    </div>
  );
}

/** The latest finished judge pass over real questions of each operation, one row per judge revision and criterion of that pass. */
export function RealJudgeCard({ rows, revisions }: { rows: RealJudgeLatest[]; revisions: DashboardJudgeRevision[] }) {
  const t = useTranslations();
  const format = useAiFormat();
  const byId = new Map(revisions.map((revision) => [revision.id, revision]));
  const operation = (key: AiOperation) => t(`ai.operations.names.${key}`);
  const columns: Column<RealJudgeLatest>[] = [
    { key: 'operation', header: t('dashboard.cols.operation'), className: 'wrap-anywhere', cell: (r) => operation(r.operation) },
    {
      key: 'judge', header: t('dashboard.real.cols.judge'), className: 'wrap-anywhere', card: 'field',
      cell: (r) => {
        const revision = byId.get(r.judge_revision_id);
        return revision ? `${revision.judge_name} · ${t('dashboard.judge.marker', { revision: revision.revision })}` : '—';
      },
    },
    { key: 'criterion', header: t('dashboard.real.cols.criterion'), className: 'wrap-anywhere', card: 'field', cell: (r) => r.criterion },
    { key: 'pass', header: t('dashboard.judge.pass'), card: 'field', cell: (r) => format.number(r.counts.pass) },
    { key: 'failMajor', header: t('dashboard.judge.failMajor'), card: 'field', cell: (r) => format.number(r.counts.fail_major) },
    { key: 'failMinor', header: t('dashboard.judge.failMinor'), card: 'field', cell: (r) => format.number(r.counts.fail_minor) },
    { key: 'unscored', header: t('dashboard.judge.unscored'), card: 'field', cell: (r) => format.number(r.counts.unscored) },
    { key: 'scoredAt', header: t('dashboard.real.cols.scoredAt'), className: NOWRAP, card: 'field', cell: (r) => format.dateTime(r.scored_at) },
  ];

  return (
    <Card icon="✎" title={t('dashboard.real.title')} hint={t('dashboard.real.hint')} wide>
      {rows.length === 0 ? (
        <p className="text-ui text-muted">{t('dashboard.real.empty')}</p>
      ) : (
        <DataList rows={rows} rowKey={(r) => `${r.operation}|${r.pass_id}|${r.judge_revision_id}|${r.criterion}`} columns={columns} state="ready" />
      )}
    </Card>
  );
}
