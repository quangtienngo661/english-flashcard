'use client';

import { Languages } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** What fills the blank once the learner answered (Figma 178:5326, 178:5546, 100:3164). */
export type BlankFill = {
  /** The right word, green. */
  right?: string;
  /** The wrong word typed: struck through in a dashed red box, beside the right word. */
  wrong?: string;
};

const BLANK = /_{2,}/;
// raw-ok: mockup L329 sets the sentence translation at 17 px / 1.5; no type token has that size.
const TRANSLATION_TEXT = 'min-w-0 flex-1 break-words font-wm-sans text-[1.0625rem]/[1.5] text-wm-ink';
const SENTENCE = 'break-words font-wm-display text-wm-card-title text-wm-ink md:text-wm-lemma';

/**
 * The sentence in large type (K/78a–K/78c); `highlight` is set in bold where it occurs (K/78b). Before an answer the sentence
 * stays one text with its blank, or holds `input` in the blank (a typed fill-in, P.13); after it, the blank holds the word chips.
 */
export function SentenceText({ sentence, highlight, fill, input }: { sentence: string; highlight?: string; fill?: BlankFill | null; input?: ReactNode }) {
  const blank = sentence.match(BLANK);
  const filled = fill?.right;
  if (blank?.index !== undefined && (filled || input)) {
    return (
      <p className={SENTENCE}>
        {sentence.slice(0, blank.index)}
        {filled ? (
          <>
            {fill.wrong && (
              <>
                <Chip tone="fail" struck>
                  {fill.wrong}
                </Chip>
                {/* A real space between the two words, so the sentence reads "deplay deploy", not "deplaydeploy". */}{' '}
              </>
            )}
            <Chip tone="pass">{fill.right}</Chip>
          </>
        ) : (
          input
        )}
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

/** A word in the blank (mockup L320-321): the answer in a pass box; a wrong word struck through in a dashed fail box (`del`). */
function Chip({ tone, struck = false, children }: { tone: 'pass' | 'fail'; struck?: boolean; children: ReactNode }) {
  const Tag = struck ? 'del' : 'span';
  return (
    <Tag
      className={cn(
        'mx-1 inline-block rounded-wm-control border-2 px-2',
        tone === 'pass' ? 'border-wm-pass bg-wm-pass-soft text-wm-pass' : 'border-wm-fail bg-wm-fail-soft text-wm-fail',
        struck && 'border-dashed line-through decoration-2',
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * K/79a, P.13 (mockup L326-331): the AI's translation of the sentence, once answered, in its own block under the sentence inside the
 * card: a 7 % accent wash with a 22 % accent line, the translate icon, the text, and the "AI translation" chip at the right.
 */
export function TranslationBlock({ text }: { text: string }) {
  const t = useTranslations('App.practice.session');
  return (
    <section
      aria-label={t('translationAi')}
      className="flex items-center gap-3 rounded-wm-row border border-wm-translation-line bg-wm-translation-soft px-4 py-3 motion-safe:animate-wm-feedback-in"
    >
      <Languages aria-hidden className="size-5 shrink-0 text-wm-accent" />
      <p className={TRANSLATION_TEXT}>{text}</p>
      <span className="shrink-0 rounded-wm-key border border-wm-translation-chip-line px-2 py-0.5 font-wm-sans text-wm-meta text-wm-accent">{t('translationAi')}</span>
    </section>
  );
}
