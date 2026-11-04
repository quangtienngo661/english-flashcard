import { Volume2 } from 'lucide-react';
import type { LandingCopy } from '../copy';

// The word page (features/learner/word): the word and level, the inflected forms, one sense with its example.
export function LookupDemo({ copy }: { copy: LandingCopy['showcase']['lookup'] }) {
  const at = copy.example.indexOf(copy.exampleWord);
  return (
    <div data-ui role="group" aria-label={copy.title} className="flex w-full min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-sheet">
      <div className="flex items-center gap-3">
        <b className="text-h2 font-extrabold text-ink" lang="en">
          {copy.word}
        </b>
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-primary">{copy.level}</span>
        <Volume2 aria-hidden className="size-5 text-primary" />
      </div>
      <p className="rounded-inner bg-accent-soft px-3 py-2 text-label font-semibold text-ink" lang="en">
        + {copy.forms}
      </p>
      <div className="flex gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-small font-bold text-surface">1</span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-caption font-semibold text-ink" lang="en">
              {copy.pos}
            </span>
            <b className="text-body text-ink">{copy.meaning}</b>
          </p>
          <p className="text-ui text-ink" lang="en">
            {copy.example.slice(0, at)}
            <b className="font-bold text-primary">{copy.exampleWord}</b>
            {copy.example.slice(at + copy.exampleWord.length)}
          </p>
        </div>
      </div>
    </div>
  );
}
