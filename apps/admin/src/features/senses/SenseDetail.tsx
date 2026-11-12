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
import {
  getSense, hasOpenEdit, quickPublish, retryAudio, saveDraft, statusKey, type AudioState, type Missing, type SenseContent, type SenseContentView,
  type SenseDetailView,
} from './senses-api';

const MAX_EXAMPLES = 3;
const panel = 'flex flex-col gap-4 rounded-panel border-2 border-border bg-surface p-5';
/** Form fields as typed: accepted forms are one comma-separated line; the IPA fields as typed, slashes allowed. */
type Form = { gloss_vi: string; definition_en: string; examples_en: string[]; topics: string[]; accepted_forms: string; ipa_uk: string; ipa_us: string };
const IPA_KEYS = ['ipa_uk', 'ipa_us'] as const;
const FIELD_OF: Record<Missing, string | null> = { 'gloss-missing': 'sense-gloss', 'example-missing': 'sense-example-0', 'level-missing': null };
const IPA_FIELD = { ipa_uk: 'sense-ipa-uk', ipa_us: 'sense-ipa-us' } as const;
const ORDER = ['sense-gloss', 'sense-ipa-uk', 'sense-ipa-us', 'sense-example-0'];

function toForm(content: SenseContentView | null): Form {
  return {
    gloss_vi: content?.gloss_vi ?? '',
    definition_en: content?.definition_en ?? '',
    examples_en: content?.examples_en.length ? [...content.examples_en] : [''],
    topics: [...(content?.topics ?? [])],
    accepted_forms: (content?.accepted_forms ?? []).join(', '),
    ipa_uk: content?.ipa_uk ?? '',
    ipa_us: content?.ipa_us ?? '',
  };
}
/** "/ˈlʌɡ.ɪdʒ/" or "[ˈlʌɡ.ɪdʒ]" → "ˈlʌɡ.ɪdʒ": the API stores it bare (H11). */
const bareIpa = (v: string) => v.trim().replace(/^[/[]+/, '').replace(/[/\]]+$/, '').trim();
/**
 * The body of a save. An IPA key goes only when it has a value or the saved sense had one (an empty field then clears it as null), so a
 * sense without IPA sends the same body as before đợt C.
 */
function toContent(form: Form, base: Form): SenseContent {
  const text = (v: string) => (v.trim() === '' ? null : v.trim());
  const ipa: Partial<SenseContent> = {};
  for (const key of IPA_KEYS) {
    const value = bareIpa(form[key]);
    if (value !== '' || bareIpa(base[key]) !== '') ipa[key] = value === '' ? null : value;
  }
  return {
    gloss_vi: text(form.gloss_vi),
    definition_en: text(form.definition_en),
    examples_en: form.examples_en.map((e) => e.trim()).filter(Boolean),
    topics: form.topics,
    accepted_forms: form.accepted_forms.split(',').map((f) => f.trim()).filter(Boolean),
    ...ipa,
  };
}
/** A kept draft may come from an older build: use it only when it has the form's shape (one from before đợt C has no IPA fields). */
function isForm(value: unknown): value is Form {
  const v = value as Form;
  return typeof v === 'object' && v !== null && typeof v.gloss_vi === 'string' && typeof v.definition_en === 'string' &&
    Array.isArray(v.examples_en) && v.examples_en.every((e) => typeof e === 'string') && Array.isArray(v.topics) && typeof v.accepted_forms === 'string' &&
    IPA_KEYS.every((key) => v[key] === undefined || typeof v[key] === 'string');
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
        <SenseForm key={sense.data.sense_id} live={sense.data} onReload={() => void sense.refetch()} />
      ) : notFound ? (
        <Banner variant="error">{t('notFound')}</Banner>
      ) : (
        <ListState state={sense.isPending ? 'loading' : 'error'} onRetry={() => void sense.refetch()} />
      )}
    </div>
  );
}

