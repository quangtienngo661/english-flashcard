'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { ErrorState } from '@/ui/States';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { shownPos } from '@/lib/pos';
import { Button, BUTTON_BASE, BUTTON_VARIANT } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { FIELD_BOX, FIELD_ERROR, FIELD_LABEL } from '@/ui/field-styles';
import { PronunciationLine } from '@/ui/PronunciationLine';
import { Select } from '@/ui/Select';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE, TextButton } from '@/ui/TextButton';
import { TextField } from '@/ui/TextField';
import { showToast } from '@/ui/Toast';
import { TargetWord } from '@/ui/TargetWord';
import { GROUPS_KEY, useGroupMutations, useGroupQueue, useGroups } from '../groups/groups-api';
import { LEVELS, useTopics } from '../lookup/lookup-api';
import { wordHref } from '../word/word-api';
import { fullGroupId, useLookup, type LookupSense, type QuickAddBody, type QuickAddResult } from './add-word-api';
import type { AiLookupResult as AiResult } from './ai-lookup-api';
import { AiLookupPanel } from './AiLookupPanel';
import { AiLookupResult } from './AiLookupResult';
import { bareIpa, cleanExamples, draftFromSuggestion, EditSuggestionForm, IPA_MAX, type WordDraft } from './EditSuggestionForm';
import { GroupPicker, SelectedCount } from './GroupPicker';
import { readLastGroups, writeLastGroups } from './last-group';

const SENTENCE_MAX = 300;
const KINDS = ['third_person', 'present_participle', 'past', 'past_participle', 'plural', 'comparative', 'superlative'] as const;
type Kind = (typeof KINDS)[number];
const LEMMA_MAX = 100;
type View = 'find' | 'manual' | 'edit' | 'picker';
type Option = { sense: LookupSense; kind: string | null; base: string | null };
type Failure = { text: string; existing?: string; deckGone?: boolean };

/**
 * K/40–K/42c, M/50–M/52c: the word just met (and the sentence), what Wordmet knows of it (went → go), the deck to save to
 * (last used by default, E21), or a meaning typed by hand. One `POST /quick-add` [I] per press.
 */
