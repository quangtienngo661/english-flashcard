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
import { TextField } from '../../ui/TextField';
import { showToast } from '../../ui/Toast';
import { aiKeys, createExample, updateExample, type AiOperation, type EvalExample } from './ai-api';
import { fieldText, fieldValue } from './prompt-form';

/** The API's limit (`ai.constants.ts` EVAL_NOTE_MAX). */
const NOTE_MAX = 500;
const NOTE_FIELD = 'example-note';
const TOO_MANY = 'operation: at most 1000 examples';
const inputId = (field: string) => `example-input-${field}`;

type Props = {
  op: AiOperation;
  /** The operation's `input_fields`, in its order: one box each. */
  inputFields: string[];
  /** Absent: a new example (`/ai/eval/new`). */
  example?: EvalExample;
  onClose: () => void;
};

/**
 * A/83 add / edit an example: a box per input field of the operation (empty → null, a JSON list or object as that value), plus a note.
 * Mounted only while open, so a closed dialog keeps nothing. The 1001st example of an operation is refused by the API (design §6.5).
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
  const [input, setInput] = useState<Record<string, string>>(initial);
  const [note, setNote] = useState(initialNote);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  const isDirty = note !== initialNote || fields.some((field) => input[field] !== initial[field]);
  const requestClose = useDialogDirtyClose(isDirty, onClose);
  const order = [...fields.map(inputId), NOTE_FIELD];
  useFocusFirstError(errors, order);

  async function submit() {
    if (busy.current) return;
    flushSync(() => {
      setErrors({});
      setBanner(null);
    });
    const value = Object.fromEntries(fields.map((field) => [field, fieldValue(input[field])]));
    const noteValue = note.trim() === '' ? null : note.trim();
    busy.current = true;
    setPending(true);
    try {
      if (isNew) await createExample(api, { operation: op, input: value, note: noteValue });
      else await updateExample(api, example.id, { input: value, note: noteValue });
      await queryClient.invalidateQueries({ queryKey: aiKeys.examples(op) });
      showToast(t(isNew ? 'ai.eval.toast.added' : 'ai.eval.toast.saved'));
      requestClose.release();
      onClose();
    } catch (e) {
      const violations = e instanceof ApiError && e.problem.slug === 'validation-failed' ? (e.problem.violations ?? []) : null;
      if (violations?.includes(TOO_MANY)) setBanner({ message: t('ai.eval.form.tooMany'), code: null });
      else if (violations) {
        const mapped = violationsToFields(violations, (path) => {
          if (path === 'note') return NOTE_FIELD;
          const field = /^input\.([A-Za-z_]+)/.exec(path)?.[1];
          return field && fields.includes(field) ? inputId(field) : null;
        });
        setErrors(mapped.fields);
        if (mapped.form.length > 0) setBanner({ message: [t('errors.validation-failed'), ...mapped.form].join(' '), code: null });
      } else setBanner(errorDetails(e));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

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
              error={errors[inputId(field)]}
              isDisabled={pending}
              autoComplete="off"
              spellCheck={false}
            />
          ))}
        </div>
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
