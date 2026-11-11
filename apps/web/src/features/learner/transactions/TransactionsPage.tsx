'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { BackLink } from '@/app-chrome/BackLink';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useFormat } from '@/app-shell/format';
import { useEntitlements } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import { useLearnerZone } from '@/lib/learner-date';
import { groupByMonth } from '@/lib/month-groups';
import { Button } from '@/ui/Button';
import { SkeletonBlocks } from '@/ui/Skeleton';
import { EmptyState, ErrorState } from '@/ui/States';
import { proLastDay } from '../plans/pro-last-day';
import { CurrentPlanCard } from '../settings/CurrentPlanCard';
import { TransactionDetail } from './TransactionDetail';
import { TransactionRow } from './TransactionRow';
import { useTransactions, type Transaction } from './transactions-api';

/**
 * Lịch sử giao dịch `/app/settings/transactions` (Figma 122:4203 / 122:4354, D18): back to Cài đặt, one card per month in the learner's
 * zone, newest first, "Xem thêm" for older pages, the footnote and the current plan. A row opens its detail (state in React, design §5.6).
 */
export function TransactionsPage() {
  const t = useTranslations('App.transactions');
  const locale = useLocale();
  const { state } = useSession();
  const zone = useLearnerZone();
  const format = useFormat();
  const list = useTransactions();
  const [open, setOpen] = useState<Transaction | null>(null);
  if (state.status !== 'signed-in') return null;
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const months = groupByMonth(items, (item) => item.occurred_at, zone);

  let content;
  if (list.isPending) content = <SkeletonBlocks />;
  else if (list.isError) content = <ErrorState message={t('error')} onRetry={() => void list.refetch()} />;
  else if (items.length === 0) content = <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />;
  else
    content = (
      <>
        {months.map((month) => (
          <section key={month.key} aria-labelledby={`transactions-${month.key}`} className="flex flex-col gap-3">
            <h2 id={`transactions-${month.key}`} className="font-wm-mono text-wm-mono font-medium text-wm-muted">
              {format.date(month.items[0].occurred_at, 'monthLabel')}
            </h2>
            <ul className="rounded-wm-xl border border-wm-line bg-wm-surface px-4 py-1 shadow-wm-card md:px-3 md:py-1.5">
              {month.items.map((item) => (
                <TransactionRow key={item.id} item={item} onOpen={() => setOpen(item)} />
              ))}
            </ul>
          </section>
        ))}
        {list.hasNextPage && (
          <Button variant="secondary" className="w-fit" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
            {t('more')}
          </Button>
        )}
        <p className="font-wm-mono text-wm-mono text-wm-muted">{t('foot')}</p>
      </>
    );

  return (
    <div>
      <BackLink href={`/${locale}/app/settings`} label={t('back')} />
      <PageTitle>{t('title')}</PageTitle>
      <div className="flex flex-col gap-4 md:gap-5">
        {content}
        <PlanCard />
      </div>
      {open && <TransactionDetail item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** "Pro tới hết 07/02/2027" (pro_until, a grant or a subscription, minus 1 ms), "Gói Miễn phí", or "Gói Pro" with no known end. */
function PlanCard() {
  const t = useTranslations('App');
  const locale = useLocale();
  const format = useFormat();
  const { data } = useEntitlements();
  if (!data) return null;
  const plan = t(`chrome.plan.${data.plan}`);
  const lastDay = data.plan === 'free' ? null : proLastDay(data);
  return (
    <CurrentPlanCard
      title={lastDay ? t('transactions.planUntil', { plan, date: format.date(lastDay, 'numeric') }) : t('account.planTitle', { plan })}
      line={t('transactions.currentPlan')}
      href={`/${locale}/app/plans`}
      linkLabel={t('transactions.seePlans')}
    />
  );
}
