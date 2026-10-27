import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslations } from 'use-intl';
import { useFocusFirstError, violationsToFields } from '../../api/field-errors';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useDirtyForm } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ListState } from '../../ui/ListState';
import { NumberField } from '../../ui/NumberField';
import { Select } from '../../ui/Select';
import { showToast } from '../../ui/Toast';
import {
  aiKeys, listModels, listOperations, saveOperation, sortByOperationOrder, type AiModel, type AiOperation, type AiOperationSetting,
} from './ai-api';
import { sameDraft, switchModel, toBody, toDraft, type Draft } from './operation-draft';
import { thinkingViolationKey } from './operation-violations';

const NONE = '__none';
const DEFAULT = '__default';
/** The API's ceiling when the model does not state its own (`ai.constants.ts`). */
const TOKENS_CEILING = 128_000;
const FIELDS = ['model', 'effort', 'thinking', 'tokens'] as const;
type Field = (typeof FIELDS)[number];
const FIELD_OF_PATH: Record<string, Field> = { model_ref: 'model', effort: 'effort', thinking: 'thinking', max_output_tokens: 'tokens' };
const THINKING_COPY = { cannotTurnOff: 'thinkingCannotOff', needsLowEffort: 'thinkingNeedsEffort' } as const;

/** A/81 `/ai/operations` (admin only): the model, effort, thinking and token limit of each AI operation, saved row by row. */
export function AiOperationsPage() {
  const t = useTranslations();
  const api = useApi();
  const operations = useQuery({ queryKey: aiKeys.operations(), queryFn: () => listOperations(api) });
  const models = useQuery({ queryKey: aiKeys.models(), queryFn: () => listModels(api) });
  const [drafts, setDrafts] = useState<Partial<Record<AiOperation, Draft>>>({});
  const rows = operations.data ? sortByOperationOrder(operations.data.items) : [];
  const anyDirty = rows.some((row) => {
    const draft = drafts[row.operation];
    return draft !== undefined && !sameDraft(draft, toDraft(row));
  });
  useDirtyForm(anyDirty);

  const failed = operations.isError ? operations : models.isError ? models : null;
  if (failed) {
    if (failed.error instanceof ApiError && failed.error.problem.slug === 'forbidden') return <Banner variant="error">{t('errors.forbidden')}</Banner>;
    return <ListState state="error" onRetry={() => void failed.refetch()} />;
  }
  if (!operations.data || !models.data) return <ListState state="loading" />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ui text-muted">{t('ai.operations.row.note')}</p>
      {rows.map((row) => (
        <OperationRow
          key={row.operation}
          setting={row}
          models={models.data.items}
          draft={drafts[row.operation] ?? toDraft(row)}
          onChange={(draft) => setDrafts((prev) => ({ ...prev, [row.operation]: draft }))}
          onDrop={() =>
            setDrafts((prev) => {
              const rest = { ...prev };
              delete rest[row.operation];
              return rest;
            })
          }
        />
      ))}
    </div>
  );
}

type RowProps = {
  setting: AiOperationSetting;
  models: AiModel[];
  draft: Draft;
  onChange: (draft: Draft) => void;
  /** Forgets this row's edits (after a save, or [Tải lại]). */
  onDrop: () => void;
};

