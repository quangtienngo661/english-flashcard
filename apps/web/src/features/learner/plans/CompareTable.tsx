import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { AppConfig } from '@/app-shell/queries';
import { Card } from '@/ui/Card';

// raw-ok: Figma's table header is Noto Sans 11, under the 12 px meta token
const HEAD = 'py-3 pr-3 text-[0.6875rem]';
// raw-ok: Figma's comparison heading is Bricolage Bold 22, a size no token has
const TITLE = 'font-wm-display text-[1.375rem] font-bold leading-tight text-wm-ink';

/**
 * "So sánh chi tiết các gói" (M7 Figma B §1.2), always shown: the heading names the table, the same numbers as the cards side by side.
 * Free values muted, Pro values SemiBold accent; yes and no are the words "Có" and "Không".
 */
export function CompareTable({ plans, groups }: { plans: AppConfig['plans']; groups: number }) {
  const t = useTranslations('App.plans');
  const c = useTranslations('App.plans.compareTable');
  const id = useId();
  // Both Free allowances at 0 is no AI at all: a dash, as before launch prep A. One of them at 0 shows its 0, like the card.
  const noFreeAi = plans.free.ai_practice_per_cycle + plans.free.ai_lookup_per_cycle === 0;
  const allowance = (count: number) => (noFreeAi ? '—' : String(count));
  const rows: Array<[string, string, string]> = [
    [c('review'), c('yes'), c('yes')],
    [c('reminders'), c('yes'), c('yes')],
    [c('groups'), String(groups), String(groups)],
    [c('sessions'), String(plans.free.practice_sessions_per_day), String(plans.pro.practice_sessions_per_day)],
    [c('ai'), allowance(plans.free.ai_practice_per_cycle), String(plans.pro.ai_practice_per_cycle)],
    [c('lookup'), allowance(plans.free.ai_lookup_per_cycle), String(plans.pro.ai_lookup_per_cycle)],
  ];
  return (
    <div className="flex w-full flex-col gap-3">
      <h2 id={id} className={TITLE}>
        {t('compare')}
      </h2>
      <Card className="border border-wm-line px-4 py-1 md:px-6 md:py-1.5">
        <table aria-labelledby={id} className="w-full table-fixed text-left">
          <colgroup>
            <col />
            <col className="w-16 md:w-35" />
            <col className="w-16 md:w-35" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={`${HEAD} font-medium text-wm-muted`}>{c('feature')}</th>
              <th scope="col" className={`${HEAD} font-medium text-wm-muted`}>{t('free')}</th>
              <th scope="col" className={`${HEAD} font-bold text-wm-accent`}>{t('pro')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, free, pro]) => (
              <tr key={name} className="border-t border-wm-line">
                <th scope="row" className="py-3 pr-3 font-wm-sans text-wm-small font-normal text-wm-ink">{name}</th>
                <td className="py-3 pr-3 font-wm-sans text-wm-small tabular-nums text-wm-muted">{free}</td>
                <td className="py-3 font-wm-sans text-wm-small-strong tabular-nums text-wm-accent">{pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
