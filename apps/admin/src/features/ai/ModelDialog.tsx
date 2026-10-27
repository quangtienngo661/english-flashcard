import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router';
import { useLocale, useTranslations } from 'use-intl';
import { violationsToFields, useFocusFirstError } from '../../api/field-errors';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { ListState } from '../../ui/ListState';
import { Select } from '../../ui/Select';
import { showToast } from '../../ui/Toast';
import { TextField } from '../../ui/TextField';
import { aiKeys, createModel, getStatus, updateModel, type AddModelBody, type AiModel, type AiProvider, type UpdateModelBody } from './ai-api';

const PROVIDER_ORDER: AiProvider[] = ['openai', 'anthropic', 'fake'];
const FIELD_ORDER = ['provider', 'model_id', 'price_input', 'price_cached_input', 'price_output', 'note'];
const MODEL_ID = /^[A-Za-z0-9._:-]{1,100}$/;
const PRICE = /^\d+(?:[.,]\d{1,4})?$/;
const PRICE_MAX = 1000;
const NOTE_MAX = 500;

type Price = { ok: true; value: number | null } | { ok: false };
/** Empty is "unknown" (null); otherwise 0-1000 with up to 4 decimals, "," or "." as the separator. */
function parsePrice(text: string): Price {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: null };
  if (!PRICE.test(trimmed)) return { ok: false };
  const value = Number(trimmed.replace(',', '.'));
  return value > PRICE_MAX ? { ok: false } : { ok: true, value };
}

type Props = { model?: AiModel };

/**
 * A/80b `/ai/models/new` and the price edit `/ai/models/:id`: one dialog, mounted only while its route matches, so its
 * state is gone on close. A new model offers only the providers that have a key; a `fake` model has no prices (the API sets 0).
 */
export function ModelDialog({ model }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const isNew = model === undefined;
  const status = useQuery({ queryKey: aiKeys.status(), queryFn: () => getStatus(api), enabled: isNew });
  const available = PROVIDER_ORDER.filter((p) => status.data?.providers[p]);

  const initial = {
    modelId: '',
    input: showPrice(model?.price?.input, locale),
    cached: showPrice(model?.price?.cached_input, locale),
    output: showPrice(model?.price?.output, locale),
    note: model?.note ?? '',
  };
  const [pickedProvider, setPickedProvider] = useState('');
  const [modelId, setModelId] = useState(initial.modelId);
  const [input, setInput] = useState(initial.input);
  const [cached, setCached] = useState(initial.cached);
  const [output, setOutput] = useState(initial.output);
  const [note, setNote] = useState(initial.note);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const busy = useRef(false);

  const provider = (model?.provider ?? (available.includes(pickedProvider as AiProvider) ? pickedProvider : available[0])) as AiProvider | undefined;
  const isFake = provider === 'fake';
  const isDirty = pickedProvider !== '' || modelId !== initial.modelId || input !== initial.input || cached !== initial.cached || output !== initial.output || note !== initial.note;

  const mutation = useMutation({
    mutationFn: (body: AddModelBody | UpdateModelBody) => (model ? updateModel(api, model.id, body) : createModel(api, body as AddModelBody)),
  });
  const requestClose = useDialogDirtyClose(isDirty, () => void navigate('/ai/models'));
  useFocusFirstError(errors, FIELD_ORDER);

  async function submit() {
    if (busy.current || provider === undefined) return;
    // Cleared first (and committed), so a second failure on the same field moves focus there again.
    flushSync(() => {
      setErrors({});
      setBanner(null);
    });
    const next: Record<string, string> = {};
    const id = modelId.trim();
    if (isNew && id === '') next.model_id = t('ai.models.form.modelIdRequired');
    else if (isNew && !MODEL_ID.test(id)) next.model_id = t('ai.models.form.modelIdInvalid');
    const prices = isFake ? [] : ([['price_input', input], ['price_cached_input', cached], ['price_output', output]] as const);
    const parsed: Record<string, number | null> = {};
    for (const [field, text] of prices) {
      const price = parsePrice(text);
      if (price.ok) parsed[field] = price.value;
      else next[field] = t('ai.models.form.priceInvalid');
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    const noteValue = note.trim() === '' ? null : note.trim();
    const body = isNew ? { provider, model_id: id, ...parsed, note: noteValue } : { ...parsed, note: noteValue };
    busy.current = true;
    try {
      const saved = await mutation.mutateAsync(body as AddModelBody & UpdateModelBody);
      await queryClient.invalidateQueries({ queryKey: aiKeys.models() });
      showToast(t(isNew ? 'ai.models.toast.added' : 'ai.models.toast.saved', { model: saved.model_id }));
      requestClose.release();
      void navigate('/ai/models');
    } catch (e) {
      const mapped = e instanceof ApiError ? violationsToFields(e.problem.violations ?? [], (path) => (FIELD_ORDER.includes(path) ? path : null)) : null;
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
  const noProvider = isNew && status.isSuccess && available.length === 0;
  const title = model ? t('ai.models.form.editTitle', { model: model.model_id }) : t('ai.models.form.addTitle');
  return (
    <Dialog isOpen onOpenChange={(open) => !open && !pending && requestClose()} isDismissable={!pending} title={title} size="lg">
      {isNew && status.isPending ? (
        <p className="text-ui text-muted">{t('common.loading')}</p>
      ) : isNew && status.isError ? (
        <ListState state="error" onRetry={() => void status.refetch()} />
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4"
        >
          {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
          {noProvider && <Banner variant="error">{t('ai.models.form.noProvider')}</Banner>}
          {isNew && (
            <div className="grid gap-4 shell:grid-cols-2">
              <Select
                id="provider"
                label={t('ai.models.form.provider')}
                items={available.map((p) => ({ id: p, label: t(`ai.providers.${p}`) }))}
                value={provider ?? ''}
                onChange={setPickedProvider}
                isDisabled={noProvider}
                error={errors.provider}
              />
              <TextField
                id="model_id"
                label={t('ai.models.form.modelId')}
                autoComplete="off"
                spellCheck={false}
                maxLength={100}
                value={modelId}
                onChange={setModelId}
                description={t('ai.models.form.modelIdHint')}
                error={errors.model_id}
              />
            </div>
          )}
          {isFake ? (
            <p className="text-ui text-muted">{t('ai.models.form.fakePrice')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 shell:grid-cols-3">
                <TextField id="price_input" label={t('ai.models.form.priceInput')} autoComplete="off" value={input} onChange={setInput} error={errors.price_input} />
                <TextField id="price_cached_input" label={t('ai.models.form.priceCached')} autoComplete="off" value={cached} onChange={setCached} error={errors.price_cached_input} />
                <TextField id="price_output" label={t('ai.models.form.priceOutput')} autoComplete="off" value={output} onChange={setOutput} error={errors.price_output} />
              </div>
              <p className="text-xs text-muted">{t('ai.models.form.priceHint')}</p>
            </div>
          )}
          <TextField id="note" label={t('ai.models.form.note')} autoComplete="off" maxLength={NOTE_MAX} value={note} onChange={setNote} error={errors.note} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onPress={requestClose} isDisabled={pending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isPending={pending} isDisabled={noProvider}>
              {t(isNew ? 'ai.models.form.submitAdd' : 'ai.models.form.submitSave')}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/** "2.5000" → "2,5" (vi) / "2.5" (en); null stays empty. */
function showPrice(value: string | null | undefined, locale: string): string {
  if (value === null || value === undefined) return '';
  const text = String(Number(value));
  return locale === 'en' ? text : text.replace('.', ',');
}