export function AddWordSheet({ initialWord = '', lockedGroupId, onClose }: { initialWord?: string; lockedGroupId?: string; onClose: () => void }) {
  const t = useTranslations('App.addWord');
  const tk = useTranslations('App.addWord.kinds');
  const kind = (k: string) => ((KINDS as readonly string[]).includes(k) ? tk(k as Kind) : k);
  const tc = useTranslations('App.common');
  const locale = useLocale();
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const groupsQuery = useGroups();
  const groups = groupsQuery.data?.items ?? [];
  const queue = useGroupQueue(lockedGroupId ?? null, 'all');
  const inDeck = new Set(queue.data?.cards.map((card) => card.sense_id) ?? []);
  const { createGroup } = useGroupMutations();
  const [view, setView] = useState<View>('find');
  const [byTopic, setByTopic] = useState(false);
  const [back, setBack] = useState<'find' | 'manual' | 'edit'>('find');
  // K/87: the AI suggestion as the learner edits it before saving.
  const [draft, setDraft] = useState<WordDraft | null>(null);
  const [word, setWord] = useState(initialWord);
  const [sentence, setSentence] = useState('');
  const [meaning, setMeaning] = useState('');
  const [ipa, setIpa] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [chosenDecks, setChosenDecks] = useState<string[] | null>(null);
  const [lastGroups] = useState(readLastGroups);
  const [unmatched, setUnmatched] = useState<string | null>(null);
  const [deckError, setDeckError] = useState<string | undefined>();
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [failure, setFailure] = useState<Failure | null>(null);
  const newDeckName = useRef<string | null>(null);
  const mode = useRef<'sense' | 'manual' | 'ai'>('sense');
  // K/85–K/86: the AI lookup is offered when Wordmet lacks the word, or on "Không phải nghĩa bạn cần?"; its result belongs to one text.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiResult, setAiResult] = useState<{ text: string; result: AiResult } | null>(null);
  const [chosenFromAi, setChosenFromAi] = useState<{ text: string; sense: LookupSense } | null>(null);

  const lemma = word.trim();
  const lookup = useLookup(lemma);
  const looked: Option[] = [
    ...(lookup.data?.senses ?? []).map((sense) => ({ sense, kind: null, base: null })),
    ...(lookup.data?.via_inflection ?? []).flatMap((v) => v.senses.map((sense) => ({ sense, kind: v.kind, base: v.base.lemma }))),
  ];
  // A dictionary meaning chosen in the AI result ([Chọn], K/86b) joins the list while the text it was found for stays (review I1).
  const fromAi = chosenFromAi !== null && chosenFromAi.text === lemma ? chosenFromAi.sense : null;
  const options: Option[] =
    fromAi && !looked.some((o) => o.sense.sense_id === fromAi.sense_id) ? [{ sense: fromAi, kind: null, base: null }, ...looked] : looked;
  const aiShown = aiResult !== null && aiResult.text === lemma ? aiResult.result : null;
  const via = lookup.data?.via_inflection[0];
  // A14-2: wait for the deck queue before offering a meaning already saved there.
  const pickable = lockedGroupId && queue.isPending ? [] : options.filter((o) => !inDeck.has(o.sense.sense_id));
  const chosenSense = pickable.find((o) => o.sense.sense_id === picked) ?? pickable[0];
  // That meaning is saved, and named, as its own word ("run"), not as the text typed ("runnning").
  const senseWord = fromAi && chosenSense?.sense.sense_id === fromAi.sense_id ? fromAi.lemma : lemma;
  // The form Wordmet recognised belongs to the typed text: an AI word with another spelling is not that form (review I2).
  const draftFormOf = via && draft !== null && draft.lemma.trim() === lemma ? via : undefined;
  // QP1: the groups the word goes to, in the order chosen. Opened from a group page, that group comes first and the last-used
  // groups are not offered; only what the learner adds there joins it.
  const remembered = chosenDecks ?? (lockedGroupId ? [] : lastGroups.filter((id) => groups.some((g) => g.id === id)));
  const decks = lockedGroupId ? [lockedGroupId, ...remembered.filter((id) => id !== lockedGroupId)] : remembered;
  const nameOf = (id: string) => groups.find((g) => g.id === id)?.name ?? '';
  const noDecks = !lockedGroupId && groupsQuery.isSuccess && groups.length === 0;

  // The body is built from what the learner sees when they press; a deck typed in the picker is created first (K/42c).
  const save = useSubmitOnce(async (key) => {
    let target = decks;
    let targetNames = decks.map(nameOf);
    if (newDeckName.current) {
      // "Tạo nhóm và lưu" saves into the new deck (and the group page the sheet came from), not into what was ticked before.
      const created = await createGroup(newDeckName.current, `${key}:deck`);
      target = lockedGroupId ? [lockedGroupId, created.id] : [created.id];
      targetNames = lockedGroupId ? [nameOf(lockedGroupId), created.name] : [created.name];
      setChosenDecks(target);
      // The deck exists now: a retry after a failure of the add step saves into it instead of creating it again.
      setUnmatched(null);
    }
    const form = mode.current === 'ai' ? draftFormOf : via;
    const formOf = form ? { form_of: { entry_id: form.base.entry_id, kind: form.kind } } : {};
    let body: QuickAddBody;
    if (mode.current === 'ai' && draft) {
      body = {
        group_ids: target,
        new_word: {
          lemma: draft.lemma.trim(),
          meaning: draft.meaning.trim(),
          ...(draft.pos ? { pos: draft.pos } : {}),
          ...(draft.level ? { level: draft.level } : {}),
          ...(draft.topic ? { topics: [draft.topic] } : {}),
          ...formOf,
          examples: cleanExamples(draft.examples),
          ...(bareIpa(draft.ipa) ? { ipa: bareIpa(draft.ipa) } : {}),
          ai_suggestion: true,
        },
      };
    } else if (mode.current === 'manual') {
      body = { group_ids: target, new_word: { lemma, meaning: meaning.trim(), ...formOf, ...(bareIpa(ipa) ? { ipa: bareIpa(ipa) } : {}) } };
    }
    else body = { group_ids: target, sense_id: chosenSense!.sense.sense_id };
    if (sentence.trim()) body.sentence = sentence.trim();
    const result = await api.post<QuickAddResult>('/v1/quick-add', body, { idempotencyKey: `${key}:add` });
    return { result, target, targetNames };
  });

  async function submit(createName: string | null = null) {
    setFailure(null);
    setDeckError(undefined);
    setFieldError(undefined);
    const editing = (view === 'edit' || (view === 'picker' && back === 'edit')) && draft !== null;
    const saved = editing ? draft.lemma.trim() : view === 'find' && chosenSense ? senseWord : lemma;
    if (!saved) return setFieldError(t('wordRequired'));
    if (editing && !draft.meaning.trim()) {
      setView('edit');
      return setFieldError(t('meaningRequired'));
    }
    // No known meaning to save (a word Wordmet does not have): the manual form, never a deck created for nothing (review I-1).
    const manual = !editing && (view === 'manual' || (view === 'picker' && back === 'manual') || !chosenSense);
    if (manual && !meaning.trim()) {
      setView('manual');
      return setFieldError(t('meaningRequired'));
    }
    if (!createName && decks.length === 0) return setDeckError(t('deckRequired'));
    newDeckName.current = createName;
    mode.current = editing ? 'ai' : manual ? 'manual' : 'sense';
    try {
      // What the learner sends decides the write: a changed form after a lost connection is a new press with a new key (review M6).
      const done = await save.submit(
        JSON.stringify([mode.current, saved, meaning.trim(), draft, mode.current === 'sense' ? chosenSense?.sense.sense_id : null, decks, createName, sentence.trim()]),
      );
      if (!done) return;
      writeLastGroups(done.target);
      showToast(t('saved', { word: saved, group: done.targetNames.join(', ') }), 'success', {
        link: { label: t('openGroup'), href: `/${locale}/app/group?id=${done.target[0]}` },
      });
      for (const queryKey of [GROUPS_KEY, ['group'], ['items'], ['word'], ['words'], ['lookup']]) void client.invalidateQueries({ queryKey });
      onClose();
    } catch (error) {
      // A14-6: quick-add also returns 404 for a sense that is no longer visible.
      if (lockedGroupId && error instanceof ApiError && error.problem.status === 404) {
        try {
          await api.get(`/v1/groups/${lockedGroupId}`);
        } catch (groupError) {
          if (groupError instanceof ApiError && groupError.problem.status === 404) {
            setFailure({ text: t('deckGone'), deckGone: true });
            return;
          }
        }
      }
      const slug = error instanceof ApiError ? error.problem.slug : '';
      if (slug === 'private-word-exists') setFailure({ text: t('exists', { word: saved }), existing: saved });
      else if (slug === 'group-full') {
        // The API names the full group; an answer without a name is only unambiguous when there was one group.
        const full = fullGroupId(error) ?? (decks.length === 1 ? decks[0] : null);
        setFailure({ text: full !== null ? (nameOf(full) ? t('fullNotSaved', { group: nameOf(full) }) : t('fullUnknown')) : errorText(error) });
      }
      else if (slug === 'private-word-limit-reached') setFailure({ text: t('privateLimit') });
      else if (slug === 'sentence-limit-reached') setFailure({ text: t('sentenceLimit') });
      else setFailure({ text: errorText(error) });
    } finally {
      newDeckName.current = null;
    }
  }

  const create = useSubmitOnce((key) => createGroup(newDeckName.current!, key));
  async function createAndPick(name: string) {
    newDeckName.current = name;
    try {
      const created = await create.submit();
      if (created) setChosenDecks([...decks, created.id]);
    } catch (error) {
      setFailure({ text: errorText(error) });
    } finally {
      newDeckName.current = null;
    }
  }

  const openPicker = () => {
    setBack(view === 'manual' || view === 'edit' ? view : 'find');
    setUnmatched(null);
    setView('picker');
  };

  const chips = (ids: string[]) =>
    ids.map((id) => <GroupChip key={id} name={nameOf(id)} tone={groupTone(id, groups.find((g) => g.id === id)?.total ?? 1)} />);
  const deckField = lockedGroupId ? (
    <div className="flex flex-col items-start gap-2">
      <p className="font-wm-sans text-wm-small text-wm-ink">{t('lockedDeck', { name: nameOf(lockedGroupId) })}</p>
      {decks.length > 1 && <div className="flex flex-wrap gap-1.5">{chips(decks.slice(1))}</div>}
      {groups.some((g) => g.id !== lockedGroupId) && <TextButton onPress={openPicker}>{t('addAnother')}</TextButton>}
    </div>
  ) : noDecks ? (
    <div className="flex flex-col items-start gap-2 rounded-wm-row bg-wm-bg p-3">
      <p className="font-wm-sans text-wm-small text-wm-ink">{t('noDecks')}</p>
      <Button variant="secondary" onPress={openPicker}>
        {t('createFirst')}
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-1.5">
      <span aria-hidden className={FIELD_LABEL}>
        {t('deck')}
      </span>
      <button type="button" onClick={openPicker} className={cn(FIELD_BOX, 'flex items-center justify-between gap-2 text-left', deckError && 'border-wm-fail')}>
        <span className="sr-only">{t('deck')}: </span>
        <span className={cn('flex min-w-0 flex-wrap items-center gap-1.5', decks.length === 0 && 'text-wm-muted')}>
          {decks.length > 0 ? chips(decks) : t('chooseDeck')}
        </span>
        <ChevronDown aria-hidden className="size-4.5 shrink-0 text-wm-muted" />
      </button>
      {deckError && <p className={FIELD_ERROR}>{deckError}</p>}
    </div>
  );

  const failureLine: ReactNode = failure && (
    <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
      {failure.text}{' '}
      {failure.existing && (
        <Link href={wordHref(locale, failure.existing)} className="font-semibold text-wm-accent underline underline-offset-2">
          {t('openExisting')}
        </Link>
      )}
    </p>
  );

  const sentenceField = (
    <TextField label={t('sentence')} value={sentence} onChange={setSentence} maxLength={SENTENCE_MAX} />
  );

  // The two fields at the top of "Bạn vừa gặp từ nào?". They stay at this one place in the tree, so typing keeps focus when an AI
  // result is showing; the body turns into the two-column grid around them (chỗ 23).
  const wordFields = (
    <div className="flex min-w-0 flex-col gap-4 md:col-start-1">
      <TextField label={t('word')} name="lemma" autoComplete="off" spellCheck={false} autoCapitalize="none" value={word} onChange={setWord} maxLength={LEMMA_MAX} error={fieldError} autoFocus={!initialWord} />
      {sentenceField}
    </div>
  );

  let title = t('title');
  let body: ReactNode;
  let footer: ReactNode;
  if (view === 'picker') {
    title = t('pickerTitle');
    body = (
      <GroupPicker
        groups={groups}
        value={decks}
        onChange={(ids) => {
          setChosenDecks(ids);
          setDeckError(undefined);
        }}
        onCreate={(name) => void createAndPick(name)}
        onUnmatched={setUnmatched}
        recentIds={lastGroups}
        pinnedId={lockedGroupId}
        onConfirm={() => setView(back)}
      />
    );
    body = (
      <div className="flex flex-col gap-4">
        {body}
        {deckError && <p className={FIELD_ERROR}>{deckError}</p>}
        {failureLine}
      </div>
    );
    footer = (
      <>
        <TextButton tone="muted" onPress={() => setView(back)}>
          {t('back')}
        </TextButton>
        {unmatched ? (
          <Button isPending={save.busy} onPress={() => void submit(unmatched)}>
            {t('createAndSave')}
          </Button>
        ) : (
          decks.length > 0 && (
            <Button onPress={() => setView(back)}>{t('pickDone')}</Button>
          )
        )}
        <SelectedCount count={decks.length} />
      </>
    );
  } else if (view === 'edit' && draft) {
    title = t('edit.title');
    body = (
      <div className="flex flex-col gap-4">
        <EditSuggestionForm
          value={draft}
          onChange={setDraft}
          meaningError={fieldError}
          formOf={draftFormOf ? t('recognizedShort', { kind: kind(draftFormOf.kind), base: draftFormOf.base.lemma }) : undefined}
        />
        {deckField}
        <p className="font-wm-sans text-wm-caption text-wm-muted">{t('edit.note')}</p>
        {failureLine}
      </div>
    );
    footer = (
      <>
        <TextButton tone="muted" onPress={() => setView('find')}>
          {tc('cancel')}
        </TextButton>
        {!noDecks && (
          <Button isPending={save.busy} onPress={() => void submit()}>
            {decks.length === 0 ? t('saveManual') : t('saveToCount', { count: decks.length })}
          </Button>
        )}
        <SelectedCount count={decks.length} />
      </>
    );
  } else if (view === 'manual') {
    title = t('manualTitle');
    body = (
      <div className="flex flex-col gap-4">
        <p className="-mt-2 font-wm-sans text-wm-small text-wm-muted">{t('manualSub')}</p>
        <TextField label={t('word')} name="lemma" autoComplete="off" spellCheck={false} autoCapitalize="none" value={word} onChange={setWord} maxLength={LEMMA_MAX} />
        {via && <p className="-mt-2 font-wm-sans text-wm-caption text-wm-ink">{t('recognized', { kind: kind(via.kind), base: via.base.lemma })}</p>}
        <TextField label={t('meaning')} value={meaning} onChange={setMeaning} maxLength={300} error={fieldError} autoFocus />
        <TextField label={t('edit.ipa')} description={t('edit.ipaHint')} value={ipa} onChange={setIpa} maxLength={IPA_MAX} spellCheck={false} />
        {sentenceField}
        {deckField}
        {failureLine}
      </div>
    );
    footer = (
      <>
        <TextButton tone="muted" onPress={() => setView('find')}>
          {t('back')}
        </TextButton>
        {!noDecks && (
          <Button isPending={save.busy} onPress={() => void submit()}>
            {decks.length === 0 ? t('saveManual') : t('saveToCount', { count: decks.length })}
          </Button>
        )}
        <SelectedCount count={decks.length} />
      </>
    );
  } else {
    body = (
      <div
        // raw-ok: Figma's two columns from 768 px, the fields and the list beside a 300 px preview
        className={cn('flex flex-col gap-4', aiShown && 'md:grid md:grid-cols-[minmax(0,1fr)_18.75rem] md:gap-x-6')}
      >
        {wordFields}
        {lemma && lookup.isPending && <p className="font-wm-sans text-wm-caption text-wm-muted">{t('lookingUp')}</p>}
        {lookup.isSuccess && options.length === 0 && !aiShown && (
          <p className="rounded-wm-row bg-wm-bg p-3 font-wm-sans text-wm-small text-wm-ink">{t('noMatch', { word: lemma })}</p>
        )}
        {lemma && lookup.isError && (
          <>
            <ErrorState message={errorText(lookup.error)} onRetry={() => void lookup.refetch()} />
            <TextButton className="self-start" onPress={() => setView('manual')}>
              {t('ai.manual')}
            </TextButton>
          </>
        )}
        {aiShown ? (
          <AiLookupResult
            text={lemma}
            sentence={sentence}
            result={aiShown}
            onChoose={(sense) => {
              setChosenFromAi({ text: lemma, sense });
              setPicked(sense.sense_id);
              setAiResult(null);
              setAiOpen(false);
            }}
          />
        ) : (
          <>
        {via && via.senses.length > 0 && (
          // Figma "Dạng gốc": went → go · quá khứ của go, the typed form highlighted.
          <p className="flex flex-wrap items-center gap-x-2 font-wm-sans text-wm-base text-wm-ink">
            <span>
              <TargetWord text={lemma} lemma={lemma} />
            </span>{' '}
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
            <b className="font-semibold">{via.base.lemma}</b>
            <span className="text-wm-muted">{` · ${t('inflection', { kind: kind(via.kind), base: via.base.lemma })}`}</span>
          </p>
        )}
        {options.length > 0 && (
          <div role="radiogroup" aria-label={t('pickSense')} className="flex flex-col">
            {options.map((o, i) => {
              const saved = inDeck.has(o.sense.sense_id);
              const chosen = chosenSense?.sense.sense_id === o.sense.sense_id;
              return (
                // Đợt C §5.3: the reading sits under the option, outside its label: a label sends a press to its first control, which
                // would be a speaker on an option with no radio ("đã có trong nhóm").
                <div key={o.sense.sense_id} className={cn('flex flex-col gap-1 rounded-wm-row p-3', i > 0 && 'border-t border-wm-line', chosen && 'bg-wm-accent/6')}>
                  <label className={cn('flex items-start gap-3', !saved && 'cursor-pointer')}>
                    {saved ? (
                      <span aria-hidden className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-wm-pass-soft text-wm-pass">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    ) : (
                      <input
                        type="radio"
                        name="add-word-sense"
                        checked={chosen}
                        disabled={!!lockedGroupId && queue.isPending}
                        onChange={() => setPicked(o.sense.sense_id)}
                        className="mt-0.5 size-4.5 shrink-0 accent-wm-accent"
                      />
                    )}
                    <span className="min-w-0 break-words font-wm-sans text-wm-base text-wm-ink">
                      <span className="font-semibold">{o.sense.lemma}</span>{' '}
                      <span className="text-wm-meta text-wm-muted">{[shownPos(o.sense.pos), o.sense.level].filter(Boolean).join(', ')}</span>
                      {saved && <span className="ml-2 text-wm-small-strong text-wm-pass">{t('alreadyIn')}</span>}
                      <span className="block text-wm-small text-wm-muted">{o.sense.meaning.text}</span>
                    </span>
                  </label>
                  <PronunciationLine
                    text={o.sense.lemma}
                    line={o.sense.pronunciation ? { scope: o.sense.scope, pronunciation: o.sense.pronunciation } : null}
                    className="pl-7.5"
                  />
                </div>
              );
            })}
          </div>
        )}
        {options.length > 0 && lemma && !aiOpen && (
          // Figma "Không phải nghĩa bạn cần? Nghĩa khác, tự nhập": the AI lookup and the hand-typed meaning, between the list and the
          // deck. Once the AI panel is open it carries its own [Tự nhập nghĩa].
          <div className="flex flex-wrap items-center gap-x-4">
            <TextButton onPress={() => setAiOpen(true)}>{t('ai.notThis')}</TextButton>
            <TextButton onPress={() => setView('manual')}>{t('manualButton')}</TextButton>
          </div>
        )}
        {lemma && lookup.isSuccess && (options.length === 0 || aiOpen) && (
          <AiLookupPanel
            text={lemma}
            sentence={sentence}
            accent={options.length === 0}
            onManual={() => setView('manual')}
            onResult={(result) => setAiResult({ text: lemma, result })}
          />
        )}
        {!lockedGroupId && deckField}
          </>
        )}
        <div className="flex flex-col gap-4 md:col-span-full empty:hidden">
        {lockedGroupId && deckField}
        {lockedGroupId && (
          <div className="flex min-w-0 flex-col gap-3">
            <button
              type="button"
              aria-expanded={byTopic}
              onClick={() => setByTopic((open) => !open)}
              className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'self-start text-left')}
            >
              {t('byTopic')}
            </button>
            {byTopic && <TopicFields groupId={lockedGroupId} />}
          </div>
        )}
        {failureLine}
        </div>
      </div>
    );
    footer = aiShown ? (
      <>
        <TextButton tone="muted" onPress={onClose}>
          {tc('cancel')}
        </TextButton>
        <Button
          onPress={() => {
            setDraft(draftFromSuggestion(aiShown.suggestion));
            setFieldError(undefined);
            setView('edit');
          }}
        >
          {t('result.edit')}
        </Button>
      </>
    ) : (
      <>
        <TextButton tone="muted" onPress={onClose}>
          {tc('cancel')}
        </TextButton>
        {chosenSense && !noDecks && (
          <Button isPending={save.busy} onPress={() => void submit()}>
            {t('saveShort')}
          </Button>
        )}
      </>
    );
  }

  // Deck gone: only the × closes it (one button named Close, P.4 fix round 1).
  if (failure?.deckGone) footer = undefined;

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={title}
      closeLabel={tc('close')}
      size={view === 'find' && aiShown ? 'xl' : 'md'}
      isDismissable={!save.busy}
      footer={footer}
    >
      {body}
    </Dialog>
  );
}

