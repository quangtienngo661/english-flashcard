import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { PageActions } from '../../app/shell-slots';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataList, type Column } from '../../ui/DataList';
import { Dialog } from '../../ui/Dialog';
import { TextField } from '../../ui/TextField';
import { showToast } from '../../ui/Toast';
import { useCountdown } from '../account/useCountdown';
import { createSource, deleteSource, listSources, type SourceView } from '../content/content-api';
import { SourceEditDialog } from './SourceEditDialog';

export function SourcesPage() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const list = useQuery({ queryKey: ['sources'], queryFn: () => listSources(api) });
  const rows = list.data ?? [];
  // `/sources/new` keeps the list and opens the form over it (UB9).
  const isNew = useMatch('/sources/new') !== null;
  const [formPending, setFormPending] = useState(false);
  const [editing, setEditing] = useState<SourceView | null>(null);
  const [deleting, setDeleting] = useState<SourceView | null>(null);
  const [problem, setProblem] = useState<ErrorDetails | null>(null);
  const remove = useMutation({
    mutationFn: (source: SourceView) => deleteSource(api, source.id),
    onMutate: () => setProblem(null),
    onSuccess: async (_, source) => {
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: ['sources'] });
      showToast(t('sources.toast.deleted', { name: source.name }));
    },
    onError: (e) => {
      setDeleting(null);
      setProblem(errorDetails(e));
      // Deleted from another tab: the list still shows it until it is reloaded.
      if (e instanceof ApiError && e.problem.status === 404) void queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });

  const columns: Column<SourceView>[] = [
    // Shares, not fixed widths, so a wide screen spreads the columns out instead of piling them on the right (owner, Checkpoint A).
    { key: 'name', header: t('sources.list.name'), className: 'w-1/3', cell: (s) => s.name },
    { key: 'version', header: t('sources.list.version'), className: 'w-1/6', cell: (s) => s.version || '—' },
    { key: 'license', header: t('sources.list.license'), className: 'w-1/4', cell: (s) => s.license || '—' },
    { key: 'priority', header: t('sources.list.priority'), className: 'w-1/12 tabular-nums', cell: (s) => s.display_priority },
    {
      key: 'actions',
      header: t('sources.list.actions'),
      card: 'action',
      // The owner's source is built in: the API refuses to change or delete it, so the row says so instead of offering buttons.
      cell: (s) =>
        s.kind === 'owner' ? (
          <span className="text-xs text-muted">{t('sources.ownerNote')}</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            <Button variant="ghost" aria-label={t('sources.editFor', { name: s.name })} onPress={() => setEditing(s)}>
              {t('sources.edit')}
            </Button>
            <Button variant="ghost" className="text-danger" aria-label={t('sources.deleteFor', { name: s.name })} onPress={() => setDeleting(s)}>
              {t('sources.delete')}
            </Button>
          </span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageActions>
        <Button onPress={() => void navigate('/sources/new')}>{t('sources.register')}</Button>
      </PageActions>
      {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
      <DataList
        rows={rows}
        rowKey={(s) => s.id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError ? 'error' : 'ready'}
        emptyText={t('sources.empty')}
        emptyHint={t('sources.emptyHint')}
        onRetry={() => void list.refetch()}
      />
      <Dialog
        isOpen={isNew}
        onOpenChange={(open) => !open && !formPending && void navigate('/sources')}
        isDismissable={!formPending}
        title={t('sources.formTitle')}
        size="lg"
      >
        <SourceForm onPendingChange={setFormPending} />
      </Dialog>
      {editing && <SourceEditDialog key={editing.id} source={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        isOpen={deleting !== null}
        title={t('sources.deleteTitle', { name: deleting?.name ?? '' })}
        confirmLabel={t('sources.deleteConfirm')}
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      >
        {t('sources.deleteBody')}
      </ConfirmDialog>
    </div>
  );
}

const RATE_LIMIT_FALLBACK_SECONDS = 10;
const IS_INT = /^-?\d+$/;

/** Spec §6.3 "Nguồn dữ liệu": register a source. Version and license are required only for a level source. Shown in a dialog (UB9). */
export function SourceForm({ onPendingChange }: { onPendingChange?: (pending: boolean) => void }) {
  const t = useTranslations();
  const api = useApi();
  const errorDetails = useErrorDetails();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [url, setUrl] = useState('');
  const [license, setLicense] = useState('');
  const [attribution, setAttribution] = useState('');
  const [priority, setPriority] = useState('100');
  const [asLevelSource, setAsLevelSource] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const busy = useRef(false);
  const wait = useCountdown();
  const mutation = useMutation({
    mutationFn: () =>
      createSource(api, {
        name: name.trim(),
        version: version.trim(),
        url: url.trim() === '' ? null : url.trim(),
        license: license.trim(),
        attribution: attribution.trim(),
        display_priority: Number(priority),
      }),
  });

  useEffect(() => onPendingChange?.(mutation.isPending), [mutation.isPending, onPendingChange]);

  const star = (label: string, required: boolean) => (required ? `${label} *` : label);

  async function submit() {
    if (busy.current || wait.remaining > 0) return;
    const next: Record<string, string> = {};
    if (name.trim() === '') next.name = t('sources.form.required');
    if (asLevelSource && version.trim() === '') next.version = t('sources.form.required');
    if (asLevelSource && license.trim() === '') next.license = t('sources.form.required');
    if (url.trim() !== '' && !/^https?:\/\//i.test(url.trim())) next.url = t('sources.form.urlInvalid');
    if (!IS_INT.test(priority.trim())) next.priority = t('sources.form.priorityInvalid');
    setErrors(next);
    setBanner(null);
    if (Object.keys(next).length > 0) return;
    busy.current = true;
    try {
      await mutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['sources'] });
      void navigate('/sources');
    } catch (e) {
      if (e instanceof ApiError && e.problem.status === 429) wait.start(e.retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SECONDS);
      else setBanner(errorDetails(e));
    } finally {
      busy.current = false;
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4"
    >
      {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
      <div className="grid gap-4 shell:grid-cols-2">
        <TextField label={star(t('sources.form.name'), true)} autoComplete="off" value={name} onChange={setName} error={errors.name} />
        <TextField label={star(t('sources.form.version'), asLevelSource)} autoComplete="off" value={version} onChange={setVersion} error={errors.version} />
        <TextField label={t('sources.form.url')} type="url" autoComplete="off" spellCheck={false} value={url} onChange={setUrl} error={errors.url} />
        <TextField label={star(t('sources.form.license'), asLevelSource)} autoComplete="off" value={license} onChange={setLicense} error={errors.license} />
        <TextField label={t('sources.form.attribution')} autoComplete="off" value={attribution} onChange={setAttribution} />
        <TextField
          label={t('sources.form.priority')}
          autoComplete="off"
          inputMode="numeric"
          value={priority}
          onChange={setPriority}
          description={t('sources.form.priorityHint')}
          error={errors.priority}
        />
      </div>
      <Checkbox isSelected={asLevelSource} onChange={setAsLevelSource}>
        {t('sources.form.asLevelSource')}
      </Checkbox>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onPress={() => void navigate('/sources')}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" isPending={mutation.isPending} isDisabled={wait.remaining > 0}>
          {wait.remaining > 0 ? t('errors.retryIn', { seconds: wait.remaining }) : t('sources.form.save')}
        </Button>
      </div>
    </form>
  );
}
