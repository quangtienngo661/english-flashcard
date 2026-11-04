import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslations } from 'use-intl';
import { userLabel } from '../../api/user-ref';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { DataList, type Column } from '../../ui/DataList';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
import { OrderDetailDialog } from './OrderDetailDialog';
import { useOrderFormat } from './order-format';
import { listOrders, NO_FILTERS, ORDER_STATUSES, type AdminOrder, type OrderFilters, type OrderStatus } from './orders-api';
import { statusTone } from './OrdersPage.parts';

const panel = 'flex flex-col gap-3 rounded-panel border-2 border-border p-4';

/** A/91 `/orders` (admin only, `settings.manage`): every purchase of a Pro period, filtered, newest first; the detail opens as a dialog. */
export function OrdersPage() {
  const t = useTranslations();
  const api = useApi();
  const format = useOrderFormat();
  const [draft, setDraft] = useState<OrderFilters>(NO_FILTERS);
  const [filters, setFilters] = useState<OrderFilters>(NO_FILTERS);
  const [open, setOpen] = useState<AdminOrder | null>(null);

  const list = useInfiniteQuery({
    queryKey: ['orders', 'list', filters],
    queryFn: ({ pageParam }) => listOrders(api, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  const two = (top: ReactNode, bottom: ReactNode) => (
    <span className="flex flex-col">
      <span>{top}</span>
      <span className="text-xs text-muted">{bottom}</span>
    </span>
  );

  const columns: Column<AdminOrder>[] = [
    { key: 'user', header: t('orders.cols.user'), className: 'w-1/5 wrap-anywhere font-semibold', cell: (r) => userLabel(r.user, t) },
    { key: 'plan', header: t('orders.cols.plan'), card: 'field', cell: (r) => `${t('orders.months', { count: r.period_months })} · ${format.money(r.amount)}` },
    { key: 'code', header: t('orders.cols.code'), className: 'whitespace-nowrap', card: 'field', cell: (r) => r.description },
    { key: 'at', header: t('orders.cols.at'), className: 'whitespace-nowrap', card: 'field', cell: (r) => two(format.date(r.created_at), format.time(r.created_at)) },
    {
      key: 'status', header: t('orders.cols.status'), card: 'field',
      cell: (r) => two(
        <Badge tone={statusTone(r.status)}>{t(`orders.statuses.${r.status}`)}</Badge>,
        r.review_reason ? t(`orders.reasons.${r.review_reason}`) : null,
      ),
    },
    {
      key: 'detail', header: '', card: 'action',
      cell: (r) => (
        <Button variant="ghost" aria-label={t('orders.detailFor', { email: userLabel(r.user, t) })} onPress={() => setOpen(r)}>
          {t('orders.detailLink')}
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
      <p className={`${panel} text-ui font-semibold text-ink`}>{t('orders.intro')}</p>
      <form onSubmit={apply} noValidate className="grid gap-3 shell:grid-cols-3 shell:items-end">
        <TextField
          label={t('orders.filters.email')}
          type="email"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('orders.filters.emailPlaceholder')}
          value={draft.email}
          onChange={(email) => setDraft({ ...draft, email })}
        />
        <Select
          label={t('orders.filters.status')}
          value={draft.status || 'all'}
          onChange={(status) => setDraft({ ...draft, status: status === 'all' ? '' : (status as OrderStatus) })}
          items={[{ id: 'all', label: t('orders.filters.allStatuses') }, ...ORDER_STATUSES.map((s) => ({ id: s, label: t(`orders.statuses.${s}`) }))]}
        />
        <TextField
          label={t('orders.filters.code')}
          placeholder={t('orders.filters.codePlaceholder')}
          spellCheck={false}
          autoComplete="off"
          value={draft.code}
          onChange={(code) => setDraft({ ...draft, code })}
        />
        <TextField label={t('orders.filters.from')} type="date" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} />
        <TextField label={t('orders.filters.to')} type="date" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} />
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox isSelected={draft.needsAttention} onChange={(needsAttention) => setDraft({ ...draft, needsAttention })}>
            {t('orders.filters.needsAttention')}
          </Checkbox>
          <Button type="submit" className="w-fit">
            {t('orders.filters.apply')}
          </Button>
        </div>
      </form>

      <DataList
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={t('orders.empty')}
        onRetry={() => void list.refetch()}
      />

      {rows.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-4">
          {list.hasNextPage && (
            <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
              {t('common.loadMore')}
            </Button>
          )}
          <p className="text-xs text-muted">{t('orders.footer', { count: rows.length })}</p>
        </div>
      )}

      {open && <OrderDetailDialog order={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
