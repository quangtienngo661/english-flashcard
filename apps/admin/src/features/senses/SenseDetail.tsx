import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useFormatter, useLocale, useTranslations } from 'use-intl';
import { useFocusFirstError } from '../../api/field-errors';
import { ApiError } from '../../api/problem';
import { useErrorMessage } from '../../api/use-error-message';
import { useKeptDraft } from '../../api/use-kept-draft';
import { useDirtyForm } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { ListState } from '../../ui/ListState';
import { RestoreDraftBanner } from '../../ui/RestoreDraftBanner';
import { TextArea } from '../../ui/TextArea';
import { TextField } from '../../ui/TextField';
import { showToast } from '../../ui/Toast';
import { listTopics } from '../content/content-api';
import { topicLabel } from '../content/FilterFields';
import { getSense, hasOpenEdit, quickPublish, saveDraft, statusKey, type Missing, type SenseContent, type SenseDetailView } from './senses-api';

const MAX_EXAMPLES = 3;
const panel = 'flex flex-col gap-4 rounded-panel border-2 border-border bg-surface p-5';
/** Form fields as typed: accepted forms are one comma-separated line. */
type Form = { gloss_vi: string; definition_en: string; examples_en: string[]; topics: string[]; accepted_forms: string };
const FIELD_OF: Record<Missing, string | null> = { 'gloss-missing': 'sense-gloss', 'example-missing': 'sense-example-0', 'level-missing': null };
const ORDER = ['sense-gloss', 'sense-example-0'];

function toForm(content: SenseContent | null): Form {
  return {
    gloss_vi: content?.gloss_vi ?? '',
    definition_en: content?.definition_en ?? '',
    examples_en: content?.examples_en.length ? [...content.examples_en] : [''],
    topics: [...(content?.topics ?? [])],
    accepted_forms: (content?.accepted_forms ?? []).join(', '),
  };
}
function toContent(form: Form): SenseContent {
  const text = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    gloss_vi: text(form.gloss_vi),
    definition_en: text(form.definition_en),
    examples_en: form.examples_en.map((e) => e.trim()).filter(Boolean),
    topics: form.topics,
    accepted_forms: form.accepted_forms.split(',').map((f) => f.trim()).filter(Boolean),
  };
}
/** A kept draft may come from an older build: use it only when it has the form's shape. */
function isForm(value: unknown): value is Form {
  const v = value as Form;
  return typeof v === 'object' && v !== null && typeof v.gloss_vi === 'string' && typeof v.definition_en === 'string' &&
    Array.isArray(v.examples_en) && v.examples_en.every((e) => typeof e === 'string') && Array.isArray(v.topics) && typeof v.accepted_forms === 'string';
}

/** A/88b `/senses/:id`: edit the latest revision's content; save a draft or save and publish; the last people who acted. */
export function SenseDetail() {
  const { id = '' } = useParams();
  const t = useTranslations('senses.detail');
  const api = useApi();
  const sense = useQuery({ queryKey: ['sense', id], queryFn: () => getSense(api, id), retry: false });
  const notFound = sense.error instanceof ApiError && sense.error.problem.status === 404;

  return (
    <div className="flex flex-col gap-4">
      <Link to="/senses" className="flex w-fit items-center gap-1 text-ui font-semibold text-primary underline">
        <ChevronLeft aria-hidden className="size-4" />
        {t('back')}
      </Link>
      {sense.data ? (
        <SenseForm key={`${sense.data.sense_id}:${sense.data.revision}`} view={sense.data} onReload={() => void sense.refetch()} />
      ) : notFound ? (
        <Banner variant="error">{t('notFound')}</Banner>
      ) : (
        <ListState state={sense.isPending ? 'loading' : 'error'} onRetry={() => void sense.refetch()} />
      )}
    </div>
  );
}

