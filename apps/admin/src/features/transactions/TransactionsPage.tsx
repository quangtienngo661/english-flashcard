import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { Dialog } from '../../ui/Dialog';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
import {
  ADMIN_ZONE,
  listTransactions,
  NO_FILTERS,
  type AdminTransaction,
  type TransactionFilters,
  type TransactionKind,
  type TransactionStatus,
} from './transactions-api';

const KINDS: TransactionKind[] = ['purchase', 'renewal', 'plan_change', 'refund', 'trial', 'grant'];
const STATUS_TONE: Record<TransactionStatus, 'success' | 'primary' | 'danger' | 'neutral'> = {
  succeeded: 'success', pending: 'primary', refunded: 'danger', reversed: 'neutral',
};
const DAY_MS = 86_400_000;
const panel = 'flex flex-col gap-3 rounded-panel border-2 border-border p-4';

/** Dates and money in the admin's fixed zone (A/90 footer): "15/10/2026", "9:12", "15/10 → 14/11/2026", "99.000 ₫". */
function useTransactionFormat() {
  const locale = useLocale();
  const tag = locale === 'en' ? 'en-US' : 'vi-VN';
  const date = new Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ADMIN_ZONE });
  const time = new Intl.DateTimeFormat(tag, { hour: 'numeric', minute: '2-digit', timeZone: ADMIN_ZONE, hour12: locale === 'en' });
  return {
    date: (at: string | Date) => date.format(new Date(at)),
    time: (at: string) => time.format(new Date(at)),
    money: (item: AdminTransaction) => {
      if (item.amount_minor === null || item.currency === null) return null;
      const money = new Intl.NumberFormat(tag, { style: 'currency', currency: item.currency });
      return money.format(item.amount_minor / 10 ** (money.resolvedOptions().maximumFractionDigits ?? 0));
    },
    /** A paid period's last day is the day before its end; a grant ends at midnight or when revoked (as the learner page). */
    period: (item: AdminTransaction) => {
      if (item.period_end === null) return '—';
      const last = new Date(new Date(item.period_end).getTime() - (item.kind === 'grant' ? 1 : DAY_MS));
      const first = date.format(new Date(item.period_start));
      const end = date.format(last);
      // vi-VN formats a lone day and month as "15-10", so the year is cut from the full date instead.
      const sameYear = first.slice(-4) === end.slice(-4) && locale !== 'en';
      return `${sameYear ? first.slice(0, -5) : first} → ${end}`;
    },
  };
}

