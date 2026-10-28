import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
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
import { DayBars } from './DayBars';
import {
  dashboardKeys, getAiDashboard, getAiQuality, getAiUsageDays, share, type AiDashboard, type AiQuality, type AiUsageDays,
} from './dashboard-api';

const RANGES = ['7', '30', '90'] as const;
const FILTERS = { days: { default: '30', valid: (value: string) => (RANGES as readonly string[]).includes(value) } };
const OPERATIONS: readonly string[] = [
  'generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word',
];
const KNOWN_TYPES = ['mcq_definition', 'true_false_definition', 'type_word', 'cloze', 'meaning_in_sentence', 'mcq_sentence'];
const KNOWN_SOURCES = ['ai', 'rule', 'own_sentence'];
const KNOWN_FAILURES = ['ai-unavailable', 'quota-exhausted', 'plan-required', 'ai-failed', 'rejected', 'input-mismatch', 'word-not-recognized'];
const KNOWN_VERDICTS = ['ok', 'not_recognized'];

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

  const queries = [ai, quality, usage];
  if (queries.some((q) => q.error instanceof ApiError && q.error.problem.slug === 'forbidden')) {
    return <Banner variant="error">{t('errors.forbidden')}</Banner>;
  }

  return (
    <div className="flex flex-col gap-8">
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
      ) : ai.isError || quality.isError || usage.isError ? (
        <ListState state="error" onRetry={() => queries.forEach((q) => q.isError && void q.refetch())} />
      ) : (
        <Body ai={ai.data!} quality={quality.data!} usage={usage.data!} />
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
        {hint && <p className="text-ui text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const tiles = 'grid gap-3 grid-cols-2 shell:grid-cols-4';
const numeric = 'whitespace-nowrap';

function Body({ ai, quality, usage }: { ai: AiDashboard; quality: AiQuality; usage: AiUsageDays }) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useAiFormat();
  const percent = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', { style: 'percent', maximumFractionDigits: 1 });
  const pct = (value: number | null) => (value === null ? '—' : percent.format(value));
  const opName = (key: string) => (OPERATIONS.includes(key) ? t(`ai.operations.names.${key as AiOperation}`) : key);
  const known = (list: string[], key: string, prefix: string) => (list.includes(key) ? t(`${prefix}.${key}`) : key);

  const notReady = ai.operations.filter((op) => !op.ready).length;
  const learnerCalls = ai.learner_health.reduce((sum, row) => sum + row.calls, 0);
  const learnerFailed = ai.learner_health.reduce((sum, row) => sum + row.failed, 0);
  const asked = (source: string) => quality.questions.filter((row) => row.source === source).reduce((sum, row) => sum + row.asked, 0);
  const failures = Object.entries(
    quality.ai_requests.filter((row) => row.state === 'failed')
      .reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.failure ?? '—']: (acc[row.failure ?? '—'] ?? 0) + row.count }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const requests = quality.ai_requests.reduce((sum, row) => sum + row.count, 0);

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
    { key: 'refunded', header: t('dashboard.cols.refunded'), className: numeric, card: 'field', cell: (r) => format.number(r.refunded) },
  ];

  const countList = (rows: Array<[string, number]>, empty: string) => (rows.length === 0 ? (
    <p className="text-ui text-muted">{empty}</p>
  ) : (
    <ul className="flex flex-col gap-1 text-ui text-ink">
      {rows.map(([label, count]) => (
        <li key={label} className="flex justify-between gap-4 border-b border-border py-1 tabular-nums">
          <span className="wrap-anywhere">{label}</span>
          <span>{format.number(count)}</span>
        </li>
      ))}
    </ul>
  ));

  return (
    <>
      {!ai.ai_enabled && <Banner variant="warning">{t('dashboard.aiDisabled')}</Banner>}

      <Section title={t('dashboard.today.title')}>
        <div className={tiles}>
          <Stat
            label={t('dashboard.today.calls')}
            value={ai.today.cap === null ? format.number(ai.today.calls) : `${format.number(ai.today.calls)} / ${format.number(ai.today.cap)}`}
          />
          <Stat label={t('dashboard.today.cost')} value={format.vnd(ai.today.cost_vnd)} />
          <Stat
            label={t('dashboard.today.units')}
            value={`${format.number(usage.today.used)} / ${format.number(usage.today.cap)}`}
            tone={usage.today.alert_reached ? 'danger' : 'neutral'}
          />
          <Stat label={t('dashboard.today.notReady')} value={`${notReady} / ${ai.operations.length}`} tone={notReady > 0 ? 'danger' : 'neutral'} />
        </div>
      </Section>

      <Section title={t('dashboard.health.title')} hint={t('dashboard.health.hint')}>
        <div className={tiles}>
          <Stat label={t('dashboard.health.calls')} value={format.number(learnerCalls)} />
          <Stat label={t('dashboard.health.failed')} value={pct(share(learnerFailed, learnerCalls))} tone={learnerFailed > 0 ? 'danger' : 'neutral'} />
        </div>
        <DataList rows={health} rowKey={(r) => r.operation} columns={healthColumns} state="ready" emptyText={t('dashboard.empty')} />
      </Section>

      <Section title={t('dashboard.cost.title')} hint={t('dashboard.cost.hint')}>
        <div className={tiles}>
          <Stat label={t('dashboard.cost.total')} value={format.vnd(ai.total.cost_vnd)} tone="primary" />
          <Stat label={t('dashboard.cost.usd')} value={format.usd(ai.total.cost_usd)} />
          <Stat label={t('dashboard.cost.calls')} value={format.number(ai.total.calls)} />
          <Stat label={t('dashboard.cost.unknown')} value={format.number(ai.total.unknown_cost_calls)} tone={ai.total.unknown_cost_calls > 0 ? 'danger' : 'neutral'} />
        </div>
        <DayBars
          label={t('dashboard.cost.chart')}
          days={ai.days.map((day) => ({ date: day.date, value: day.cost_vnd }))}
          describe={(day) => `${format.dayMonth(`${day.date}T00:00:00+07:00`)}: ${format.vnd(day.value)}`}
        />
        <h3 className="font-bold text-ink">{t('dashboard.cost.byOperation')}</h3>
        <DataList rows={ai.by_operation} rowKey={(r) => r.key} columns={costColumns(opName)} state="ready" emptyText={t('dashboard.empty')} />
        <h3 className="font-bold text-ink">{t('dashboard.cost.byModel')}</h3>
        <DataList rows={ai.by_model} rowKey={(r) => r.key} columns={costColumns((key) => key)} state="ready" emptyText={t('dashboard.empty')} />
        <h3 className="font-bold text-ink">{t('dashboard.cost.byPurpose')}</h3>
        <DataList
          rows={ai.by_purpose}
          rowKey={(r) => r.key}
          columns={costColumns((key) => known(['learner', 'test', 'eval'], key, 'ai.status.purposes'))}
          state="ready"
          emptyText={t('dashboard.empty')}
        />
      </Section>

      <Section title={t('dashboard.quality.title')} hint={t('dashboard.quality.hint')}>
        <DataList rows={quality.questions} rowKey={(r) => `${r.source}|${r.type}`} columns={questionColumns} state="ready" emptyText={t('dashboard.empty')} />
        <h3 className="font-bold text-ink">{t('dashboard.quality.reports')}</h3>
        <DataList rows={quality.reports} rowKey={(r) => r.source} columns={reportColumns} state="ready" emptyText={t('dashboard.quality.noReports')} />
        <div className="grid gap-6 shell:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-ink">{t('dashboard.quality.aiReasons')}</h3>
            {countList(quality.ai_report_reasons.map((row) => [locale === 'en' ? row.label_en : row.label_vi, row.count]), t('dashboard.quality.noReports'))}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-ink">{t('dashboard.quality.forms')}</h3>
            {countList([
              [t('dashboard.quality.newForms'), quality.unknown_forms.new_forms],
              [t('dashboard.quality.formsSeen'), quality.unknown_forms.rejected_seen],
              ...quality.word_checks.map((row): [string, number] => [
                t('dashboard.quality.wordCheck', { verdict: known(KNOWN_VERDICTS, row.verdict, 'dashboard.verdicts') }), row.count,
              ]),
            ], t('dashboard.empty'))}
          </div>
        </div>
      </Section>

      <Section title={t('dashboard.impact.title')} hint={t('dashboard.impact.hint')}>
        <div className={tiles}>
          <Stat label={t('dashboard.impact.requests')} value={format.number(requests)} />
          <Stat
            label={t('dashboard.impact.failedShare')}
            value={pct(share(failures.reduce((sum, [, n]) => sum + n, 0), requests))}
            tone={failures.length > 0 ? 'danger' : 'neutral'}
          />
        </div>
        <div className="grid gap-6 shell:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-ink">{t('dashboard.impact.failures')}</h3>
            {countList(failures.map(([failure, n]) => [known(KNOWN_FAILURES, failure, 'dashboard.failures'), n]), t('dashboard.impact.noFailure'))}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-ink">{t('dashboard.impact.sessions')}</h3>
            {countList(
              quality.ai_sessions.map((row) => [row.stopped === null ? t('dashboard.impact.notStopped') : known(KNOWN_FAILURES, row.stopped, 'dashboard.failures'), row.count]),
              t('dashboard.empty'),
            )}
          </div>
        </div>
      </Section>

      <Section title={t('dashboard.usage.title')} hint={t('dashboard.usage.hint')}>
        <div className={tiles}>
          <Stat label={t('dashboard.usage.total')} value={format.number(usage.days.reduce((sum, day) => sum + day.total, 0))} />
          <Stat label={t('dashboard.usage.daysAtCap')} value={format.number(usage.days_at_cap)} tone={usage.days_at_cap > 0 ? 'danger' : 'neutral'} />
          <Stat label={t('dashboard.usage.refunds')} value={format.number(usage.refunds)} />
          <Stat label={t('dashboard.usage.peakLearners')} value={format.number(Math.max(0, ...usage.days.map((day) => day.learners)))} />
        </div>
        <DayBars
          label={t('dashboard.usage.chart')}
          days={usage.days.map((day) => ({ date: day.date, value: day.total }))}
          describe={(day) => `${format.dayMonth(`${day.date}T00:00:00+07:00`)}: ${format.number(day.value)} / ${format.number(usage.today.cap)}`}
        />
      </Section>
    </>
  );
}
