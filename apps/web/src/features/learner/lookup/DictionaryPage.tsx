'use client';

import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import type { WordRow } from './lookup-api';

/** Dictionary abbreviations of the parts of speech (Figma: "n.", "v.", "n., v."); others are written out. */
const POS_SHORT: Record<string, string> = { noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.', pronoun: 'pron.', preposition: 'prep.', conjunction: 'conj.' };

/**
 * Figma "Trang từ điển" (85:3285): a paper page with a running header (first word · trang N · last word), letter headings and one
 * entry per word: head, IPA, part of speech, level, "của tôi"; "1" and the meaning; the example with the word highlighted. An entry
 * with no IPA or example has no line for it. Hover, focus or a click selects an entry; ↑ ↓ move between entries.
 */
export function DictionaryPage({ words, page, selected, onSelect, onPrev, onNext }: {
  words: WordRow[];
  page: number;
  selected: string | null;
  onSelect: (lemma: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const t = useTranslations('App.lookup');
  const letters = groupByLetter(words);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const entries = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-lemma]')];
    const at = entries.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const next = entries[at + (event.key === 'ArrowDown' ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    next.focus();
  }

  return (
    <article className="lk-paper flex min-w-0 flex-col px-5 pb-8 pt-6 md:px-12 md:pb-10 md:pt-8">
      <header
        // raw-ok: Figma's running header, first word left, page number centred, last word right
        className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 border-b-2 border-wm-ink pb-1.5"
      >
        <span className="truncate font-wm-display text-wm-small font-extrabold md:text-wm-word">{words[0]?.lemma}</span>
        <span className="font-wm-mono text-wm-mono text-wm-muted">{t('page', { n: page })}</span>
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
                  <Entry word={word} current={word.lemma === selected} onSelect={() => onSelect(word.lemma)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <footer className="mt-5 flex items-center justify-between gap-3 font-wm-mono text-wm-mono">
        {onPrev ? (
          <button type="button" onClick={onPrev} className="font-bold text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent">
            {t('prev')}
          </button>
        ) : (
          <span aria-hidden />
        )}
        <span className="text-wm-muted">{t('pageFoot', { n: page })}</span>
        {onNext ? (
          <button type="button" onClick={onNext} className="font-bold text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent">
            {t('next')}
          </button>
        ) : (
          <span aria-hidden />
        )}
      </footer>
    </article>
  );
}

function Entry({ word, current, onSelect }: { word: WordRow; current: boolean; onSelect: () => void }) {
  const t = useTranslations('App.lookup');
  const meaning = /[.!?…]$/.test(word.meaning_preview) ? word.meaning_preview : `${word.meaning_preview}.`;
  return (
    <button
      type="button"
      data-lemma={word.lemma}
      aria-current={current}
      onClick={onSelect}
      onFocus={onSelect}
      onMouseEnter={onSelect}
      className={cn(
        // raw-ok: the entry's hover box reaches into the page margin by its own padding
        'lk-entry -mx-2.5 flex w-[calc(100%+1.25rem)] flex-col gap-0.5 rounded-wm-md px-2.5 py-2 text-left outline-none',
        'hover:bg-wm-ink/4 focus-visible:outline-3 focus-visible:outline-wm-accent',
      )}
    >
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="break-all font-wm-display text-wm-word font-extrabold tracking-tight text-wm-ink md:text-wm-logo">{word.lemma}</span>
        {word.ipa && <span className="font-wm-sans text-wm-small text-wm-muted">/{word.ipa}/</span>}
        {word.pos_list.length > 0 && <i className="font-wm-sans text-wm-small text-wm-muted">{word.pos_list.map((p) => POS_SHORT[p] ?? p).join(', ')}</i>}
        {word.level && <span className="font-wm-mono text-wm-mono font-bold text-wm-muted">{word.level}</span>}
        {word.has_private && <span className="font-wm-mono text-wm-mono text-wm-accent">{t('mineTag')}</span>}
      </span>
      <span className="flex items-baseline gap-1.5 font-wm-sans text-wm-base text-wm-ink">
        <b className="font-wm-mono text-wm-mono font-bold text-wm-muted">1</b>
        <span className="min-w-0 break-words">{meaning}</span>
      </span>
      {word.example && <span className="break-words font-wm-sans text-wm-small italic text-wm-muted">{marked(word.example, word.lemma)}</span>}
    </button>
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

/** The form of the word in its example, highlighted ("three **candidates** for"). */
export function marked(sentence: string, word: string) {
  const stem = word.length > 3 && /e$/.test(word) ? word.slice(0, -1) : word;
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`\\b${escaped}\\w*`, 'i').exec(sentence);
  if (!match) return sentence;
  return (
    <>
      {sentence.slice(0, match.index)}
      <mark className="rounded-xs bg-wm-mark px-0.75 not-italic text-wm-mark-ink">{match[0]}</mark>
      {sentence.slice(match.index + match[0].length)}
    </>
  );
}
