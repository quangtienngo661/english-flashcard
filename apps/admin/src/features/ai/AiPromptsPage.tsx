import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslations } from 'use-intl';
import { useFocusFirstError, violationsToFields } from '../../api/field-errors';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useKeptDraft } from '../../api/use-kept-draft';
import { useUrlFilters } from '../../api/use-url-filters';
import { userLabel } from '../../api/user-ref';
import { useDirtyForm } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ListState } from '../../ui/ListState';
import { RestoreDraftBanner } from '../../ui/RestoreDraftBanner';
import { Select } from '../../ui/Select';
import { TextArea } from '../../ui/TextArea';
import { TextField } from '../../ui/TextField';
import { showToast } from '../../ui/Toast';
import { AI_OPERATION_ORDER, aiKeys, getPrompt, savePrompt, type AiOperation, type PromptExample, type PromptView } from './ai-api';
import {
  EXAMPLES_MAX, INSTRUCTIONS_FIELD, emptyExample, fieldOfViolation, fieldOrder, inputFieldId, isPromptForm, outputFieldId, sameForm, samePrompt,
  toForm, toPayload, type FormExample, type PromptForm,
} from './prompt-form';
import { PromptHistory, RevisionContent } from './PromptHistory';
import { TestRunPanel } from './TestRunPanel';
import { useAiFormat } from './useAiFormat';

/** The API's limit (`ai.constants.ts` PROMPT_INSTRUCTIONS_MAX); the counter shows it, typing past it is allowed (design §6.4). */
const INSTRUCTIONS_MAX = 8000;
const FILTERS = { op: { default: 'generate_cloze', valid: (value: string) => (AI_OPERATION_ORDER as readonly string[]).includes(value) } };
/** API violation texts with their own copy; the others are shown as the API wrote them. */
const VIOLATION_COPY: Record<string, string> = {
  'instructions: Expected at most 8000 characters': 'tooLong',
  'instructions: Must not be blank': 'blank',
};
const textBlock = 'whitespace-pre-wrap wrap-anywhere rounded-inner bg-canvas p-3 text-ui text-ink';

/** A/82 `/ai/prompts?op=` (admin only): the instructions and examples of one AI operation, its history and test runs. */
export function AiPromptsPage() {
  const t = useTranslations();
  const api = useApi();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const op = filters.op as AiOperation;
  const prompt = useQuery({ queryKey: aiKeys.prompt(op), queryFn: () => getPrompt(api, op) });
  const items = AI_OPERATION_ORDER.map((id) => ({ id, label: `${t(`ai.operations.names.${id}`)} (${id})` }));

  let body;
  if (prompt.isError && !prompt.data) {
    body = prompt.error instanceof ApiError && prompt.error.problem.slug === 'forbidden'
      ? <Banner variant="error">{t('errors.forbidden')}</Banner>
      : <ListState state="error" onRetry={() => void prompt.refetch()} />;
  } else if (!prompt.data) body = <ListState state="loading" />;
  // Keyed by operation: switching never carries one operation's edits (or kept draft) into another's.
  else body = <PromptEditor key={op} op={op} prompt={prompt.data} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full max-w-sm">
        <Select label={t('ai.prompts.operation')} items={items} value={op} onChange={(value) => setFilters({ op: value })} />
      </div>
      {body}
    </div>
  );
}