function SenseForm({ view, onReload }: { view: SenseDetailView; onReload: () => void }) {
  const t = useTranslations('senses');
  const locale = useLocale();
  const format = useFormatter();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const canPublish = useCan('content.publish');
  const topics = useQuery({ queryKey: ['topics'], queryFn: () => listTopics(api) });
  const server = useMemo(() => toForm(view.content), [view.content]);
  const [form, setForm] = useState<Form>(server);
  const dirty = JSON.stringify(toContent(form)) !== JSON.stringify(toContent(server));
  const kept = useKeptDraft<unknown>(`sense:${view.sense_id}`, form, dirty);
  const { release } = useDirtyForm(dirty, { onLeave: kept.clear });

  const done = async (droppedTopics: string[], message: string) => {
    release();
    kept.clear();
    showToast(message);
    if (droppedTopics.length > 0) showToast(t('detail.droppedTopics', { topics: droppedTopics.join(', ') }));
    await queryClient.invalidateQueries({ queryKey: ['senses'] });
    onReload();
  };
  const draft = useMutation({
    mutationFn: () => saveDraft(api, view.sense_id, view.revision, toContent(form)),
    onSuccess: (r) => done(r.dropped_topics, t('detail.draftSaved')),
  });
  const publish = useMutation({
    mutationFn: () => quickPublish(api, view.sense_id, view.revision, toContent(form)),
    onSuccess: (r) => done(r.dropped_topics, t('detail.published')),
  });
  const error = draft.error ?? publish.error;
  const problem = error instanceof ApiError ? error.problem : null;
  const missing = (problem?.slug === 'publish-incomplete' ? problem.violations ?? [] : []) as Missing[];
  const fieldErrors = Object.fromEntries(missing.flatMap((m) => (FIELD_OF[m] ? [[FIELD_OF[m]!, t(`bulk.missing.${m}`)]] : [])));
  useFocusFirstError(fieldErrors, ORDER);
  const pending = draft.isPending || publish.isPending;

  const set = (change: Partial<Form>) => setForm((f) => ({ ...f, ...change }));
  const at = (iso: string) => format.dateTime(new Date(iso), { weekday: 'long', day: 'numeric', month: 'numeric', hour: 'numeric', minute: '2-digit' });
  const actionOfState = { open: t('detail.stateActions.open'), unpublished: t('detail.stateActions.unpublished'), retired: t('detail.stateActions.retired') };
  const activeTopics = (topics.data ?? []).filter((tp) => !tp.archived_at || form.topics.includes(tp.code));

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="wrap-anywhere text-2xl font-extrabold tracking-tight text-ink">
          {view.lemma} · {view.pos}
        </h2>
        <p className="text-ui text-muted">
          {[
            view.context_label,
            view.displayed_level ?? t('detail.noLevel'),
            hasOpenEdit(view) ? t('detail.publishedWithEdit') : t(`status.${statusKey(view)}` as 'status.draft'),
          ].filter(Boolean).join(' · ')}
        </p>
      </div>

      {kept.kept !== null && !dirty && isForm(kept.kept) && (
        <RestoreDraftBanner
          onRestore={() => {
            if (isForm(kept.kept)) setForm(kept.kept);
            kept.discard();
          }}
          onDiscard={kept.discard}
        />
      )}
      {problem?.slug === 'stale-revision' ? (
        <Banner variant="error" action={<Button variant="secondary" onPress={onReload}>{t('detail.reload')}</Button>}>
          {t('detail.stale')}
        </Banner>
      ) : problem?.slug === 'publish-incomplete' ? (
        <Banner variant="error">
          {t('detail.incomplete', { missing: missing.map((m) => t(`bulk.missing.${m}`)).join(', ') })}
        </Banner>
      ) : (
        error && <Banner variant="error">{errorMessage(error)}</Banner>
      )}

      <div className="grid gap-6 panel:grid-cols-3 panel:items-start">
        <section aria-labelledby="sense-content" className={`${panel} panel:col-span-2`}>
          <h3 id="sense-content" className="text-xl font-extrabold tracking-tight text-ink">{t('detail.content')}</h3>
          <TextField id="sense-gloss" label={t('detail.gloss')} value={form.gloss_vi} onChange={(gloss_vi) => set({ gloss_vi })} error={fieldErrors['sense-gloss']} />
          <TextArea label={t('detail.definition')} value={form.definition_en} onChange={(definition_en) => set({ definition_en })} rows={3} />
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1.5 text-ui font-medium text-ink">{t('detail.examples', { max: MAX_EXAMPLES })}</legend>
            {form.examples_en.map((example, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <TextField
                    id={`sense-example-${i}`}
                    label={t('detail.example', { n: i + 1 })}
                    value={example}
                    onChange={(value) => set({ examples_en: form.examples_en.map((e, j) => (j === i ? value : e)) })}
                    error={i === 0 ? fieldErrors['sense-example-0'] : undefined}
                  />
                </div>
                {form.examples_en.length > 1 && (
                  <Button variant="ghost" aria-label={t('detail.removeExample', { n: i + 1 })} onPress={() => set({ examples_en: form.examples_en.filter((_, j) => j !== i) })}>
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {form.examples_en.length < MAX_EXAMPLES && (
              <Button variant="ghost" className="w-fit" onPress={() => set({ examples_en: [...form.examples_en, ''] })}>
                <Plus aria-hidden className="size-4" />
                {t('detail.addExample')}
              </Button>
            )}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1.5 text-ui font-medium text-ink">{t('detail.topics')}</legend>
            {activeTopics.length === 0 && <p className="text-xs text-muted">{t('detail.noTopics')}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {activeTopics.map((tp) => (
                <Checkbox
                  key={tp.code}
                  isSelected={form.topics.includes(tp.code)}
                  onChange={(on) => set({ topics: on ? [...form.topics, tp.code] : form.topics.filter((c) => c !== tp.code) })}
                >
                  {topicLabel(tp, locale, t('archived'))}
                </Checkbox>
              ))}
            </div>
          </fieldset>
          <TextField label={t('detail.acceptedForms')} description={t('detail.acceptedFormsHint')} value={form.accepted_forms} onChange={(accepted_forms) => set({ accepted_forms })} />
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" isPending={draft.isPending} isDisabled={pending} onPress={() => draft.mutate()}>
              {t('detail.saveDraft')}
            </Button>
            {canPublish && (
              <Button isPending={publish.isPending} isDisabled={pending} onPress={() => publish.mutate()}>
                {t('detail.savePublish')}
              </Button>
            )}
          </div>
        </section>

        <section aria-labelledby="sense-people" className={panel}>
          <h3 id="sense-people" className="text-xl font-extrabold tracking-tight text-ink">{t('detail.people')}</h3>
          <ul className="flex flex-col gap-2 text-ui text-ink">
            {view.reviewed_by ? (
              <li className="wrap-anywhere">
                {t('detail.reviewedBy', { email: view.reviewed_by.email ?? t('detail.unknownUser'), at: view.reviewed_at ? at(view.reviewed_at) : '' })}
              </li>
            ) : (
              (view.status === 'draft' || view.status === 'reviewed') && <li>{t('detail.notReviewed')}</li>
            )}
            {view.published_by && <li className="wrap-anywhere">{t('detail.publishedBy', { email: view.published_by.email ?? t('detail.unknownUser') })}</li>}
            {view.state_changed_by && (
              <li className="wrap-anywhere">
                {t('detail.stateChangedBy', {
                  email: view.state_changed_by.email ?? t('detail.unknownUser'),
                  action: actionOfState[view.state],
                  at: view.state_changed_at ? at(view.state_changed_at) : '',
                })}
              </li>
            )}
          </ul>
          <p className="text-xs text-muted">{t('detail.lastOnly')}</p>
        </section>
      </div>
    </>
  );
}