/**
 * `view` is the revision the form started from; saves send its number. A newer `live` read (after a save, a reload, or a refetch on
 * window focus) is taken over only while nothing is unsaved; under unsaved edits the page keeps them and says the sense changed.
 */
function SenseForm({ live, onReload }: { live: SenseDetailView; onReload: () => void }) {
  const t = useTranslations('senses');
  const locale = useLocale();
  const format = useFormatter();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const canPublish = useCan('content.publish');
  const topics = useQuery({ queryKey: ['topics'], queryFn: () => listTopics(api) });
  const [view, setView] = useState(live);
  const [seen, setSeen] = useState(live);
  const server = useMemo(() => toForm(view.content), [view.content]);
  const [form, setForm] = useState<Form>(server);
  const dirty = JSON.stringify(toContent(form, server)) !== JSON.stringify(toContent(server, server));
  const kept = useKeptDraft<unknown>(`sense:${view.sense_id}`, form, dirty);
  const { release } = useDirtyForm(dirty, { onLeave: kept.clear });

  const done = async (revision: number, droppedTopics: string[], message: string) => {
    // The saved text is now the base, so the read that follows (same revision) is taken over without a conflict.
    setView({ ...view, revision, content: { ...toContent(form, server), ipa_source: view.content?.ipa_source ?? null } });
    release();
    kept.clear();
    showToast(message);
    if (droppedTopics.length > 0) showToast(t('detail.droppedTopics', { topics: droppedTopics.join(', ') }));
    await queryClient.invalidateQueries({ queryKey: ['senses'] });
    onReload();
  };
  const draft = useMutation({
    mutationFn: () => saveDraft(api, view.sense_id, view.revision, toContent(form, server)),
    onSuccess: (r) => done(r.revision, r.dropped_topics, t('detail.draftSaved')),
  });
  const publish = useMutation({
    mutationFn: () => quickPublish(api, view.sense_id, view.revision, toContent(form, server)),
    onSuccess: (r) => done(r.revision, r.dropped_topics, t('detail.published')),
  });
  if (live !== seen) {
    setSeen(live);
    if (!dirty) {
      setView(live);
      setForm(toForm(live.content));
      draft.reset();
      publish.reset();
    }
  }
  const moved = live.revision !== view.revision;
  /** [Tải lại] drops the unsaved edit: the newer read on hand is taken over, else one is fetched. */
  const reload = () => {
    release();
    kept.clear();
    draft.reset();
    publish.reset();
    if (moved) {
      setView(live);
      setForm(toForm(live.content));
    } else {
      setForm(server);
      onReload();
    }
  };
  const error = draft.error ?? publish.error;
  const problem = error instanceof ApiError ? error.problem : null;
  const missing = (problem?.slug === 'publish-incomplete' ? problem.violations ?? [] : []) as Missing[];
  const ipaError: Array<[string, string]> = problem?.slug === 'ipa-invalid' && (problem.field === 'ipa_uk' || problem.field === 'ipa_us')
    ? [[IPA_FIELD[problem.field], t('detail.ipaInvalid', { char: problem.char ?? '' })]] : [];
  const fieldErrors: Record<string, string> = Object.fromEntries([
    ...missing.flatMap((m): Array<[string, string]> => (FIELD_OF[m] ? [[FIELD_OF[m]!, t(`bulk.missing.${m}`)]] : [])), ...ipaError,
  ]);
  // Đợt C §5.2: a typed change makes the source Wordmet (the API drops the source when the IPA changes without one).
  const ipaChanged = IPA_KEYS.some((key) => bareIpa(form[key]) !== bareIpa(server[key]));
  const ipaSource = form.ipa_uk.trim() || form.ipa_us.trim()
    ? (!ipaChanged && view.content?.ipa_source ? t('detail.ipaSource', { name: view.content.ipa_source.name }) : t('detail.ipaSourceOwn')) : null;
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
            if (isForm(kept.kept)) setForm({ ...kept.kept, ipa_uk: kept.kept.ipa_uk ?? '', ipa_us: kept.kept.ipa_us ?? '' });
            kept.discard();
          }}
          onDiscard={kept.discard}
        />
      )}
      {moved || problem?.slug === 'stale-revision' ? (
        <Banner variant="error" action={<Button variant="secondary" onPress={reload}>{t('detail.reload')}</Button>}>
          {t('detail.stale')}
        </Banner>
      ) : problem?.slug === 'publish-incomplete' ? (
        <Banner variant="error">
          {t('detail.incomplete', { missing: missing.map((m) => t(`bulk.missing.${m}`)).join(', ') })}
        </Banner>
      ) : (
        // ipa-invalid is shown under its field.
        error && problem?.slug !== 'ipa-invalid' && <Banner variant="error">{errorMessage(error)}</Banner>
      )}

      <div className="grid gap-6 panel:grid-cols-3 panel:items-start">
        <section aria-labelledby="sense-content" className={`${panel} panel:col-span-2`}>
          <h3 id="sense-content" className="text-xl font-extrabold tracking-tight text-ink">{t('detail.content')}</h3>
          <TextField id="sense-gloss" label={t('detail.gloss')} value={form.gloss_vi} onChange={(gloss_vi) => set({ gloss_vi })} error={fieldErrors['sense-gloss']} />
          <div className="flex flex-col gap-1.5">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="sense-ipa-uk" label={t('detail.ipaUk')} value={form.ipa_uk} onChange={(ipa_uk) => set({ ipa_uk })} error={fieldErrors['sense-ipa-uk']} />
              <TextField id="sense-ipa-us" label={t('detail.ipaUs')} value={form.ipa_us} onChange={(ipa_us) => set({ ipa_us })} error={fieldErrors['sense-ipa-us']} />
            </div>
            {ipaSource && <p className="text-xs text-muted">{ipaSource}</p>}
          </div>
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
        {view.audio && <AudioPanel senseId={view.sense_id} audio={view.audio} />}
      </div>
    </>
  );
}

