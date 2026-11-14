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
import { RadioGroup } from '../../ui/RadioGroup';
import { TextField } from '../../ui/TextField';
import { useSubmitAction } from '../content/useSubmitAction';
import { createReportReason, updateReportReason, type ReasonAppliesTo, type ReportReason } from './reports-api';

export const REASON_CODE = /^[a-z][a-z0-9_]{1,39}$/;
const APPLIES: ReasonAppliesTo[] = ['ai', 'non_ai', 'all'];
const FIELD_IDS = {
  code: 'reason-code-field',
  label_vi: 'reason-label-vi',
  label_en: 'reason-label-en',
  detail_hint_vi: 'reason-hint-vi',
  detail_hint_en: 'reason-hint-en',
  position: 'reason-position',
} as const;
const ORDER = Object.values(FIELD_IDS);
const ID_OF = new Map<string, string>(Object.entries(FIELD_IDS));

type Values = {
  code: string;
  labelVi: string;
  labelEn: string;
  hintVi: string;
  hintEn: string;
  appliesTo: ReasonAppliesTo;
  noteRequired: boolean;
  refundable: boolean;
  position: number | null;
};

const blank: Values = { code: '', labelVi: '', labelEn: '', hintVi: '', hintEn: '', appliesTo: 'all', noteRequired: false, refundable: false, position: 0 };
const fromReason = (r: ReportReason): Values => ({
  code: r.code, labelVi: r.label_vi, labelEn: r.label_en, hintVi: r.detail_hint_vi ?? '', hintEn: r.detail_hint_en ?? '',
  appliesTo: r.applies_to, noteRequired: r.note_required, refundable: r.refundable, position: r.position,
});
const labelOk = (value: string) => value.trim().length >= 1 && value.trim().length <= 100;

