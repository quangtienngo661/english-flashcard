import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useTranslations } from 'use-intl';
import { useUrlFilters } from '../../api/use-url-filters';
import { userLabel } from '../../api/user-ref';
import { useApi } from '../../auth/session-context';
import { useDateTime } from '../../i18n/use-date-time';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { TextField } from '../../ui/TextField';
import { listRefunds, type Refund } from './reports-api';

/** A real calendar day typed as `YYYY-MM-DD`; anything else is dropped from the URL. */
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const FILTERS = {
  resolved_by_email: { default: '', valid: (v: string) => v.trim() !== '' && v.length <= 320 },
  from: { default: '', valid: isDay },
  to: { default: '', valid: isDay },
};
const REFUND_TONE = { true: 'success', false: 'neutral', null: 'warning' } as const;

/** A/76 `/refunds` (admin only, `settings.manage`): the confirmed AI reports and whether the unit went back, newest first. */
export function RefundsPage() {
  const t = useTranslations();
  const api = useApi();
  const dateTime = useDateTime();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const [draft, setDraft] = useState(filters);

  const list = useInfiniteQuery({
    queryKey: ['refunds', filters],
    queryFn: ({ pageParam }) => listRefunds(api, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  const system = t('common.systemUser');
  const columns: Column<Refund>[] = [
    {
      key: 'report', header: t('refunds.cols.report'), className: 'whitespace-nowrap font-semibold',
      cell: (r) => (
        <Link to={`/reports/${r.report_id}`} className="rounded-control text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">
          {t('refunds.reportLink')}
        </Link>
      ),
    },
    { key: 'user', header: t('refunds.cols.user'), className: 'wrap-anywhere', card: 'field', cell: (r) => userLabel(r.user, system) },
    {
      key: 'resolver', header: t('refunds.cols.resolver'), className: 'wrap-anywhere', card: 'field',
      cell: (r) => (
        <span className="flex flex-col">
          <span>{userLabel(r.resolved_by_user, system)}</span>
          {r.self_resolved && <span className="text-xs text-muted">{t('refunds.selfResolved')}</span>}
        </span>
      ),
    },
    { key: 'role', header: t('refunds.cols.role'), className: 'whitespace-nowrap', card: 'field', cell: (r) => r.resolved_by_role ?? '—' },
    {
      key: 'refunded', header: t('refunds.cols.refunded'), className: 'whitespace-nowrap', card: 'field',
      cell: (r) => <Badge tone={REFUND_TONE[String(r.refunded) as 'true' | 'false' | 'null']}>{t(`refunds.refunded.${String(r.refunded)}`)}</Badge>,
    },
    { key: 'at', header: t('refunds.cols.at'), className: 'whitespace-nowrap', card: 'field', cell: (r) => (r.resolved_at ? dateTime(r.resolved_at) : '—') },
  ];

  function apply(event: FormEvent) {
    event.preventDefault();
    setFilters(draft);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={apply} noValidate className="grid gap-3 shell:grid-cols-4 shell:items-end">
        <TextField
          label={t('refunds.filters.resolver')}
          type="email"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('refunds.filters.resolverPlaceholder')}
          value={draft.resolved_by_email}
          onChange={(resolved_by_email) => setDraft({ ...draft, resolved_by_email })}
        />
        <TextField label={t('refunds.filters.from')} type="date" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} />
        <TextField label={t('refunds.filters.to')} type="date" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} />
        <Button type="submit" className="w-fit">
          {t('refunds.filters.apply')}
        </Button>
      </form>
      <DataList
        rows={rows}
        rowKey={(r) => r.report_id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={t('refunds.empty')}
        onRetry={() => void list.refetch()}
      />
      {rows.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-4">
          {list.hasNextPage && (
            <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
              {t('common.loadMore')}
            </Button>
          )}
          <p className="text-xs text-muted">{t('list.shown', { count: rows.length })}</p>
        </div>
      )}
      <p className="text-xs text-muted">{t('refunds.note')}</p>
    </div>
  );
}
