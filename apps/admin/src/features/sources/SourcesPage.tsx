import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { useErrorMessage } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { PageActions } from '../../app/shell-slots';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { DataList, type Column } from '../../ui/DataList';
import { TextField } from '../../ui/TextField';
import { createSource, listSources, type SourceView } from '../content/content-api';

const panel = 'flex flex-col gap-4 rounded-panel border-2 border-border p-4';

export function SourcesPage() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const list = useQuery({ queryKey: ['sources'], queryFn: () => listSources(api) });
  const rows = list.data ?? [];

  const columns: Column<SourceView>[] = [
    { key: 'name', header: t('sources.list.name'), cell: (s) => s.name },
    { key: 'version', header: t('sources.list.version'), className: 'w-32', cell: (s) => s.version || '—' },
    { key: 'license', header: t('sources.list.license'), className: 'w-40', cell: (s) => s.license || '—' },
    { key: 'priority', header: t('sources.list.priority'), className: 'w-24 tabular-nums', cell: (s) => s.display_priority },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageActions>
        <Button onPress={() => void navigate('/sources/new')}>{t('sources.register')}</Button>
      </PageActions>
      <DataList
        rows={rows}
        rowKey={(s) => s.id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError ? 'error' : 'ready'}
        emptyText={t('sources.empty')}
        emptyHint={t('sources.emptyHint')}
        onRetry={() => void list.refetch()}
      />
    </div>
  );
}

const IS_INT = /^-?\d+$/;

/** Spec §6.3 "Nguồn dữ liệu": register a source. Version and license are required only for a level source. */
export function SourceForm() {
  const t = useTranslations();
  const api = useApi();
  const errorMessage = useErrorMessage();
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
  const [banner, setBanner] = useState<string | null>(null);
  const busy = useRef(false);
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

  const star = (label: string, required: boolean) => (required ? `${label} *` : label);

  async function submit() {
    if (busy.current) return;
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
      setBanner(errorMessage(e));
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
      className={panel}
    >
      {banner && <Banner variant="error">{banner}</Banner>}
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
        <Button type="submit" isPending={mutation.isPending}>
          {t('sources.form.save')}
        </Button>
      </div>
    </form>
  );
}
