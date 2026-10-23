'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'react-aria-components';
import { useFormat } from '@/app-shell/format';
import { cn } from '@/lib/cn';
import { moneyText, periodText, type Transaction, type TransactionStatus } from './transactions-api';

const STATUS_CHIP: Record<TransactionStatus, string> = {
  succeeded: 'bg-success-soft',
  pending: 'bg-primary-soft',
  refunded: 'bg-accent-soft',
  reversed: 'bg-neutral-soft',
};

export function StatusChip({ status }: { status: TransactionStatus }) {
  const t = useTranslations('App.transactions.statuses');
  return <span className={cn('w-fit shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold text-ink', STATUS_CHIP[status])}>{t(status)}</span>;
}

/** "Pro · theo tháng", or the plan alone for a grant. */
export function usePlanText() {
  const t = useTranslations('App');
  return (item: Transaction) => {
    const plan = item.plan === 'pro' ? t('chrome.plan.pro') : item.plan;
    return item.interval ? t('transactions.planInterval', { plan, interval: t(`transactions.intervals.${item.interval}`) }) : plan;
  };
}

/**
 * One row of K/95 (a line of the table from 768 px) and of M/95 (three stacked lines): the whole row opens the detail. The two
 * layouts are drawn for the eye only; the button's name reads the row once.
 */
export function TransactionRow({ item, onOpen }: { item: Transaction; onOpen: () => void }) {
  const t = useTranslations('App.transactions');
  const format = useFormat();
  const planText = usePlanText();
  const kind = t(`kinds.${item.kind}`);
  const date = format.date(item.occurred_at, 'full');
  const plan = planText(item);
  const money = moneyText(format, item);
  const period = periodText(format, item) ?? '';
  const label = t('rowLabel', { kind, date, plan, amount: money ? `${money}, ` : '', period, status: t(`statuses.${item.status}`) });
  return (
    <li>
      <Button
        aria-label={label}
        onPress={onOpen}
        className="w-full cursor-pointer rounded-inner py-3 text-left outline-none hover:bg-canvas focus-visible:ring-2 focus-visible:ring-primary md:px-2"
      >
        <div aria-hidden className="flex flex-col gap-0.5 md:hidden">
          <div className="flex items-start justify-between gap-2">
            <span className="break-words text-ui font-semibold text-ink">{money ? `${kind} · ${money}` : kind}</span>
            <StatusChip status={item.status} />
          </div>
          <span className="text-caption text-muted">{`${plan} · ${date}`}</span>
          {item.kind !== 'refund' && <span className="text-caption text-muted">{t('used', { period })}</span>}
        </div>
        <div aria-hidden className="hidden items-center gap-3 text-ui md:grid md:grid-cols-7">
          <span className="text-ink">{date}</span>
          <span className="font-semibold text-ink">{kind}</span>
          <span className="text-ink">{plan}</span>
          <span className="text-ink">{money ?? '—'}</span>
          <span className="text-ink">{period}</span>
          <StatusChip status={item.status} />
          <span className="flex items-center justify-end gap-0.5 font-semibold text-primary">
            {t('detailLink')}
            <ChevronRight className="size-4" />
          </span>
        </div>
      </Button>
    </li>
  );
}
