import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useMatch, useNavigate } from 'react-router';
import { useTranslations, useFormatter } from 'use-intl';
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
import { listUploads, type UploadListItem } from '../content/content-api';
import { StatusBadge } from '../jobs/StatusBadge';
import { BatchPanel } from './BatchPanel';
import { UploadForm } from './UploadForm';

export function UploadsPage() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const format = useFormatter();
  const dateTime = useDateTime();
  const canUpload = useCan('content.edit');
  // `/uploads/new` opens the form over the list (UB9) and `/uploads/:id` the batch beside it (UB8); `:id` also matches
  // `new`, so `new` is checked first. The closing panel keeps its batch until it has animated out.
  const isNew = useMatch('/uploads/new') !== null;
  const idMatch = useMatch('/uploads/:id');
  const panelId = isNew ? undefined : idMatch?.params.id;
  const [formPending, setFormPending] = useState(false);
  const shownId = useRetained(panelId);

  const list = useInfiniteQuery({
    queryKey: ['uploads'],
    queryFn: ({ pageParam }) => listUploads(api, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  const columns: Column<UploadListItem>[] = [
    // Shares, not fixed widths, so a wide screen spreads the columns out (owner, Checkpoint A); short cells never wrap.
    { key: 'file', header: t('uploads.list.file'), className: 'w-2/5', cell: (b) => b.file_name },
    { key: 'rows', header: t('uploads.list.rows'), className: 'w-3/20 whitespace-nowrap tabular-nums', cell: (b) => format.number(b.row_count) },
    { key: 'status', header: t('uploads.list.status'), className: 'w-3/20', cell: (b) => <StatusBadge status={b.status} /> },
    { key: 'time', header: t('uploads.list.time'), className: 'w-1/5 whitespace-nowrap', cell: (b) => dateTime(b.created_at) },
    {
      key: 'open',
      header: '',
      className: 'w-1/10',
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
      <PageActions>{canUpload && <Button onPress={() => void navigate('/uploads/new')}>{t('uploads.upload')}</Button>}</PageActions>
      <DataList
        rows={rows}
        rowKey={(b) => b.id}
        columns={columns}
        rowHref={(b) => `/uploads/${b.id}`}
        selectedKey={panelId}
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
      {shownId && (
        <DetailPanel
          isOpen={panelId !== undefined}
          onClose={() => void navigate('/uploads')}
          onExited={() => focusRowLink(`/uploads/${shownId}`)}
          focusKey={shownId}
        >
          {/* Keyed by batch: switching rows must not carry a revert report, an error or a retry over (review I1, B25E28). */}
          <BatchPanel key={shownId} id={shownId} />
        </DetailPanel>
      )}
      {/* Always rendered so the dialog can animate out; React Aria unmounts the form after, so each opening is fresh. */}
      <Dialog
        isOpen={isNew}
        onOpenChange={(open) => !open && !formPending && void navigate('/uploads')}
        isDismissable={!formPending}
        title={t('uploads.formTitle')}
        size="md"
      >
        <UploadForm onPendingChange={setFormPending} />
      </Dialog>
    </div>
  );
}
