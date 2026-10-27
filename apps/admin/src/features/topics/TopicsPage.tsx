import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { useErrorMessage } from '../../api/use-error-message';
import { PageActions } from '../../app/shell-slots';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { showToast } from '../../ui/Toast';
import { listTopics, updateTopic, type TopicView } from '../content/content-api';
import { TopicDialog } from './TopicDialog';

/** A/89 `/topics` (`taxonomy.manage`): every topic, no paging; add, rename, archive / use again (no delete). */
export function TopicsPage() {
  const t = useTranslations('topics');
  const api = useApi();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const topics = useQuery({ queryKey: ['topics'], queryFn: () => listTopics(api) });
  const [editing, setEditing] = useState<TopicView | 'new' | null>(null);
  const archive = useMutation({
    mutationFn: (topic: TopicView) => updateTopic(api, topic.code, { archived: topic.archived_at === null }),
    onSuccess: async (saved) => {
      showToast(saved.archived_at ? t('archivedToast', { code: saved.code }) : t('restoredToast', { code: saved.code }));
      await queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
    onError: (e) => showToast(errorMessage(e)),
  });
  const rows = topics.data ?? [];

  const columns: Column<TopicView>[] = [
    { key: 'code', header: t('cols.code'), className: 'wrap-anywhere', cell: (r) => <code className="font-semibold">{r.code}</code> },
    { key: 'vi', header: t('cols.vi'), card: 'field', className: 'wrap-anywhere font-semibold', cell: (r) => r.names.vi ?? '—' },
    { key: 'en', header: t('cols.en'), card: 'field', className: 'wrap-anywhere', cell: (r) => r.names.en ?? '—' },
    {
      key: 'state', header: t('cols.state'), card: 'field', className: 'whitespace-nowrap',
      cell: (r) => (r.archived_at ? <Badge>{t('archived')}</Badge> : <Badge tone="success">{t('active')}</Badge>),
    },
    {
      key: 'actions', header: '', card: 'action',
      cell: (r) => (
        <span className="flex flex-wrap gap-1">
          <Button variant="ghost" aria-label={t('renameFor', { code: r.code })} onPress={() => setEditing(r)}>
            {t('rename')}
          </Button>
          <Button
            variant="ghost"
            aria-label={t(r.archived_at ? 'restoreFor' : 'archiveFor', { code: r.code })}
            isPending={archive.isPending && archive.variables?.code === r.code}
            onPress={() => archive.mutate(r)}
          >
            {r.archived_at ? t('restore') : t('archive')}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <Button onPress={() => setEditing('new')}>{t('addTitle')}</Button>
      </PageActions>
      <p className="text-ui text-muted">{t('intro')}</p>
      <DataList
        rows={rows}
        rowKey={(r) => r.code}
        columns={columns}
        state={topics.isPending ? 'loading' : topics.isError ? 'error' : 'ready'}
        emptyText={t('empty')}
        onRetry={() => void topics.refetch()}
      />
      {rows.length > 0 && <p className="text-xs text-muted">{t('footer', { count: rows.length })}</p>}
      {editing && <TopicDialog topic={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
