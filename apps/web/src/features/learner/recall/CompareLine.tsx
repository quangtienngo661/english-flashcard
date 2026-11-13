'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

export type Letter = { char: string; mark: 'same' | 'extra' | 'missing' };

/**
 * Lines the typed word up with the answer through their longest common subsequence: a typed letter outside it is extra, an answer
 * letter outside it is missing (a substitution is one of each, at the same place). Case is ignored, as the grading ignores it.
 */
export function compareLetters(typed: string, answer: string): { typed: Letter[]; answer: Letter[] } {
  const a = [...typed];
  const b = [...answer];
  const same = (x: string, y: string) => x.toLowerCase() === y.toLowerCase();
  // lcs[i][j]: common length of a[i..] and b[j..].
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = same(a[i], b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const outTyped: Letter[] = [];
  const outAnswer: Letter[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (same(a[i], b[j])) {
      outTyped.push({ char: a[i++], mark: 'same' });
      outAnswer.push({ char: b[j++], mark: 'same' });
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) outTyped.push({ char: a[i++], mark: 'extra' });
    else outAnswer.push({ char: b[j++], mark: 'missing' });
  }
  while (i < a.length) outTyped.push({ char: a[i++], mark: 'extra' });
  while (j < b.length) outAnswer.push({ char: b[j++], mark: 'missing' });
  return { typed: outTyped, answer: outAnswer };
}

/**
 * Figma 209:5902 "so chữ": once the answer is shown, the typed word above the answer, extra letters struck in red, missing ones
 * underlined in green. Screen readers get both words in one name; the marks are visual only. P.13 (chỗ 18, mockup L1270-1272): it takes
 * the answer field's place inside the question card, under a hairline; the typed word struck in red, the answer in green.
 */
export function CompareLine({ typed, answer }: { typed: string; answer: string }) {
  const t = useTranslations('App.recall.compare');
  const letters = compareLetters(typed, answer);
  return (
    <div role="group" aria-label={t('label', { typed, answer })} className="flex flex-col gap-1.5 border-t border-wm-line pt-3 motion-safe:animate-wm-feedback-in">
      <Row label={t('typed')} letters={letters.typed} tone="text-wm-fail line-through decoration-2" />
      <Row label={t('answer')} letters={letters.answer} tone="text-wm-pass" />
    </div>
  );
}

function Row({ label, letters, tone }: { label: string; letters: Letter[]; tone: string }) {
  return (
    <p aria-hidden className="flex flex-wrap items-baseline gap-3.5">
      <span className="w-20 shrink-0 text-wm-meta text-wm-muted">{label}</span>
      <span className={cn('min-w-0 break-all text-wm-word tracking-wide', tone)}>
        {letters.map((letter, i) => (
          <span
            key={i}
            data-mark={letter.mark}
            className={cn(
              letter.mark === 'extra' && 'rounded-wm-key bg-wm-fail-soft text-wm-fail line-through',
              letter.mark === 'missing' && 'rounded-wm-key bg-wm-pass-soft text-wm-pass underline decoration-2 underline-offset-4',
            )}
          >
            {letter.char}
          </span>
        ))}
      </span>
    </p>
  );
}
