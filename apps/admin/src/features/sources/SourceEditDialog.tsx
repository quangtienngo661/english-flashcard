import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslations } from 'use-intl';
import { useFocusFirstError, violationsToFields } from '../../api/field-errors';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Dialog } from '../../ui/Dialog';
import { TextField } from '../../ui/TextField';
import { showToast } from '../../ui/Toast';
import { updateSource, type NewSource, type SourceView } from '../content/content-api';

const IS_INT = /^-?\d+$/;
const FIELD_ORDER = ['name', 'version', 'url', 'license', 'attribution', 'priority'];
/** The API names the priority `display_priority`; the field here is `priority`. */
const FIELD_OF_PATH: Record<string, string> = {
  name: 'name',
  version: 'version',
  url: 'url',
  license: 'license',
  attribution: 'attribution',
  display_priority: 'priority',
};

/**
 * [Sửa] on a third-party source: the register form's fields and rules, filled in. Only the keys that changed are sent
 * (the API refuses an empty body), and `kind` is not editable. A source that already has a version and a license starts as
 * a level source, so those two stay required unless the box is cleared.
 */
export function SourceEditDialog({ source, onClose }: { source: SourceView; onClose: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const errorDetails = useErrorDetails();
  const queryClient = useQueryClient();
  const initial = {
    name: source.name,
    version: source.version,
    url: source.url ?? '',
    license: source.license,
    attribution: source.attribution,
    priority: String(source.display_priority),
  };
  const [name, setName] = useState(initial.name);
  const [version, setVersion] = useState(initial.version);
  const [url, setUrl] = useState(initial.url);
  const [license, setLicense] = useState(initial.license);
  const [attribution, setAttribution] = useState(initial.attribution);
  const [priority, setPriority] = useState(initial.priority);
  const [asLevelSource, setAsLevelSource] = useState(source.version.trim() !== '' && source.license.trim() !== '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const busy = useRef(false);
  const mutation = useMutation({ mutationFn: (body: Partial<NewSource>) => updateSource(api, source.id, body) });

  const dirty =
    name !== initial.name || version !== initial.version || url !== initial.url || license !== initial.license || attribution !== initial.attribution || priority !== initial.priority;
  const requestClose = useDialogDirtyClose(dirty && !mutation.isPending, onClose);
  useFocusFirstError(errors, FIELD_ORDER);

  const star = (label: string, required: boolean) => (required ? `${label} *` : label);

  /** The keys whose trimmed value differs from the source. */
  function changes(): Partial<NewSource> {
    const body: Partial<NewSource> = {};
    const nextUrl = url.trim() === '' ? null : url.trim();
    if (name.trim() !== source.name) body.name = name.trim();
    if (version.trim() !== source.version) body.version = version.trim();
    if (nextUrl !== source.url) body.url = nextUrl;
    if (license.trim() !== source.license) body.license = license.trim();
    if (attribution.trim() !== source.attribution) body.attribution = attribution.trim();
    if (Number(priority) !== source.display_priority) body.display_priority = Number(priority);
    return body;
  }

  async function submit() {
    if (busy.current) return;
    // Cleared first (and committed), so a second failure on the same field moves focus there again.
    flushSync(() => {
      setErrors({});
      setBanner(null);
    });
    const next: Record<string, string> = {};
    if (name.trim() === '') next.name = t('sources.form.required');
    if (asLevelSource && version.trim() === '') next.version = t('sources.form.required');
    if (asLevelSource && license.trim() === '') next.license = t('sources.form.required');
    if (url.trim() !== '' && !/^https?:\/\//i.test(url.trim())) next.url = t('sources.form.urlInvalid');
    if (!IS_INT.test(priority.trim())) next.priority = t('sources.form.priorityInvalid');
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    const body = changes();
    if (Object.keys(body).length === 0) {
      requestClose.release();
      onClose();
      return;
    }
    busy.current = true;
    try {
      const saved = await mutation.mutateAsync(body);
      await queryClient.invalidateQueries({ queryKey: ['sources'] });
      showToast(t('sources.toast.saved', { name: saved.name }));
      requestClose.release();
      onClose();
    } catch (e) {
      // The source is gone (deleted from another tab): the list still shows it until it is reloaded.
      if (e instanceof ApiError && e.problem.status === 404) void queryClient.invalidateQueries({ queryKey: ['sources'] });
      const mapped = e instanceof ApiError ? violationsToFields(e.problem.violations ?? [], (path) => FIELD_OF_PATH[path] ?? null) : null;
      if (mapped && Object.keys(mapped.fields).length > 0) setErrors(mapped.fields);
      if (!mapped || Object.keys(mapped.fields).length === 0 || mapped.form.length > 0) {
        const details = errorDetails(e);
        setBanner(mapped && mapped.form.length > 0 ? { ...details, message: [details.message, ...mapped.form].join(' ') } : details);
      }
    } finally {
      busy.current = false;
    }
  }

  const pending = mutation.isPending;
  return (
    <Dialog isOpen onOpenChange={(open) => !open && !pending && requestClose()} isDismissable={!pending} title={t('sources.editTitle', { name: source.name })} size="lg">
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
          <TextField id="name" label={star(t('sources.form.name'), true)} autoComplete="off" value={name} onChange={setName} error={errors.name} />
          <TextField id="version" label={star(t('sources.form.version'), asLevelSource)} autoComplete="off" value={version} onChange={setVersion} error={errors.version} />
          <TextField id="url" label={t('sources.form.url')} type="url" autoComplete="off" spellCheck={false} value={url} onChange={setUrl} error={errors.url} />
          <TextField id="license" label={star(t('sources.form.license'), asLevelSource)} autoComplete="off" value={license} onChange={setLicense} error={errors.license} />
          <TextField id="attribution" label={t('sources.form.attribution')} autoComplete="off" value={attribution} onChange={setAttribution} error={errors.attribution} />
          <TextField
            id="priority"
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
          <Button variant="secondary" onPress={requestClose} isDisabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isPending={pending}>
            {t('sources.form.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
