import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslations } from 'use-intl';
import { useFocusFirstError, violationsToFields } from '../../../api/field-errors';
import { ApiError } from '../../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../../api/use-error-message';
import { userLabel } from '../../../api/user-ref';
import { useDirtyForm } from '../../../app/dirty-form';
import { useApi } from '../../../auth/session-context';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { Checkbox } from '../../../ui/Checkbox';
import { ListState } from '../../../ui/ListState';
import { NumberField } from '../../../ui/NumberField';
import { Select } from '../../../ui/Select';
import { Switch } from '../../../ui/Switch';
import { TextArea } from '../../../ui/TextArea';
import { TextField } from '../../../ui/TextField';
import { showToast } from '../../../ui/Toast';
import {
  AI_OPERATION_ORDER, aiKeys, createJudge, listJudgeRevisions, listJudges, saveJudge, type AiModel, type Judge, type JudgeRevision, type SaveJudgeBody,
} from '../ai-api';
import { modelChoices } from '../model-choices';
import { thinkingViolationKey } from '../operation-violations';
import { EXAMPLES_MAX, INSTRUCTIONS_FIELD, emptyExample, inputFieldId, outputFieldId, type FormExample } from '../prompt-form';
import { useAiFormat } from '../useAiFormat';
import {
  CRITERIA_MAX, JUDGE_IDS, JUDGE_INPUT_FIELDS, criterionFieldId, emptyJudgeForm, judgeFieldOfViolation, judgeFieldOrder, sameJudgeForm, sortedOperations,
  switchJudgeModel, toJudgeBody, toJudgeForm, type JudgeForm,
} from './judge-form';

const NONE = '__none';
const DEFAULT = '__default';
/** The API's limits (`ai.constants.ts`): the text counts but does not stop typing; a model with no limit of its own is capped. */
const INSTRUCTIONS_MAX = 8000;
const NAME_MAX = 100;
const QUESTION_MAX = 500;
const CODE_MAX = 40;
const TOKENS_CEILING = 128_000;
/** API violation texts with their own copy; the others are shown as the API wrote them. */
const VIOLATION_COPY: Record<string, string> = {
  'instructions: Expected at most 8000 characters': 'tooLong',
  'instructions: Must not be blank': 'blank',
};
const THINKING_COPY = { cannotTurnOff: 'thinkingCannotOff', needsLowEffort: 'thinkingNeedsEffort' } as const;

type Props = {
  /** `null`: a new judge. The editor keeps its own copy of the judge and never takes a newer one by itself. */
  judge: Judge | null;
  models: AiModel[];
  onClose: () => void;
};

/**
 * One judge (nhóm B design §5.4): name, the operations it scores, its criteria, instructions, examples and model. Saving a changed revision field
 * adds a revision (the newest is the one in use); a change of the name, the operations or the switch alone adds none. "Chỉ Anthropic" is the API's
 * rule (a `fake` model only while the fake provider is on), so the model select leaves OpenAI out and the API still has the last word.
 */
