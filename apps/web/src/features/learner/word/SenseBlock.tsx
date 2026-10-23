'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/app-ui/Button';
import { useGroups } from '../groups/groups-api';
import { highlightWord } from '../groups/highlight';
import { DeckPickerDialog } from '../add-word/DeckPickerDialog';
import { SavedSentencesDialog } from './SavedSentencesDialog';
import { wordHref, type ItemState, type PageSense } from './word-api';

/** The meaning text with the base word of a form linked ("quá khứ của go"); the link is added after it when the text lacks it. */
function MeaningText({ sense }: { sense: PageSense }) {
  const locale = useLocale();
  const base = sense.form_of?.lemma;
  const text = sense.meaning.text;
  if (!base) return <>{text}</>;
  const link = (
    <Link href={wordHref(locale, base)} className="text-primary underline underline-offset-2">
      {base}
    </Link>
  );
  const match = new RegExp(`\\b${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).exec(text);
  if (!match) return <>{text} · {link}</>;
  return (
    <>
      {text.slice(0, match.index)}
      {link}
      {text.slice(match.index + base.length)}
    </>
  );
}

/** One numbered meaning (K/31): part of speech and level, meaning, English definition, example; learning state or [Thêm vào nhóm]. */
export function SenseBlock({ index, sense, item, forms }: { index: number; sense: PageSense; item: ItemState | undefined; forms: string[] }) {
  const t = useTranslations('App.word');
  const groups = useGroups().data?.items ?? [];
  const [dialog, setDialog] = useState<'sentences' | 'add' | null>(null);
  const deckNames = item ? item.group_ids.map((id) => groups.find((g) => g.id === id)?.name).filter(Boolean).join(', ') : '';
  const headingId = `sense-${sense.sense_id}`;

  const sentencesButton: ReactNode =
    sense.sentence_count > 0 ? (
      <button type="button" onClick={() => setDialog('sentences')} className="font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {t('sentences', { count: sense.sentence_count })}
      </button>
    ) : null;

  return (
    <article aria-labelledby={headingId} className="flex gap-4 py-5 first:pt-0 last:pb-0">
      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy text-caption font-bold text-on-navy">
        {index}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={headingId} className="text-ui font-bold text-ink">
              {sense.pos}
            </h2>
            {sense.level && <span className="rounded-sm bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">{sense.level}</span>}
          </div>
          <p className="break-words text-body font-semibold text-ink">
            <MeaningText sense={sense} />
          </p>
          {sense.definition_en && <p className="break-words text-caption text-muted">{sense.definition_en}</p>}
          {sense.examples[0] && <p className="break-words text-ui text-ink">{highlightWord(sense.examples[0], sense.lemma, forms)}</p>}
          {!item && sentencesButton && <p className="text-caption text-ink">{sentencesButton}</p>}
        </div>
        <div className="mt-2 shrink-0 md:mt-0">
          {item ? (
            <span className="inline-flex flex-wrap items-center gap-x-1 rounded-full bg-success-soft px-2.5 py-1 text-caption font-semibold text-success">
              {t('learning', { groups: deckNames })}
              {sentencesButton && <> · {sentencesButton}</>}
            </span>
          ) : (
            <Button variant="quiet" onPress={() => setDialog('add')}>
              {t('addToGroup')}
            </Button>
          )}
        </div>
      </div>
      {dialog === 'sentences' && <SavedSentencesDialog lemma={sense.lemma} senseId={sense.sense_id} onClose={() => setDialog(null)} />}
      {dialog === 'add' && <DeckPickerDialog sense={sense} onClose={() => setDialog(null)} />}
    </article>
  );
}