/** Đợt C §5.2, §5.4: the UK and US files of the sense; failed ones go back in the queue with [Tạo lại] (H13). */
function AudioPanel({ senseId, audio }: { senseId: string; audio: { uk: AudioState | null; us: AudioState | null } }) {
  const t = useTranslations('senses.detail');
  const api = useApi();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const retry = useMutation({
    mutationFn: () => retryAudio(api, senseId),
    onSuccess: async () => {
      showToast(t('audioRetried'));
      await queryClient.invalidateQueries({ queryKey: ['sense', senseId] });
    },
  });
  const status = (state: AudioState | null) =>
    state === null ? t('audioNone') : state.status === 'ready' ? t('audioReady') : state.status === 'pending' ? t('audioPending') : t('audioFailed');
  const rows = [['UK', audio.uk], ['US', audio.us]] as const;
  return (
    <section aria-labelledby="sense-audio" className={panel}>
      <h3 id="sense-audio" className="text-xl font-extrabold tracking-tight text-ink">{t('audio')}</h3>
      <ul className="flex flex-col gap-2 text-ui text-ink">
        {rows.map(([voice, state]) => (
          <li key={voice} className="flex flex-col gap-0.5">
            <span className={state?.status === 'failed' ? 'font-semibold text-danger' : undefined}>{t('audioLine', { voice, status: status(state) })}</span>
            {state?.status === 'failed' && state.error && <span className="wrap-anywhere text-xs text-muted">{state.error}</span>}
          </li>
        ))}
      </ul>
      {rows.some(([, state]) => state?.status === 'failed') && (
        <Button variant="secondary" className="w-fit" isPending={retry.isPending} onPress={() => retry.mutate()}>
          {t('audioRetry')}
        </Button>
      )}
      {retry.error && <Banner variant="error">{errorMessage(retry.error)}</Banner>}
    </section>
  );
}
