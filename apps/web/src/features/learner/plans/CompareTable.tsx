import { Check, Crown, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { AppConfig } from '@/app-shell/queries';

/**
 * "So sánh chi tiết các gói": the same numbers as the cards, side by side (owner 05/11/2026). No frame around the table: the Pro column
 * is a card of its own that stands a little above and below the rows, on the soft shadow, so the plan to pick reads at a glance. Free
 * values are muted, Pro values heavy; yes and no are marks with a name, and the ads row reads as a perk ("Không quảng cáo").
 */
export function CompareTable({ plans, groups }: { plans: AppConfig['plans']; groups: number }) {
  const t = useTranslations('App.plans');
  const c = useTranslations('App.plans.compareTable');
  // Both Free allowances at 0 is no AI at all: a dash, as before launch prep A. One of them at 0 shows its 0, like the card.
  const noFreeAi = plans.free.ai_practice_per_cycle + plans.free.ai_lookup_per_cycle === 0;
  const allowance = (count: number) => (noFreeAi ? '—' : String(count));
  const yes = <Check role="img" aria-label={c('yes')} className="mx-auto size-5 text-success" />;
  const no = <Minus role="img" aria-label={c('no')} className="mx-auto size-5 text-border-strong" />;
  const rows: Array<[string, ReactNode, ReactNode]> = [
    [c('review'), yes, yes],
    [c('reminders'), yes, yes],
    [c('groups'), String(groups), String(groups)],
    [c('sessions'), String(plans.free.practice_sessions_per_day), String(plans.pro.practice_sessions_per_day)],
    [c('ai'), allowance(plans.free.ai_practice_per_cycle), String(plans.pro.ai_practice_per_cycle)],
    [c('lookup'), allowance(plans.free.ai_lookup_per_cycle), String(plans.pro.ai_lookup_per_cycle)],
    [c('noAds'), no, yes],
  ];
  return (
    <div className="relative py-4">
      <div aria-hidden className="absolute inset-y-0 right-0 w-1/4 rounded-feature border-2 border-accent bg-surface shadow-soft-card" />
      <table className="relative w-full table-fixed text-left text-ui text-ink">
        <colgroup>
          <col className="w-1/2" />
          <col className="w-1/4" />
          <col className="w-1/4" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="px-4 py-3 text-caption font-semibold text-muted">{c('feature')}</th>
            <th scope="col" className="px-4 py-3 text-center font-semibold text-muted">{t('free')}</th>
            <th scope="col" className="px-4 py-3 text-center text-body font-extrabold text-ink">
              <span className="inline-flex items-center gap-1.5">
                <Crown aria-hidden className="size-4 text-accent-deep" />
                {t('pro')}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, free, pro]) => (
            <tr key={name} className="transition-colors duration-fast hover:bg-primary-soft/60">
              <th scope="row" className="border-t border-border px-4 py-3 font-medium">{name}</th>
              <td className="border-t border-border px-4 py-3 text-center tabular-nums text-muted">{free}</td>
              <td className="px-4 py-3 text-center text-body font-extrabold tabular-nums">{pro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
