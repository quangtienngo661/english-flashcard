import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useFocusFirstError } from '../../api/field-errors';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useDirtyForm } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Tabs } from '../../ui/Tabs';
import { TextArea } from '../../ui/TextArea';
import { TextField } from '../../ui/TextField';
import { showToast } from '../../ui/Toast';
import {
  createLegalDraft, deleteLegalDraft, getLegalVersion, legalKeys, publishLegalDraft, saveLegalDraft,
  type LegalSaveBody, type LegalVersion,
} from './legal-api';
import { MarkdownPreview } from './MarkdownPreview';

type Doc = 'privacy' | 'terms';
type Form = { privacyVi: string; termsVi: string; privacyEn: string; termsEn: string; effectiveDate: string };

const MAX_CHARS = 20_000;
/** An API violation name and the id of the field that shows it. */
const FIELD_OF_VIOLATION: Record<string, string> = { privacy_vi: 'legal-privacy-vi', terms_vi: 'legal-terms-vi', effective_date: 'legal-effective' };
const FIELD_ORDER = ['legal-privacy-vi', 'legal-terms-vi', 'legal-effective'];

const toForm = (v: LegalVersion): Form => ({
  privacyVi: v.privacy_vi, termsVi: v.terms_vi, privacyEn: v.privacy_en ?? '', termsEn: v.terms_en ?? '', effectiveDate: v.effective_date ?? '',
});

/** A blank English text means "no English text": the public page then shows the Vietnamese one. */
const blankToNull = (text: string) => (text.trim() === '' ? null : text);

function toBody(form: Form, expectedVersion: number): LegalSaveBody {
  return {
    expected_version: expectedVersion, privacy_vi: form.privacyVi, terms_vi: form.termsVi,
    privacy_en: blankToNull(form.privacyEn), terms_en: blankToNull(form.termsEn), effective_date: form.effectiveDate === '' ? null : form.effectiveDate,
  };
}

/** `/legal/:id`: reads one version; a draft is edited here, a published or replaced one is shown read-only. */
export function LegalEditorPage() {
  const { id = '' } = useParams();
  const api = useApi();
  const t = useTranslations();
  const [doc, setDoc] = useState<Doc>('privacy');
  const query = useQuery({ queryKey: legalKeys.one(id), queryFn: () => getLegalVersion(api, id) });
  if (query.isPending) return <p className="text-sm text-muted" role="status">{t('common.loading')}</p>;
  if (query.isError) return <Banner variant="error">{t('list.error')}</Banner>;
  // A save or a reload gives a new row_version: the form starts again from what the server holds.
  return <LegalEditor key={`${query.data.id}:${query.data.row_version}`} version={query.data} doc={doc} onDoc={setDoc} />;
}

