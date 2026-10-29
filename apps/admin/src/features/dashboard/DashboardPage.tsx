import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useUrlFilters } from '../../api/use-url-filters';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { DataList, type Column } from '../../ui/DataList';
import { ListState } from '../../ui/ListState';
import { Select } from '../../ui/Select';
import { Stat } from '../../ui/Stat';
import { sortByOperationOrder, type AiOperation, type CostTotals } from '../ai/ai-api';
import { todayInAdminZone } from '../ai/cost-range';
import { useAiFormat } from '../ai/useAiFormat';
import { Card, SubTitle } from './Card';
import { BarList, ColumnChart, Meter, SERIES, TableView } from './charts';
import {
  dashboardKeys, getAiDashboard, getAiQuality, getAiUsageDays, getAiUsagePro, share, type AiDashboard, type AiQuality, type AiUsageDays,
  type AiUsagePro,
} from './dashboard-api';
import { JudgeScoresCard, LatestEvalCard, RealJudgeCard } from './QualityCards';

const RANGES = ['7', '30', '90'] as const;
const FILTERS = { days: { default: '30', valid: (value: string) => (RANGES as readonly string[]).includes(value) } };
const OPERATIONS: readonly string[] = [
  'generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word',
];
const KNOWN_TYPES = ['mcq_definition', 'true_false_definition', 'type_word', 'cloze', 'meaning_in_sentence', 'mcq_sentence'];
const KNOWN_SOURCES = ['ai', 'rule', 'own_sentence'];
const KNOWN_FAILURES = ['ai-unavailable', 'quota-exhausted', 'plan-required', 'ai-failed', 'rejected', 'input-mismatch', 'word-not-recognized'];
const KNOWN_VERDICTS = ['ok', 'not_recognized'];
const PRO_BUCKET_LABEL = {
  '0': 'bucketZero', '1-49': 'bucketLow', '50-79': 'bucketMid', '80-99': 'bucketHigh', '100': 'bucketFull',
} as const;

const addDays = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** `/dashboard` (`ai.view`, admin and editor; owner 28/10/2026): whether AI runs, how good its questions are, what it costs. */
export function DashboardPage() {
  const t = useTranslations();
  const api = useApi();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const to = todayInAdminZone(new Date());
  const from = addDays(to, 1 - Number(filters.days));

  const ai = useQuery({ queryKey: dashboardKeys.ai(from, to), queryFn: () => getAiDashboard(api, from, to) });
  const quality = useQuery({ queryKey: dashboardKeys.quality(from, to), queryFn: () => getAiQuality(api, from, to) });
  const usage = useQuery({ queryKey: dashboardKeys.usage(from, to), queryFn: () => getAiUsageDays(api, from, to) });
  // The Pro spread is of each learner's current cycle, so the selected range does not change it.
  const usagePro = useQuery({ queryKey: dashboardKeys.usagePro(), queryFn: () => getAiUsagePro(api) });

  const queries = [ai, quality, usage, usagePro];
  if (queries.some((q) => q.error instanceof ApiError && q.error.problem.slug === 'forbidden')) {
    return <Banner variant="error">{t('errors.forbidden')}</Banner>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 shell:grid-cols-3 shell:items-end">
        <p className="text-ui text-muted shell:col-span-2">{t('dashboard.note')}</p>
        <Select
          label={t('dashboard.range')}
          value={filters.days}
          onChange={(value) => setFilters({ days: value as (typeof RANGES)[number] })}
          items={RANGES.map((days) => ({ id: days, label: t('dashboard.lastDays', { days: Number(days) }) }))}
        />
      </div>
      {queries.some((q) => q.isPending) ? (
        <ListState state="loading" />
      ) : queries.some((q) => q.isError) ? (
        <ListState state="error" onRetry={() => queries.forEach((q) => q.isError && void q.refetch())} />
      ) : (
        <Body ai={ai.data!} quality={quality.data!} usage={usage.data!} usagePro={usagePro.data!} />
      )}
    </div>
  );
}

