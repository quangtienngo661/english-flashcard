import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { useTranslations, useFormatter } from 'use-intl';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { useDateTime } from '../../i18n/use-date-time';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { listUploads, type UploadListItem } from '../content/content-api';
import { StatusBadge } from '../jobs/StatusBadge';

export function UploadsPage() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const format = useFormatter();
  const dateTime = useDateTime();
  const canUpload = useCan('content.edit');

  const list = useInfiniteQuery({
    queryKey: ['uploads'],
    queryFn: ({ pageParam }) => listUploads(api, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  const columns: Column<UploadListItem>[] = [
    { key: 'file', header: t('uploads.list.file'), cell: (b) => b.file_name },
    { key: 'rows', header: t('uploads.list.rows'), className: 'w-28 tabular-nums', cell: (b) => format.number(b.row_count) },
    { key: 'status', header: t('uploads.list.status'), className: 'w-36', cell: (b) => <StatusBadge status={b.status} /> },
    { key: 'time', header: t('uploads.list.time'), className: 'w-48', cell: (b) => dateTime(b.created_at) },
    {
      key: 'open',
      header: '',
      className: 'w-32',
      card: 'action',
      cell: (b) => (
        <Link
          to={`/uploads/${b.id}`}
          className="inline-flex min-h-control items-center whitespace-nowrap rounded-control px-4 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t('uploads.open')}
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {canUpload && (
        <div className="flex shell:justify-end">
          <Button className="w-full shell:w-auto" onPress={() => void navigate('/uploads/new')}>
            {t('uploads.upload')}
          </Button>
        </div>
      )}
      <DataList
        rows={rows}
        rowKey={(b) => b.id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={t('uploads.empty')}
        emptyHint={canUpload ? t('uploads.emptyHint') : undefined}
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
    </div>
  );
}
