'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { PronunciationLine } from '@/ui/PronunciationLine';
import { SpeakSentence } from '@/ui/SpeakButton';
import { TextButton } from '@/ui/TextButton';
import { DeckPickerDialog } from '../add-word/DeckPickerDialog';
import { marked } from '../lookup/DictionaryPage';
import { LevelTag } from './LearningBlock';
import { SavedSentencesDialog } from './SavedSentencesDialog';
import type { PronLine } from '@/lib/speech/pronunciation';
import { wordHref, type ItemState, type PageSense } from './word-api';

/** The meaning text with the base word of a form linked ("quá khứ của go"); the link is added after it when the text lacks it. */
function MeaningText({ sense }: { sense: PageSense }) {
  const locale = useLocale();
  const base = sense.form_of?.lemma;
  const text = sense.meaning.text;
  if (!base) return <>{text}</>;
  const link = (
    <Link href={wordHref(locale, base)} className="text-wm-accent underline underline-offset-2">
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
 * One numbered meaning (Figma 118:4413 "Nghĩa noun"): meaning, English definition (catalog only, §15 point 11), the example with the
 * word marked and its speaker, "N câu đã gặp", then the stage tag of a meaning being learned or [Thêm vào nhóm] (Overlay 5).
 */
export function SenseBlock({ index, sense, item, groupName, forms, ownLine }: {
  index: number; sense: PageSense; item: ItemState | undefined; groupName: string | undefined; forms: string[];
  /** Đợt C §5.3: this sense reads differently from its block (`lead` the metal), so it shows its own line. */
  ownLine?: PronLine;
}) {
  const t = useTranslations('App.word');
  const [dialog, setDialog] = useState<'sentences' | 'add' | null>(null);
  const mine = sense.scope === 'private';
  const headingId = `sense-${sense.sense_id}`;

  return (
    <article aria-labelledby={headingId} className="flex gap-3 py-4 md:gap-4">
      <span aria-hidden className="w-4.5 shrink-0 pt-1 text-wm-meta text-wm-muted md:w-6">
        {index}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 id={headingId} className="break-words font-wm-display text-wm-word text-wm-ink">
            <MeaningText sense={sense} />
          </h3>
          {ownLine && <PronunciationLine text={sense.lemma} line={ownLine} />}
          {!mine && sense.definition_en && sense.definition_en !== sense.meaning.text && (
            <p className="max-w-lg break-words font-wm-sans text-wm-small text-wm-muted">{sense.definition_en}</p>
          )}
          {sense.examples[0] && (
            <div className="flex items-start gap-1">
              <p className="min-w-0 break-words font-wm-sans text-wm-small text-wm-ink">{marked(sense.examples[0], sense.lemma, forms)}</p>
              <span className="shrink-0">
                <SpeakSentence text={sense.examples[0]} />
              </span>
            </div>
          )}
          {sense.sentence_count > 0 && (
            <TextButton className="self-start" onPress={() => setDialog('sentences')}>
              {t('sentences', { count: sense.sentence_count })}
            </TextButton>
          )}
        </div>
        <div className="shrink-0">
          {item ? (
            <LevelTag level={item.level} group={groupName} />
          ) : (
            <TextButton tone="add" onPress={() => setDialog('add')}>
              {t('addToGroup')}
            </TextButton>
          )}
        </div>
      </div>
      {dialog === 'sentences' && <SavedSentencesDialog lemma={sense.lemma} senseId={sense.sense_id} onClose={() => setDialog(null)} />}
      {dialog === 'add' && <DeckPickerDialog sense={sense} onClose={() => setDialog(null)} />}
    </article>
  );
}