const tiles = 'grid gap-3 grid-cols-2';
const numeric = 'whitespace-nowrap';

function Body({ ai, quality, usage, usagePro }: { ai: AiDashboard; quality: AiQuality; usage: AiUsageDays; usagePro: AiUsagePro }) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useAiFormat();
  const percent = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', { style: 'percent', maximumFractionDigits: 1 });
  const pct = (value: number | null) => (value === null ? '—' : percent.format(value));
  const opName = (key: string) => (OPERATIONS.includes(key) ? t(`ai.operations.names.${key as AiOperation}`) : key);
  const known = (list: string[], key: string, prefix: string) => (list.includes(key) ? t(`${prefix}.${key}`) : key);
  const day = (date: string) => format.dayMonth(`${date}T00:00:00+07:00`);

  const notReady = ai.operations.filter((op) => !op.ready).length;
  const learnerCalls = ai.learner_health.reduce((sum, row) => sum + row.calls, 0);
  const learnerFailed = ai.learner_health.reduce((sum, row) => sum + row.failed, 0);
  const asked = (source: string) => quality.questions.filter((row) => row.source === source).reduce((sum, row) => sum + row.asked, 0);
  const failures = Object.entries(
    quality.ai_requests.filter((row) => row.state === 'failed')
      .reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.failure ?? '—']: (acc[row.failure ?? '—'] ?? 0) + row.count }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const requests = quality.ai_requests.reduce((sum, row) => sum + row.count, 0);
  const failedRequests = failures.reduce((sum, [, n]) => sum + n, 0);
  // The gateway stops test, eval and judge calls once today's spend is at the cap or over it (B20), so "at" already counts as reached.
  const adminSpent = Number(ai.today.admin_cost_usd);
  const adminCap = ai.today.admin_usd_cap;
  const adminReached = adminCap !== null && adminSpent >= adminCap;

  // AI next to non-AI questions over the range: shares of answered (correct) and of asked (hint, skip).
  const totalsOf = (source: string) => quality.questions.filter((row) => row.source === source)
    .reduce((acc, row) => ({ asked: acc.asked + row.asked, answered: acc.answered + row.answered, correct: acc.correct + row.correct,
      hinted: acc.hinted + row.hinted, skipped: acc.skipped + row.skipped }), { asked: 0, answered: 0, correct: 0, hinted: 0, skipped: 0 });
  const [aiQ, ruleQ] = [totalsOf('ai'), totalsOf('rule')];
  const compare = [
    { key: 'correct', label: t('dashboard.cols.correct'), values: [share(aiQ.correct, aiQ.answered), share(ruleQ.correct, ruleQ.answered)] },
    { key: 'hinted', label: t('dashboard.cols.hinted'), values: [share(aiQ.hinted, aiQ.asked), share(ruleQ.hinted, ruleQ.asked)] },
    { key: 'skipped', label: t('dashboard.cols.skipped'), values: [share(aiQ.skipped, aiQ.asked), share(ruleQ.skipped, ruleQ.asked)] },
  ];
  const sourceSeries = [
    { label: t('dashboard.sources.ai'), ...SERIES.first },
    { label: t('dashboard.sources.rule'), ...SERIES.second },
  ];

  type Health = AiDashboard['learner_health'][number] & { ready: boolean; reason: string | null };
  const health: Health[] = sortByOperationOrder(ai.operations).map((op) => {
    const row = ai.learner_health.find((item) => item.operation === op.operation);
    return { operation: op.operation, ready: op.ready, reason: op.reason, calls: 0, failed: 0, p50_ms: 0, p95_ms: 0, outcomes: {}, ...row };
  });
  const healthColumns: Column<Health>[] = [
    { key: 'op', header: t('dashboard.cols.operation'), className: 'wrap-anywhere', cell: (r) => opName(r.operation) },
    { key: 'ready', header: t('dashboard.cols.ready'), card: 'field', cell: (r) => (r.ready ? t('dashboard.ready') : t(`ai.reasons.${r.reason as 'model-not-set'}`)) },
    { key: 'calls', header: t('dashboard.cols.calls'), className: numeric, card: 'field', cell: (r) => format.number(r.calls) },
    { key: 'failed', header: t('dashboard.cols.failedShare'), className: numeric, card: 'field', cell: (r) => pct(share(r.failed, r.calls)) },
    { key: 'p50', header: t('dashboard.cols.p50'), className: numeric, card: 'field', cell: (r) => (r.calls ? t('dashboard.ms', { ms: format.number(r.p50_ms) }) : '—') },
    { key: 'p95', header: t('dashboard.cols.p95'), className: numeric, card: 'field', cell: (r) => (r.calls ? t('dashboard.ms', { ms: format.number(r.p95_ms) }) : '—') },
    {
      key: 'outcomes', header: t('dashboard.cols.errors'), className: 'wrap-anywhere', card: 'field',
      cell: (r) => Object.entries(r.outcomes).filter(([outcome]) => outcome !== 'succeeded').map(([outcome, n]) => `${outcome} × ${n}`).join(', ') || '—',
    },
  ];

  type Cost = CostTotals & { key: string };
  const costColumns = (label: (key: string) => string): Column<Cost>[] => [
    { key: 'key', header: t('dashboard.cols.group'), className: 'wrap-anywhere', cell: (r) => label(r.key) },
    { key: 'calls', header: t('dashboard.cols.calls'), className: numeric, card: 'field', cell: (r) => format.number(r.calls) },
    { key: 'vnd', header: t('dashboard.cols.vnd'), className: numeric, card: 'field', cell: (r) => format.vnd(r.cost_vnd) },
    { key: 'usd', header: t('dashboard.cols.usd'), className: numeric, card: 'field', cell: (r) => format.usd(r.cost_usd) },
    { key: 'unknown', header: t('dashboard.cols.unknownCost'), className: numeric, card: 'field', cell: (r) => format.number(r.unknown_cost_calls) },
  ];

  type Question = AiQuality['questions'][number];
  const questionColumns: Column<Question>[] = [
    { key: 'type', header: t('dashboard.cols.type'), className: 'wrap-anywhere', cell: (r) => known(KNOWN_TYPES, r.type, 'dashboard.types') },
    { key: 'source', header: t('dashboard.cols.source'), card: 'field', cell: (r) => known(KNOWN_SOURCES, r.source, 'dashboard.sources') },
    { key: 'asked', header: t('dashboard.cols.asked'), className: numeric, card: 'field', cell: (r) => format.number(r.asked) },
    { key: 'correct', header: t('dashboard.cols.correct'), className: numeric, card: 'field', cell: (r) => pct(share(r.correct, r.answered)) },
    { key: 'hinted', header: t('dashboard.cols.hinted'), className: numeric, card: 'field', cell: (r) => pct(share(r.hinted, r.asked)) },
    { key: 'skipped', header: t('dashboard.cols.skipped'), className: numeric, card: 'field', cell: (r) => pct(share(r.skipped, r.asked)) },
  ];

  type Report = AiQuality['reports'][number];
  const reportColumns: Column<Report>[] = [
    { key: 'source', header: t('dashboard.cols.source'), cell: (r) => known(KNOWN_SOURCES, r.source, 'dashboard.sources') },
    { key: 'total', header: t('dashboard.cols.reports'), className: numeric, card: 'field', cell: (r) => format.number(r.total) },
    {
      key: 'per1000', header: t('dashboard.cols.per1000'), className: numeric, card: 'field',
      cell: (r) => (asked(r.source) > 0 ? format.number(Math.round((r.total / asked(r.source)) * 10_000) / 10) : '—'),
    },
    { key: 'open', header: t('dashboard.cols.open'), className: numeric, card: 'field', cell: (r) => format.number(r.open) },
    { key: 'fixed', header: t('dashboard.cols.fixed'), className: numeric, card: 'field', cell: (r) => format.number(r.fixed) },
    { key: 'noError', header: t('dashboard.cols.noError'), className: numeric, card: 'field', cell: (r) => format.number(r.no_error) },
    { key: 'confirmed', header: t('dashboard.cols.confirmed'), className: numeric, card: 'field', cell: (r) => format.number(r.confirmed) },
    { key: 'refunded', header: t('dashboard.cols.refunded'), className: numeric, card: 'field', cell: (r) => format.number(r.refunded) },
  ];

  const one = (label: string) => [{ label, ...SERIES.first }];
  const countBars = (label: string, rows: Array<[string, number]>, empty: string) => (rows.length === 0 ? (
    <p className="text-ui text-muted">{empty}</p>
  ) : (
    <BarList label={label} series={one(label)} rows={rows.map(([name, n]) => ({ key: name, label: name, values: [n], display: [format.number(n)] }))} />
  ));

  return (
    <>
      {!ai.ai_enabled && <Banner variant="warning">{t('dashboard.aiDisabled')}</Banner>}

      <div className="grid gap-6 shell:grid-cols-2">
        <Card icon="◷" title={t('dashboard.today.title')} wide>
          <div className="grid gap-3 shell:grid-cols-3">
            <Meter
              label={t('dashboard.today.calls')}
              value={ai.today.calls}
              max={ai.today.cap}
              display={ai.today.cap === null ? format.number(ai.today.calls) : `${format.number(ai.today.calls)} / ${format.number(ai.today.cap)}`}
            />
            <Meter
              label={t('dashboard.today.units')}
              value={usage.today.used}
              max={usage.today.cap}
              display={`${format.number(usage.today.used)} / ${format.number(usage.today.cap)}`}
              alert={usage.today.alert_reached}
            />
            <Meter
              label={t('dashboard.today.adminUsd')}
              value={adminSpent}
              max={adminCap}
              display={adminCap === null ? format.usd(ai.today.admin_cost_usd) : `${format.usd(ai.today.admin_cost_usd)} / ${format.usd(String(adminCap))}`}
              alert={adminReached}
            />
            <Stat label={t('dashboard.today.cost')} value={format.vnd(ai.today.cost_vnd)} />
            <Stat label={t('dashboard.today.notReady')} value={`${notReady} / ${ai.operations.length}`} tone={notReady > 0 ? 'danger' : 'neutral'} />
          </div>
          {adminReached && <Banner variant="warning">{t('dashboard.today.adminUsdReached')}</Banner>}
        </Card>

        <Card icon="♥" title={t('dashboard.health.title')} hint={t('dashboard.health.hint')} wide>
          <div className="grid gap-3 grid-cols-2 shell:grid-cols-4">
            <Stat label={t('dashboard.health.calls')} value={format.number(learnerCalls)} />
            <Stat label={t('dashboard.health.failed')} value={pct(share(learnerFailed, learnerCalls))} tone={learnerFailed > 0 ? 'danger' : 'neutral'} />
          </div>
          <ColumnChart
            label={t('dashboard.health.chart')}
            series={[{ label: t('dashboard.health.ok'), ...SERIES.first }, { label: t('dashboard.health.failedCalls'), ...SERIES.failure }]}
            days={ai.days.map((d) => ({ date: d.date, values: [d.learner_calls - d.learner_failed, d.learner_failed] }))}
            formatValue={(v) => format.number(Math.round(v))}
            formatDay={day}
          />
          <TableView summary={t('dashboard.byOperation')}>
            <DataList rows={health} rowKey={(r) => r.operation} columns={healthColumns} state="ready" emptyText={t('dashboard.empty')} />
          </TableView>
        </Card>

        <Card icon="₫" title={t('dashboard.cost.title')} hint={t('dashboard.cost.hint')} wide>
          <div className="grid gap-3 grid-cols-2 shell:grid-cols-4">
            <Stat label={t('dashboard.cost.total')} value={format.vnd(ai.total.cost_vnd)} tone="primary" />
            <Stat label={t('dashboard.cost.usd')} value={format.usd(ai.total.cost_usd)} />
            <Stat label={t('dashboard.cost.calls')} value={format.number(ai.total.calls)} />
            <Stat label={t('dashboard.cost.unknown')} value={format.number(ai.total.unknown_cost_calls)} tone={ai.total.unknown_cost_calls > 0 ? 'danger' : 'neutral'} />
          </div>
          <ColumnChart
            label={t('dashboard.cost.chart')}
            series={one(t('dashboard.cost.chart'))}
            days={ai.days.map((d) => ({ date: d.date, values: [d.cost_vnd] }))}
            formatValue={(v) => format.vnd(Math.round(v))}
            formatDay={day}
          />
          <div className="grid gap-6 shell:grid-cols-2">
            <div className="flex flex-col gap-3">
              <SubTitle>{t('dashboard.cost.byOperation')}</SubTitle>
              {ai.by_operation.length === 0 ? <p className="text-ui text-muted">{t('dashboard.empty')}</p> : (
                <BarList
                  label={t('dashboard.cost.byOperation')}
                  series={one(t('dashboard.cost.byOperation'))}
                  rows={[...ai.by_operation].sort((a, b) => b.cost_vnd - a.cost_vnd)
                    .map((row) => ({ key: row.key, label: opName(row.key), values: [row.cost_vnd], display: [format.vnd(row.cost_vnd)] }))}
                />
              )}
            </div>
            <div className="flex flex-col gap-3">
              <SubTitle>{t('dashboard.cost.byModel')}</SubTitle>
              {ai.by_model.length === 0 ? <p className="text-ui text-muted">{t('dashboard.empty')}</p> : (
                <BarList
                  label={t('dashboard.cost.byModel')}
                  series={one(t('dashboard.cost.byModel'))}
                  rows={[...ai.by_model].sort((a, b) => b.cost_vnd - a.cost_vnd)
                    .map((row) => ({ key: row.key, label: row.key, values: [row.cost_vnd], display: [format.vnd(row.cost_vnd)] }))}
                />
              )}
            </div>
          </div>
          <TableView summary={t('dashboard.showTable')}>
            <div className="flex flex-col gap-3">
              <SubTitle>{t('dashboard.cost.byOperation')}</SubTitle>
              <DataList rows={ai.by_operation} rowKey={(r) => r.key} columns={costColumns(opName)} state="ready" emptyText={t('dashboard.empty')} />
              <SubTitle>{t('dashboard.cost.byModel')}</SubTitle>
              <DataList rows={ai.by_model} rowKey={(r) => r.key} columns={costColumns((key) => key)} state="ready" emptyText={t('dashboard.empty')} />
              <SubTitle>{t('dashboard.cost.byPurpose')}</SubTitle>
              <DataList
                rows={ai.by_purpose}
                rowKey={(r) => r.key}
                columns={costColumns((key) => known(['learner', 'test', 'eval'], key, 'ai.status.purposes'))}
                state="ready"
                emptyText={t('dashboard.empty')}
              />
            </div>
          </TableView>
        </Card>

        <Card icon="✓" title={t('dashboard.quality.title')} hint={t('dashboard.quality.hint')}>
          {quality.questions.length === 0 ? <p className="text-ui text-muted">{t('dashboard.empty')}</p> : (
            <BarList
              label={t('dashboard.quality.compare')}
              series={sourceSeries}
              max={1}
              rows={compare.map((row) => ({ key: row.key, label: row.label, values: row.values.map((v) => v ?? 0), display: row.values.map(pct) }))}
            />
          )}
          <div className="flex flex-col gap-3">
            <SubTitle>{t('dashboard.quality.retry.title')}</SubTitle>
            <p className="text-ui text-muted">{t('dashboard.quality.retry.hint')}</p>
            {quality.ai_second_tries.length === 0 ? <p className="text-ui text-muted">{t('dashboard.empty')}</p> : (
              <BarList
                label={t('dashboard.quality.retry.title')}
                series={one(t('dashboard.quality.retry.title'))}
                max={1}
                rows={quality.ai_second_tries.map((row) => {
                  const rate = share(row.second_tries, row.first_answers);
                  return {
                    key: row.type,
                    label: `${known(KNOWN_TYPES, row.type, 'dashboard.types')} (${format.number(row.second_tries)} / ${format.number(row.first_answers)})`,
                    values: [rate ?? 0],
                    display: [pct(rate)],
                  };
                })}
              />
            )}
          </div>
          <div className="grid gap-3 grid-cols-2">
            <Stat label={t('dashboard.quality.newForms')} value={format.number(quality.unknown_forms.new_forms)} />
            <Stat label={t('dashboard.quality.reportsAi')} value={format.number(quality.reports.find((r) => r.source === 'ai')?.total ?? 0)} />
          </div>
          {quality.ai_report_reasons.length > 0 && (
            <div className="flex flex-col gap-3">
              <SubTitle>{t('dashboard.quality.aiReasons')}</SubTitle>
              {countBars(t('dashboard.quality.aiReasons'), quality.ai_report_reasons.map((row) => [locale === 'en' ? row.label_en : row.label_vi, row.count]), '')}
            </div>
          )}
          <TableView summary={t('dashboard.showTable')}>
            <div className="flex flex-col gap-3">
              <DataList rows={quality.questions} rowKey={(r) => `${r.source}|${r.type}`} columns={questionColumns} state="ready" emptyText={t('dashboard.empty')} />
              <SubTitle>{t('dashboard.quality.reports')}</SubTitle>
              <DataList rows={quality.reports} rowKey={(r) => r.source} columns={reportColumns} state="ready" emptyText={t('dashboard.quality.noReports')} />
              <SubTitle>{t('dashboard.quality.forms')}</SubTitle>
              <ul className="flex flex-col gap-1 text-ui text-ink">
                {[
                  [t('dashboard.quality.newForms'), quality.unknown_forms.new_forms] as const,
                  [t('dashboard.quality.formsSeen'), quality.unknown_forms.rejected_seen] as const,
                  ...quality.word_checks.map((row) => [
                    t('dashboard.quality.wordCheck', { verdict: known(KNOWN_VERDICTS, row.verdict, 'dashboard.verdicts') }), row.count,
                  ] as const),
                ].map(([label, count]) => (
                  <li key={label} className="flex justify-between gap-4 border-b border-border py-1 tabular-nums">
                    <span>{label}</span>
                    <span>{format.number(count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TableView>
        </Card>

        <Card icon="☺" title={t('dashboard.impact.title')} hint={t('dashboard.impact.hint')}>
          <div className={tiles}>
            <Stat label={t('dashboard.impact.requests')} value={format.number(requests)} />
            <Stat label={t('dashboard.impact.failedShare')} value={pct(share(failedRequests, requests))} tone={failedRequests > 0 ? 'danger' : 'neutral'} />
          </div>
          <div className="flex flex-col gap-3">
            <SubTitle>{t('dashboard.impact.failures')}</SubTitle>
            {countBars(t('dashboard.impact.failures'), failures.map(([failure, n]) => [known(KNOWN_FAILURES, failure, 'dashboard.failures'), n]), t('dashboard.impact.noFailure'))}
          </div>
          <div className="flex flex-col gap-3">
            <SubTitle>{t('dashboard.impact.sessions')}</SubTitle>
            {countBars(
              t('dashboard.impact.sessions'),
              quality.ai_sessions.map((row) => [row.stopped === null ? t('dashboard.impact.notStopped') : known(KNOWN_FAILURES, row.stopped, 'dashboard.failures'), row.count]),
              t('dashboard.empty'),
            )}
          </div>
        </Card>

        <LatestEvalCard evals={ai.latest_evals} revisions={ai.judge_revisions} />

        <JudgeScoresCard groups={[...ai.judge_scores, ...quality.real_judge_scores]} revisions={ai.judge_revisions} />

        <RealJudgeCard rows={quality.real_judge_latest} revisions={ai.judge_revisions} />

        <Card icon="▤" title={t('dashboard.usage.title')} hint={t('dashboard.usage.hint')} wide>
          <div className="grid gap-3 grid-cols-2 shell:grid-cols-4">
            <Stat label={t('dashboard.usage.total')} value={format.number(usage.days.reduce((sum, d) => sum + d.total, 0))} />
            <Stat label={t('dashboard.usage.daysAtCap')} value={format.number(usage.days_at_cap)} tone={usage.days_at_cap > 0 ? 'danger' : 'neutral'} />
            <Stat label={t('dashboard.usage.refunds')} value={format.number(usage.refunds)} />
            <Stat label={t('dashboard.usage.peakLearners')} value={format.number(Math.max(0, ...usage.days.map((d) => d.learners)))} />
          </div>
          <ColumnChart
            label={t('dashboard.usage.chart')}
            series={[{ label: t('dashboard.usage.practice'), ...SERIES.first }, { label: t('dashboard.usage.lookup'), ...SERIES.second }]}
            days={usage.days.map((d) => ({ date: d.date, values: [d.ai_practice, d.ai_lookup] }))}
            formatValue={(v) => format.number(Math.round(v))}
            formatDay={day}
          />
          <div className="flex flex-col gap-3">
            <SubTitle>{t('dashboard.usage.pro.title')}</SubTitle>
            <p className="text-ui text-muted">{t('dashboard.usage.pro.hint')}</p>
            {usagePro.pro_learners === 0 ? <p className="text-ui text-muted">{t('dashboard.usage.pro.none')}</p> : (
              <>
                <div className="grid gap-3 grid-cols-2 shell:grid-cols-4">
                  <Stat label={t('dashboard.usage.pro.learners')} value={format.number(usagePro.pro_learners)} />
                </div>
                <BarList
                  label={t('dashboard.usage.pro.chart')}
                  series={one(t('dashboard.usage.pro.chart'))}
                  rows={usagePro.buckets.map((bucket) => ({
                    key: bucket.key,
                    label: t(`dashboard.usage.pro.${PRO_BUCKET_LABEL[bucket.key]}`),
                    values: [bucket.learners],
                    display: [format.number(bucket.learners)],
                  }))}
                />
                {usagePro.no_limit > 0 && <p className="text-ui text-muted">{t('dashboard.usage.pro.noLimit', { count: usagePro.no_limit })}</p>}
                {usagePro.truncated && <p className="text-ui text-muted">{t('dashboard.usage.pro.truncated')}</p>}
              </>
            )}
          </div>
          <TableView summary={t('dashboard.showTable')}>
            <DataList
              rows={usage.days.filter((d) => d.total > 0)}
              rowKey={(r) => r.date}
              columns={[
                { key: 'date', header: t('dashboard.cols.date'), cell: (r) => format.date(`${r.date}T00:00:00+07:00`) },
                { key: 'practice', header: t('dashboard.usage.practice'), className: numeric, card: 'field', cell: (r) => format.number(r.ai_practice) },
                { key: 'lookup', header: t('dashboard.usage.lookup'), className: numeric, card: 'field', cell: (r) => format.number(r.ai_lookup) },
                { key: 'learners', header: t('dashboard.cols.learners'), className: numeric, card: 'field', cell: (r) => format.number(r.learners) },
                { key: 'cap', header: t('dashboard.usage.dayCap'), card: 'field', cell: (r) => format.number(r.cap) },
                { key: 'atCap', header: t('dashboard.usage.atCap'), card: 'field', cell: (r) => (r.at_cap ? t('dashboard.usage.yes') : '—') },
              ]}
              state="ready"
              emptyText={t('dashboard.empty')}
            />
          </TableView>
        </Card>
      </div>
    </>
  );
}
