'use client';

import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { shownPos } from '@/lib/pos';
import { TargetWord } from '@/ui/TargetWord';
import { wordHref } from '../word/word-api';
import type { WordRow } from './lookup-api';

/** Dictionary abbreviations of the parts of speech (Figma: "n.", "v.", "n., v."); others are written out. */
const POS_SHORT: Record<string, string> = { noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.', pronoun: 'pron.', preposition: 'prep.', conjunction: 'conj.' };

/** "n., v." for the parts of speech that were set; empty when none was. */
const posLabel = (list: string[]) => list.filter((p) => shownPos(p)).map((p) => POS_SHORT[p] ?? p).join(', ');

/**
 * Figma "Trang từ điển" (85:3285): a paper page with a running header (first word · trang N · last word), letter headings and one
 * entry per word: head, IPA, part of speech, level, "của tôi"; "1" and the meaning; the example with the word highlighted. An entry
 * with no IPA or example has no line for it. Focus or a click selects an entry (not hover: the mouse crosses entries on its way to the stacks); ↑ ↓ move between entries.
 * With `linked` (below 1024 px, where Tra từ has no card) each entry is a link to its word page instead (owner 14/11/2026).
 */
export function DictionaryPage({ words, page, selected, linked = false, onSelect, onPrev, onNext }: {
  words: WordRow[];
  page: number;
  selected: string | null;
  linked?: boolean;
  onSelect: (lemma: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const t = useTranslations('App.lookup');
  const letters = groupByLetter(words);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const entries = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-lemma]')];
    const at = entries.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    const next = entries[at + (event.key === 'ArrowDown' ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    next.focus();
  }

  return (
    <article data-surface="paper" className="lk-paper flex min-w-0 flex-col px-5 pb-8 pt-6 md:px-12 md:pb-10 md:pt-8">
      <header
        // raw-ok: Figma's running header, first word left, page number centred, last word right
        className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 border-b-2 border-wm-ink pb-1.5"
      >
        <span className="truncate font-wm-display text-wm-small font-extrabold md:text-wm-word">{words[0]?.lemma}</span>
        <span className="text-wm-meta text-wm-muted">{t('page', { n: page })}</span>
        <span className="truncate text-right font-wm-display text-wm-small font-extrabold md:text-wm-word">{words.at(-1)?.lemma}</span>
      </header>
      <div className="mt-4 flex flex-col" onKeyDown={onKeyDown}>
        {letters.map(([letter, items]) => (
          <section key={letter} aria-labelledby={`lk-letter-${letter}`} className="flex flex-col gap-1">
            <h3 id={`lk-letter-${letter}`} className="mt-3 flex items-center gap-2.5 font-wm-display text-wm-word font-extrabold leading-none text-wm-muted after:h-px after:flex-1 after:bg-current after:opacity-25 first:mt-0">
              {letter}
            </h3>
            <ul className="flex flex-col gap-1">
              {items.map((word) => (
                <li key={word.lemma}>
                  <Entry word={word} current={word.lemma === selected} linked={linked} onSelect={() => onSelect(word.lemma)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <footer className="mt-5 flex items-center justify-between gap-3 text-wm-meta">
        {onPrev ? (
          <button type="button" onClick={onPrev} className="font-bold text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent">
            {t('prev')}
          </button>
        ) : (
          <span aria-hidden />
        )}
        <span className="text-wm-muted">{t('pageFoot', { n: page })}</span>
        {onNext ? (
          <button type="button" onClick={onNext} className="inline-flex items-center gap-1 font-bold text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent">
            {t('next')}
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
          </button>
        ) : (
          <span aria-hidden />
        )}
      </footer>
    </article>
  );
}

const ENTRY = cn(
  // raw-ok: the entry's hover box reaches into the page margin by its own padding
  'lk-entry -mx-2.5 flex w-[calc(100%+1.25rem)] flex-col gap-0.5 rounded-wm-row px-2.5 py-2 text-left outline-none',
  'hover:bg-wm-ink/4 focus-visible:outline-3 focus-visible:outline-wm-accent',
);

function Entry({ word, current, linked, onSelect }: { word: WordRow; current: boolean; linked: boolean; onSelect: () => void }) {
  const locale = useLocale();
  if (linked) {
    return (
      <Link href={wordHref(locale, word.lemma)} data-lemma={word.lemma} className={ENTRY}>
        <EntryBody word={word} />
      </Link>
    );
  }
  return (
    <button type="button" data-lemma={word.lemma} aria-current={current} onClick={onSelect} onFocus={onSelect} className={ENTRY}>
      <EntryBody word={word} />
    </button>
  );
}

function EntryBody({ word }: { word: WordRow }) {
  const t = useTranslations('App.lookup');
  const meaning = /[.!?…]$/.test(word.meaning_preview) ? word.meaning_preview : `${word.meaning_preview}.`;
  return (
    <>
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="break-all font-wm-display text-wm-word font-extrabold tracking-tight text-wm-ink md:text-wm-logo">{word.lemma}</span>
        {word.ipa && <span className="font-wm-sans text-wm-small text-wm-muted">/{word.ipa}/</span>}
        {posLabel(word.pos_list) && <i className="font-wm-sans text-wm-small text-wm-muted">{posLabel(word.pos_list)}</i>}
        {word.level && <span className="text-wm-meta font-bold text-wm-muted">{word.level}</span>}
        {word.has_private && <span className="text-wm-meta text-wm-accent">{t('mineTag')}</span>}
      </span>
      <span className="flex items-baseline gap-1.5 font-wm-sans text-wm-base text-wm-ink">
        <b className="text-wm-meta font-bold text-wm-muted">1</b>
        <span className="min-w-0 break-words">{meaning}</span>
      </span>
      {word.example && (
        // The italic example keeps its target upright, bold and underlined (mockup L1342, L723).
        <span className="break-words font-wm-sans text-wm-small italic text-wm-muted [&_strong]:not-italic">
          <TargetWord text={word.example} lemma={word.lemma} />
        </span>
      )}
    </>
  );
}

/** Words under their first letter, in the API's order. */
function groupByLetter(words: WordRow[]): Array<[string, WordRow[]]> {
  const out: Array<[string, WordRow[]]> = [];
  for (const word of words) {
    const letter = word.lemma.charAt(0).toLocaleUpperCase('vi');
    const last = out.at(-1);
    if (last && last[0] === letter) last[1].push(word);
    else out.push([letter, [word]]);
  }
  return out;
}
