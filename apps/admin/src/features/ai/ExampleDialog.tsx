import { useQueryClient } from '@tanstack/react-query';
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
import { Dialog } from '../../ui/Dialog';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
import { showToast } from '../../ui/Toast';
import { aiKeys, createExample, getForms, updateExample, type AiOperation, type EvalExample } from './ai-api';
import { expectedFields, expectedFromFields, fieldsFromExpected, type ExpectedField } from './expected-form';
import { fieldText, fieldValue } from './prompt-form';

/** The API's limit (`ai.constants.ts` EVAL_NOTE_MAX). */
const NOTE_MAX = 500;
const NOTE_FIELD = 'example-note';
const TOO_MANY = 'operation: at most 1000 examples';
const VERDICTS = ['ok', 'not_recognized'];
const inputId = (field: string) => `example-input-${field}`;
const expectedId = (field: ExpectedField) => `example-expected-${field}`;

type FillNote = { kind: 'filled'; count: number } | { kind: 'not-found' } | null;

type Props = {
  op: AiOperation;
  /** The operation's `input_fields`, in its order: one box each. */
  inputFields: string[];
  /** Absent: a new example (`/ai/eval/new`). */
  example?: EvalExample;
  onClose: () => void;
};

/**
 * A/83 add / edit an example: a box per input field of the operation (empty → null, a JSON list or object as that value), the expected
 * answer of the operation (nhóm B design §5.1) and a note. Mounted only while open, so a closed dialog keeps nothing. The 1001st
 * example of an operation is refused by the API (design §6.5).
 */
