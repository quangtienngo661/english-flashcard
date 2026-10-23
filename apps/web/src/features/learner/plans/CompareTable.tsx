import { useTranslations } from 'next-intl';
import type { AppConfig } from '@/app-shell/queries';

/** "So sánh chi tiết các gói": the same numbers as the cards, side by side. */
export function CompareTable({ plans, groups }: { plans: AppConfig['plans']; groups: number }) {
  const t = useTranslations('App.plans');
  const c = useTranslations('App.plans.compareTable');
  const rows: Array<[string, string, string]> = [
    [c('review'), c('yes'), c('yes')],
    [c('reminders'), c('yes'), c('yes')],
    [c('groups'), c('groupsValue', { count: groups }), c('groupsValue', { count: groups })],
    [c('sessions'), String(plans.free.practice_sessions_per_day), String(plans.pro.practice_sessions_per_day)],
    [c('ai'), '—', String(plans.pro.ai_practice_per_cycle)],
    [c('lookup'), '—', String(plans.pro.ai_lookup_per_cycle)],
    [c('ads'), c('yes'), c('no')],
  ];
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full text-left text-ui text-ink">
        <thead className="text-caption text-muted">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">{c('feature')}</th>
            <th scope="col" className="px-4 py-2 font-semibold">{t('free')}</th>
            <th scope="col" className="px-4 py-2 font-semibold">{t('pro')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([name, free, pro]) => (
            <tr key={name}>
              <th scope="row" className="px-4 py-2 font-medium">{name}</th>
              <td className="px-4 py-2">{free}</td>
              <td className="px-4 py-2">{pro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
