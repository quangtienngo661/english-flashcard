'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { Select } from '@/app-ui/Select';
import { TextField } from '@/app-ui/TextField';
import { showToast } from '@/app-ui/Toast';
import { cn } from '@/lib/cn';
import { GROUPS_KEY, useGroupMutations, useGroupQueue, useGroups } from '../groups/groups-api';
import { LEVELS, useTopics } from '../lookup/lookup-api';
import { wordHref } from '../word/word-api';
import { useLookup, type LookupSense, type QuickAddBody, type QuickAddResult } from './add-word-api';
import type { AiLookupResult as AiResult } from './ai-lookup-api';
import { AiLookupPanel } from './AiLookupPanel';
import { AiLookupResult } from './AiLookupResult';
import { cleanExamples, draftFromSuggestion, EditSuggestionForm, type WordDraft } from './EditSuggestionForm';
import { GroupPicker } from './GroupPicker';
import { readLastGroup, writeLastGroup } from './last-group';

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
  const [picked, setPicked] = useState<string | null>(null);
  const [chosenDeck, setChosenDeck] = useState<string | null>(null);
  const [lastGroup] = useState(readLastGroup);
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
  const deck = lockedGroupId ?? chosenDeck ?? (groups.some((g) => g.id === lastGroup) ? lastGroup : null);
  const deckName = groups.find((g) => g.id === deck)?.name ?? '';
  const noDecks = !lockedGroupId && groupsQuery.isSuccess && groups.length === 0;

  // The body is built from what the learner sees when they press; a deck typed in the picker is created first (K/42c).
  const save = useSubmitOnce(async (key) => {
    let target = deck;
    let targetName = deckName;
    if (!lockedGroupId && newDeckName.current) {
      const created = await createGroup(newDeckName.current, `${key}:deck`);
      target = created.id;
      targetName = created.name;
      setChosenDeck(created.id);
      // The deck exists now: a retry after a failure of the add step saves into it instead of creating it again.
      setUnmatched(null);
    }
    const form = mode.current === 'ai' ? draftFormOf : via;
    const formOf = form ? { form_of: { entry_id: form.base.entry_id, kind: form.kind } } : {};
    let body: QuickAddBody;
    if (mode.current === 'ai' && draft) {
      body = {
        group_id: target!,
        new_word: {
          lemma: draft.lemma.trim(),
          meaning: draft.meaning.trim(),
          ...(draft.pos ? { pos: draft.pos } : {}),
          ...(draft.level ? { level: draft.level } : {}),
          ...(draft.topic ? { topics: [draft.topic] } : {}),
          ...formOf,
          examples: cleanExamples(draft.examples),
          ai_suggestion: true,
        },
      };
    } else if (mode.current === 'manual') body = { group_id: target!, new_word: { lemma, meaning: meaning.trim(), ...formOf } };
    else body = { group_id: target!, sense_id: chosenSense!.sense.sense_id };
    if (sentence.trim()) body.sentence = sentence.trim();
    const result = await api.post<QuickAddResult>('/v1/quick-add', body, { idempotencyKey: `${key}:add` });
    return { result, target: target!, targetName };
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
    if (!createName && !deck) return setDeckError(t('deckRequired'));
    newDeckName.current = createName;
    mode.current = editing ? 'ai' : manual ? 'manual' : 'sense';
    try {
      // What the learner sends decides the write: a changed form after a lost connection is a new press with a new key (review M6).
      const done = await save.submit(
        JSON.stringify([mode.current, saved, meaning.trim(), draft, mode.current === 'sense' ? chosenSense?.sense.sense_id : null, deck, createName, sentence.trim()]),
      );
      if (!done) return;
      writeLastGroup(done.target);
      showToast(t('saved', { word: saved, group: done.targetName }), 'success');
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
      else if (slug === 'group-full') setFailure({ text: t('groupFull', { group: deckName }) });
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
      if (created) setChosenDeck(created.id);
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

  const deckField = lockedGroupId ? (
    <p className="text-ui text-ink">{t('lockedDeck', { name: deckName })}</p>
  ) : noDecks ? (
    <div className="flex flex-col items-start gap-2 rounded-inner bg-canvas p-3">
      <p className="text-ui text-ink">{t('noDecks')}</p>
      <Button variant="quiet" onPress={openPicker}>
        {t('createFirst')}
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-1.5">
      <span aria-hidden className="text-ui font-medium text-ink">
        {t('deck')}
      </span>
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          'flex min-h-control w-full items-center justify-between gap-2 rounded-control border-2 bg-surface px-3 py-2 text-left text-ui text-ink outline-none focus-visible:border-primary',
          deckError ? 'border-danger' : 'border-border-strong',
        )}
      >
        <span className="sr-only">{t('deck')}: </span>
        <span className={cn('truncate', !deck && 'text-placeholder')}>{deck ? deckName : t('chooseDeck')}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0" />
      </button>
      {deckError && <p className="text-caption text-danger">{deckError}</p>}
    </div>
  );

  const failureLine: ReactNode = failure && (
    <p role="alert" className="text-ui text-danger">
      {failure.text}{' '}
      {failure.existing && (
        <Link href={wordHref(locale, failure.existing)} className="font-semibold underline underline-offset-2">
          {t('openExisting')}
        </Link>
      )}
    </p>
  );

  const sentenceField = (
    <TextField label={t('sentence')} value={sentence} onChange={setSentence} maxLength={SENTENCE_MAX} />
  );

  let title = t('title');
  let body: ReactNode;
  let footer: ReactNode;
  if (view === 'picker' && !lockedGroupId) {
    title = t('pickerTitle');
    body = (
      <GroupPicker
        groups={groups}
        value={deck}
        onChange={(id) => {
          setChosenDeck(id);
          setDeckError(undefined);
        }}
        onCreate={(name) => void createAndPick(name)}
        onUnmatched={setUnmatched}
        recentId={lastGroup}
      />
    );
    body = (
      <div className="flex flex-col gap-4">
        {body}
        {deckError && <p className="text-caption text-danger">{deckError}</p>}
        {failureLine}
      </div>
    );
    footer = (
      <>
        <Button variant="quiet" onPress={() => setView(back)}>
          {t('back')}
        </Button>
        {unmatched ? (
          <Button variant="sticker" isPending={save.busy} onPress={() => void submit(unmatched)}>
            {t('createAndSave')}
          </Button>
        ) : (
          deck && (
            <Button variant="sticker" onPress={() => setView(back)}>
              {t('pickDeck', { group: deckName })}
            </Button>
          )
        )}
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
        <p className="text-caption text-muted">{t('edit.note')}</p>
        {failureLine}
      </div>
    );
    footer = (
      <>
        <Button variant="quiet" onPress={() => setView('find')}>
          {tc('cancel')}
        </Button>
        {!noDecks && (
          <Button variant="sticker" isPending={save.busy} onPress={() => void submit()}>
            {t('saveManual')}
          </Button>
        )}
      </>
    );
  } else if (view === 'manual') {
    title = t('manualTitle');
    body = (
      <div className="flex flex-col gap-4">
        <p className="-mt-3 text-caption text-muted">{t('manualSub')}</p>
        <TextField label={t('word')} value={word} onChange={setWord} maxLength={LEMMA_MAX} />
        {via && <p className="-mt-2 text-caption text-ink">{t('recognized', { kind: kind(via.kind), base: via.base.lemma })}</p>}
        <TextField label={t('meaning')} value={meaning} onChange={setMeaning} maxLength={300} error={fieldError} autoFocus />
        {sentenceField}
        {deckField}
        {failureLine}
      </div>
    );
    footer = (
      <>
        <Button variant="quiet" onPress={() => setView('find')}>
          {t('back')}
        </Button>
        {!noDecks && (
          <Button variant="sticker" isPending={save.busy} onPress={() => void submit()}>
            {t('saveManual')}
          </Button>
        )}
      </>
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        <TextField label={t('word')} value={word} onChange={setWord} placeholder={t('wordPlaceholder')} maxLength={LEMMA_MAX} error={fieldError} autoFocus={!initialWord} />
        {sentenceField}
        {lemma && lookup.isPending && <p className="text-caption text-muted">{t('lookingUp')}</p>}
        {lookup.isSuccess && options.length === 0 && !aiShown && <p className="rounded-inner bg-canvas p-3 text-ui text-ink">{t('noMatch', { word: lemma })}</p>}
        {aiShown ? (
          <AiLookupResult
            text={lemma}
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
        {options.length > 0 && (
          <div role="radiogroup" aria-label={t('pickSense')} className="flex flex-col gap-1 rounded-inner bg-primary-soft p-3">
            {via && via.senses.length > 0 && (
              <p className="text-ui font-semibold text-ink">{t('formOf', { word: lemma, kind: kind(via.kind), base: via.base.lemma })}</p>
            )}
            {options.map((o) => (
              <label key={o.sense.sense_id} className={cn('flex items-start gap-2 py-1', !inDeck.has(o.sense.sense_id) && 'cursor-pointer')}>
                {inDeck.has(o.sense.sense_id) ? (
                  <span className="text-caption text-muted">{t('alreadyIn')}</span>
                ) : (
                  <input
                    type="radio"
                    name="add-word-sense"
                    checked={chosenSense?.sense.sense_id === o.sense.sense_id}
                    disabled={!!lockedGroupId && queue.isPending}
                    onChange={() => setPicked(o.sense.sense_id)}
                    className="mt-1 size-4 shrink-0 accent-primary"
                  />
                )}
                <span className="min-w-0 break-words text-ui text-ink">
                  <span className="font-semibold">{o.sense.lemma}</span> <span className="text-caption text-muted">{[o.sense.pos, o.sense.level].filter(Boolean).join(', ')}</span>
                  <span className="block">{o.sense.meaning.text}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        {options.length > 0 && !aiOpen && lemma && (
          <button type="button" onClick={() => setAiOpen(true)} className="self-start text-ui font-semibold text-primary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {t('ai.notThis')}
          </button>
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
        {lockedGroupId && deckField}
        {lockedGroupId && (
          <div className="flex min-w-0 flex-col gap-3">
            <button
              type="button"
              aria-expanded={byTopic}
              onClick={() => setByTopic((open) => !open)}
              className="min-h-control-touch self-start text-left text-ui font-semibold text-primary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('byTopic')}
            </button>
            {byTopic && <TopicFields groupId={lockedGroupId} />}
          </div>
        )}
        {failureLine}
      </div>
    );
    footer = aiShown ? (
      <>
        <Button variant="ghost" onPress={onClose}>
          {tc('cancel')}
        </Button>
        <Button
          variant="sticker"
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
        <Button variant="ghost" onPress={onClose}>
          {tc('cancel')}
        </Button>
        {options.length > 0 && (
          <Button variant="quiet" onPress={() => setView('manual')}>
            {t('manualButton')}
          </Button>
        )}
        {chosenSense && !noDecks && (
          <Button variant="sticker" isPending={save.busy} onPress={() => void submit()}>
            {t('save', { word: senseWord })}
          </Button>
        )}
      </>
    );
  }

  if (failure?.deckGone) footer = <Button variant="quiet" onPress={onClose}>{tc('close')}</Button>;

  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} title={title} isDismissable={!save.busy} footer={footer}>
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
          className="flex min-h-control-touch items-center justify-center rounded-inner border-2 border-border-strong bg-surface px-4 text-ui font-semibold text-ink outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t('addWord.seeWords')}
        </Link>
      )}
    </div>
  );
}
