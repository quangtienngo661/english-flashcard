import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { useFocusFirstError, violationsToFields } from '../../../api/field-errors';
import { type Problem } from '../../../api/problem';
import { useDialogDirtyClose } from '../../../app/dirty-form';
import { useApi } from '../../../auth/session-context';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { Dialog } from '../../../ui/Dialog';
import { TextField } from '../../../ui/TextField';
import { showToast } from '../../../ui/Toast';
import { useSubmitAction } from '../../content/useSubmitAction';
import { aiKeys } from '../ai-api';
import { expectedFields, expectedFromFields, fieldsFromExpected } from '../expected-form';
import { addFromSource, sourceKeyPart, type NotEligibleReason, type SourcePreview, type SourceRef } from './real-questions-api';

/** The API's limit (`ai.constants.ts` EVAL_NOTE_MAX), as in the example dialog. */
const NOTE_MAX = 500;
const FORMS_FIELD = 'add-expected-forms';
const NOTE_FIELD = 'add-note';
const TOO_MANY = 'operation: at most 1000 examples';
const REASONS: readonly string[] = ['report-not-confirmed', 'not-ai', 'private-word', 'sense-gone', 'no-input'] satisfies NotEligibleReason[];

/** The sentence for a `source-not-eligible` problem (its `reason`), or `null` for any other problem. */
export function useNotEligibleText() {
  const t = useTranslations();
  return (problem: Problem | null): string | null => {
    if (!problem || problem.slug !== 'source-not-eligible') return null;
    return problem.reason !== undefined && REASONS.includes(problem.reason) ? t(`ai.real.add.notEligible.${problem.reason}`) : t('errors.source-not-eligible');
  };
}

type Props = { source: SourceRef; preview: SourcePreview; onClose: () => void };

/**
 * "Đưa vào bộ ví dụ" (nhóm B design §7.2, D27): the word, the machine's expected forms for the admin to correct, and an optional note. The example always
 * goes into the working set of its operation as a dev example. Mounted only while open, so a closed dialog keeps nothing. Shared by the report detail
 * and the results of a real-question pass.
 */
export function AddToExamplesDialog({ source, preview, onClose }: Props) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notEligibleText = useNotEligibleText();
  const op = preview.operation;
  const hasForms = expectedFields(op).includes('forms');
  const initialForms = fieldsFromExpected(op, preview.expected).forms ?? '';
  const [forms, setForms] = useState(initialForms);
  const [note, setNote] = useState('');

  const isDirty = forms !== initialForms || note !== '';
  const requestClose = useDialogDirtyClose(isDirty, onClose);

  const action = useSubmitAction(
    (key) => addFromSource(api, { ...source, expected: expectedFromFields(op, { forms }), note: note.trim() === '' ? null : note.trim() }, key),
    `${sourceKeyPart(source)}|${forms}|${note}`,
    async () => {
      await queryClient.invalidateQueries({ queryKey: aiKeys.examples(op) });
      showToast(t('ai.real.add.added'), { label: t('ai.real.add.openEval'), onPress: () => void navigate(`/ai/eval?op=${op}`) });
      requestClose.release();
      onClose();
    },
  );

  // The violations of the last refusal, mapped to the boxes (the API names `expected.forms` and `note`); the rest is said once above the form.
  const problem = action.problem;
  const violations = problem && (problem.slug === 'expected-invalid' || problem.slug === 'validation-failed') ? (problem.violations ?? []) : null;
  const mapped = violations === null ? null : violationsToFields(violations, (path) => (path === 'note' ? NOTE_FIELD : /^expected/.test(path) && hasForms ? FORMS_FIELD : null));
  const fieldErrors = mapped?.fields ?? {};
  useFocusFirstError(fieldErrors, [FORMS_FIELD, NOTE_FIELD]);
  const eligibility = notEligibleText(problem);
  const banner = eligibility ?? (violations?.includes(TOO_MANY) ? t('ai.eval.form.tooMany') : mapped && mapped.form.length > 0 ? [t('errors.validation-failed'), ...mapped.form].join(' ') : null);
  const generic = banner === null && mapped === null && action.error !== null ? action.error : null;

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !action.pending && requestClose()}
      isDismissable={!action.pending}
      title={t('ai.real.add.title')}
      size="lg"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void action.submit();
        }}
        className="flex flex-col gap-4"
      >
        {banner !== null && <Banner variant="error">{banner}</Banner>}
        {generic && (
          <Banner
            variant={action.canRetry ? 'offline' : 'error'}
            code={generic.code}
            action={action.canRetry ? <Button variant="secondary" onPress={() => void action.submit()}>{t('common.retry')}</Button> : undefined}
          >
            {generic.message}
          </Banner>
        )}
        <p className="text-ui text-muted wrap-anywhere">{t('ai.real.add.body', { operation: t(`ai.operations.names.${op}`) })}</p>
        <p className="text-ui font-semibold text-ink wrap-anywhere">{t('ai.real.add.word', { word: preview.word, pos: preview.part_of_speech })}</p>
        {preview.rebuilt && <Banner variant="info">{t('ai.real.add.rebuilt')}</Banner>}
        {hasForms && (
          <TextField
            id={FORMS_FIELD}
            label={t('ai.eval.form.expected.forms.label')}
            description={t('ai.eval.form.expected.forms.hint')}
            value={forms}
            onChange={setForms}
            error={fieldErrors[FORMS_FIELD]}
            isDisabled={action.pending}
            autoComplete="off"
            spellCheck={false}
          />
        )}
        <TextField
          id={NOTE_FIELD}
          label={t('ai.eval.form.note')}
          description={t('ai.eval.form.noteHint')}
          value={note}
          onChange={setNote}
          maxLength={NOTE_MAX}
          error={fieldErrors[NOTE_FIELD]}
          isDisabled={action.pending}
          autoComplete="off"
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onPress={requestClose} isDisabled={action.pending}>{t('common.cancel')}</Button>
          <Button type="submit" isPending={action.pending} isDisabled={action.waitSeconds > 0}>{t('ai.real.add.confirm')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
