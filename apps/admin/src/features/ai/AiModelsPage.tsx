import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useMatch, useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { PageActions } from '../../app/shell-slots';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataList, type Column } from '../../ui/DataList';
import { ListState } from '../../ui/ListState';
import { showToast } from '../../ui/Toast';
import { aiKeys, deleteModel, listModels, refreshModel, type AiModel } from './ai-api';
import { ModelDialog } from './ModelDialog';
import { useAiFormat } from './useAiFormat';

const linkClass =
  'inline-flex min-h-control w-fit items-center whitespace-nowrap rounded-control px-4 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-control-touch';

/** A/80 `/ai/models` (admin only): the models operations can choose, with their prices. `new` and `:id` open the add / price dialogs over the list. */
export function AiModelsPage() {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const query = useQuery({ queryKey: aiKeys.models(), queryFn: () => listModels(api) });
  const isNew = useMatch('/ai/models/new') !== null;
  const editId = useMatch('/ai/models/:id')?.params.id;
  const [deleting, setDeleting] = useState<AiModel | null>(null);
  const [problem, setProblem] = useState<ErrorDetails | null>(null);

  const refresh = useMutation({
    mutationFn: (model: AiModel) => refreshModel(api, model.id),
    onMutate: () => setProblem(null),
    onSuccess: async (_, model) => {
      await queryClient.invalidateQueries({ queryKey: aiKeys.models() });
      showToast(t('ai.models.toast.refreshed', { model: model.model_id }));
    },
    onError: (e) => setProblem(errorDetails(e)),
  });
  const remove = useMutation({
    mutationFn: (model: AiModel) => deleteModel(api, model.id),
    onMutate: () => setProblem(null),
    onSuccess: async (_, model) => {
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: aiKeys.models() });
      showToast(t('ai.models.toast.deleted', { model: model.model_id }));
    },
    onError: (e, model) => {
      setDeleting(null);
      const details = errorDetails(e);
      // The 409 carries no list of operations (design §6.2): the names come from the row's `used_by`.
      if (e instanceof ApiError && e.problem.slug === 'model-in-use' && model.used_by.length > 0) {
        const operations = model.used_by.map((op) => t(`ai.operations.names.${op}`)).join(', ');
        setProblem({ ...details, message: `${details.message} ${t('ai.models.usedBy', { operations })}` });
      } else setProblem(details);
    },
  });

  if (query.isPending) return <ListState state="loading" />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.problem.slug === 'forbidden') return <Banner variant="error">{t('errors.forbidden')}</Banner>;
    return <ListState state="error" onRetry={() => void query.refetch()} />;
  }

  const models = query.data.items;
  const editing = isNew || editId === undefined ? undefined : models.find((m) => m.id === editId);

  const columns: Column<AiModel>[] = [
    {
      key: 'model', header: t('ai.models.cols.model'), className: 'w-1/5 wrap-anywhere',
      cell: (m) => (
        <span className="flex flex-col">
          <span className="font-semibold">{`${t(`ai.providers.${m.provider}`)} · ${m.model_id}`}</span>
          {m.note && <span className="text-xs font-normal text-muted">{m.note}</span>}
        </span>
      ),
    },
    {
      key: 'price', header: t('ai.models.cols.price'), className: 'tabular-nums', card: 'field',
      cell: (m) =>
        m.price ? `${format.price(m.price.input)} / ${m.price.cached_input === null ? '—' : format.price(m.price.cached_input)} / ${format.price(m.price.output)}` : t('ai.models.noPrice'),
    },
    {
      key: 'usedBy', header: t('ai.models.cols.usedBy'), className: 'wrap-anywhere', card: 'field',
      cell: (m) => (m.used_by.length > 0 ? m.used_by.map((op) => t(`ai.operations.names.${op}`)).join(', ') : t('ai.models.none')),
    },
    {
      key: 'lifecycle', header: t('ai.models.cols.lifecycle'), className: 'wrap-normal', card: 'field',
      cell: (m) => {
        if (!m.lifecycle && !m.shutdown_at) return t('ai.models.none');
        return (
          <span className="flex flex-col">
            {m.lifecycle && <span>{m.lifecycle}</span>}
            {m.shutdown_at && <span className="text-xs text-muted">{t('ai.status.shutdown', { date: format.date(m.shutdown_at) })}</span>}
          </span>
        );
      },
    },
    {
      key: 'estimate', header: t('ai.models.cols.estimate'), className: 'tabular-nums', card: 'field',
      cell: (m) => (m.estimate ? t('ai.models.estimate', { usd: format.usd(m.estimate.per_call_usd), vnd: format.vnd(m.estimate.per_call_vnd) }) : t('ai.models.none')),
    },
    { key: 'checked', header: t('ai.models.cols.checked'), className: 'tabular-nums', card: 'field', cell: (m) => format.dateTime(m.info_checked_at) },
    {
      key: 'actions', header: t('ai.models.cols.actions'), card: 'action',
      cell: (m) => (
        <span className="flex flex-wrap items-center gap-x-1">
          <Link to={`/ai/models/${m.id}`} className={linkClass} aria-label={t('ai.models.editPriceFor', { model: m.model_id })}>
            {t('ai.models.editPrice')}
          </Link>
          <Button
            variant="ghost"
            aria-label={t('ai.models.refreshFor', { model: m.model_id })}
            isPending={refresh.isPending && refresh.variables?.id === m.id}
            isDisabled={refresh.isPending}
            onPress={() => refresh.mutate(m)}
          >
            {t('ai.models.refresh')}
          </Button>
          <Button variant="ghost" className="text-danger" aria-label={t('ai.models.deleteFor', { model: m.model_id })} onPress={() => setDeleting(m)}>
            {t('ai.models.delete')}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageActions>
        <Button onPress={() => void navigate('/ai/models/new')}>{t('ai.models.add')}</Button>
      </PageActions>
      {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
      <DataList
        rows={models}
        rowKey={(m) => m.id}
        columns={columns}
        state="ready"
        emptyText={t('ai.models.empty')}
        emptyHint={t('ai.models.emptyHint')}
      />
      {isNew && <ModelDialog />}
      {editing && <ModelDialog key={editing.id} model={editing} />}
      {!isNew && editId !== undefined && !editing && <Navigate to="/ai/models" replace />}
      <ConfirmDialog
        isOpen={deleting !== null}
        title={t('ai.models.deleteTitle', { model: deleting?.model_id ?? '' })}
        confirmLabel={t('ai.models.deleteConfirm')}
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      >
        {t('ai.models.deleteBody')}
      </ConfirmDialog>
    </div>
  );
}
