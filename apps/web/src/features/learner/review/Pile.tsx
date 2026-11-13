'use client';

import { useEffect, useRef } from 'react';
import { bump, chipIn } from '@/lib/stack-motion';
import { cn } from '@/lib/cn';
import { WordChip } from '@/ui/WordChip';

const SHOWN = 5;

/**
 * One pile beside the Học stack (mockup L222-229, L1172-1174): its count in large type, its name under it, both centred, no arrows. On
 * desktop the last five words drop in under them, newest on top; a phone shows the count only (mockup L293). The count bumps when it grows.
 */
export function Pile({ tone, label, words, chips = true, className }: {
  tone: 'review' | 'known'; label: string; words: string[]; chips?: boolean; className?: string;
}) {
  const countRef = useRef<HTMLSpanElement>(null);
  const seen = useRef(words.length);
  useEffect(() => {
    if (words.length > seen.current && countRef.current) void bump(countRef.current);
    seen.current = words.length;
  }, [words.length]);
  const shown = words.slice(-SHOWN).reverse();
  const color = tone === 'review' ? 'text-wm-fail' : 'text-wm-pass';
  return (
    <section aria-label={label} className={cn('flex min-w-0 flex-col items-center gap-1 text-center', className)}>
      <span ref={countRef} className={cn('inline-block font-wm-display text-wm-lemma tabular-nums', color)}>
        {words.length}
      </span>
      <p className={cn('font-wm-sans text-wm-small-strong', color)}>{label}</p>
      {chips && (
        <ul className="mt-2 flex flex-col items-center gap-1">
          {shown.map((word, i) => (
            // Keyed by the word's place in the whole pile, so older chips keep their element and only the new one slides in.
            <PileChip key={words.length - 1 - i} word={word} tone={tone} fresh={i === 0} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PileChip({ word, tone, fresh }: { word: string; tone: 'review' | 'known'; fresh: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (fresh && ref.current) void chipIn(ref.current);
    // Only when the chip first lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <li ref={ref} className="max-w-full">
      <WordChip word={word} tone={tone === 'review' ? 'review' : 'normal'} />
    </li>
  );
}
