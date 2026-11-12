import { cn } from '@/lib/cn';

/**
 * The answer blank of a practice question: exactly as wide as the word, so it does not grow while typing and fits once green.
 * An invisible copy of the whole word reserves the width; only the typed letters are visible to readers.
 */
export function TypingBlank({ word, typed, done, motion }: { word: string; typed: number; done: boolean; motion: boolean }) {
  return (
    <span
      className={cn(
        'relative inline-block px-1',
        done
          ? 'rounded-wm-control border border-wm-pass bg-wm-pass-soft text-wm-pass'
          : 'rounded-t-wm-control border-b-2 border-wm-accent bg-wm-showcase-blank text-wm-accent',
      )}
    >
      <span aria-hidden className="invisible">{word}</span>
      <span className="absolute inset-y-0 left-1 whitespace-nowrap">
        {word.slice(0, typed)}
        {motion && !done && <span className="ml-px inline-block h-4 w-0.5 bg-wm-accent align-middle animate-wm-showcase-caret" />}
      </span>
    </span>
  );
}