export function ExampleDialog({ op, inputFields, example, onClose }: Props) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const isNew = example === undefined;
  // The operation's fields first, then any other key an older example has, so nothing it holds is dropped on save.
  const fields = [...inputFields, ...Object.keys(example?.input ?? {}).filter((key) => !inputFields.includes(key))];
  const initial = Object.fromEntries(fields.map((field) => [field, fieldText(example?.input[field])]));
  const initialNote = example?.note ?? '';
  const expectedKeys = expectedFields(op);
  const initialExpected = fieldsFromExpected(op, example?.expected ?? null);
  const [input, setInput] = useState<Record<string, string>>(initial);
  const [note, setNote] = useState(initialNote);
  const [expected, setExpected] = useState<Record<string, string>>(initialExpected);
  /** Forms the admin typed or kept from a saved example are never replaced by the catalog's (design §5.1: only a box not edited is filled). */
  const [formsEdited, setFormsEdited] = useState((initialExpected.forms ?? '') !== '');
  const [fillNote, setFillNote] = useState<FillNote>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const lookup = useRef(0);

  const isDirty = note !== initialNote || fields.some((field) => input[field] !== initial[field]) || expectedKeys.some((key) => expected[key] !== initialExpected[key]);
  const requestClose = useDialogDirtyClose(isDirty, onClose);
  const order = [...fields.map(inputId), ...expectedKeys.map(expectedId), NOTE_FIELD];
  useFocusFirstError(errors, order);

  /** Leaving `word` or `part_of_speech` with both set: the catalog's forms go into a box the admin did not edit. A failed lookup stays silent (the box is typed by hand). */
  async function fillForms() {
    if (!expectedKeys.includes('forms') || formsEdited) return;
    const word = (input.word ?? '').trim();
    const partOfSpeech = (input.part_of_speech ?? '').trim();
    if (word === '' || partOfSpeech === '') return;
    const mine = ++lookup.current;
    try {
      const { forms } = await getForms(api, word, partOfSpeech);
      if (mine !== lookup.current) return;
      if (forms && forms.length > 0) {
        setExpected((prev) => ({ ...prev, forms: forms.join(', ') }));
        setFillNote({ kind: 'filled', count: forms.length });
      } else {
        setExpected((prev) => ({ ...prev, forms: '' }));
        setFillNote({ kind: 'not-found' });
      }
    } catch {
      if (mine === lookup.current) setFillNote(null);
    }
  }

  function boxOfViolation(path: string): string | null {
    if (path === 'note') return NOTE_FIELD;
    const inputField = /^input\.([A-Za-z_]+)/.exec(path)?.[1];
    if (inputField) return fields.includes(inputField) ? inputId(inputField) : null;
    const match = /^expected(?:\.([A-Za-z_]+))?/.exec(path);
    if (!match || expectedKeys.length === 0) return null;
    const key = expectedKeys.find((candidate) => candidate === match[1]) ?? expectedKeys[0];
    return expectedId(key);
  }

  async function submit() {
    if (busy.current) return;
    flushSync(() => {
      setErrors({});
      setBanner(null);
    });
    const value = Object.fromEntries(fields.map((field) => [field, fieldValue(input[field])]));
    const noteValue = note.trim() === '' ? null : note.trim();
    const answer = expectedFromFields(op, expected);
    const body = { input: value, note: noteValue, ...(answer ? { expected: answer } : {}) };
    busy.current = true;
    setPending(true);
    try {
      let toast = 'ai.eval.toast.saved';
      if (isNew) {
        const created = await createExample(api, { operation: op, ...body });
        toast = created.split === 'held_out' ? 'ai.eval.toast.addedHeldOut' : 'ai.eval.toast.added';
      } else await updateExample(api, example.id, body);
      await queryClient.invalidateQueries({ queryKey: aiKeys.examples(op) });
      showToast(t(toast));
      requestClose.release();
      onClose();
    } catch (e) {
      const problem = e instanceof ApiError ? e.problem : null;
      const violations = problem && (problem.slug === 'validation-failed' || problem.slug === 'expected-invalid') ? (problem.violations ?? []) : null;
      if (violations?.includes(TOO_MANY)) setBanner({ message: t('ai.eval.form.tooMany'), code: null });
      else if (violations) {
        const mapped = violationsToFields(violations, boxOfViolation);
        setErrors(mapped.fields);
        if (mapped.form.length > 0) setBanner({ message: [t('errors.validation-failed'), ...mapped.form].join(' '), code: null });
      } else setBanner(errorDetails(e));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function setBox(key: ExpectedField, text: string) {
    setExpected((prev) => ({ ...prev, [key]: text }));
  }

  const fillText = fillNote === null ? null
    : fillNote.kind === 'filled' ? t('ai.eval.form.expected.forms.filled', { count: fillNote.count })
    : t('ai.eval.form.expected.forms.notFound');

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !pending && requestClose()}
      isDismissable={!pending}
      title={t(isNew ? 'ai.eval.form.addTitle' : 'ai.eval.form.editTitle')}
      size="lg"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
      >
        {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
        <p className="text-ui text-muted wrap-anywhere">{t('ai.eval.form.fieldsHint', { fields: inputFields.join(', ') })}</p>
        <div className="grid min-w-0 gap-4 shell:grid-cols-2">
          {fields.map((field) => (
            <TextField
              key={field}
              id={inputId(field)}
              label={field}
              value={input[field]}
              onChange={(text) => setInput((prev) => ({ ...prev, [field]: text }))}
              onBlur={field === 'word' || field === 'part_of_speech' ? () => void fillForms() : undefined}
              error={errors[inputId(field)]}
              isDisabled={pending}
              autoComplete="off"
              spellCheck={false}
            />
          ))}
        </div>
        {expectedKeys.length > 0 && (
          <fieldset className="flex min-w-0 flex-col gap-3 rounded-inner border-2 border-border p-4">
            <legend className="px-1 text-ui font-semibold text-ink">{t('ai.eval.form.expected.title')}</legend>
            {expectedKeys.includes('forms') && (
              <>
                <TextField
                  id={expectedId('forms')}
                  label={t('ai.eval.form.expected.forms.label')}
                  description={t('ai.eval.form.expected.forms.hint')}
                  value={expected.forms ?? ''}
                  onChange={(text) => {
                    setFormsEdited(true);
                    setFillNote(null);
                    setBox('forms', text);
                  }}
                  error={errors[expectedId('forms')]}
                  isDisabled={pending}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p role="status" className="text-ui text-muted empty:hidden">{fillText}</p>
              </>
            )}
            {expectedKeys.includes('lemma') && (
              <TextField
                id={expectedId('lemma')}
                label={t('ai.eval.form.expected.lemma')}
                value={expected.lemma ?? ''}
                onChange={(text) => setBox('lemma', text)}
                error={errors[expectedId('lemma')]}
                isDisabled={pending}
                autoComplete="off"
                spellCheck={false}
              />
            )}
            {expectedKeys.includes('part_of_speech') && (
              <TextField
                id={expectedId('part_of_speech')}
                label={t('ai.eval.form.expected.partOfSpeech')}
                value={expected.part_of_speech ?? ''}
                onChange={(text) => setBox('part_of_speech', text)}
                error={errors[expectedId('part_of_speech')]}
                isDisabled={pending}
                autoComplete="off"
                spellCheck={false}
              />
            )}
            {expectedKeys.includes('verdict') && (
              <div className="max-w-sm">
                <Select
                  id={expectedId('verdict')}
                  label={t('ai.eval.form.expected.verdict')}
                  placeholder={t('ai.eval.form.expected.verdictPlaceholder')}
                  items={VERDICTS.map((verdict) => ({ id: verdict, label: verdict }))}
                  value={expected.verdict ?? ''}
                  onChange={(verdict) => setBox('verdict', verdict)}
                  error={errors[expectedId('verdict')]}
                  isDisabled={pending}
                />
              </div>
            )}
          </fieldset>
        )}
        <TextField
          id={NOTE_FIELD}
          label={t('ai.eval.form.note')}
          description={t('ai.eval.form.noteHint')}
          value={note}
          onChange={setNote}
          maxLength={NOTE_MAX}
          error={errors[NOTE_FIELD]}
          isDisabled={pending}
          autoComplete="off"
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onPress={requestClose} isDisabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isPending={pending}>
            {t(isNew ? 'ai.eval.form.submitAdd' : 'ai.eval.form.submitSave')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
