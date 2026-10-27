'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/app-ui/Button';
import { SpeakSentence } from '@/app-ui/SpeakButtons';
import { highlightWord } from '../groups/highlight';
import { DeckPickerDialog } from '../add-word/DeckPickerDialog';
import { DeleteMyWordDialog, EditMyWordDialog } from './MyWordDialogs';
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

/**
 * One numbered meaning (K/31): part of speech and level, meaning, English definition, example; learning state or [Thêm vào nhóm].
 * A word of the learner's own (K/88) has no English definition (§15 point 11) and [Sửa] [Xóa từ] on the right instead.
 */
export function SenseBlock({ index, sense, item, forms }: { index: number; sense: PageSense; item: ItemState | undefined; forms: string[] }) {
  const t = useTranslations('App.word');
  const [dialog, setDialog] = useState<'sentences' | 'add' | 'edit' | 'delete' | null>(null);
  const mine = sense.scope === 'private';
  const headingId = `sense-${sense.sense_id}`;

  const sentencesButton: ReactNode =
    sense.sentence_count > 0 ? (
      <button type="button" onClick={() => setDialog('sentences')} className="font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {t('sentences', { count: sense.sentence_count })}
      </button>
    ) : null;

  const learning: ReactNode = item ? (
    <span className="inline-flex flex-wrap items-center gap-x-1 rounded-full bg-success-soft px-2.5 py-1 text-caption font-semibold text-success">
      {t('learning')}
      {sentencesButton && <> · {sentencesButton}</>}
    </span>
  ) : (
    <Button variant="quiet" onPress={() => setDialog('add')}>
      {t('addToGroup')}
    </Button>
  );

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
          {!mine && sense.definition_en && sense.definition_en !== sense.meaning.text && <p className="break-words text-caption text-muted">{sense.definition_en}</p>}
          {sense.examples[0] && (
            <p className="flex items-start gap-1">
              <span className="min-w-0 break-words text-ui text-ink">{highlightWord(sense.examples[0], sense.lemma, forms)}</span>
              <span className="shrink-0">
                <SpeakSentence text={sense.examples[0]} />
              </span>
            </p>
          )}
          {!item && sentencesButton && <p className="text-caption text-ink">{sentencesButton}</p>}
          {mine && <div className="mt-2 self-start">{learning}</div>}
        </div>
        <div className="mt-2 shrink-0 md:mt-0">
          {mine ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="quiet" onPress={() => setDialog('edit')}>
                {t('mine.edit')}
              </Button>
              <Button variant="danger" onPress={() => setDialog('delete')}>
                {t('mine.delete')}
              </Button>
            </div>
          ) : (
            learning
          )}
        </div>
      </div>
      {dialog === 'sentences' && <SavedSentencesDialog lemma={sense.lemma} senseId={sense.sense_id} onClose={() => setDialog(null)} />}
      {dialog === 'add' && <DeckPickerDialog sense={sense} onClose={() => setDialog(null)} />}
      {dialog === 'edit' && <EditMyWordDialog sense={sense} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && <DeleteMyWordDialog sense={sense} onClose={() => setDialog(null)} />}
    </article>
  );
}
