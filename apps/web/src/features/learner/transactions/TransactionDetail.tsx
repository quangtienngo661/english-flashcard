'use client';

import { Copy } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useFormat } from '@/app-shell/format';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { showToast } from '@/ui/Toast';
import { TransactionStatusDot, useTransactionText } from './TransactionRow';
import type { Transaction } from './transactions-api';

// raw-ok: Figma 122:4637 receipt amount is Bricolage ExtraBold 40 / -0.84, a size no token has
const AMOUNT = 'font-wm-display text-[2.5rem] font-extrabold leading-tight tracking-[-0.021em]';

/**
 * Chi tiết giao dịch (Figma 122:4637, phone sheet 182:5952): the receipt (mono line, the amount, the status), a dashed rule, then
 * Thời điểm, Kỳ được dùng, Cổng thanh toán and Mã giao dịch with a copy button. A grant has no gateway, id or help text.
 */
export function TransactionDetail({ item, onClose }: { item: Transaction; onClose: () => void }) {
  const t = useTranslations('App.transactions');
  const locale = useLocale();
  const format = useFormat();
  const text = useTransactionText()(item);
  const id = item.provider_transaction_id;
  // A known gateway has its own name ("payOS", "Giả (thử)"); an unknown one shows the API's value.
  const providerKey = `providers.${item.provider}` as 'providers.fake';
  const copy = () => {
    if (!id) return;
    navigator.clipboard?.writeText(id).then(() => showToast(t('detail.copied'), 'success'), () => {});
  };
  const rows: Array<[string, ReactNode]> = [
    [t('detail.at'), t('detail.atValue', { date: text.date, time: format.time(item.occurred_at) })],
    [t('detail.period'), item.kind === 'refund' ? t('noPeriod') : text.period],
    ...(item.provider ? [[t('detail.provider'), t.has(providerKey) ? t(providerKey) : item.provider] as [string, ReactNode]] : []),
    ...(id
      ? [[
          t('detail.id'),
          <span key="id" className="flex min-w-0 items-center justify-end gap-1">
            <span className="min-w-0 break-all text-wm-caption font-medium">{id}</span>
            <AriaButton
              aria-label={t('detail.copy')}
              onPress={copy}
              className="flex size-11 shrink-0 items-center justify-center rounded-wm-sm text-wm-muted outline-none hover:bg-wm-bg hover:text-wm-ink focus-visible:outline-3 focus-visible:outline-wm-accent md:size-8"
            >
              <Copy aria-hidden className="size-4" />
            </AriaButton>
          </span>,
        ] as [string, ReactNode]]
      : []),
  ];
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={t('detail.title')}
      closeLabel={t('detail.dismiss')}
      footer={
        <Button variant="secondary" onPress={onClose}>
          {t('detail.close')}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-2 py-1 text-center">
        <p className="text-wm-meta text-wm-muted">{text.line1.toLocaleLowerCase(locale)}</p>
        <p className={cn(AMOUNT, item.kind === 'refund' ? 'text-wm-pass' : 'text-wm-ink')}>{text.amount}</p>
        <TransactionStatusDot status={item.status} />
      </div>
      <hr className="border-0 border-t border-dashed border-wm-line" />
      <dl className="flex flex-col">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-1.5">
            <dt className="shrink-0 font-wm-sans text-wm-small text-wm-muted">{label}</dt>
            <dd className="min-w-0 text-right font-wm-sans text-wm-small-strong text-wm-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {item.kind !== 'grant' && <p className="font-wm-sans text-wm-small text-wm-muted">{t('detail.help')}</p>}
    </Dialog>
  );
}