export function JudgeEditor({ judge, models, onClose }: Props) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  /** The judge the editor builds on: what [Lưu bản mới] sends the revision of, and what "unsaved" compares with. */
  const [server, setServer] = useState<Judge | null>(judge);
  const base = useMemo(() => (server ? toJudgeForm(server) : emptyJudgeForm()), [server]);
  const [form, setForm] = useState<JudgeForm>(base);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  /** Set by a 409 `judge-revision-conflict`: somebody saved a newer revision meanwhile. */
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState(false);
  const [droppedEffort, setDroppedEffort] = useState<string | null>(null);
  const busy = useRef(false);

  const dirty = !sameJudgeForm(form, base);
  useDirtyForm(dirty);
  useFocusFirstError(errors, judgeFieldOrder(form));

  const model = models.find((m) => m.id === form.model_ref);
  const providerName = (m: { provider: AiModel['provider']; model_id: string }) => `${t(`ai.providers.${m.provider}`)} · ${m.model_id}`;
  const selectedId = server?.latest.model?.id ?? null;
  // A judge is Anthropic's alone (D3), and the fake while it is on: OpenAI models stay out. The judge's own newest model stays whatever it is (B50).
  const choices = modelChoices(models, selectedId).filter((m) => m.id === selectedId || m.provider !== 'openai');
  const modelItems = [
    { id: NONE, label: t('ai.operations.row.noModel') },
    ...choices.map((m) => ({ id: m.id, label: providerName(m) })),
    ...(server?.latest.model && !choices.some((m) => m.id === server.latest.model?.id) ? [{ id: server.latest.model.id, label: providerName(server.latest.model) }] : []),
  ];
  const effortItems = [{ id: DEFAULT, label: t('ai.operations.row.effortDefault') }, ...(model?.effort_choices ?? []).map((level) => ({ id: level, label: level }))];
  const thinkingItems = [
    { id: DEFAULT, label: t('ai.operations.row.thinkingDefault') },
    ...(model?.thinking_off_available ? [{ id: 'off', label: t('ai.operations.row.thinkingOff') }] : []),
  ];

  const set = (patch: Partial<JudgeForm>) => setForm((prev) => ({ ...prev, ...patch }));
  const setCriterion = (index: number, patch: Partial<JudgeForm['criteria'][number]>) =>
    setForm((prev) => ({ ...prev, criteria: prev.criteria.map((criterion, i) => (i === index ? { ...criterion, ...patch } : criterion)) }));
  const setExample = (index: number, next: FormExample) =>
    setForm((prev) => ({ ...prev, examples: prev.examples.map((example, i) => (i === index ? next : example)) }));

  function showViolations(violations: string[]) {
    const texts = violations.map((violation) => {
      if (VIOLATION_COPY[violation]) return `instructions: ${t(`ai.prompts.errors.${VIOLATION_COPY[violation]}`)}`;
      const key = thinkingViolationKey(violation);
      return key ? `thinking: ${t(`ai.operations.row.${THINKING_COPY[key]}`)}` : violation;
    });
    const mapped = violationsToFields(texts, (path) => judgeFieldOfViolation(path, form));
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
    const built = toJudgeBody(form, server?.latest.revision);
    if (!built.ok) {
      setErrors(Object.fromEntries(built.badOutputs.map((index) => [outputFieldId(index), t('ai.prompts.errors.outputJson')])));
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      const result = server ? await saveJudge(api, server.id, built.body as SaveJudgeBody) : await createJudge(api, built.body);
      void queryClient.invalidateQueries({ queryKey: aiKeys.judges() });
      void queryClient.invalidateQueries({ queryKey: aiKeys.judgeRevisions(result.id) });
      void queryClient.invalidateQueries({ queryKey: aiKeys.judgeAgreement(result.id) });
      if (!server) {
        showToast(t('ai.judges.editor.created', { name: result.name }));
        onClose();
        return;
      }
      showToast(t(result.latest.revision === server.latest.revision ? 'ai.judges.editor.savedSame' : 'ai.judges.editor.saved', { revision: result.latest.revision }));
      setServer(result);
      setForm(toJudgeForm(result));
      setDroppedEffort(null);
    } catch (e) {
      if (e instanceof ApiError && e.problem.slug === 'judge-revision-conflict') setConflict(true);
      else if (e instanceof ApiError && e.problem.slug === 'judge-provider') setErrors({ [JUDGE_IDS.model]: t('errors.judge-provider') });
      else if (e instanceof ApiError && e.problem.slug === 'validation-failed') showViolations(e.problem.violations ?? []);
      else {
        // The judge is gone: the list reads again and drops this editor.
        if (e instanceof ApiError && e.problem.status === 404) void queryClient.invalidateQueries({ queryKey: aiKeys.judges() });
        setBanner(errorDetails(e));
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  /** [Tải bản mới]: the newest revision replaces the boxes (what was being edited is lost, and the hint says so). */
  async function reload() {
    try {
      const fresh = await queryClient.fetchQuery({ queryKey: aiKeys.judges(), queryFn: () => listJudges(api), staleTime: 0 });
      const found = fresh.items.find((item) => item.id === server?.id);
      if (!found) {
        onClose();
        return;
      }
      setServer(found);
      setForm(toJudgeForm(found));
      setErrors({});
      setBanner(null);
      setConflict(false);
      setDroppedEffort(null);
      void queryClient.invalidateQueries({ queryKey: aiKeys.judgeRevisions(found.id) });
    } catch (e) {
      setBanner(errorDetails(e));
    }
  }

  // The scroll lands on the editor when it opens (it sits under a list that can be long).
  const top = useRef<HTMLElement>(null);
  useEffect(() => {
    top.current?.scrollIntoView?.({ block: 'nearest' });
  }, []);

  return (
    <section ref={top} aria-labelledby="judge-editor" className="flex flex-col gap-6 rounded-panel border-2 border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <h2 id="judge-editor" className="text-lg font-bold text-ink wrap-anywhere">
            {server ? t('ai.judges.editor.title', { name: server.name }) : t('ai.judges.editor.titleNew')}
          </h2>
          {dirty && <span className="text-xs text-muted">{t('common.unsavedChanges')}</span>}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Button onPress={() => void save()} isPending={pending} isDisabled={!dirty || conflict}>
            {t(server ? 'ai.judges.editor.save' : 'ai.judges.editor.create')}
          </Button>
          <Button variant="secondary" onPress={onClose} isDisabled={pending}>{t('ai.judges.editor.close')}</Button>
        </span>
      </div>
      {conflict && (
        <Banner variant="error" action={<Button variant="secondary" onPress={() => void reload()}>{t('ai.judges.editor.reload')}</Button>}>
          <span className="block">{t('errors.judge-revision-conflict')}</span>
          <span className="block text-xs">{t('ai.judges.editor.reloadNote')}</span>
        </Banner>
      )}
      {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}

      <div className="flex min-w-0 flex-col gap-6">
        <div className="max-w-md">
          <TextField
            id={JUDGE_IDS.name}
            label={t('ai.judges.editor.name')}
            value={form.name}
            onChange={(name) => set({ name })}
            error={errors[JUDGE_IDS.name]}
            maxLength={NAME_MAX}
            isDisabled={pending}
          />
        </div>

        <div role="group" id={JUDGE_IDS.operations} aria-labelledby="judge-operations-label" className="flex flex-col gap-2">
          <span id="judge-operations-label" className="text-ui font-medium text-ink">{t('ai.judges.editor.operations')}</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {AI_OPERATION_ORDER.map((operation) => (
              <Checkbox
                key={operation}
                isSelected={form.operations.includes(operation)}
                isDisabled={pending}
                onChange={(on) => set({ operations: sortedOperations(on ? [...form.operations, operation] : form.operations.filter((o) => o !== operation)) })}
              >
                {t(`ai.operations.names.${operation}`)}
              </Checkbox>
            ))}
          </div>
          {errors[JUDGE_IDS.operations] && <p className="text-xs text-danger">{errors[JUDGE_IDS.operations]}</p>}
        </div>

        <Switch label={t('ai.judges.editor.active')} isSelected={form.active} onChange={(active) => set({ active })} isDisabled={pending} />

        <section aria-labelledby="judge-criteria" className="flex flex-col gap-3">
          <h3 id="judge-criteria" className="text-lg font-bold text-ink">{t('ai.judges.editor.criteria')}</h3>
          {form.criteria.map((criterion, index) => (
            <div
              key={index}
              role="group"
              aria-label={t('ai.judges.editor.criterion', { n: index + 1 })}
              className="flex min-w-0 flex-col gap-3 rounded-panel border-2 border-border p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">{t('ai.judges.editor.criterion', { n: index + 1 })}</span>
                <Button
                  variant="ghost"
                  aria-label={t('ai.judges.editor.removeCriterion', { n: index + 1 })}
                  isDisabled={pending || form.criteria.length === 1}
                  onPress={() => {
                    // Errors are keyed by position: after a removal they would land on the criterion that moved up.
                    setErrors({});
                    setForm((prev) => ({ ...prev, criteria: prev.criteria.filter((_, i) => i !== index) }));
                  }}
                >
                  {t('ai.prompts.remove')}
                </Button>
              </div>
              <div className="max-w-md">
                <TextField
                  id={criterionFieldId(index, 'code')}
                  label={t('ai.judges.editor.code')}
                  value={criterion.code}
                  onChange={(code) => setCriterion(index, { code })}
                  error={errors[criterionFieldId(index, 'code')]}
                  maxLength={CODE_MAX}
                  isDisabled={pending}
                  spellCheck={false}
                />
              </div>
              <TextArea
                id={criterionFieldId(index, 'question')}
                label={t('ai.judges.editor.question')}
                value={criterion.question}
                onChange={(question) => setCriterion(index, { question })}
                error={errors[criterionFieldId(index, 'question')]}
                maxLength={QUESTION_MAX}
                rows={2}
                isDisabled={pending}
              />
            </div>
          ))}
          <Button
            variant="secondary"
            className="self-start"
            isDisabled={pending || form.criteria.length >= CRITERIA_MAX}
            onPress={() => setForm((prev) => ({ ...prev, criteria: [...prev.criteria, { code: '', question: '' }] }))}
          >
            {t('ai.judges.editor.addCriterion')}
          </Button>
        </section>

        <div className="grid grid-cols-1 gap-4 shell:grid-cols-2 panel:grid-cols-4">
          <Select
            id={JUDGE_IDS.model}
            label={t('ai.judges.editor.model')}
            description={t('ai.judges.editor.modelHint')}
            items={modelItems}
            value={form.model_ref ?? NONE}
            onChange={(value) => {
              const next = switchJudgeModel(form, value === NONE ? null : value, models);
              setForm(next.form);
              setDroppedEffort(next.droppedEffort);
            }}
            error={errors[JUDGE_IDS.model]}
            isDisabled={pending}
          />
          <div className="flex flex-col gap-1">
            <Select
              id={JUDGE_IDS.effort}
              label={t('ai.operations.row.effort')}
              items={effortItems}
              value={form.effort ?? DEFAULT}
              onChange={(value) => {
                setDroppedEffort(null);
                set({ effort: value === DEFAULT ? null : value });
              }}
              isDisabled={model === undefined || pending}
              error={errors[JUDGE_IDS.effort]}
            />
            {droppedEffort && <p className="text-xs text-muted">{t('ai.operations.row.effortDropped', { effort: droppedEffort })}</p>}
          </div>
          <Select
            id={JUDGE_IDS.thinking}
            label={t('ai.operations.row.thinking')}
            items={thinkingItems}
            value={form.thinking ?? DEFAULT}
            onChange={(value) => set({ thinking: value === 'off' ? 'off' : null })}
            isDisabled={model === undefined || pending}
            error={errors[JUDGE_IDS.thinking]}
          />
          <NumberField
            id={JUDGE_IDS.tokens}
            label={t('ai.operations.row.maxTokens')}
            value={form.max_output_tokens === '' ? null : Number(form.max_output_tokens)}
            onChange={(tokens) => set({ max_output_tokens: tokens === null ? '' : String(tokens) })}
            isNullable
            minValue={1}
            maxValue={model?.max_output_tokens ?? TOKENS_CEILING}
            error={errors[JUDGE_IDS.tokens]}
            isDisabled={pending}
          />
        </div>

        <TextArea
          id={INSTRUCTIONS_FIELD}
          label={t('ai.judges.editor.instructions')}
          description={t('ai.prompts.instructionsHint')}
          value={form.instructions}
          onChange={(instructions) => set({ instructions })}
          error={errors[INSTRUCTIONS_FIELD]}
          maxLength={INSTRUCTIONS_MAX}
          counter
          rows={12}
          isDisabled={pending}
        />
        <p className="text-ui text-ink wrap-anywhere">{t('ai.prompts.inputFields', { fields: JUDGE_INPUT_FIELDS.join(', ') })}</p>

        <section aria-labelledby="judge-examples" className="flex flex-col gap-3">
          <h3 id="judge-examples" className="text-lg font-bold text-ink">{t('ai.judges.editor.examples')}</h3>
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
                    value={example.input[field]!}
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
            onPress={() => setForm((prev) => ({ ...prev, examples: [...prev.examples, emptyExample(JUDGE_INPUT_FIELDS)] }))}
          >
            {t('ai.prompts.addExample')}
          </Button>
        </section>
      </div>

      {server && <JudgeRevisions judgeId={server.id} />}
    </section>
  );
}

/** "Các bản": every revision of the judge, newest first, with who saved it and on which model. */
function JudgeRevisions({ judgeId }: { judgeId: string }) {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const query = useQuery({ queryKey: aiKeys.judgeRevisions(judgeId), queryFn: () => listJudgeRevisions(api, judgeId) });
  let body;
  if (query.isPending) body = <ListState state="loading" />;
  else if (query.isError) body = <p className="text-ui text-muted">{t('ai.judges.editor.historyFailed')}</p>;
  else {
    body = (
      <ul className="flex flex-col gap-1 text-ui text-ink">
        {query.data.items.map((revision: JudgeRevision) => (
          <li key={revision.id} className="wrap-anywhere">
            {t('ai.judges.editor.revision', {
              revision: revision.revision,
              date: format.dateTime(revision.saved_at),
              email: userLabel(revision.saved_by_user, t),
              model: revision.model ? `${t(`ai.providers.${revision.model.provider}`)} · ${revision.model.model_id}` : t('ai.judges.noModel'),
            })}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <section aria-labelledby="judge-history" className="flex flex-col gap-2">
      <h3 id="judge-history" className="text-lg font-bold text-ink">{t('ai.judges.editor.history')}</h3>
      {body}
    </section>
  );
}
