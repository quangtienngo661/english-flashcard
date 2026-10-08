'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';

type FlashcardProps = { word: string; meaning: string; hint: string };

export function Flashcard({ word, meaning, hint }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const reduced = useReducedMotion();
  const face = 'absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-panel backface-hidden';

  return (
    <button
      type="button"
      aria-pressed={flipped}
      onClick={() => setFlipped((v) => !v)}
      className="group block min-h-45 w-full rounded-panel perspective-distant"
    >
      <span
        data-testid="flashcard-inner"
        className={cn(
          'relative block min-h-45 w-full transform-3d',
          !reduced && 'transition-transform duration-flip ease-out',
          flipped && 'rotate-y-180',
        )}
      >
        <span className={cn(face, 'border border-border bg-surface')} aria-hidden={flipped}>
          <span className="text-h2 font-extrabold text-ink">{word}</span>{' '}
          <span className="text-small font-medium text-muted">{hint}</span>
        </span>
        <span className={cn(face, 'rotate-y-180 bg-primary')} aria-hidden={!flipped}>
          <span className="text-title-lg font-extrabold text-on-primary">{meaning}</span>{' '}
          <span className="text-small font-medium text-on-primary">{word}</span>
        </span>
      </span>
    </button>
  );
}
