import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { useFocusFirstError, violationsToFields } from '../../../api/field-errors';
import { ApiError } from '../../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../../api/use-error-message';
import { useDirtyForm } from '../../../app/dirty-form';
import { useApi } from '../../../auth/session-context';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { NumberField } from '../../../ui/NumberField';
import { Select } from '../../../ui/Select';
import { TextArea } from '../../../ui/TextArea';
import { TextField } from '../../../ui/TextField';
import { showToast } from '../../../ui/Toast';
import {
  aiKeys, deleteDraft, getConfigs, saveDraft, testDraft, type AiModel, type AiOperation, type ConfigsView, type ConfigView, type EvalSet, type PromptRevision,
} from '../ai-api';
import { StartRunFailure, useStartRun } from '../EvalRunPanel';
import { modelChoices } from '../model-choices';
import { thinkingViolationKey } from '../operation-violations';
import { RevisionContent } from '../PromptHistory';
import {
  EXAMPLES_MAX, INSTRUCTIONS_FIELD, emptyExample, fieldOfViolation, fieldOrder, inputFieldId, outputFieldId, toForm, type FormExample,
} from '../prompt-form';
import { TestRunPanel } from '../TestRunPanel';
import { sameConfigForm, sameDraftContent, switchConfigModel, toConfigForm, toDraftBody, type ConfigForm } from './config-form';

const NONE = '__none';
const DEFAULT = '__default';
/** The API's limits (`ai.constants.ts`): the prompt text counts but does not stop typing; the note and a model with no limit of its own are capped. */
const INSTRUCTIONS_MAX = 8000;
const NOTE_MAX = 500;
const TOKENS_CEILING = 128_000;
const ID = { model: 'config-model', effort: 'config-effort', thinking: 'config-thinking', tokens: 'config-tokens', note: 'config-note' } as const;
const FIELD_OF_PATH: Record<string, string> = {
  model_ref: ID.model, effort: ID.effort, thinking: ID.thinking, max_output_tokens: ID.tokens, note: ID.note,
};
/** API violation texts with their own copy; the others are shown as the API wrote them. */
const VIOLATION_COPY: Record<string, string> = {
  'instructions: Expected at most 8000 characters': 'tooLong',
  'instructions: Must not be blank': 'blank',
};
const THINKING_COPY = { cannotTurnOff: 'thinkingCannotOff', needsLowEffort: 'thinkingNeedsEffort' } as const;
const textBlock = 'whitespace-pre-wrap wrap-anywhere rounded-inner bg-canvas p-3 text-ui text-ink';
const linkClass =
  'inline-flex min-h-control w-fit items-center whitespace-nowrap rounded-control px-4 text-ui font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-control-touch';

type Props = {
  op: AiOperation;
  /** The draft as the page read it; the editor then keeps its own copy (`server`) and never takes a newer one by itself. */
  initial: ConfigView;
  inputFields: string[];
  guard: string;
  models: AiModel[];
  /** The newest frozen version of the operation's example set: what [Chạy bộ ví dụ với nháp] runs; null when none was frozen yet. */
  newestSet: EvalSet | null;
  /** The page's history list copies a revision into the form through this. */
  copyRef: { current: ((revision: PromptRevision) => void) | null };
};

/**
 * The draft of an operation's config (nhóm B design §6.2): prompt, examples, model, effort, thinking, token limit and a note, saved to the
 * server with `expected_version`. A test run and a run of the example set work on the saved draft, so both wait for a save.
 */
