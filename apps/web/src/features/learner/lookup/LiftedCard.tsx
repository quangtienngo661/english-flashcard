'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { PronunciationLine } from '@/ui/PronunciationLine';
import type { GroupSummary } from '../groups/groups-api';
import { STAGE_DAYS, wordHref, type ItemState, type PageSense } from '../word/word-api';
import { marked } from './DictionaryPage';
import type { WordRow } from './lookup-api';

/**
 * Figma "Thẻ nhấc lên" (85:3568): the selected entry lifted into a card, the next card blurred behind it. "n. · B1 · Công việc",
 * the head, UK / US with their speakers, the meaning, the example, and the deck and stage when the learner already learns it.
 * It arrives from below in 300ms (motion doc §4); with reduced motion it just appears.
 */
export function LiftedCard({ word, sense, item, groups }: { word: WordRow; sense?: PageSense; item?: ItemState; groups: GroupSummary[] }) {
  const t = useTranslations('App.lookup');
  const tw = useTranslations('App.word');
  const locale = useLocale();
  const meta = [sense?.pos ?? word.pos_list.join(', '), sense?.level ?? word.level, sense?.topics[0]?.name].filter(Boolean).join(' · ');
  const example = sense ? sense.examples[0] : word.example;
  const deck = item ? groups.find((g) => item.group_ids.includes(g.id)) : undefined;
  return (
    <section aria-label={t('card')} className="relative">
      <div aria-hidden className="lk-card-behind absolute inset-0 rounded-wm-xl border border-wm-line bg-wm-surface" />
      <div key={word.lemma} className="lk-card relative flex min-h-80 flex-col gap-3 rounded-wm-xl border border-wm-line bg-wm-surface p-6">
        <p className="text-wm-meta text-wm-muted">{meta}</p>
        <h2 className="break-all font-wm-display text-wm-lemma font-extrabold leading-tight text-wm-ink">{word.lemma}</h2>
        {sense?.pronunciation && <PronunciationLine text={word.lemma} line={{ scope: sense.scope, pronunciation: sense.pronunciation }} />}
        <p className="break-words font-wm-display text-wm-word text-wm-ink">{sense?.meaning.text ?? word.meaning_preview}</p>
        {example && (
          <p className="break-words border-t border-wm-line pt-3 font-wm-sans text-wm-base text-wm-ink">{marked(example, word.lemma)}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1">
          {item && deck ? (
            <p className="flex min-w-0 items-center gap-2 font-wm-sans text-wm-caption text-wm-muted">
              <span aria-hidden className={cn('size-2.5 shrink-0 rounded-xs', groupTone(deck.id, deck.total).bg)} />
              {item.level === 0 ? tw('stageNew', { group: deck.name }) : tw('stage', { group: deck.name, days: STAGE_DAYS[item.level] ?? 30 })}
            </p>
          ) : (
            <span />
          )}
          <Link
            href={wordHref(locale, word.lemma)}
            className="ml-auto inline-flex min-h-11 items-center font-wm-sans text-wm-small-strong text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent md:min-h-0"
          >
            {t('openWordArrow')}
          </Link>
        </div>
      </div>
    </section>
  );
}
