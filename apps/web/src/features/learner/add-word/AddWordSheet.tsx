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
import { TextField } from '@/app-ui/TextField';
import { showToast } from '@/app-ui/Toast';
import { cn } from '@/lib/cn';
import { GROUPS_KEY, useGroupMutations, useGroups } from '../groups/groups-api';
import { wordHref } from '../word/word-api';
import { useLookup, type LookupSense, type QuickAddBody, type QuickAddResult } from './add-word-api';
import { GroupPicker } from './GroupPicker';
import { readLastGroup, writeLastGroup } from './last-group';

const SENTENCE_MAX = 300;
const KINDS = ['third_person', 'present_participle', 'past', 'past_participle', 'plural', 'comparative', 'superlative'] as const;
type Kind = (typeof KINDS)[number];
const LEMMA_MAX = 100;
type View = 'find' | 'manual' | 'picker';
type Option = { sense: LookupSense; kind: string | null; base: string | null };
type Failure = { text: string; existing?: string };

/**
 * K/40–K/42c, M/50–M/52c: the word just met (and the sentence), what Wordmet knows of it (went → go), the deck to save to
 * (last used by default, E21), or a meaning typed by hand. One `POST /quick-add` [I] per press.
 */
export function AddWordSheet({ initialWord = '', onClose }: { initialWord?: string; onClose: () => void }) {
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
  const { createGroup } = useGroupMutations();
  const [view, setView] = useState<View>('find');
  const [back, setBack] = useState<'find' | 'manual'>('find');
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
  const manualMode = useRef(false);

  const lemma = word.trim();
  const lookup = useLookup(lemma);
  const options: Option[] = [
    ...(lookup.data?.senses ?? []).map((sense) => ({ sense, kind: null, base: null })),
    ...(lookup.data?.via_inflection ?? []).flatMap((v) => v.senses.map((sense) => ({ sense, kind: v.kind, base: v.base.lemma }))),
  ];
  const via = lookup.data?.via_inflection[0];
  const chosenSense = options.find((o) => o.sense.sense_id === picked) ?? options[0];
  const deck = chosenDeck ?? (groups.some((g) => g.id === lastGroup) ? lastGroup : null);
  const deckName = groups.find((g) => g.id === deck)?.name ?? '';
  const noDecks = groupsQuery.isSuccess && groups.length === 0;

  // The body is built from what the learner sees when they press; a deck typed in the picker is created first (K/42c).
  const save = useSubmitOnce(async (key) => {
    let target = deck;
    let targetName = deckName;
    if (newDeckName.current) {
      const created = await createGroup(newDeckName.current, `${key}:deck`);
      target = created.id;
      targetName = created.name;
      setChosenDeck(created.id);
      // The deck exists now: a retry after a failure of the add step saves into it instead of creating it again.
      setUnmatched(null);
    }
    const body: QuickAddBody =
      manualMode.current
        ? {
            group_id: target!,
            new_word: { lemma, meaning: meaning.trim(), ...(via ? { form_of: { entry_id: via.base.entry_id, kind: via.kind } } : {}) },
          }
        : { group_id: target!, sense_id: chosenSense!.sense.sense_id };
    if (sentence.trim()) body.sentence = sentence.trim();
    const result = await api.post<QuickAddResult>('/v1/quick-add', body, { idempotencyKey: `${key}:add` });
    return { result, target: target!, targetName };
  });

  async function submit(createName: string | null = null) {
    setFailure(null);
    setDeckError(undefined);
    setFieldError(undefined);
    if (!lemma) return setFieldError(t('wordRequired'));
    // No known meaning to save (a word Wordmet does not have): the manual form, never a deck created for nothing (review I-1).
    const manual = view === 'manual' || (view === 'picker' && back === 'manual') || !chosenSense;
    if (manual && !meaning.trim()) {
      setView('manual');
      return setFieldError(t('meaningRequired'));
    }
    if (!createName && !deck) return setDeckError(t('deckRequired'));
    newDeckName.current = createName;
    manualMode.current = manual;
    try {
      const done = await save.submit();
      if (!done) return;
      writeLastGroup(done.target);
      showToast(t('saved', { word: lemma, group: done.targetName }), 'success');
      for (const queryKey of [GROUPS_KEY, ['group'], ['items'], ['word'], ['words'], ['lookup']]) void client.invalidateQueries({ queryKey });
      onClose();
    } catch (error) {
      const slug = error instanceof ApiError ? error.problem.slug : '';
      if (slug === 'private-word-exists') setFailure({ text: t('exists', { word: lemma }), existing: lemma });
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
    setBack(view === 'manual' ? 'manual' : 'find');
    setUnmatched(null);
    setView('picker');
  };

  const deckField = noDecks ? (
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
  if (view === 'picker') {
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
        {lookup.isSuccess && options.length === 0 && <p className="rounded-inner bg-canvas p-3 text-ui text-ink">{t('noMatch', { word: lemma })}</p>}
        {options.length > 0 && (
          <div role="radiogroup" aria-label={t('pickSense')} className="flex flex-col gap-1 rounded-inner bg-primary-soft p-3">
            {via && via.senses.length > 0 && (
              <p className="text-ui font-semibold text-ink">{t('formOf', { word: lemma, kind: kind(via.kind), base: via.base.lemma })}</p>
            )}
            {options.map((o) => (
              <label key={o.sense.sense_id} className="flex cursor-pointer items-start gap-2 py-1">
                <input
                  type="radio"
                  name="add-word-sense"
                  checked={chosenSense?.sense.sense_id === o.sense.sense_id}
                  onChange={() => setPicked(o.sense.sense_id)}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 break-words text-ui text-ink">
                  <span className="font-semibold">{o.sense.lemma}</span> <span className="text-caption text-muted">{[o.sense.pos, o.sense.level].filter(Boolean).join(', ')}</span>
                  <span className="block">{o.sense.meaning.text}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        {deckField}
        {failureLine}
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onPress={onClose}>
          {tc('cancel')}
        </Button>
        <Button variant="quiet" onPress={() => setView('manual')}>
          {t('manualButton')}
        </Button>
        {options.length > 0 && !noDecks && (
          <Button variant="sticker" isPending={save.busy} onPress={() => void submit()}>
            {t('save', { word: lemma })}
          </Button>
        )}
      </>
    );
  }

  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} title={title} isDismissable={!save.busy} footer={footer}>
      {body}
    </Dialog>
  );
}