/** Add (`reason` is `null`) or edit one report reason in a dialog over the list (A/75b). The form lives in here, so closing the dialog drops it. */
export function ReasonDialog({ reason }: { reason: ReportReason | null }) {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [initial] = useState<Values>(() => (reason ? fromReason(reason) : blank));
  const [values, setValues] = useState<Values>(initial);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((current) => ({ ...current, [key]: value }));

  // Once saved the form is no longer "unsaved changes": the registration is dropped in this render's cleanup, before the effect below navigates.
  const changed = JSON.stringify(values) !== JSON.stringify(initial);
  const close = () => void navigate('/report-reasons');
  const requestClose = useDialogDirtyClose(changed && !saved, close);
  useEffect(() => {
    if (saved) close();
    // `close` only navigates; the effect is meant to run once, when `saved` turns on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const fields = {
    detail_hint_vi: values.hintVi.trim() === '' ? null : values.hintVi.trim(),
    detail_hint_en: values.hintEn.trim() === '' ? null : values.hintEn.trim(),
    label_vi: values.labelVi.trim(),
    label_en: values.labelEn.trim(),
    applies_to: values.appliesTo,
    note_required: values.noteRequired,
    refundable: values.refundable,
    position: values.position ?? 0,
  };

  const action = useSubmitAction(
    async (key) => {
      const result = reason
        ? await updateReportReason(api, reason.code, fields)
        : await createReportReason(api, { code: values.code, ...fields }, key);
      await queryClient.invalidateQueries({ queryKey: ['report-reasons'] });
      return result;
    },
    JSON.stringify(values),
    () => setSaved(true),
  );

  const server = action.problem?.slug === 'report-reason-exists'
    ? { fields: { [FIELD_IDS.code]: t('errors.report-reason-exists') }, form: [] as string[] }
    : violationsToFields(action.problem?.violations ?? [], (path) => ID_OF.get(path) ?? null);
  const shown = { ...server.fields, ...clientErrors };
  useFocusFirstError(shown, ORDER);

  function submit() {
    const next: Record<string, string> = {};
    if (!reason && !REASON_CODE.test(values.code)) next[FIELD_IDS.code] = t('reportReasons.form.codeInvalid');
    if (!labelOk(values.labelVi)) next[FIELD_IDS.label_vi] = t('reportReasons.form.labelInvalid');
    if (!labelOk(values.labelEn)) next[FIELD_IDS.label_en] = t('reportReasons.form.labelInvalid');
    if (values.position === null || !Number.isInteger(values.position) || values.position < 0 || values.position > 10_000) {
      next[FIELD_IDS.position] = t('reportReasons.form.positionInvalid');
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
      title={reason ? t('reportReasons.editTitle') : t('reportReasons.newTitle')}
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
        {server.form.length > 0 && (
          <Banner variant="error">
            {server.form.join(' ')}
          </Banner>
        )}
        <TextField
          id={FIELD_IDS.code}
          label={t('reportReasons.form.code')}
          autoComplete="off"
          spellCheck={false}
          value={values.code}
          onChange={(v) => set('code', v)}
          isDisabled={reason !== null}
          description={reason ? undefined : t('reportReasons.form.codeHint')}
          {...f(FIELD_IDS.code)}
        />
        <div className="grid gap-4 shell:grid-cols-2">
          <TextField
            id={FIELD_IDS.label_vi}
            label={t('reportReasons.form.labelVi')}
            autoComplete="off"
            maxLength={100}
            value={values.labelVi}
            onChange={(v) => set('labelVi', v)}
            description={t('reportReasons.form.labelHint')}
            {...f(FIELD_IDS.label_vi)}
          />
          <TextField
            id={FIELD_IDS.label_en}
            label={t('reportReasons.form.labelEn')}
            autoComplete="off"
            maxLength={100}
            value={values.labelEn}
            onChange={(v) => set('labelEn', v)}
            description={t('reportReasons.form.labelHint')}
            {...f(FIELD_IDS.label_en)}
          />
          <TextField
            id={FIELD_IDS.detail_hint_vi}
            label={t('reportReasons.form.hintVi')}
            autoComplete="off"
            maxLength={200}
            value={values.hintVi}
            onChange={(v) => set('hintVi', v)}
            description={t('reportReasons.form.hintHint')}
            {...f(FIELD_IDS.detail_hint_vi)}
          />
          <TextField
            id={FIELD_IDS.detail_hint_en}
            label={t('reportReasons.form.hintEn')}
            autoComplete="off"
            maxLength={200}
            value={values.hintEn}
            onChange={(v) => set('hintEn', v)}
            description={t('reportReasons.form.hintHint')}
            {...f(FIELD_IDS.detail_hint_en)}
          />
        </div>
        <RadioGroup
          label={t('reportReasons.form.appliesTo')}
          value={values.appliesTo}
          onChange={(v) => set('appliesTo', v as ReasonAppliesTo)}
          items={APPLIES.map((id) => ({ id, label: t(`reportReasons.appliesTo.${id}`) }))}
        />
        <div className="flex flex-col gap-2">
          <Checkbox isSelected={values.noteRequired} onChange={(v) => set('noteRequired', v)}>
            {t('reportReasons.form.noteRequired')}
          </Checkbox>
          <Checkbox isSelected={values.refundable} onChange={(v) => set('refundable', v)}>
            {t('reportReasons.form.refundable')}
          </Checkbox>
          <p className="ps-7 text-xs text-muted">{t('reportReasons.form.refundableHint')}</p>
        </div>
        <NumberField
          id={FIELD_IDS.position}
          label={t('reportReasons.form.position')}
          value={values.position}
          onChange={(v) => set('position', v)}
          isNullable
          step={1}
          description={t('reportReasons.form.positionHint')}
          {...f(FIELD_IDS.position)}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" isDisabled={action.pending} onPress={requestClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isPending={action.pending} isDisabled={action.waitSeconds > 0}>
            {action.waitSeconds > 0 ? t('errors.retryIn', { seconds: action.waitSeconds }) : action.canRetry ? t('common.retry') : t('reportReasons.form.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
