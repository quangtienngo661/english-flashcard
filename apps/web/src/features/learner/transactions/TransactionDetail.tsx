'use client';

import { useTranslations } from 'next-intl';
import { useFormat } from '@/app-shell/format';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { StatusChip, usePlanText } from './TransactionRow';
import { moneyText, periodText, type Transaction } from './transactions-api';

/** K/95b (dialog), M/95b (sheet from the bottom): every field of one transaction; a grant has no money, gateway or id. */
export function TransactionDetail({ item, onClose }: { item: Transaction; onClose: () => void }) {
  const t = useTranslations('App.transactions');
  const format = useFormat();
  const planText = usePlanText();
  const money = moneyText(format, item);
  const rows: Array<[string, React.ReactNode]> = [
    [t('detail.kind'), t(`kinds.${item.kind}`)],
    [t('detail.plan'), planText(item)],
    ...(money ? [[t('detail.amount'), money] as [string, string]] : []),
    [t('detail.at'), t('detail.atValue', { date: format.date(item.occurred_at, 'full'), time: format.time(item.occurred_at) })],
    [t('detail.period'), periodText(format, item)],
    [t('detail.status'), <StatusChip key="status" status={item.status} />],
    ...(item.provider ? [[t('detail.provider'), item.provider === 'fake' ? t('providers.fake') : item.provider] as [string, string]] : []),
    ...(item.provider_transaction_id ? [[t('detail.id'), item.provider_transaction_id] as [string, string]] : []),
  ];
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={t('detail.title')}
      footer={
        <Button variant="quiet" onPress={onClose}>
          {t('detail.close')}
        </Button>
      }
    >
      <dl className="flex flex-col divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-ui text-muted">{label}</dt>
            <dd className="min-w-0 break-all text-right text-ui font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {item.kind !== 'grant' && <p className="text-caption text-muted">{t('detail.help')}</p>}
    </Dialog>
  );
}
