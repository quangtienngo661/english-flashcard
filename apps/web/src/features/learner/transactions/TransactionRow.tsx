'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'react-aria-components';
import { useFormat } from '@/app-shell/format';
import { cn } from '@/lib/cn';
import { StatusDot } from '@/ui/StatusDot';
import { moneyText, periodText, type Transaction, type TransactionStatus } from './transactions-api';

// M7 decision: succeeded pass, pending accent, refunded ghost (a muted label), reversed muted.
const TONE: Record<TransactionStatus, 'pass' | 'accent' | 'ghost' | 'muted'> = {
  succeeded: 'pass',
  pending: 'accent',
  refunded: 'ghost',
  reversed: 'muted',
};

export function TransactionStatusDot({ status }: { status: TransactionStatus }) {
  const t = useTranslations('App.transactions.statuses');
  return <StatusDot tone={TONE[status]}>{t(status)}</StatusDot>;
}

/**
 * The words of one transaction, shared by its row and its detail: line 1 "Mua · Pro · 3 tháng" (a payOS period in months, a
 * subscription "theo tháng", a grant the plan alone), the date, the amount, line 2 "dùng {period}" or "không có kỳ" for a refund.
 */
export function useTransactionText() {
  const t = useTranslations('App');
  const format = useFormat();
  return (item: Transaction) => {
    const plan = item.plan === 'pro' ? t('chrome.plan.pro') : item.plan;
    const interval = item.interval === null ? null
      : item.provider === 'payos' ? t(`transactions.prepaidIntervals.${item.interval}`) : t(`transactions.intervals.${item.interval}`);
    const period = periodText(format, item);
    return {
      line1: [t(`transactions.kinds.${item.kind}`), plan, interval].filter(Boolean).join(' · '),
      date: format.date(item.occurred_at, 'numeric'),
      amount: moneyText(format, item),
      period,
      line2: item.kind === 'refund' ? t('transactions.noPeriod') : t('transactions.used', { period }),
    };
  };
}

// raw-ok: Figma 122:4254 line 1 and amount are Noto Sans 15, between the button (15 medium) and base-strong (16)
const FIFTEEN = 'font-wm-sans text-[0.9375rem] leading-snug';

/**
 * A row of Lịch sử giao dịch (Figma 122:4254 / 122:4366): the whole row is a button that opens the detail. Desktop: date column,
 * line 1 over line 2, amount, status, chevron. Phones: line 2 in mono starting with the date, the amount over the status. The
 * drawing is for the eye only; the button's name reads the row once.
 */
export function TransactionRow({ item, onOpen }: { item: Transaction; onOpen: () => void }) {
  const t = useTranslations('App.transactions');
  const text = useTransactionText()(item);
  const label = t('rowLabel', { ...text, status: t(`statuses.${item.status}`) });
  const amount = (
    <span className={cn(FIFTEEN, 'whitespace-nowrap font-bold', item.kind === 'refund' ? 'text-wm-pass' : 'text-wm-ink')}>{text.amount}</span>
  );
  return (
    <li className="border-wm-line not-first:border-t">
      <Button
        aria-label={label}
        onPress={onOpen}
        className="flex w-full cursor-pointer items-center gap-3 px-1 py-3 text-left outline-none hover:bg-wm-bg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent md:gap-4 md:rounded-wm-lg md:px-3 md:py-4"
      >
        <span aria-hidden className="hidden w-25 shrink-0 text-wm-meta text-wm-muted md:block">{text.date}</span>
        <span aria-hidden className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn(FIFTEEN, 'break-words font-semibold text-wm-ink')}>{text.line1}</span>
          <span className="break-words text-wm-meta text-wm-muted md:font-wm-sans md:text-wm-small">
            <span className="md:hidden">{`${text.date} · `}</span>
            {text.line2}
          </span>
        </span>
        <span aria-hidden className="flex shrink-0 flex-col items-end gap-0.5 md:hidden">
          {amount}
          <TransactionStatusDot status={item.status} />
        </span>
        <span aria-hidden className="hidden w-27.5 shrink-0 text-right md:block">{amount}</span>
        <span aria-hidden className="hidden w-32.5 shrink-0 md:block">
          <TransactionStatusDot status={item.status} />
        </span>
        <ChevronRight aria-hidden className="size-4.5 shrink-0 text-wm-muted" />
      </Button>
    </li>
  );
}
