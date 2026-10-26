'use client';

import { useTranslations } from 'next-intl';
import { Select } from '@/app-ui/Select';
import { TextField } from '@/app-ui/TextField';
import { LEVELS, POS, useTopics } from '../lookup/lookup-api';
import type { AiLookupResult } from './ai-lookup-api';

const LEMMA_MAX = 100;
const MEANING_MAX = 300;
const EXAMPLE_MAX = 300;
/** A private word keeps at most two examples (API `PRIVATE_EXAMPLES_MAX`). */
const EXAMPLES_MAX = 2;
const NONE = 'none';

/** The fields a learner can change on their own word; '' means "not set" for part of speech, level and topic. */
export type WordDraft = { lemma: string; pos: string; meaning: string; level: string; topic: string; examples: string[] };

export function draftFromSuggestion(s: AiLookupResult['suggestion']): WordDraft {
  return {
    lemma: s.lemma,
    pos: (POS as readonly string[]).includes(s.part_of_speech) ? s.part_of_speech : '',
    meaning: s.meaning.text,
    // The AI answer has no level (Bước 7 `lookup_word`): the learner sets one if they want.
    level: '',
    topic: '',
    examples: s.examples.slice(0, EXAMPLES_MAX),
  };
}

/** The examples as the API takes them: trimmed, empty ones dropped. */
export const cleanExamples = (examples: string[]) => examples.map((e) => e.trim()).filter(Boolean);

/**
 * K/87 (and [Sửa] on K/88): word, part of speech, meaning, level, topic, up to two examples. The caller adds the deck and the
 * buttons; the same fields edit a saved word on its page.
 */
export function EditSuggestionForm({ value, onChange, meaningError, formOf }: {
  value: WordDraft;
  onChange: (next: WordDraft) => void;
  meaningError?: string;
  /** "Dạng chia của": shown when Wordmet recognised the word as a form (it is sent as recognised, not typed). */
  formOf?: string;
}) {
  const t = useTranslations('App.addWord.edit');
  const topics = useTopics().data?.items ?? [];
  const set = (patch: Partial<WordDraft>) => onChange({ ...value, ...patch });
  const optional = (id: string) => (id === NONE ? '' : id);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('word')} value={value.lemma} onChange={(lemma) => set({ lemma })} maxLength={LEMMA_MAX} />
        <Select
          label={t('pos')}
          items={[{ id: NONE, label: '—' }, ...POS.map((p) => ({ id: p, label: p }))]}
          value={value.pos}
          onChange={(id) => set({ pos: optional(id) })}
          placeholder="—"
        />
      </div>
      <TextField label={t('meaning')} value={value.meaning} onChange={(meaning) => set({ meaning })} maxLength={MEANING_MAX} error={meaningError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t('level')}
          items={[{ id: NONE, label: '—' }, ...LEVELS.map((l) => ({ id: l, label: l }))]}
          value={value.level}
          onChange={(id) => set({ level: optional(id) })}
          placeholder="—"
        />
        <Select
          label={t('topic')}
          items={[{ id: NONE, label: '—' }, ...topics.map((topic) => ({ id: topic.code, label: topic.name }))]}
          value={value.topic}
          onChange={(id) => set({ topic: optional(id) })}
          placeholder="—"
        />
      </div>
      {formOf && (
        <p className="text-caption text-ink">
          <span className="font-medium">{t('formOf')}</span> {formOf}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-ui font-medium text-ink">{t('examples')}</span>
        {value.examples.map((example, i) => (
          <TextField
            key={i}
            label={t('example', { n: i + 1 })}
            value={example}
            onChange={(text) => set({ examples: value.examples.map((e, j) => (j === i ? text : e)) })}
            maxLength={EXAMPLE_MAX}
          />
        ))}
        {value.examples.length < EXAMPLES_MAX && (
          <button
            type="button"
            onClick={() => set({ examples: [...value.examples, ''] })}
            className="self-start text-ui font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('addExample')}
          </button>
        )}
        <p className="text-caption text-muted">{t('exampleHint')}</p>
      </div>
    </div>
  );
}