/** A14-7: leave this page's sheet for the topic picker, carrying its deck. */
function TopicFields({ groupId }: { groupId: string }) {
  const t = useTranslations('App');
  const locale = useLocale();
  const topics = useTopics();
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('');
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Select label={t('lookup.topicLabel')} value={topic} onChange={setTopic} items={(topics.data?.items ?? []).map((item) => ({ id: item.code, label: item.name }))} placeholder="—" />
      <Select label={t('addWord.edit.level')} value={level} onChange={setLevel} items={LEVELS.map((id) => ({ id, label: id }))} placeholder="—" />
      {topic && level && (
        <Link
          href={`/${locale}/app/topic?code=${encodeURIComponent(topic)}&level=${level}&group=${groupId}`}
          className={cn(BUTTON_BASE, BUTTON_VARIANT.secondary)}
        >
          {t('addWord.seeWords')}
        </Link>
      )}
    </div>
  );
}

/** A deck in its own colour (mockup `.gchip`): a dot and the name on the deck's wash. */
function GroupChip({ name, tone }: { name: string; tone: ReturnType<typeof groupTone> }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 rounded-wm-control px-2.25 py-0.75 font-wm-sans text-wm-small-strong', tone.wash, tone.ink)}>
      <span aria-hidden className={cn('size-2 shrink-0 rounded-wm-key', tone.bg)} />
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
}
