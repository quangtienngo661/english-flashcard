import { CircleCheck } from 'lucide-react';
import type { AppCopy, LandingCopy } from '../copy';

// An AI question already answered, in the look of the practice session's question card (features/learner/practice/session/QuestionCard.tsx):
// the "Câu AI" and kind chips, the sentence, and the typed answer in its right state.
export function PracticeDemo({ copy, app }: { copy: LandingCopy['showcase']['practice']; app: AppCopy }) {
  return (
    <section data-ui aria-label={copy.title} className="flex min-w-0 flex-col gap-3 rounded-feature border-2 border-border-strong bg-surface p-4 shadow-ledge">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-semibold text-primary">{copy.aiChip}</span>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-on-accent">{app.kinds.cloze}</span>
      </div>
      <p className="text-body font-semibold break-words text-ink" lang="en">
        {copy.sentenceBefore} <strong className="font-extrabold">{copy.word}</strong> {copy.sentenceAfter}
      </p>
      <div className="flex min-h-control-touch items-center justify-between gap-2 rounded-inner border-2 border-success bg-success-soft px-3 text-body font-semibold text-success" lang="en">
        {copy.word}
        <CircleCheck aria-hidden className="size-5" />
      </div>
    </section>
  );
}
