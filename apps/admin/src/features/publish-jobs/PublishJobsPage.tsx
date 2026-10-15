import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useMatch, useNavigate } from 'react-router';
import { useFormatter, useTranslations } from 'use-intl';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { useDateTime } from '../../i18n/use-date-time';
import { PageActions } from '../../app/shell-slots';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { DetailPanel } from '../../ui/DetailPanel';
import { Dialog } from '../../ui/Dialog';
import { focusRowLink } from '../../ui/focus-row-link';
import { useRetained } from '../../ui/use-retained';
import { listPublishJobs, type PublishJobListItem, type SenseFilter } from '../content/content-api';
import { StatusBadge } from '../jobs/StatusBadge';
import { PublishJobForm } from './PublishJobForm';
import { PublishJobPanel } from './PublishJobPanel';

/** `#a3f2c1`: the first six characters of the job id, as in Figma. */
export const shortId = (id: string) => id.slice(0, 6);

/** `level=B1 · topic=food`; a batch filter reads `lô #<id>`. Empty when the job has no filter. */
export function filterSummary(filter: SenseFilter, batchLabel: (id: string) => string): string {
  const parts: string[] = [];
  for (const key of ['level', 'topic', 'pos', 'status'] as const) {
    if (filter[key]) parts.push(`${key}=${filter[key]}`);
  }
  if (filter.batch_id) parts.push(batchLabel(shortId(filter.batch_id)));
  return parts.join(' · ');
}

export function PublishJobsPage() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const format = useFormatter();
  const dateTime = useDateTime();
  const canPublish = useCan('content.publish');
  // `/publish-jobs/new` opens the form over the list (UB9) and `/publish-jobs/:id` the job beside it (UB8); `:id` also
  // matches `new`, so `new` is checked first. The closing panel keeps its job until it has animated out.
  const isNew = useMatch('/publish-jobs/new') !== null;
  const idMatch = useMatch('/publish-jobs/:id');
  const panelId = isNew ? undefined : idMatch?.params.id;
  const [formPending, setFormPending] = useState(false);
  const shownId = useRetained(panelId);

  const list = useInfiniteQuery({
    queryKey: ['publish-jobs'],
    queryFn: ({ pageParam }) => listPublishJobs(api, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  const columns: Column<PublishJobListItem>[] = [
    {
      key: 'job',
      header: t('publishJobs.list.job'),
      // Shares, not fixed widths, so a wide screen spreads the columns out (owner, Checkpoint A); short cells never wrap.
      className: 'w-3/20 whitespace-nowrap',
      cell: (j) => (
        <Link to={`/publish-jobs/${j.id}`} className="rounded-control text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">
          #{shortId(j.id)}
        </Link>
      ),
    },
    {
      key: 'filter',
      header: t('publishJobs.list.filter'),
      className: 'w-2/5',
      cell: (j) => filterSummary(j.filter, (id) => t('publishJobs.batchFilter', { id })) || t('publishJobs.filterNone'),
    },
    { key: 'status', header: t('publishJobs.list.status'), className: 'w-3/20', cell: (j) => <StatusBadge status={j.status} /> },
    { key: 'count', header: t('publishJobs.list.count'), className: 'w-3/20 whitespace-nowrap tabular-nums', cell: (j) => format.number(j.snapshot_count) },
    { key: 'time', header: t('publishJobs.list.time'), className: 'w-3/20 whitespace-nowrap', cell: (j) => dateTime(j.created_at) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageActions>{canPublish && <Button onPress={() => void navigate('/publish-jobs/new')}>{t('publishJobs.create')}</Button>}</PageActions>
      <DataList
        rows={rows}
        rowKey={(j) => j.id}
        columns={columns}
        rowHref={(j) => `/publish-jobs/${j.id}`}
        selectedKey={panelId}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={t('publishJobs.empty')}
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
          onClose={() => void navigate('/publish-jobs')}
          onExited={() => focusRowLink(`/publish-jobs/${shownId}`)}
          focusKey={shownId}
        >
          {/* Keyed by job: switching rows must not carry a download error over (review I1). */}
          <PublishJobPanel key={shownId} id={shownId} />
        </DetailPanel>
      )}
      <Dialog
        isOpen={isNew}
        onOpenChange={(open) => !open && !formPending && void navigate('/publish-jobs')}
        isDismissable={!formPending}
        title={t('publishJobs.formTitle')}
        size="md"
      >
        <PublishJobForm onPendingChange={setFormPending} />
      </Dialog>
    </div>
  );
}
