import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { useFocusFirstError, violationsToFields } from '../../api/field-errors';
import { useApi } from '../../auth/session-context';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Dialog } from '../../ui/Dialog';
import { NumberField } from '../../ui/NumberField';
import { TextArea } from '../../ui/TextArea';
import { TextField } from '../../ui/TextField';
import { useSubmitAction } from '../content/useSubmitAction';
import { createFaq, faqKeys, updateFaq, type AdminFaqItem } from './faq-api';

const FIELD_IDS = { question: 'faq-question', answer: 'faq-answer', position: 'faq-position' } as const;
const ORDER = Object.values(FIELD_IDS);
const ID_OF = new Map<string, string>(Object.entries(FIELD_IDS));
const QUESTION_MAX = 300;
const ANSWER_MAX = 2000;

type Values = { question: string; answer: string; position: number | null; published: boolean };

const lengthOk = (value: string, max: number) => value.trim().length >= 1 && value.trim().length <= max;

/** Add (`item` is `null`) or edit one home page question in a dialog over the list. Closing the dialog drops the form. */
export function FaqDialog({ item, nextPosition }: { item: AdminFaqItem | null; nextPosition: number }) {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [initial] = useState<Values>(() =>
    item
      ? { question: item.question, answer: item.answer, position: item.position, published: item.published }
      : { question: '', answer: '', position: nextPosition, published: false },
  );
  const [values, setValues] = useState<Values>(initial);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((current) => ({ ...current, [key]: value }));

  // Once saved the form is no longer "unsaved changes": the registration is dropped in this render's cleanup, before the effect below navigates.
  const changed = JSON.stringify(values) !== JSON.stringify(initial);
  const close = () => void navigate('/faq');
  const requestClose = useDialogDirtyClose(changed && !saved, close);
  useEffect(() => {
    if (saved) close();
    // `close` only navigates; the effect is meant to run once, when `saved` turns on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const fields = { question: values.question.trim(), answer: values.answer.trim(), position: values.position ?? 0, published: values.published };
  const action = useSubmitAction(
    async (key) => {
      const result = item ? await updateFaq(api, item.id, item.row_version, fields, key) : await createFaq(api, fields, key);
      await queryClient.invalidateQueries({ queryKey: faqKeys.list });
      return result;
    },
    JSON.stringify(values),
    () => setSaved(true),
  );

  const server = violationsToFields(action.problem?.violations ?? [], (path) => ID_OF.get(path) ?? null);
  const shown = { ...server.fields, ...clientErrors };
  useFocusFirstError(shown, ORDER);

  function submit() {
    const next: Record<string, string> = {};
    if (!lengthOk(values.question, QUESTION_MAX)) next[FIELD_IDS.question] = t('faq.form.questionInvalid');
    if (!lengthOk(values.answer, ANSWER_MAX)) next[FIELD_IDS.answer] = t('faq.form.answerInvalid');
    if (values.position === null || !Number.isInteger(values.position) || values.position < 0 || values.position > 10_000) {
      next[FIELD_IDS.position] = t('faq.form.positionInvalid');
    }
    setClientErrors(next);
    if (Object.keys(next).length === 0) void action.submit();
  }

  const banner = Object.keys(server.fields).length === 0 ? action.error : null;
  const f = (key: string) => (shown[key] === undefined ? {} : { error: shown[key] });

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !action.pending && requestClose()}
      isDismissable={!action.pending}
      title={item ? t('faq.editTitle') : t('faq.newTitle')}
      size="lg"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
        {server.form.length > 0 && <Banner variant="error">{server.form.join(' ')}</Banner>}
        <TextField
          id={FIELD_IDS.question}
          label={t('faq.form.question')}
          autoComplete="off"
          maxLength={QUESTION_MAX}
          value={values.question}
          onChange={(v) => set('question', v)}
          {...f(FIELD_IDS.question)}
        />
        <TextArea
          id={FIELD_IDS.answer}
          label={t('faq.form.answer')}
          maxLength={ANSWER_MAX}
          rows={6}
          value={values.answer}
          onChange={(v) => set('answer', v)}
          {...f(FIELD_IDS.answer)}
        />
        <NumberField
          id={FIELD_IDS.position}
          label={t('faq.form.position')}
          value={values.position}
          onChange={(v) => set('position', v)}
          isNullable
          step={1}
          description={t('faq.form.positionHint')}
          {...f(FIELD_IDS.position)}
        />
        <Checkbox isSelected={values.published} onChange={(v) => set('published', v)}>
          {t('faq.form.published')}
        </Checkbox>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" isDisabled={action.pending} onPress={requestClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isPending={action.pending} isDisabled={action.waitSeconds > 0}>
            {action.waitSeconds > 0 ? t('errors.retryIn', { seconds: action.waitSeconds }) : action.canRetry ? t('common.retry') : t('faq.form.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