/** A/90–A/90c `/transactions` (admin only, `settings.manage`): every learner's transactions, filtered, newest first. */
export function TransactionsPage() {
  const t = useTranslations();
  const api = useApi();
  const format = useTransactionFormat();
  const [draft, setDraft] = useState<TransactionFilters>(NO_FILTERS);
  const [filters, setFilters] = useState<TransactionFilters>(NO_FILTERS);
  const [open, setOpen] = useState<AdminTransaction | null>(null);

  const list = useInfiniteQuery({
    queryKey: ['transactions', filters],
    queryFn: ({ pageParam }) => listTransactions(api, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  const plan = (item: AdminTransaction) =>
    item.interval ? t('transactions.planInterval', { plan: 'Pro', interval: t(`transactions.intervals.${item.interval}`) }) : 'Pro';
  const gateway = (item: AdminTransaction) => {
    if (item.provider === null) return t('transactions.noGateway');
    const name = item.provider === 'fake' ? t('transactions.providers.fake') : item.provider;
    return item.provider_transaction_id ? `${name} · ${item.provider_transaction_id}` : name;
  };
  const two = (top: ReactNode, bottom: ReactNode) => (
    <span className="flex flex-col">
      <span>{top}</span>
      <span className="text-xs text-muted">{bottom}</span>
    </span>
  );

  const columns: Column<AdminTransaction>[] = [
    { key: 'user', header: t('transactions.cols.user'), className: 'w-1/5 wrap-anywhere font-semibold', cell: (r) => r.user.email ?? r.user.id },
    {
      key: 'kind', header: t('transactions.cols.kind'), className: 'whitespace-nowrap', card: 'field',
      cell: (r) => <Badge tone="primary">{t(`transactions.kinds.${r.kind}`)}</Badge>,
    },
    { key: 'plan', header: t('transactions.cols.plan'), card: 'field', cell: (r) => two(plan(r), format.period(r)) },
    { key: 'at', header: t('transactions.cols.at'), className: 'whitespace-nowrap', card: 'field', cell: (r) => two(format.date(r.occurred_at), format.time(r.occurred_at)) },
    { key: 'amount', header: t('transactions.cols.amount'), className: 'wrap-anywhere', card: 'field', cell: (r) => two(format.money(r) ?? '—', gateway(r)) },
    {
      key: 'status', header: t('transactions.cols.status'), className: 'whitespace-nowrap', card: 'field',
      cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`transactions.statuses.${r.status}`)}</Badge>,
    },
    {
      key: 'detail', header: '', card: 'action',
      cell: (r) => (
        <Button variant="ghost" aria-label={t('transactions.detailFor', { email: r.user.email ?? r.user.id })} onPress={() => setOpen(r)}>
          {t('transactions.detailLink')}
        </Button>
      ),
    },
  ];

  function apply(event: FormEvent) {
    event.preventDefault();
    setFilters(draft);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className={`${panel} text-ui font-semibold text-ink`}>{t('transactions.intro')}</p>
      <form onSubmit={apply} noValidate className="grid gap-3 shell:grid-cols-5 shell:items-end">
        <TextField
          label={t('transactions.filters.email')}
          type="email"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('transactions.filters.emailPlaceholder')}
          value={draft.email}
          onChange={(email) => setDraft({ ...draft, email })}
        />
        <Select
          label={t('transactions.filters.kind')}
          value={draft.kind || 'all'}
          onChange={(kind) => setDraft({ ...draft, kind: kind === 'all' ? '' : (kind as TransactionKind) })}
          items={[{ id: 'all', label: t('transactions.filters.allKinds') }, ...KINDS.map((k) => ({ id: k, label: t(`transactions.kinds.${k}`) }))]}
        />
        <TextField label={t('transactions.filters.from')} type="date" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} />
        <TextField label={t('transactions.filters.to')} type="date" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} />
        <Button type="submit" className="w-fit">
          {t('transactions.filters.apply')}
        </Button>
      </form>

      <DataList
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={t('transactions.empty')}
        onRetry={() => void list.refetch()}
      />

      {rows.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-4">
          {list.hasNextPage && (
            <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
              {t('common.loadMore')}
            </Button>
          )}
          <p className="text-xs text-muted">{t('transactions.footer', { count: rows.length })}</p>
        </div>
      )}

      {open && (
        <Dialog
          isOpen
          onOpenChange={(isOpen) => !isOpen && setOpen(null)}
          title={t('transactions.detail.title')}
          size="md"
          actions={
            <Button variant="secondary" onPress={() => setOpen(null)}>
              {t('transactions.detail.close')}
            </Button>
          }
        >
          <dl className="flex flex-col divide-y divide-border">
            {(
              [
                [t('transactions.detail.user'), open.user.email ?? '—'],
                [t('transactions.detail.userId'), open.user.id],
                [t('transactions.detail.kind'), t(`transactions.kinds.${open.kind}`)],
                [t('transactions.detail.plan'), plan(open)],
                ...(format.money(open) ? [[t('transactions.detail.amount'), `${format.money(open)} (${open.currency})`]] : []),
                [t('transactions.detail.at'), `${format.date(open.occurred_at)}, ${format.time(open.occurred_at)}`],
                [t('transactions.detail.period'), format.period(open)],
                [t('transactions.detail.status'), t(`transactions.statuses.${open.status}`)],
                ...(open.provider
                  ? [[t('transactions.detail.gateway'), open.provider === 'fake'
                    ? t('transactions.detail.testEnv', { gateway: t('transactions.providers.fake') }) : open.provider]]
                  : []),
                ...(open.provider_transaction_id ? [[t('transactions.detail.txId'), open.provider_transaction_id]] : []),
              ] as Array<[string, string]>
            ).map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-2">
                <dt className="text-ui text-muted">{label}</dt>
                <dd className="min-w-0 wrap-anywhere text-right text-ui font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted">{t('transactions.detail.readOnly')}</p>
        </Dialog>
      )}
    </div>
  );
}
