import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { PageActions } from '../../app/shell-slots';
import { useErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataList, type Column } from '../../ui/DataList';
import { FaqDialog } from './FaqDialog';
import { deleteFaq, faqKeys, listFaq, type AdminFaqItem } from './faq-api';

/** `/faq`: the questions and answers of the home page, in the API's order; `/faq/new` and `/faq/:id` open the form over the list. Admin only. */
export function FaqPage() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const list = useQuery({ queryKey: faqKeys.list, queryFn: () => listFaq(api) });
  const rows = list.data?.items ?? [];
  const [toDelete, setToDelete] = useState<AdminFaqItem | null>(null);

  const isNew = useMatch('/faq/new') !== null;
  const editId = useMatch('/faq/:id')?.params.id;
  const editing = !isNew && editId !== undefined ? rows.find((r) => r.id === editId) : undefined;
  // A link to an id that is not in the list (once it has loaded) goes back to the list instead of an empty dialog.
  const unknownId = !isNew && editId !== undefined && list.isSuccess && editing === undefined;
  useEffect(() => {
    if (unknownId) void navigate('/faq', { replace: true });
  }, [unknownId, navigate]);
  // A new question goes after the last one.
  const nextPosition = rows.length === 0 ? 10 : Math.max(...rows.map((r) => r.position)) + 10;

  const remove = useMutation({
    mutationFn: (id: string) => deleteFaq(api, id),
    // A failed delete closes the question too: its error shows above the list.
    onSettled: () => {
      setToDelete(null);
      return queryClient.invalidateQueries({ queryKey: faqKeys.list });
    },
  });

  const columns: Column<AdminFaqItem>[] = [
    { key: 'position', header: t('faq.cols.position'), className: 'w-24 tabular-nums', card: 'field', cell: (r) => r.position },
    { key: 'question', header: t('faq.cols.question'), card: 'title', cell: (r) => r.question },
    {
      key: 'status', header: t('faq.cols.status'), className: 'w-32', card: 'field',
      cell: (r) => <Badge tone={r.published ? 'success' : 'neutral'}>{r.published ? t('faq.status.published') : t('faq.status.draft')}</Badge>,
    },
    {
      key: 'actions',
      header: t('faq.cols.actions'),
      card: 'action',
      cell: (r) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" aria-label={t('faq.editFor', { question: r.question })} onPress={() => void navigate(`/faq/${r.id}`)}>
            {t('faq.edit')}
          </Button>
          <Button
            variant="secondary"
            aria-label={t('faq.deleteFor', { question: r.question })}
            onPress={() => {
              remove.reset();
              setToDelete(r);
            }}
          >
            {t('faq.delete')}
          </Button>
        </div>
      ),
    },
  ];

  const deleteError = remove.isError ? errorDetails(remove.error) : null;
  return (
    <div className="flex flex-col gap-4">
      <PageActions>
        <Button onPress={() => void navigate('/faq/new')}>{t('faq.add')}</Button>
      </PageActions>
      <Banner variant="info">{t('faq.banner')}</Banner>
      {deleteError && <Banner variant="error" code={deleteError.code}>{deleteError.message}</Banner>}
      <DataList
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError ? 'error' : 'ready'}
        emptyText={t('faq.empty')}
        emptyHint={t('faq.emptyHint')}
        onRetry={() => void list.refetch()}
      />
      {isNew && list.isSuccess && <FaqDialog key="new" item={null} nextPosition={nextPosition} />}
      {editing && <FaqDialog key={editing.id} item={editing} nextPosition={nextPosition} />}
      <ConfirmDialog
        isOpen={toDelete !== null}
        title={t('faq.deleteDialog.title')}
        confirmLabel={t('faq.deleteDialog.confirm')}
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      >
        {toDelete?.question}
      </ConfirmDialog>
    </div>
  );
}