function LegalEditor({ version, doc, onDoc }: { version: LegalVersion; doc: Doc; onDoc: (doc: Doc) => void }) {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const editable = version.status === 'draft';
  const initial = toForm(version);
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const [conflict, setConflict] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirtyFields = (['privacyVi', 'termsVi', 'privacyEn', 'termsEn', 'effectiveDate'] as const).filter((key) => form[key] !== initial[key]);
  const dirty = editable && dirtyFields.length > 0;
  const { release } = useDirtyForm(dirty);
  useFocusFirstError(errors, FIELD_ORDER);
  const set = (key: keyof Form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors({});
  };
  const heading = t('legal.editor.heading', { number: version.number });

  const reload = () => void queryClient.invalidateQueries({ queryKey: legalKeys.one(version.id) });
  const afterWrite = async () => queryClient.invalidateQueries({ queryKey: legalKeys.list });

  function failed(e: unknown) {
    setConfirmPublish(false);
    if (e instanceof ApiError && e.problem.slug === 'draft-version-conflict') return setConflict(true);
    if (e instanceof ApiError && e.problem.slug === 'validation-failed' && (e.problem.violations ?? []).length > 0) {
      const fields: Record<string, string> = {};
      for (const violation of e.problem.violations ?? []) {
        const field = FIELD_OF_VIOLATION[violation];
        if (field) fields[field] = violation === 'effective_date' ? t('legal.editor.needDate') : t('legal.editor.required');
      }
      if (Object.keys(fields).length > 0) return setErrors(fields);
    }
    // The draft is gone (deleted or published elsewhere): read it again.
    if (e instanceof ApiError && (e.problem.status === 404 || e.problem.slug === 'not-a-draft')) reload();
    setBanner(errorDetails(e));
  }

  const save = useMutation({
    mutationFn: () => saveLegalDraft(api, version.id, toBody(form, version.row_version), crypto.randomUUID()),
    onMutate: () => { setBanner(null); setErrors({}); },
    onSuccess: async (saved) => {
      queryClient.setQueryData(legalKeys.one(version.id), saved);
      await afterWrite();
      showToast(t('legal.editor.saved', { number: saved.number }));
    },
    onError: failed,
  });
  const publish = useMutation({
    mutationFn: () => publishLegalDraft(api, version.id, version.row_version, crypto.randomUUID()),
    onMutate: () => { setBanner(null); setErrors({}); },
    onSuccess: async (published) => {
      queryClient.setQueryData(legalKeys.one(version.id), published);
      await afterWrite();
      showToast(t('legal.toast.published', { number: published.number }));
      release();
      void navigate('/legal');
    },
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: () => deleteLegalDraft(api, version.id),
    onMutate: () => setBanner(null),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: legalKeys.one(version.id) });
      await afterWrite();
      showToast(t('legal.toast.deleted', { number: version.number }));
      release();
      void navigate('/legal');
    },
    onError: (e) => { setConfirmDelete(false); failed(e); },
  });
  const copy = useMutation({
    mutationFn: () => createLegalDraft(api, version.id, crypto.randomUUID()),
    onMutate: () => setBanner(null),
    onSuccess: async (draft) => {
      await afterWrite();
      showToast(t('legal.toast.created', { number: draft.number }));
      void navigate(`/legal/${draft.id}`);
    },
    onError: failed,
  });

  const privacy = doc === 'privacy';
  const viKey = privacy ? 'privacyVi' : 'termsVi';
  const enKey = privacy ? 'privacyEn' : 'termsEn';
  const viId = privacy ? 'legal-privacy-vi' : 'legal-terms-vi';
  const marked = (key: Doc) => dirtyFields.some((field) => (key === 'privacy' ? field.startsWith('privacy') : field.startsWith('terms')));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/legal" className="text-sm text-primary underline">{t('legal.editor.back')}</Link>
        <h2 className="text-lg font-bold">{heading}</h2>
        <Badge tone={editable ? 'primary' : version.status === 'published' ? 'success' : 'neutral'}>{t(`legal.status.${version.status}`)}</Badge>
        {dirty && <span className="text-sm text-muted">{t('legal.editor.dirty')}</span>}
      </div>
      {!editable && <Banner variant="info">{t('legal.editor.readOnly')}</Banner>}
      {conflict && (
        <Banner variant="error" action={<Button variant="secondary" onPress={reload}>{t('legal.editor.reload')}</Button>}>{t('legal.editor.conflict')}</Banner>
      )}
      {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
      <TextField
        id="legal-effective" label={t('legal.editor.effective')} description={t('legal.editor.effectiveHint')} type="date"
        value={form.effectiveDate} onChange={set('effectiveDate')} error={errors['legal-effective']} isDisabled={!editable}
      />
      <Tabs
        label={t('legal.editor.tabs')}
        items={[
          { id: 'privacy', label: t('legal.editor.privacy'), marked: marked('privacy') },
          { id: 'terms', label: t('legal.editor.terms'), marked: marked('terms') },
        ]}
        selected={doc}
        onSelect={(next) => onDoc(next as Doc)}
      >
        {() => (
          <div className="grid gap-4 panel:grid-cols-2">
            <div className="flex flex-col gap-4">
              <TextArea
                id={viId} label={t('legal.editor.vi')} value={form[viKey]} onChange={set(viKey)} error={errors[viId]}
                rows={22} maxLength={MAX_CHARS} counter isDisabled={!editable} spellCheck={false}
              />
              <TextArea
                label={t('legal.editor.en')} value={form[enKey]} onChange={set(enKey)}
                rows={10} maxLength={MAX_CHARS} counter isDisabled={!editable} spellCheck={false}
              />
            </div>
            <section aria-label={t('legal.editor.preview')} className="rounded-lg border border-border p-4">
              <h3 className="mb-2 text-sm font-semibold text-muted">{t('legal.editor.preview')}</h3>
              {form[viKey].trim() === '' ? <p className="text-sm text-muted">{t('legal.editor.previewEmpty')}</p> : <MarkdownPreview source={form[viKey]} />}
            </section>
          </div>
        )}
      </Tabs>
      <div className="flex flex-wrap items-center gap-2">
        {editable ? (
          <>
            <Button isPending={save.isPending} isDisabled={!dirty || conflict} onPress={() => save.mutate()}>{t('legal.editor.save')}</Button>
            <Button variant="secondary" isDisabled={dirty || conflict || publish.isPending} onPress={() => setConfirmPublish(true)}>{t('legal.editor.publish')}</Button>
            {dirty && <span className="text-sm text-muted">{t('legal.editor.publishFirst')}</span>}
            <Button variant="ghost" className="ml-auto text-danger" onPress={() => setConfirmDelete(true)}>{t('legal.editor.delete')}</Button>
          </>
        ) : (
          <Button isPending={copy.isPending} onPress={() => copy.mutate()}>{t('legal.editor.copy')}</Button>
        )}
      </div>
      <ConfirmDialog
        isOpen={confirmPublish}
        title={t('legal.publishDialog.title', { number: version.number })}
        confirmLabel={t('legal.publishDialog.confirm')}
        isPending={publish.isPending}
        onConfirm={() => publish.mutate()}
        onCancel={() => setConfirmPublish(false)}
      >
        {t('legal.publishDialog.body')}
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={confirmDelete}
        title={t('legal.deleteDialog.title', { number: version.number })}
        confirmLabel={t('legal.deleteDialog.confirm')}
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(false)}
      >
        {t('legal.deleteDialog.body')}
      </ConfirmDialog>
    </div>
  );
}