export function DraftEditor({ op, initial, inputFields, guard, models, newestSet, copyRef }: Props) {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  /** The draft the editor builds on: what [Lưu nháp] sends the version of, and what "unsaved" compares with. */
  const [server, setServer] = useState(initial);
  const base = useMemo(() => toConfigForm(server, inputFields), [server, inputFields]);
  const [form, setForm] = useState<ConfigForm>(base);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  /** Set by a 409 that was not our own save; `fresh` is the newer draft, when it could be read. */
  const [conflict, setConflict] = useState<{ fresh: ConfigView | null } | null>(null);
  const [newer, setNewer] = useState<ConfigView | null>(null);
  const [pending, setPending] = useState(false);
  const [droppedEffort, setDroppedEffort] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const busy = useRef(false);

  const dirty = !sameConfigForm(form, base);
  useDirtyForm(dirty);
  useFocusFirstError(errors, [ID.note, ID.model, ID.effort, ID.thinking, ID.tokens, ...fieldOrder(form)]);

  const model = models.find((m) => m.id === form.model_ref);
  const providerName = (m: { provider: AiModel['provider']; model_id: string }) => `${t(`ai.providers.${m.provider}`)} · ${m.model_id}`;
  const choices = modelChoices(models, server.model?.id ?? null);
  const modelItems = [
    { id: NONE, label: t('ai.operations.row.noModel') },
    ...choices.map((m) => ({ id: m.id, label: providerName(m) })),
    ...(server.model && !choices.some((m) => m.id === server.model?.id) ? [{ id: server.model.id, label: providerName(server.model) }] : []),
  ];
  const effortItems = [
    { id: DEFAULT, label: t('ai.operations.row.effortDefault') },
    ...(model?.effort_choices ?? []).map((level) => ({ id: level, label: level })),
  ];
  const thinkingItems = [
    { id: DEFAULT, label: t('ai.operations.row.thinkingDefault') },
    ...(model?.thinking_off_available ? [{ id: 'off', label: t('ai.operations.row.thinkingOff') }] : []),
  ];

  const setExample = (index: number, next: FormExample) =>
    setForm((prev) => ({ ...prev, examples: prev.examples.map((example, i) => (i === index ? next : example)) }));

  useEffect(() => {
    copyRef.current = (revision) => {
      setErrors({});
      setForm((prev) => ({ ...prev, ...toForm(revision, inputFields) }));
    };
    return () => {
      copyRef.current = null;
    };
  }, [copyRef, inputFields]);

  function saved(result: ConfigView) {
    queryClient.setQueryData<ConfigsView>(aiKeys.configs(op), (old) => old && { ...old, draft: result });
    setServer(result);
    setForm(toConfigForm(result, inputFields));
    setErrors({});
    setBanner(null);
    setConflict(null);
    setNewer(null);
    setDroppedEffort(null);
    showToast(t('ai.configs.draft.saved', { version: result.version }));
  }

  /** The reply to our own save may have been lost: if the newer draft is exactly what we sent, it did land (design §4.6). */
  async function afterConflict(sent: Parameters<typeof sameDraftContent>[1]) {
    try {
      const fresh = await queryClient.fetchQuery({ queryKey: aiKeys.configs(op), queryFn: () => getConfigs(api, op), staleTime: 0 });
      const draft = fresh.draft;
      if (draft && draft.id === server.id && draft.version === server.version + 1 && sameDraftContent(draft, sent)) saved(draft);
      else setConflict({ fresh: draft });
    } catch (e) {
      setConflict({ fresh: null });
      setBanner(errorDetails(e));
    }
  }

  function showViolations(violations: string[]) {
    const texts = violations.map((violation) => {
      if (VIOLATION_COPY[violation]) return `instructions: ${t(`ai.prompts.errors.${VIOLATION_COPY[violation]}`)}`;
      const key = thinkingViolationKey(violation);
      return key ? `thinking: ${t(`ai.operations.row.${THINKING_COPY[key]}`)}` : violation;
    });
    const mapped = violationsToFields(texts, (path) => FIELD_OF_PATH[path] ?? fieldOfViolation(path, form));
    setErrors(mapped.fields);
    if (mapped.form.length > 0 || Object.keys(mapped.fields).length === 0) setBanner({ message: [t('errors.validation-failed'), ...mapped.form].join(' '), code: null });
  }

  async function save() {
    if (busy.current || conflict) return;
    // Cleared first (and committed), so a repeated failure on the same field moves focus there again.
    flushSync(() => {
      setErrors({});
      setBanner(null);
    });
    const built = toDraftBody(form, server.version);
    if (!built.ok) {
      setErrors(Object.fromEntries(built.badOutputs.map((index) => [outputFieldId(index), t('ai.prompts.errors.outputJson')])));
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      saved(await saveDraft(api, op, built.body));
    } catch (e) {
      if (e instanceof ApiError && e.problem.slug === 'draft-version-conflict') await afterConflict(built.body);
      else if (e instanceof ApiError && e.problem.slug === 'few-shot-invalid') {
        const fields = Object.fromEntries(
          (e.problem.examples ?? []).map((entry) => [
            outputFieldId(entry.index), t('ai.configs.draft.fewShotInvalid', { n: entry.index + 1, problems: entry.problems.join(', ') }),
          ]),
        );
        if (Object.keys(fields).length > 0) setErrors(fields);
        else setBanner(errorDetails(e));
      } else if (e instanceof ApiError && e.problem.slug === 'validation-failed') showViolations(e.problem.violations ?? []);
      else {
        // The draft is gone (deleted by someone else, or published): the page reads again and drops this editor.
        if (e instanceof ApiError && e.problem.status === 404) void queryClient.invalidateQueries({ queryKey: aiKeys.configs(op) });
        setBanner(errorDetails(e));
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  /** [Tải bản mới]: build on the newer draft (so [Lưu nháp] can save over it) and show it beside the text being edited. */
  async function loadNewer() {
    let fresh = conflict?.fresh ?? null;
    if (!fresh) {
      try {
        fresh = (await queryClient.fetchQuery({ queryKey: aiKeys.configs(op), queryFn: () => getConfigs(api, op), staleTime: 0 })).draft;
      } catch (e) {
        setBanner(errorDetails(e));
        return;
      }
    }
    if (!fresh) return;
    setBanner(null);
    setServer(fresh);
    setNewer(fresh);
    setConflict(null);
  }

  const remove = useMutation({
    mutationFn: () => deleteDraft(api, op),
    onMutate: () => setBanner(null),
    onSuccess: () => {
      setDeleting(false);
      queryClient.setQueryData<ConfigsView>(aiKeys.configs(op), (old) => old && { ...old, draft: null });
      showToast(t('ai.configs.draft.deleted'));
    },
    onError: (e) => {
      setDeleting(false);
      if (e instanceof ApiError && e.problem.slug === 'draft-busy') setBanner({ message: t('ai.configs.draft.busy'), code: null });
      else {
        if (e instanceof ApiError && e.problem.status === 404) void queryClient.invalidateQueries({ queryKey: aiKeys.configs(op) });
        setBanner(errorDetails(e));
      }
    },
  });

  // The run takes the saved draft, so the same press a second time is a second run: the fingerprint moves with the draft and the version.
  const start = useStartRun(op, `draft:${server.id}:${server.version}:${newestSet?.id ?? 'none'}`, (id) => void navigate(`/ai/eval/runs/${id}?op=${op}`));
  const sendTest = (exampleIds: string[]) => testDraft(api, op, exampleIds.length > 0 ? { example_ids: exampleIds } : {});

  return (
    <section aria-labelledby="config-draft" className="flex flex-col gap-6 rounded-panel border-2 border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <h2 id="config-draft" className="text-lg font-bold text-ink">
            {t('ai.configs.draft.title', { number: server.number, version: server.version })}
          </h2>
          {dirty && <span className="text-xs text-muted">{t('common.unsavedChanges')}</span>}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Button onPress={() => void save()} isPending={pending} isDisabled={!dirty || conflict !== null}>
            {t('ai.configs.draft.save')}
          </Button>
          <Button variant="secondary" onPress={() => setDeleting(true)}>{t('ai.configs.draft.delete')}</Button>
        </span>
      </div>
      {conflict && (
        <Banner variant="error" action={<Button variant="secondary" onPress={() => void loadNewer()}>{t('ai.configs.draft.reload')}</Button>}>
          {t('ai.configs.draft.conflict')}
        </Banner>
      )}
      {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}

      <div className={`grid min-w-0 gap-6 ${newer ? 'panel:grid-cols-2' : ''}`}>
        <div className="flex min-w-0 flex-col gap-6">
          <TextField
            id={ID.note}
            label={t('ai.configs.draft.note')}
            value={form.note}
            onChange={(note) => setForm((prev) => ({ ...prev, note }))}
            error={errors[ID.note]}
            maxLength={NOTE_MAX}
            isDisabled={pending}
          />
          <div className="grid grid-cols-1 gap-4 shell:grid-cols-2 panel:grid-cols-4">
            <Select
              id={ID.model}
              label={t('ai.operations.row.model')}
              items={modelItems}
              value={form.model_ref ?? NONE}
              onChange={(value) => {
                const next = switchConfigModel(form, value === NONE ? null : value, models);
                setForm(next.form);
                setDroppedEffort(next.droppedEffort);
              }}
              error={errors[ID.model]}
              isDisabled={pending}
            />
            <div className="flex flex-col gap-1">
              <Select
                id={ID.effort}
                label={t('ai.operations.row.effort')}
                items={effortItems}
                value={form.effort ?? DEFAULT}
                onChange={(value) => {
                  setDroppedEffort(null);
                  setForm((prev) => ({ ...prev, effort: value === DEFAULT ? null : value }));
                }}
                isDisabled={model === undefined || pending}
                error={errors[ID.effort]}
              />
              {droppedEffort && <p className="text-xs text-muted">{t('ai.operations.row.effortDropped', { effort: droppedEffort })}</p>}
            </div>
            <Select
              id={ID.thinking}
              label={t('ai.operations.row.thinking')}
              items={thinkingItems}
              value={form.thinking ?? DEFAULT}
              onChange={(value) => setForm((prev) => ({ ...prev, thinking: value === 'off' ? 'off' : null }))}
              isDisabled={model === undefined || pending}
              error={errors[ID.thinking]}
            />
            <NumberField
              id={ID.tokens}
              label={t('ai.operations.row.maxTokens')}
              value={form.max_output_tokens === '' ? null : Number(form.max_output_tokens)}
              onChange={(tokens) => setForm((prev) => ({ ...prev, max_output_tokens: tokens === null ? '' : String(tokens) }))}
              isNullable
              minValue={1}
              maxValue={model?.max_output_tokens ?? TOKENS_CEILING}
              error={errors[ID.tokens]}
              isDisabled={pending}
            />
          </div>

          <TextArea
            id={INSTRUCTIONS_FIELD}
            label={t('ai.prompts.instructions')}
            description={t('ai.prompts.instructionsHint')}
            value={form.instructions}
            onChange={(instructions) => setForm((prev) => ({ ...prev, instructions }))}
            error={errors[INSTRUCTIONS_FIELD]}
            maxLength={INSTRUCTIONS_MAX}
            counter
            rows={12}
            isDisabled={pending}
          />
          <p className="text-ui text-ink wrap-anywhere">{t('ai.prompts.inputFields', { fields: inputFields.join(', ') })}</p>

          <section aria-labelledby="config-examples" className="flex flex-col gap-3">
            <h3 id="config-examples" className="text-lg font-bold text-ink">{t('ai.prompts.examples', { count: form.examples.length })}</h3>
            <p className="text-ui text-muted">{t('ai.prompts.examplesHint')} {t('ai.prompts.fieldHint')}</p>
            {form.examples.map((example, index) => (
              <div
                key={index}
                role="group"
                aria-label={t('ai.prompts.example', { n: index + 1 })}
                className="flex min-w-0 flex-col gap-3 rounded-panel border-2 border-border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{t('ai.prompts.example', { n: index + 1 })}</span>
                  <Button
                    variant="ghost"
                    aria-label={t('ai.prompts.removeExample', { n: index + 1 })}
                    isDisabled={pending}
                    onPress={() => {
                      // Errors are keyed by position: after a removal they would land on the example that moved up.
                      setErrors({});
                      setForm((prev) => ({ ...prev, examples: prev.examples.filter((_, i) => i !== index) }));
                    }}
                  >
                    {t('ai.prompts.remove')}
                  </Button>
                </div>
                <div className="grid min-w-0 gap-3 shell:grid-cols-2">
                  {Object.keys(example.input).map((field) => (
                    <TextField
                      key={field}
                      id={inputFieldId(index, field)}
                      label={field}
                      value={example.input[field]}
                      onChange={(text) => setExample(index, { ...example, input: { ...example.input, [field]: text } })}
                      error={errors[inputFieldId(index, field)]}
                      isDisabled={pending}
                      spellCheck={false}
                    />
                  ))}
                </div>
                <TextArea
                  id={outputFieldId(index)}
                  label={t('ai.prompts.output')}
                  value={example.output}
                  onChange={(output) => setExample(index, { ...example, output })}
                  error={errors[outputFieldId(index)]}
                  rows={5}
                  isDisabled={pending}
                  spellCheck={false}
                />
              </div>
            ))}
            <Button
              variant="secondary"
              className="self-start"
              isDisabled={pending || form.examples.length >= EXAMPLES_MAX}
              onPress={() => setForm((prev) => ({ ...prev, examples: [...prev.examples, emptyExample(inputFields)] }))}
            >
              {t('ai.prompts.addExample')}
            </Button>
          </section>

          <div className="flex flex-col gap-1">
            <span className="text-ui font-medium text-ink">{t('ai.prompts.guard')}</span>
            <p lang="en" className={textBlock}>{guard}</p>
          </div>
        </div>

        {newer && (
          <section aria-labelledby="config-newer" className="flex min-w-0 flex-col gap-3 rounded-panel border-2 border-border p-4">
            <h3 id="config-newer" className="text-lg font-bold text-ink">{t('ai.configs.draft.newerTitle', { version: newer.version })}</h3>
            <RevisionContent instructions={newer.instructions} examples={newer.examples} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onPress={() => {
                  setErrors({});
                  setForm(toConfigForm(newer, inputFields));
                }}
              >
                {t('ai.prompts.copyToEditor')}
              </Button>
              <Button variant="ghost" onPress={() => setNewer(null)}>{t('ai.prompts.hideNewer')}</Button>
            </div>
          </section>
        )}
      </div>

      {dirty && <p className="text-ui text-ink">{t('ai.configs.draft.saveFirst')}</p>}
      <TestRunPanel op={op} send={sendTest} note={t('ai.configs.draft.testNote')} isDisabled={dirty} />

      <section aria-labelledby="config-run-set" className="flex flex-col gap-3 rounded-panel border-2 border-border p-4">
        <h3 id="config-run-set" className="text-lg font-bold text-ink">{t('ai.eval.run.title')}</h3>
        {newestSet ? (
          <p className="text-ui text-muted">{t('ai.configs.draft.runSetNote', { version: newestSet.version })}</p>
        ) : (
          <Banner variant="info" action={<Link to={`/ai/eval?op=${op}`} className={linkClass}>{t('nav.aiEval')}</Link>}>
            {t('ai.configs.publish.noSet')}
          </Banner>
        )}
        <Button
          variant="secondary"
          className="self-start"
          isPending={start.pending}
          isDisabled={dirty || !newestSet || start.waitSeconds > 0}
          onPress={() => newestSet && start.start({ config: 'draft', set_id: newestSet.id })}
        >
          {start.waitSeconds > 0 ? t('ai.eval.run.wait', { seconds: start.waitSeconds }) : t('ai.configs.draft.runSet')}
        </Button>
        <StartRunFailure action={start} />
      </section>

      <ConfirmDialog
        isOpen={deleting}
        title={t('ai.configs.draft.deleteConfirm', { number: server.number })}
        confirmLabel={t('ai.configs.draft.delete')}
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setDeleting(false)}
      >
        {t('ai.configs.draft.deleteBody')}
      </ConfirmDialog>
    </section>
  );
}
