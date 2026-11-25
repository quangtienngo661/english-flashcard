import { useLocale, useTranslations } from 'use-intl';
import { DataList, type Column } from '../../ui/DataList';
import { Stat } from '../../ui/Stat';
import { useAiFormat } from '../ai/useAiFormat';
import { Card, SubTitle } from './Card';
import { share } from './dashboard-api';
import type { PilotMetrics, PilotWeek, RecallLevel, Retention, RetentionCohort } from './retention-api';

const NUMERIC = 'whitespace-nowrap';

/** Whether learners keep learning: today's two numbers and, per registration week, how many of them were still learning 7 and 30 days after (a table, no chart: D28). */
export function RetentionCard({ data, pilot, pilotError = false }: { data: Retention; pilot?: PilotMetrics; pilotError?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useAiFormat();
  const percent = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', { style: 'percent', maximumFractionDigits: 1 });

  // A dash where the number is not known yet or nobody was counted; a real zero stays "0% (0/5)".
  const rate = (count: number | null, size: number) => {
    const ratio = count === null ? null : share(count, size);
    return ratio === null ? '—' : t('dashboard.retention.rate', { percent: percent.format(ratio), count: format.number(count!), size: format.number(size) });
  };
  const ratioText = (count: number, total: number) => {
    const ratio = share(count, total);
    if (ratio === null) return `${format.number(count)}/${format.number(total)} (—)`;
    return `${format.number(count)}/${format.number(total)} (${Math.round(ratio * 100)}%)`;
  };
  const columns: Column<RetentionCohort>[] = [
    { key: 'week', header: t('dashboard.retention.cols.week'), className: NUMERIC, cell: (r) => t('dashboard.retention.weekOf', { date: format.dayMonth(`${r.week_start}T00:00:00+07:00`) }) },
    { key: 'size', header: t('dashboard.retention.cols.size'), className: NUMERIC, card: 'field', cell: (r) => format.number(r.size) },
    { key: 'd7', header: t('dashboard.retention.cols.d7'), className: NUMERIC, card: 'field', cell: (r) => rate(r.d7, r.size) },
    { key: 'd30', header: t('dashboard.retention.cols.d30'), className: NUMERIC, card: 'field', cell: (r) => rate(r.d30, r.size) },
  ];
  const weekColumns: Column<PilotWeek>[] = [
    { key: 'week', header: t('dashboard.retention.pilot.cols.week'), className: NUMERIC, cell: (r) => t('dashboard.retention.weekOf', { date: format.dayMonth(`${r.week}T00:00:00+07:00`) }) },
    { key: 'verified', header: t('dashboard.retention.pilot.cols.verified'), className: NUMERIC, card: 'field', cell: (r) => format.number(r.verified) },
    { key: 'orders_created', header: t('dashboard.retention.pilot.cols.ordersCreated'), className: NUMERIC, card: 'field', cell: (r) => format.number(r.orders_created) },
    { key: 'orders_paid', header: t('dashboard.retention.pilot.cols.ordersPaid'), className: NUMERIC, card: 'field', cell: (r) => format.number(r.orders_paid) },
  ];
  const recallColumns: Column<RecallLevel>[] = [
    { key: 'level', header: t('dashboard.retention.pilot.cols.level'), className: NUMERIC, cell: (r) => format.number(r.level) },
    { key: 'due_answers', header: t('dashboard.retention.pilot.cols.dueAnswers'), className: NUMERIC, card: 'field', cell: (r) => format.number(r.due_answers) },
    { key: 'remembered', header: t('dashboard.retention.pilot.cols.remembered'), className: NUMERIC, card: 'field', cell: (r) => ratioText(r.remembered, r.due_answers) },
  ];

  return (
    <Card icon="↺" title={t('dashboard.retention.title')} hint={t('dashboard.retention.hint', { days: data.window_days })} wide>
      <div className="grid gap-3 grid-cols-2">
        <Stat label={t('dashboard.retention.active')} value={format.number(data.today.active)} tone="primary" />
        <Stat label={t('dashboard.retention.stopped')} value={format.number(data.today.stopped)} />
      </div>
      <div className="flex flex-col gap-3">
        <SubTitle>{t('dashboard.retention.cohorts')}</SubTitle>
        <DataList rows={data.cohorts} rowKey={(r) => r.week_start} columns={columns} state="ready" emptyText={t('dashboard.empty')} />
        <p className="text-ui text-muted">{t('dashboard.retention.blank')}</p>
      </div>
      {pilot ? (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="grid gap-3 grid-cols-2">
            <Stat label={t('dashboard.retention.pilot.activated')} value={ratioText(pilot.activated, pilot.members)} />
            <Stat label={t('dashboard.retention.pilot.aiSessions')} value={ratioText(pilot.ai_sessions.with_ai, pilot.ai_sessions.sessions)} />
          </div>
          <div className="flex flex-col gap-3">
            <SubTitle>{t('dashboard.retention.pilot.ordersByWeek')}</SubTitle>
            <DataList rows={pilot.weeks} rowKey={(r) => r.week} columns={weekColumns} state="ready" emptyText={t('dashboard.empty')} />
          </div>
          <div className="flex flex-col gap-3">
            <SubTitle>{t('dashboard.retention.pilot.recallByLevel')}</SubTitle>
            <DataList rows={pilot.recall_by_level} rowKey={(r) => String(r.level)} columns={recallColumns} state="ready" emptyText={t('dashboard.empty')} />
          </div>
        </div>
      ) : pilotError ? (
        <p className="border-t border-border pt-4 text-ui text-muted" role="status">
          {t('dashboard.retention.pilot.loadFailed')}
        </p>
      ) : null}
    </Card>
  );
}
