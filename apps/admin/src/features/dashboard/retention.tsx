import { useLocale, useTranslations } from 'use-intl';
import { DataList, type Column } from '../../ui/DataList';
import { Stat } from '../../ui/Stat';
import { useAiFormat } from '../ai/useAiFormat';
import { Card, SubTitle } from './Card';
import { share } from './dashboard-api';
import type { Retention, RetentionCohort } from './retention-api';

const NUMERIC = 'whitespace-nowrap';

/** Whether learners keep learning: today's two numbers and, per registration week, how many of them were still learning 7 and 30 days after (a table, no chart: D28). */
export function RetentionCard({ data }: { data: Retention }) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useAiFormat();
  const percent = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', { style: 'percent', maximumFractionDigits: 1 });

  // A dash where the number is not known yet or nobody was counted; a real zero stays "0% (0/5)".
  const rate = (count: number | null, size: number) => {
    const ratio = count === null ? null : share(count, size);
    return ratio === null ? '—' : t('dashboard.retention.rate', { percent: percent.format(ratio), count: format.number(count!), size: format.number(size) });
  };
  const columns: Column<RetentionCohort>[] = [
    { key: 'week', header: t('dashboard.retention.cols.week'), className: NUMERIC, cell: (r) => t('dashboard.retention.weekOf', { date: format.dayMonth(`${r.week_start}T00:00:00+07:00`) }) },
    { key: 'size', header: t('dashboard.retention.cols.size'), className: NUMERIC, card: 'field', cell: (r) => format.number(r.size) },
    { key: 'd7', header: t('dashboard.retention.cols.d7'), className: NUMERIC, card: 'field', cell: (r) => rate(r.d7, r.size) },
    { key: 'd30', header: t('dashboard.retention.cols.d30'), className: NUMERIC, card: 'field', cell: (r) => rate(r.d30, r.size) },
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
    </Card>
  );
}
