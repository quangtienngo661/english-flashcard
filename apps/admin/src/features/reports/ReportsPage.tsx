import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useMatch, useNavigate } from 'react-router';
import { useLocale, useTranslations } from 'use-intl';
import { useUrlFilters } from '../../api/use-url-filters';
import { userLabel } from '../../api/user-ref';
import { useApi } from '../../auth/session-context';
import { useDateTime } from '../../i18n/use-date-time';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { DetailPanel } from '../../ui/DetailPanel';
import { focusRowLink } from '../../ui/focus-row-link';
import { Select } from '../../ui/Select';
import { useRetained } from '../../ui/use-retained';
import { ReportDetail } from './ReportDetail';
import { listReportReasons, listReports, reportWord, type Report, type ReportStatus } from './reports-api';

const STATUSES: ReportStatus[] = ['open', 'no_error', 'fixed', 'confirmed'];
const SOURCES = ['rule', 'ai'] as const;
const REASON_CODE = /^[a-z][a-z0-9_]{1,39}$/;
const FILTERS = {
  status: { default: 'open', valid: (v: string) => v === 'all' || (STATUSES as string[]).includes(v) },
  reason: { default: 'all', valid: (v: string) => REASON_CODE.test(v) },
  source: { default: 'all', valid: (v: string) => (SOURCES as readonly string[]).includes(v) },
};

export const STATUS_TONE: Record<ReportStatus, 'warning' | 'neutral' | 'success' | 'primary'> = {
  open: 'warning', no_error: 'neutral', fixed: 'success', confirmed: 'primary',
};

/** The reasons list; `GET …/report-reasons` is open to `content.edit`, so an editor gets the filter too (design §5.3). */
function useReasons() {
  const api = useApi();
  return useQuery({ queryKey: ['report-reasons'], queryFn: () => listReportReasons(api), staleTime: 5 * 60_000 });
}

/** The question type's name; a type this build does not know shows as its code. */
export function useTypeLabel(): (type: string) => string {
  const t = useTranslations();
  return (type) => (t.has(`reports.types.${type}`) ? t(`reports.types.${type}`) : type);
}

export function ReportsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const api = useApi();
  const navigate = useNavigate();
  const { search } = useLocation();
  const dateTime = useDateTime();
  const typeLabel = useTypeLabel();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  // `/reports/:id` opens the report beside the list (UB8); the closing panel keeps its report until it has animated out.
  const panelId = useMatch('/reports/:id')?.params.id;
  const shownId = useRetained(panelId);

  const reasons = useReasons();
  const adminLabel = (code: string) => {
    const reason = reasons.data?.items.find((r) => r.code === code);
    return reason ? (locale === 'en' ? reason.label_en : reason.label_vi) : null;
  };
  const list = useInfiniteQuery({
    queryKey: ['reports', filters],
    queryFn: ({ pageParam }) => listReports(api, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  // The filters stay in the URL while a report is open, so closing the panel returns to the same list.
  const href = (r: Report) => `/reports/${r.id}${search}`;

  const allColumns: Column<Report>[] = [
    {
      key: 'word', header: t('reports.cols.word'), className: 'wrap-anywhere font-semibold',
      cell: (r) => (
        <Link to={href(r)} className="rounded-control text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">
          {reportWord(r)}
        </Link>
      ),
    },
    { key: 'type', header: t('reports.cols.type'), card: 'field', cell: (r) => typeLabel(r.question_snapshot.type) },
    {
      key: 'reason', header: t('reports.cols.reason'), card: 'field',
      cell: (r) => {
        const own = adminLabel(r.reason);
        return (
          <span className="flex flex-col">
            <span>{r.reason_label}</span>
            {own !== null && own !== r.reason_label && <span className="text-xs text-muted">{own}</span>}
          </span>
        );
      },
    },
    { key: 'source', header: t('reports.cols.source'), card: 'field', className: 'whitespace-nowrap', cell: (r) => t(`reports.sources.${r.question_source}`) },
    { key: 'note', header: t('reports.cols.note'), card: 'field', className: 'max-w-48 truncate', cell: (r) => r.note ?? '—' },
    { key: 'sentAt', header: t('reports.cols.sentAt'), card: 'field', className: 'whitespace-nowrap', cell: (r) => dateTime(r.created_at) },
    {
      key: 'status', header: t('reports.cols.status'), card: 'field', className: 'whitespace-nowrap',
      cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`reports.statuses.${r.status}`)}</Badge>,
    },
    { key: 'resolvedBy', header: t('reports.cols.resolvedBy'), card: 'field', className: 'wrap-anywhere', cell: (r) => r.resolved_by_user ? userLabel(r.resolved_by_user, t('common.systemUser')) : (r.resolved_by_role ?? '—') },
  ];

  // Beside the open report the table only has room for the word, the reason and the status; the rest is in the panel.
  const columns = panelId === undefined ? allColumns : allColumns.filter((c) => ['word', 'reason', 'status'].includes(c.key));

  const reasonItems = [
    { id: 'all', label: t('reports.filters.allReasons') },
    ...(reasons.data?.items ?? []).map((r) => ({ id: r.code, label: locale === 'en' ? r.label_en : r.label_vi })),
  ];
  // A code in the URL that the list does not know (still loading, or removed) still shows as itself.
  if (filters.reason !== 'all' && !reasonItems.some((i) => i.id === filters.reason)) reasonItems.push({ id: filters.reason, label: filters.reason });

  const unfiltered = filters.status === 'open' && filters.reason === 'all' && filters.source === 'all';
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 shell:grid-cols-3">
        <Select
          label={t('reports.filters.status')}
          value={filters.status}
          onChange={(status) => setFilters({ status })}
          items={[{ id: 'all', label: t('reports.filters.allStatuses') }, ...STATUSES.map((s) => ({ id: s, label: t(`reports.statuses.${s}`) }))]}
        />
        <Select label={t('reports.filters.reason')} value={filters.reason} onChange={(reason) => setFilters({ reason })} items={reasonItems} />
        <Select
          label={t('reports.filters.source')}
          value={filters.source}
          onChange={(source) => setFilters({ source })}
          items={[{ id: 'all', label: t('reports.filters.allSources') }, ...SOURCES.map((s) => ({ id: s, label: t(`reports.sources.${s}`) }))]}
        />
      </div>
      <DataList
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        rowHref={href}
        selectedKey={panelId}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={unfiltered ? t('reports.empty') : t('reports.emptyFiltered')}
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
      {shownId && (
        <DetailPanel
          isOpen={panelId !== undefined}
          onClose={() => void navigate(`/reports${search}`)}
          onExited={() => focusRowLink(`/reports/${shownId}${search}`)}
          focusKey={shownId}
        >
          <ReportDetail key={shownId} id={shownId} listSearch={search} />
        </DetailPanel>
      )}
    </div>
  );
}
