'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { SpeakSentence } from '@/app-ui/SpeakButtons';
import { AddSentenceSheet } from '../add-word/AddSentenceSheet';
import { useGroups } from '../groups/groups-api';
import { highlightWord } from '../groups/highlight';
import { SavedSentencesDialog } from './SavedSentencesDialog';
import { STAGE_DAYS, useSentences, type ItemState, type PageSense } from './word-api';

/** "Bạn đang học" (copy §15 row 7): part of speech, meaning, each deck with its stage, the first saved sentence. */
export function LearningBlock({ sense, item, forms }: { sense: PageSense; item: ItemState; forms: string[] }) {
  const t = useTranslations('App.word');
  const groups = useGroups().data?.items ?? [];
  const [dialog, setDialog] = useState<'add' | 'list' | null>(null);
  const sentences = useSentences(sense.sentence_count > 0 ? sense.sense_id : null).data?.items ?? [];
  const decks = item.group_ids
    .map((id) => groups.find((g) => g.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .map((group) => (item.level === 0 ? t('stageNew', { group }) : t('stage', { group, days: STAGE_DAYS[item.level] ?? item.level })));

  return (
    <section aria-label={t('learningTitle')} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-ledge-soft">
      <h2 className="border-b border-border pb-2 text-title font-semibold text-ink">{t('learningTitle')}</h2>
      <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-ui">
        <Row label={t('rowPos')}>
          <span className="font-semibold">{sense.pos}</span>
        </Row>
        <Row label={t('rowMeaning')}>{sense.meaning.text}</Row>
        {decks.length > 0 && (
          <Row label={t('rowGroup')}>
            {decks.map((deck) => (
              <span key={deck} className="block">
                {deck}
              </span>
            ))}
          </Row>
        )}
        {sentences[0] && (
          <Row label={t('rowSentence')}>
            <p className="flex items-start gap-1 rounded-inner bg-accent-soft px-3 py-2 text-ink">
              <span className="min-w-0 flex-1 break-words">{highlightWord(sentences[0].text, sense.lemma, forms)}</span>
              <span className="shrink-0">
                <SpeakSentence private text={sentences[0].text} />
              </span>
            </p>
          </Row>
        )}
      </dl>
      <button
        type="button"
        onClick={() => setDialog('add')}
        className="w-fit text-caption font-semibold text-primary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {t('addSentence')}
      </button>
      {dialog === 'add' && <AddSentenceSheet sense={sense} onClose={() => setDialog(null)} onSeeAll={() => setDialog('list')} />}
      {dialog === 'list' && <SavedSentencesDialog lemma={sense.lemma} senseId={sense.sense_id} onClose={() => setDialog(null)} />}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-caption text-muted">{label}</dt>
      <dd className="col-span-2 min-w-0 break-words text-ink">{children}</dd>
    </>
  );
}