function PromptEditor({ op, prompt }: { op: AiOperation; prompt: PromptView }) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const format = useAiFormat();
  /** The revision the editor builds on: what [Lưu] sends as `expected_revision`, and what "unsaved" compares with. */
  const [server, setServer] = useState(prompt);
  const base = useMemo(() => toForm(server, server.input_fields), [server]);
  const [form, setForm] = useState<PromptForm>(base);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  /** Set by a 409 that was not our own save; `fresh` is the newer prompt, when it could be read. */
  const [conflict, setConflict] = useState<{ fresh: PromptView | null } | null>(null);
  const [newer, setNewer] = useState<PromptView | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  const dirty = !sameForm(form, base);
  const kept = useKeptDraft<unknown>(`ai-prompt:${op}`, form, dirty);
  useDirtyForm(dirty, { onLeave: kept.clear });
  const [draftAnswered, setDraftAnswered] = useState(false);
  const offered = !draftAnswered && !dirty && isPromptForm(kept.kept) && !sameForm(kept.kept, base) ? kept.kept : null;
  useFocusFirstError(errors, fieldOrder(form));

  const setExample = (index: number, next: FormExample) =>
    setForm((prev) => ({ ...prev, examples: prev.examples.map((example, i) => (i === index ? next : example)) }));

  /** Clears the old errors (committed, so a repeated failure refocuses its field), then the body or null when an output is not JSON. */
  function prepare(): { instructions: string; examples: PromptExample[] } | null {
    flushSync(() => {
      setErrors({});
      setBanner(null);
    });
    const payload = toPayload(form);
    if (!payload.ok) {
      setErrors(Object.fromEntries(payload.badOutputs.map((index) => [outputFieldId(index), t('ai.prompts.errors.outputJson')])));
      return null;
    }
    return payload.body;
  }

  function showViolations(violations: string[]): string[] {
    const texts = violations.map((v) => (VIOLATION_COPY[v] ? `instructions: ${t(`ai.prompts.errors.${VIOLATION_COPY[v]}`)}` : v));
    const mapped = violationsToFields(texts, (path) => fieldOfViolation(path, form));
    setErrors(mapped.fields);
    return mapped.form;
  }

  function saved(result: PromptView) {
    queryClient.setQueryData(aiKeys.prompt(op), result);
    void queryClient.invalidateQueries({ queryKey: aiKeys.revisions(op) });
    setServer(result);
    setForm(toForm(result, result.input_fields));
    setConflict(null);
    setNewer(null);
    kept.clear();
    showToast(t('ai.prompts.saved', { revision: result.revision }));
  }

  /** Reads the newest revision; the history list is read again too, since someone else's save is not in it yet. */
  const readFresh = async () => {
    const fresh = await queryClient.fetchQuery({ queryKey: aiKeys.prompt(op), queryFn: () => getPrompt(api, op), staleTime: 0 });
    void queryClient.invalidateQueries({ queryKey: aiKeys.revisions(op) });
    return fresh;
  };

  /** The reply to our own save may have been lost: if the newer revision is exactly what we sent, it did land (design §4.6). */
  async function afterConflict(sent: { instructions: string; examples: PromptExample[] }) {
    try {
      const fresh = await readFresh();
      if (samePrompt(fresh, sent)) saved(fresh);
      else setConflict({ fresh });
    } catch (e) {
      setConflict({ fresh: null });
      setBanner(errorDetails(e));
    }
  }

  async function save() {
    if (busy.current || conflict) return;
    const body = prepare();
    if (!body) return;
    busy.current = true;
    setPending(true);
    try {
      saved(await savePrompt(api, op, { expected_revision: server.revision, ...body }));
    } catch (e) {
      if (e instanceof ApiError && e.problem.slug === 'prompt-revision-conflict') await afterConflict(body);
      else if (e instanceof ApiError && e.problem.slug === 'validation-failed') {
        const rest = showViolations(e.problem.violations ?? []);
        if (rest.length > 0) setBanner({ message: [t('errors.validation-failed'), ...rest].join(' '), code: null });
      } else setBanner(errorDetails(e));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  /** [Tải bản mới]: build on the newer revision (so [Lưu] can save over it) and show it beside the text being edited. */
  async function loadNewer() {
    let fresh = conflict?.fresh ?? null;
    if (!fresh) {
      try {
        fresh = await readFresh();
      } catch (e) {
        setBanner(errorDetails(e));
        return;
      }
    }
    setBanner(null);
    setServer(fresh);
    setNewer(fresh);
    setConflict(null);
  }

  const copy = (source: { instructions: string; examples: PromptExample[] }) => setForm(toForm(source, server.input_fields));

  return (
    <div className="flex flex-col gap-6">
      {offered && (
        <RestoreDraftBanner
          onRestore={() => {
            setForm(offered);
            kept.discard();
            setDraftAnswered(true);
          }}
          onDiscard={() => {
            kept.discard();
            setDraftAnswered(true);
          }}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="font-semibold text-ink">{t('ai.prompts.revision', { revision: server.revision })}</span>
          <span className="text-xs text-muted wrap-anywhere">
            {t('ai.prompts.updated', { at: format.dateTime(server.updated_at), by: userLabel(server.updated_by_user, t) })}
          </span>
        </span>
        <Button onPress={() => void save()} isPending={pending} isDisabled={!dirty || conflict !== null}>
          {t('ai.prompts.save')}
        </Button>
      </div>
      {conflict && (
        <Banner variant="error" action={<Button variant="secondary" onPress={() => void loadNewer()}>{t('ai.prompts.loadNewer')}</Button>}>
          {t('errors.prompt-revision-conflict')}
        </Banner>
      )}
      {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}

      <div className={`grid min-w-0 gap-6 ${newer ? 'panel:grid-cols-2' : ''}`}>
        <div className="flex min-w-0 flex-col gap-6">
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
          <p className="text-ui text-ink wrap-anywhere">{t('ai.prompts.inputFields', { fields: server.input_fields.join(', ') })}</p>

          <section aria-labelledby="prompt-examples" className="flex flex-col gap-3">
            <h2 id="prompt-examples" className="text-lg font-bold text-ink">{t('ai.prompts.examples', { count: form.examples.length })}</h2>
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
              onPress={() => setForm((prev) => ({ ...prev, examples: [...prev.examples, emptyExample(server.input_fields)] }))}
            >
              {t('ai.prompts.addExample')}
            </Button>
          </section>

          <div className="flex flex-col gap-1">
            <span className="text-ui font-medium text-ink">{t('ai.prompts.guard')}</span>
            <p lang="en" className={textBlock}>{server.guard}</p>
          </div>
        </div>

        {newer && (
          <section aria-labelledby="prompt-newer" className="flex min-w-0 flex-col gap-3 rounded-panel border-2 border-border p-4">
            <h2 id="prompt-newer" className="text-lg font-bold text-ink">{t('ai.prompts.newerTitle', { revision: newer.revision })}</h2>
            <RevisionContent instructions={newer.instructions} examples={newer.examples} />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onPress={() => copy(newer)}>{t('ai.prompts.copyToEditor')}</Button>
              <Button variant="ghost" onPress={() => setNewer(null)}>{t('ai.prompts.hideNewer')}</Button>
            </div>
          </section>
        )}
      </div>

      <TestRunPanel op={op} prepare={prepare} showViolations={showViolations} />
      <PromptHistory op={op} onCopy={copy} />
    </div>
  );
}
