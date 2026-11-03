'use client';

import { Volume2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { AppCopy, LandingCopy } from '../copy';

const FACE =
  'relative col-start-1 row-start-1 flex min-h-40 flex-col overflow-hidden rounded-card border-2 border-ink bg-surface shadow-ledge backface-hidden';

// A copy of the app's review card (features/learner/review/Flashcard.tsx) with sample data. Both faces share one grid cell, so the card
// is as tall as its taller face and does not overflow when it turns on a phone (design LRE3). The turned-away face is inert and aria-hidden.
export function ReviewCardDemo({ copy, app }: { copy: LandingCopy['showcase']['review']; app: AppCopy }) {
  const [flipped, setFlipped] = useState(false);
  const at = copy.seen.indexOf(copy.seenWord);
  return (
    <div data-ui role="group" aria-label={copy.deck} className="flex w-full min-w-0 flex-col gap-3">
      <div className="relative w-full perspective-distant">
        <div className={cn('relative grid transform-3d motion-safe:transition-transform motion-safe:duration-flip motion-safe:ease-standard', flipped && 'motion-safe:rotate-y-180')}>
          <div aria-hidden={flipped || undefined} inert={flipped} className={cn(FACE, flipped && 'motion-reduce:opacity-0')}>
            <button
              type="button"
              aria-pressed={flipped}
              aria-label={`${app.review.flip} ${copy.word}`}
              onClick={() => setFlipped((f) => !f)}
              className="flex flex-1 cursor-pointer flex-col p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <span className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-center">
                <span className="flex items-center gap-2 text-h2 font-extrabold break-all text-ink" lang="en">
                  {copy.word}
                  <Volume2 aria-hidden className="size-6 text-primary" />
                </span>
                <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-caption font-semibold text-ink">{copy.pos}</span>
              </span>
              <span className="self-center text-caption text-muted">
                <span className="hidden md:inline">{app.review.hintWeb}</span>
                <span className="md:hidden">{app.review.hintPhone}</span>
              </span>
            </button>
          </div>
          <div aria-hidden={!flipped || undefined} inert={!flipped} className={cn(FACE, 'motion-safe:rotate-y-180', !flipped && 'motion-reduce:opacity-0')}>
            <button type="button" tabIndex={-1} onClick={() => setFlipped(false)} className="flex flex-1 cursor-pointer flex-col text-left outline-none">
              <span className="flex min-w-0 flex-col gap-1 p-3.5">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-h3 font-bold break-all text-ink" lang="en">
                    {copy.word}
                  </span>
                  <span className="text-ui text-muted">{copy.pos}</span>
                </span>
                <span className="text-title font-bold break-words text-ink">{copy.meaning}</span>
              </span>
              <span className="flex flex-col gap-1 border-t border-border p-3.5">{/* taste-skill-ignore: the app's own flashcard divider */}
                <span className="text-caption font-semibold text-muted">{copy.exampleLabel}</span>
                <span className="text-ui text-ink" lang="en">
                  {copy.example}
                </span>
              </span>
              <span className="flex flex-col gap-1 bg-accent-soft p-3.5">
                <span className="text-caption font-semibold text-ink">{copy.seenLabel}</span>
                <span className="text-ui text-ink" lang="en">
                  {copy.seen.slice(0, at)}
                  <b className="font-bold text-primary">{copy.seenWord}</b>
                  {copy.seen.slice(at + copy.seenWord.length)}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
