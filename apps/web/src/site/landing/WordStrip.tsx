import { cn } from '@/lib/cn';
import type { LandingCopy } from './copy';

type Word = LandingCopy['strip']['row1'][number];

/** Highlighted chips (Figma desktop `6:40`: allocate, viable in row 1; alleviate, feasible in row 2). */
const HIGHLIGHT = new Set(['allocate', 'viable', 'alleviate', 'feasible']);

/**
 * "Dải từ IELTS" `6:40` (phone `9:213`): two rows of word chips, the second set further left, faded at both edges from md. Decorative
 * (the words come back in the groups section), so it is hidden from screen readers. M8.6 duplicates each row and moves it.
 */
export function WordStrip({ copy }: { copy: LandingCopy['strip'] }) {
  return (
    <div aria-hidden className="relative flex flex-col gap-4 overflow-hidden py-1.5">
      <Row words={copy.row1} className="-ml-15" />
      <Row words={copy.row2} className="-ml-55" />
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-50 bg-linear-to-r from-wm-bg to-transparent md:block" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-50 bg-linear-to-l from-wm-bg to-transparent md:block" />
    </div>
  );
}

function Row({ words, className }: { words: Word[]; className: string }) {
  return (
    <div data-strip-row="" className={cn('flex w-max gap-2.5', className)}>
      {words.map(({ word, pos }) => {
        const lit = HIGHLIGHT.has(word);
        return (
          <span
            key={word}
            className={cn(
              'inline-flex items-baseline gap-2 rounded-wm-lg border px-4 py-2.5',
              lit ? 'border-wm-accent bg-wm-accent-soft shadow-wm-btn' : 'border-wm-line bg-wm-surface shadow-wm-soft',
            )}
          >
            <span className={cn('font-wm-display text-wm-word', lit ? 'text-wm-accent' : 'text-wm-ink')}>{word}</span>
            <span className="font-wm-sans text-wm-caption text-wm-muted">{pos}</span>
          </span>
        );
      })}
    </div>
  );
}