function OperationRow({ setting, models, draft, onChange, onDrop }: RowProps) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const op = setting.operation;
  const id = (field: Field) => `${op}-${field}`;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState(false);
  const [droppedEffort, setDroppedEffort] = useState<string | null>(null);
  const busy = useRef(false);
  useFocusFirstError(errors, FIELDS.map(id));

  const dirty = !sameDraft(draft, toDraft(setting));
  const model = models.find((m) => m.id === draft.modelId);
  const name = t(`ai.operations.names.${op}`);
  const providerName = (m: { provider: AiModel['provider']; model_id: string }) => `${t(`ai.providers.${m.provider}`)} · ${m.model_id}`;
  const modelItems = [
    { id: NONE, label: t('ai.operations.row.noModel') },
    ...models.map((m) => ({ id: m.id, label: providerName(m) })),
    ...(setting.model && !models.some((m) => m.id === setting.model?.id) ? [{ id: setting.model.id, label: providerName(setting.model) }] : []),
  ];
  const effortItems = [
    { id: DEFAULT, label: t('ai.operations.row.effortDefault') },
    ...(model?.effort_choices ?? []).map((level) => ({ id: level, label: level })),
  ];
  const thinkingItems = [
    { id: DEFAULT, label: t('ai.operations.row.thinkingDefault') },
    ...(model?.thinking_off_available ? [{ id: 'off', label: t('ai.operations.row.thinkingOff') }] : []),
  ];

  function edit(next: Draft) {
    setDroppedEffort(null);
    onChange(next);
  }

  function saved() {
    onDrop();
    void queryClient.invalidateQueries({ queryKey: aiKeys.status() });
    showToast(t('ai.operations.row.saved'));
  }

  /** The reply to our own save may have been lost: if the row on the server now equals the screen, it did land (design §4.6). */
  async function afterConflict() {
    try {
      const fresh = await queryClient.fetchQuery({ queryKey: aiKeys.operations(), queryFn: () => listOperations(api), staleTime: 0 });
      const row = fresh.items.find((item) => item.operation === op);
      if (row && sameDraft(toDraft(row), draft)) saved();
      else setConflict(true);
    } catch (e) {
      setBanner(errorDetails(e));
    }
  }

  function showFailure(e: unknown) {
    const violations = e instanceof ApiError
      ? (e.problem.violations ?? []).map((v) => {
          const key = thinkingViolationKey(v);
          return key ? `thinking: ${t(`ai.operations.row.${THINKING_COPY[key]}`)}` : v;
        })
      : [];
    const mapped = violationsToFields(violations, (path) => (FIELD_OF_PATH[path] ? id(FIELD_OF_PATH[path]) : null));
    const hasFields = Object.keys(mapped.fields).length > 0;
    if (hasFields) setErrors(mapped.fields);
    if (!hasFields || mapped.form.length > 0) {
      const details = errorDetails(e);
      setBanner(mapped.form.length > 0 ? { ...details, message: [details.message, ...mapped.form].join(' ') } : details);
    }
  }

  async function save() {
    if (busy.current || conflict) return;
    // Cleared first (and committed), so a second failure on the same field moves focus there again.
    flushSync(() => {
      setErrors({});
      setBanner(null);
    });
    busy.current = true;
    setPending(true);
    try {
      const result = await saveOperation(api, op, toBody(draft, setting.version));
      queryClient.setQueryData<{ items: AiOperationSetting[] }>(aiKeys.operations(), (old) =>
        old && { items: old.items.map((item) => (item.operation === op ? result : item)) },
      );
      saved();
    } catch (e) {
      if (e instanceof ApiError && e.problem.slug === 'operation-settings-conflict') await afterConflict();
      else showFailure(e);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function reload() {
    setConflict(false);
    onDrop();
    void queryClient.invalidateQueries({ queryKey: aiKeys.operations() });
  }

  return (
    <div role="group" aria-label={t('ai.operations.row.rowLabel', { name, operation: op })} className="flex flex-col gap-4 rounded-panel border-2 border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="font-semibold text-ink">{name}</span>
          <code className="text-xs text-muted wrap-anywhere">{op}</code>
        </span>
        <Button
          type="button"
          onPress={() => void save()}
          isPending={pending}
          isDisabled={!dirty || conflict}
          aria-label={t('ai.operations.row.saveFor', { operation: op })}
        >
          {t('ai.operations.row.save')}
        </Button>
      </div>
      {conflict && (
        <Banner variant="error" action={<Button variant="secondary" onPress={reload}>{t('ai.operations.row.reload')}</Button>}>
          {t('errors.operation-settings-conflict')}
        </Banner>
      )}
      {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
      <div className="grid gap-4 shell:grid-cols-2 panel:grid-cols-4">
        <Select
          id={id('model')}
          label={t('ai.operations.row.model')}
          items={modelItems}
          value={draft.modelId ?? NONE}
          onChange={(value) => {
            const next = switchModel(draft, value === NONE ? null : value, models);
            onChange(next.draft);
            setDroppedEffort(next.droppedEffort);
          }}
          error={errors[id('model')]}
        />
        <div className="flex flex-col gap-1">
          <Select
            id={id('effort')}
            label={t('ai.operations.row.effort')}
            items={effortItems}
            value={draft.effort ?? DEFAULT}
            onChange={(value) => edit({ ...draft, effort: value === DEFAULT ? null : value })}
            isDisabled={model === undefined}
            error={errors[id('effort')]}
          />
          {droppedEffort && <p className="text-xs text-muted">{t('ai.operations.row.effortDropped', { effort: droppedEffort })}</p>}
        </div>
        <Select
          id={id('thinking')}
          label={t('ai.operations.row.thinking')}
          items={thinkingItems}
          value={draft.thinking ?? DEFAULT}
          onChange={(value) => edit({ ...draft, thinking: value === 'off' ? 'off' : null })}
          isDisabled={model === undefined}
          error={errors[id('thinking')]}
        />
        <NumberField
          id={id('tokens')}
          label={t('ai.operations.row.maxTokens')}
          value={draft.tokens}
          onChange={(tokens) => edit({ ...draft, tokens })}
          isNullable
          minValue={1}
          maxValue={model?.max_output_tokens ?? TOKENS_CEILING}
          error={errors[id('tokens')]}
        />
      </div>
    </div>
  );
}
