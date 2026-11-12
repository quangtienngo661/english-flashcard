'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** What fills the blank once the learner answered (Figma 178:5326, 178:5546, 100:3164). */
export type BlankFill = {
  /** The right word, green. */
  right?: string;
  /** The wrong word typed: red, struck through (dashed) when the answer is shown, with "lần N" while the learner may retry. */
  wrong?: string;
  attempt?: number;
};

const BLANK = /_{2,}/;
const SENTENCE = 'break-words font-wm-display text-wm-card-title text-wm-ink md:text-wm-lemma';

/**
 * The sentence in large type (K/78a–K/78c); `highlight` is set in bold where it occurs (K/78b). Before an answer the sentence
 * stays one text with its blank; after it, the blank holds the word chips.
 */
export function SentenceText({ sentence, highlight, fill }: { sentence: string; highlight?: string; fill?: BlankFill | null }) {
  const t = useTranslations('App.practice.session');
  const blank = sentence.match(BLANK);
  if (fill && blank?.index !== undefined && (fill.right || fill.wrong)) {
    const struck = Boolean(fill.right && fill.wrong);
    return (
      <p className={SENTENCE}>
        {sentence.slice(0, blank.index)}
        {fill.wrong && (
          <Chip tone="fail" struck={struck}>
            {fill.wrong}
            {fill.attempt !== undefined && <span className="ml-2 align-middle text-wm-meta">{t('attempt', { n: fill.attempt })}</span>}
          </Chip>
        )}
        {fill.right && <Chip tone="pass">{fill.right}</Chip>}
        {sentence.slice(blank.index + blank[0].length)}
      </p>
    );
  }
  let content: ReactNode = sentence;
  const at = highlight ? sentence.indexOf(highlight) : -1;
  if (highlight && at >= 0) {
    content = (
      <>
        {sentence.slice(0, at)}
        <strong className="font-extrabold underline decoration-wm-accent decoration-2 underline-offset-4">{highlight}</strong>
        {sentence.slice(at + highlight.length)}
      </>
    );
  }
  return <p className={SENTENCE}>{content}</p>;
}

function Chip({ tone, struck = false, children }: { tone: 'pass' | 'fail'; struck?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'mx-1 inline-block rounded-wm-md border-2 px-3',
        tone === 'pass' ? 'border-wm-pass bg-wm-pass-soft text-wm-pass' : 'border-wm-fail bg-wm-fail-soft text-wm-fail',
        struck && 'border-dashed line-through',
      )}
    >
      {children}
    </span>
  );
}
